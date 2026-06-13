/**
 * Search Observer
 * Owns: MutationObserver, monitor interval, debounce, processAll / processNode.
 * Stateless w.r.t. settings — caller syncs via sync() before use.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchObserver = class SearchObserver {

    // -------------------------------------------------------------------------
    // Static constants (tag-level classification)
    // -------------------------------------------------------------------------

    static NOISE_TAGS = new Set([
        'ytd-shelf-renderer',
        'ytd-horizontal-card-list-renderer',
        'ytd-vertical-list-renderer',
        'ytd-universal-watch-card-renderer',
        'ytd-background-promo-renderer',
        'ytd-search-refinement-card-renderer',
        'ytd-reel-shelf-renderer',
        'ytd-rich-shelf-renderer',
    ]);

    static VIDEO_TAGS = new Set([
        'ytd-video-renderer',
        'ytd-playlist-renderer',
        'ytd-radio-renderer',
        'ytd-channel-renderer',
        'yt-lockup-view-model',
        'ytd-lockup-view-model'
    ]);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        this._processedNodes  = new WeakSet();

        /** Injected by SearchRedesign via sync() */
        this._settings  = {};
        this._isEnabled = () => false;
        this._classes   = {};
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Sync latest settings / state from the orchestrator before each use.
     * @param {Object}   settings    - Current user settings
     * @param {Function} isEnabledFn - Returns true when the feature is active
     * @param {Object}   classes     - SearchRedesign.CLASSES reference
     */
    sync(settings, isEnabledFn, classes) {
        this._settings  = settings  || {};
        this._isEnabled = isEnabledFn;
        this._classes   = classes   || {};
    }

    /** Reset the processed-node cache (call on fresh navigation). */
    resetProcessedNodes() {
        this._processedNodes = new WeakSet();
    }

    start(containerSelector) {
        if (this._isObserving) return;
        this._isObserving = true;
        this._containerSelector = containerSelector;

        if (window.YPP?.sharedObserver) {
            // Debounce: batches rapid mutations (20 items loading at once) into a
            // single _processMatches call rather than firing 20 separate times.
            const debouncedProcess = window.YPP.Utils?.debounce
                ? window.YPP.Utils.debounce((matches) => this._processMatches(matches), 150)
                : (matches) => this._processMatches(matches);

            window.YPP.sharedObserver.register(
                'search-results-scanner',
                'ytd-item-section-renderer, ytd-video-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-channel-renderer',
                debouncedProcess
            );
            this.processAll();
        }
    }

    /** Stop observing and clear all timers. */
    stop() {
        this._isObserving = false;
        
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('search-results-scanner');
        }
    }

    // -------------------------------------------------------------------------
    // Observer internals
    // -------------------------------------------------------------------------

    _processMatches(matches) {
        if (!this._isEnabled()) return;
        
        const sectionsToProcess = new Set();
        
        for (let i = 0; i < matches.length; i++) {
            const node = matches[i];
            if (node.tagName === 'YTD-ITEM-SECTION-RENDERER') {
                sectionsToProcess.add(node);
            } else if (node.closest) {
                const section = node.closest('ytd-item-section-renderer');
                if (section) sectionsToProcess.add(section);
            }
        }
        
        sectionsToProcess.forEach(section => {
            try {
                if (document.body.contains(section)) {
                    this._processSection(section);
                }
            } catch (error) {
                this.utils?.log('_processSection error', 'SEARCH', 'warn', error);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Node processing
    // -------------------------------------------------------------------------

    /** Two-pass processing: hide noise sections, then wire up grids. */
    processAll() {
        if (!this._isEnabled()) return;

        try {
            const itemSections = document.querySelectorAll('ytd-item-section-renderer');
            for (let i = 0; i < itemSections.length; i++) {
                this._processSection(itemSections[i]);
            }
        } catch (error) {
            this.utils?.log('processAll error', 'SEARCH', 'warn', error);
        }
    }

    _processSection(section) {
        window.YPP.Utils.batch.read(() => {
            const contents = section.querySelector('#contents');
            if (!contents) return;

            const children = Array.from(contents.children);
            if (children.length === 0) return;

            const stats = this._analyzeSectionChildren(children);

            window.YPP.Utils.batch.write(() => {
                if (this._handleNoiseSection(section, stats, children.length)) {
                    return;
                }

                if (stats.hasVideos) {
                    this._applyGridSystem(contents, children);
                }
            });
        });
    }

    _analyzeSectionChildren(children) {
        let hasVideos = false;
        let allNoise = true;
        let hasTransients = false;
        const { NOISE_TAGS, VIDEO_TAGS } = SearchObserver;

        for (let i = 0; i < children.length; i++) {
            const tag = children[i].tagName.toLowerCase();

            if (tag === 'ytd-continuation-item-renderer') {
                hasTransients = true;
                continue;
            }
            if (VIDEO_TAGS.has(tag)) {
                hasVideos = true;
                allNoise = false;
            } else if (!NOISE_TAGS.has(tag)) {
                allNoise = false;
            }
        }
        return { hasVideos, allNoise, hasTransients };
    }

    _handleNoiseSection(section, stats, childCount) {
        if (stats.allNoise && !stats.hasTransients && childCount > 0) {
            section.classList.add('ypp-noise-section');
            return true;
        }

        if (section.classList.contains('ypp-noise-section') && stats.hasVideos) {
            section.classList.remove('ypp-noise-section');
        }
        return false;
    }

    _applyGridSystem(contents, children) {
        const CLASSES = this._classes;
        if (!contents.classList.contains(CLASSES.GRID_CONTAINER)) {
            contents.classList.add(CLASSES.GRID_CONTAINER);
        }
        for (let i = 0; i < children.length; i++) {
            this.processNode(children[i], contents);
        }
    }

    processNode(node, gridContainer) {
        if (node.nodeType !== Node.ELEMENT_NODE)  return;
        if (this._processedNodes.has(node))        return;

        window.YPP.Utils.batch.read(() => {
            const tag = node.tagName.toLowerCase();
            const isFlattenable = this._isFlattenableShelf(node);
            const isShorts = this._isShorts(node);
            const container = gridContainer || node.parentElement;
            const isGridContainer = container?.classList.contains(this._classes.GRID_CONTAINER);

            window.YPP.Utils.batch.write(() => {
                this._processedNodes.add(node);
                const CLASSES = this._classes;
                const { NOISE_TAGS } = SearchObserver;

                // ── A. Noise node ─────────────────────────────────────────────────────
                if (NOISE_TAGS.has(tag)) {
                    if (isFlattenable) {
                        this._flattenShelf(node);
                        return;
                    }
                    if (this._settings.hideSearchShelves) {
                        node.style.setProperty('display', 'none', 'important');
                    }
                    return;
                }



                // ── B. Shorts ─────────────────────────────────────────────────────────
                if (isShorts) {
                    node.style.setProperty('display', 'none', 'important');
                    return;
                }

                // ── C. Grid layout ────────────────────────────────────────────────────
                if (isGridContainer) {
                    if (
                        tag === 'ytd-video-renderer'    ||
                        tag === 'ytd-radio-renderer'    ||
                        tag === 'ytd-playlist-renderer' ||
                        tag === 'ytd-channel-renderer'  ||
                        tag === 'yt-lockup-view-model'  ||
                        tag === 'ytd-lockup-view-model'
                    ) {
                        node.classList.add(CLASSES.GRID_ITEM);
                        this._cleanInlineStyles(node);
                    } else if (
                        tag === 'ytd-ad-slot-renderer' ||
                        tag === 'ytd-promoted-sparkles-web-renderer'
                    ) {
                        node.style.setProperty('display', 'none', 'important');
                    } else if (!node.classList.contains('ypp-flattened-container')) {
                        node.classList.add(CLASSES.FULL_WIDTH);
                    }
                }
            });
        });
    }

    // -------------------------------------------------------------------------
    // Shorts detection helpers
    // -------------------------------------------------------------------------

    _isShorts(node) {
        const tag = node.tagName.toLowerCase();
        if (tag === 'ytd-reel-shelf-renderer') return true;
        if (tag === 'ytd-rich-shelf-renderer' && node.hasAttribute('is-shorts')) return true;
        if (node.querySelector('a[href*="/shorts/"]')) return true;
        if (node.querySelector('[overlay-style="SHORTS"]')) return true;

        const title = node.querySelector('#title-container #title')?.textContent?.trim() || '';
        if (title.includes('Shorts')) return true;

        const badges = node.querySelectorAll('ytd-badge-supported-renderer');
        for (let i = 0; i < badges.length; i++) {
            if (badges[i].textContent.trim() === 'Shorts') return true;
        }
        return false;
    }

    _isShortsShelf(node) {
        const title = node.querySelector('#title-container #title')?.textContent?.trim() || '';
        if (/shorts/i.test(title)) return true;
        if (node.querySelector('ytd-icon-button-renderer[aria-label="Shorts"]')) return true;
        if (node.querySelector('a[href*="/shorts/"]')) return true;
        return false;
    }

    _isFlattenableShelf(node) {
        const tag = node.tagName.toLowerCase();
        if (
            tag === 'ytd-horizontal-card-list-renderer' ||
            tag === 'ytd-vertical-list-renderer'        ||
            tag === 'ytd-shelf-renderer'                ||
            tag === 'ytd-rich-shelf-renderer'
        ) {
            if (!this._isShortsShelf(node)) {
                return !!node.querySelector(
                    'ytd-video-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-rich-item-renderer'
                );
            }
        }
        return false;
    }

    _flattenShelf(node) {
        if (node.dataset.yppFlattened === 'true') return;
        node.dataset.yppFlattened = 'true';
        node.classList.add('ypp-flattened-container');

        const CLASSES = this._classes;

        const vertical   = node.querySelector('ytd-vertical-list-renderer #items');
        const horizontal = node.querySelector('ytd-horizontal-card-list-renderer #scroll-container')
                        || node.querySelector('ytd-horizontal-card-list-renderer #items');
        const generic    = node.querySelector('#items')
                        || node.querySelector('#scroll-container')
                        || node.querySelector('#contents');

        const container = vertical || horizontal || generic;
        if (!container) return;

        container.classList.add('ypp-flattened-grid');

        const cards = container.querySelectorAll(
            'ytd-video-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-rich-item-renderer, ytd-channel-renderer'
        );
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            card.classList.add(CLASSES.GRID_ITEM);
            this._cleanInlineStyles(card);
        }
    }

    // -------------------------------------------------------------------------
    // Inline style cleanup
    // -------------------------------------------------------------------------

    _cleanInlineStyles(node) {
        if (node.style.width)    node.style.width    = '';
        if (node.style.maxWidth) node.style.maxWidth = '';
        if (node.style.minWidth) node.style.minWidth = '';
        if (node.style.height)   node.style.height   = '';
        if (node.style.margin)   node.style.margin   = '';

        const dismissible = node.querySelector('#dismissible');
        if (dismissible) {
            dismissible.style.display       = '';
            dismissible.style.flexDirection = '';
            dismissible.style.width         = '';
            dismissible.style.height        = '';
        }

        const thumb = node.querySelector('ytd-thumbnail, ytd-playlist-thumbnail');
        if (thumb) {
            thumb.style.width       = '';
            thumb.style.minWidth    = '';
            thumb.style.maxWidth    = '';
            thumb.style.height      = '';
            thumb.style.margin      = '';
            thumb.style.marginRight = '';
            thumb.style.flexBasis   = '';
            thumb.style.flexShrink  = '';

            const inner = thumb.querySelector('a, yt-image');
            if (inner) {
                inner.style.width    = '';
                inner.style.height   = '';
                inner.style.maxWidth = '';
            }
        }

        const textWrapper = node.querySelector('.text-wrapper');
        if (textWrapper) {
            textWrapper.style.marginLeft  = '';
            textWrapper.style.marginRight = '';
            textWrapper.style.marginTop   = '';
            textWrapper.style.width       = '';
            textWrapper.style.maxWidth    = '';
        }

        const actionMenu = node.querySelector('#action-menu, .action-menu');
        if (actionMenu) {
            actionMenu.style.width    = '';
            actionMenu.style.height   = '';
            actionMenu.style.position = '';
        }
    }

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------


};
