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
        'ytd-compact-video-renderer', // used by music/song results and some compact search layouts
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
                ? window.YPP.Utils.debounce((matches) => this._processMatches(matches), 30)
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
        const contents = section.querySelector('#contents');
        if (!contents) return;

        const children = Array.from(contents.children);
        if (children.length === 0) return;

        // Use fastdom pattern to strictly separate DOM reads and writes.
        // Interleaving them (e.g. read `querySelector` then write `classList.add`)
        // inside a loop causes synchronous Layout Thrashing and extreme lag.
        window.YPP.Utils.batch.read(() => {
            const stats = this._analyzeSectionChildren(children);
            const operations = [];

            const CLASSES = this._classes;
            const isGridContainer = contents.classList.contains(CLASSES.GRID_CONTAINER);

            // Phase 1: DOM Reads (Gather all necessary state)
            for (let i = 0; i < children.length; i++) {
                const node = children[i];
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                if (this._processedNodes.has(node)) continue;

                const tag = node.tagName.toLowerCase();
                const isFlattenable = this._isFlattenableShelf(node);
                const isShorts = this._isShorts(node);

                let flattenData = null;
                if (isFlattenable) {
                    const vertical = node.querySelector('ytd-vertical-list-renderer #items');
                    const horizontal = node.querySelector('ytd-horizontal-card-list-renderer #scroll-container')
                                    || node.querySelector('ytd-horizontal-card-list-renderer #items');
                    const generic = node.querySelector('#items')
                                    || node.querySelector('#scroll-container')
                                    || node.querySelector('#contents');
                    const shelfContainer = vertical || horizontal || generic;
                    let cards = [];
                    let cardsCleanData = [];
                    if (shelfContainer) {
                        cards = Array.from(shelfContainer.querySelectorAll(
                            'ytd-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-rich-item-renderer, ytd-channel-renderer'
                        ));
                        cardsCleanData = cards.map(c => {
                            const thumb = c.querySelector('ytd-thumbnail, ytd-playlist-thumbnail');
                            return {
                                dismissible: c.querySelector('#dismissible'),
                                thumb: thumb,
                                innerThumb: thumb ? thumb.querySelector('a, yt-image') : null,
                                textWrapper: c.querySelector('.text-wrapper'),
                                actionMenu: c.querySelector('#action-menu, .action-menu')
                            };
                        });
                    }
                    flattenData = { shelfContainer, cards, cardsCleanData };
                }

                let cleanData = null;
                if (stats.hasVideos || isGridContainer) {
                    if (
                        tag === 'ytd-video-renderer'         ||
                        tag === 'ytd-compact-video-renderer' ||  // music/song cards
                        tag === 'ytd-radio-renderer'         ||
                        tag === 'ytd-playlist-renderer'      ||
                        tag === 'ytd-channel-renderer'       ||
                        tag === 'yt-lockup-view-model'       ||
                        tag === 'ytd-lockup-view-model'
                    ) {
                        const thumb = node.querySelector('ytd-thumbnail, ytd-playlist-thumbnail');
                        cleanData = {
                            dismissible: node.querySelector('#dismissible'),
                            thumb: thumb,
                            innerThumb: thumb ? thumb.querySelector('a, yt-image') : null,
                            textWrapper: node.querySelector('.text-wrapper'),
                            actionMenu: node.querySelector('#action-menu, .action-menu')
                        };
                    }
                }

                operations.push({ node, tag, isFlattenable, isShorts, flattenData, cleanData });
            }

            // Phase 2: DOM Writes (Apply all mutations in one frame)
            window.YPP.Utils.batch.write(() => {
                const { NOISE_TAGS } = SearchObserver;

                this._handleNoiseSection(section, stats, children.length);

                if (stats.hasVideos && !isGridContainer) {
                    contents.classList.add(CLASSES.GRID_CONTAINER);
                }

                for (let op of operations) {
                    this._processedNodes.add(op.node);

                    if (NOISE_TAGS.has(op.tag)) {
                        if (op.isFlattenable && op.flattenData) {
                            op.node.dataset.yppFlattened = 'true';
                            op.node.classList.add('ypp-flattened-container');
                            if (op.flattenData.shelfContainer) {
                                op.flattenData.shelfContainer.classList.add('ypp-flattened-grid');
                            }
                            for (let j = 0; j < op.flattenData.cards.length; j++) {
                                const card = op.flattenData.cards[j];
                                card.classList.add(CLASSES.GRID_ITEM);
                                this._cleanInlineStyles(card, op.flattenData.cardsCleanData[j]);
                            }
                            continue;
                        }
                        if (this._settings.hideSearchShelves) {
                            op.node.style.setProperty('display', 'none', 'important');
                        }
                        continue;
                    }

                    if (op.isShorts) {
                        op.node.style.setProperty('display', 'none', 'important');
                        continue;
                    }

                    if (stats.hasVideos || isGridContainer) {
                        if (
                            op.tag === 'ytd-video-renderer'         ||
                            op.tag === 'ytd-compact-video-renderer' ||  // music/song results
                            op.tag === 'ytd-radio-renderer'         ||
                            op.tag === 'ytd-playlist-renderer'      ||
                            op.tag === 'ytd-channel-renderer'       ||
                            op.tag === 'yt-lockup-view-model'       ||
                            op.tag === 'ytd-lockup-view-model'
                        ) {
                            op.node.classList.add(CLASSES.GRID_ITEM);
                            this._cleanInlineStyles(op.node, op.cleanData);
                        } else if (
                            op.tag === 'ytd-ad-slot-renderer' ||
                            op.tag === 'ytd-promoted-sparkles-web-renderer'
                        ) {
                            op.node.style.setProperty('display', 'none', 'important');
                        } else if (!op.node.classList.contains('ypp-flattened-container')) {
                            op.node.classList.add(CLASSES.FULL_WIDTH);
                        }
                    }
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
                    // ytd-compact-video-renderer covers music/song results in shelves —
                    // without it, music shelves are never flattenable and get hidden.
                    'ytd-video-renderer, ytd-compact-video-renderer, ytd-playlist-renderer, ytd-radio-renderer, ytd-rich-item-renderer'
                );
            }
        }
        return false;
    }



    // -------------------------------------------------------------------------
    // Inline style cleanup
    // -------------------------------------------------------------------------

    _cleanInlineStyles(node, data) {
        if (node.style.width)    node.style.width    = '';
        if (node.style.maxWidth) node.style.maxWidth = '';
        if (node.style.minWidth) node.style.minWidth = '';
        if (node.style.height)   node.style.height   = '';
        if (node.style.margin)   node.style.margin   = '';

        if (!data) return;

        if (data.dismissible) {
            data.dismissible.style.display       = '';
            data.dismissible.style.flexDirection = '';
            data.dismissible.style.width         = '';
            data.dismissible.style.height        = '';
        }

        if (data.thumb) {
            data.thumb.style.width       = '';
            data.thumb.style.minWidth    = '';
            data.thumb.style.maxWidth    = '';
            data.thumb.style.height      = '';
            data.thumb.style.margin      = '';
            data.thumb.style.marginRight = '';
            data.thumb.style.flexBasis   = '';
            data.thumb.style.flexShrink  = '';

            if (data.innerThumb) {
                data.innerThumb.style.width    = '';
                data.innerThumb.style.height   = '';
                data.innerThumb.style.maxWidth = '';
            }
        }

        if (data.textWrapper) {
            data.textWrapper.style.marginLeft  = '';
            data.textWrapper.style.marginRight = '';
            data.textWrapper.style.marginTop   = '';
            data.textWrapper.style.width       = '';
            data.textWrapper.style.maxWidth    = '';
        }

        if (data.actionMenu) {
            data.actionMenu.style.width    = '';
            data.actionMenu.style.height   = '';
            data.actionMenu.style.position = '';
        }
    }

    // -------------------------------------------------------------------------
    // Utility
    // -------------------------------------------------------------------------


};
