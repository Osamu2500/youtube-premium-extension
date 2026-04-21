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
    ]);

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        this._observer        = null;
        this._monitorInterval = null;
        this._debounceTimer   = null;
        this._processedNodes  = new WeakSet();

        /** Injected by SearchRedesign via sync() */
        this._settings  = {};
        this._isEnabled = () => false;
        this._classes   = {};

        this._processMutations = this._processMutations.bind(this);
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

    /**
     * Begin observing the search container for new results.
     * @param {string} containerSelector - CSS selector for ytd-search
     */
    start(containerSelector) {
        if (this._observer) return;

        this._pollForElement(containerSelector, (target) => {
            if (this._observer) return;

            this.processAll();
            this._startMonitor(containerSelector);

            this._observer = new MutationObserver(this._processMutations);
            this._observer.observe(target, {
                childList: true,
                subtree:   true,
                attributes: false,
            });
        });
    }

    /** Stop observing and clear all timers. */
    stop() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }

    // -------------------------------------------------------------------------
    // Observer internals
    // -------------------------------------------------------------------------

    _startMonitor(containerSelector) {
        if (this._monitorInterval) clearInterval(this._monitorInterval);

        let containerCache = null;

        this._monitorInterval = setInterval(() => {
            if (document.hidden)       return;
            if (!this._isEnabled())    return;

            if (!containerCache || !containerCache.isConnected) {
                containerCache = document.querySelector(containerSelector);
            }
            if (!containerCache) return;

            const unprocessed = containerCache.querySelectorAll(
                'ytd-video-renderer:not(.ypp-grid-item),' +
                'ytd-playlist-renderer:not(.ypp-grid-item),' +
                'ytd-radio-renderer:not(.ypp-grid-item),' +
                'ytd-channel-renderer:not(.ypp-grid-item)'
            );

            if (unprocessed.length > 0) {
                this.processAll();
            }
        }, 1500);
    }

    _processMutations(mutations) {
        let shouldProcess = false;
        for (let i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }
        if (!shouldProcess) return;

        if (this._debounceTimer) clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(() => {
            requestAnimationFrame(() => { this.processAll(); });
            this._debounceTimer = null;
        }, 150);
    }

    // -------------------------------------------------------------------------
    // Node processing
    // -------------------------------------------------------------------------

    /** Two-pass processing: hide noise sections, then wire up grids. */
    processAll() {
        if (!this._isEnabled()) return;

        try {
            const itemSections              = document.querySelectorAll('ytd-item-section-renderer');
            const { NOISE_TAGS, VIDEO_TAGS } = SearchObserver;
            const CLASSES                   = this._classes;

            for (const section of itemSections) {
                const contents = section.querySelector('#contents');
                if (!contents) continue;

                const children = contents.children;
                if (children.length === 0) continue;

                let hasVideos     = false;
                let allNoise      = true;
                let hasTransients = false;

                for (let i = 0; i < children.length; i++) {
                    const tag = children[i].tagName.toLowerCase();

                    if (tag === 'ytd-continuation-item-renderer') {
                        hasTransients = true;
                        continue;
                    }
                    if (VIDEO_TAGS.has(tag)) {
                        hasVideos = true;
                        allNoise  = false;
                    } else if (!NOISE_TAGS.has(tag)) {
                        allNoise = false;
                    }
                }

                // Hide pure-noise sections
                if (allNoise && !hasTransients && children.length > 0) {
                    if (this._settings.hideSearchShelves) {
                        section.classList.add('ypp-noise-section');
                        section.style.setProperty('display', 'none', 'important');
                    }
                    continue;
                }

                // Restore previously-hidden sections that now have videos
                if (section.classList.contains('ypp-noise-section') && hasVideos) {
                    section.classList.remove('ypp-noise-section');
                    section.style.removeProperty('display');
                }

                // Wire up CSS grid
                if (hasVideos) {
                    if (!contents.classList.contains(CLASSES.GRID_CONTAINER)) {
                        contents.classList.add(CLASSES.GRID_CONTAINER);
                    }
                    for (let i = 0; i < children.length; i++) {
                        this.processNode(children[i], contents);
                    }
                }
            }
        } catch (error) {
            console.warn('[SearchObserver] processAll error:', error.message);
        }
    }

    processNode(node, gridContainer) {
        if (node.nodeType !== Node.ELEMENT_NODE)  return;
        if (this._processedNodes.has(node))        return;
        this._processedNodes.add(node);

        const tag    = node.tagName.toLowerCase();
        const CLASSES = this._classes;
        const { NOISE_TAGS } = SearchObserver;

        // ── A. Noise node ─────────────────────────────────────────────────────
        if (NOISE_TAGS.has(tag)) {
            if (this._isFlattenableShelf(node)) {
                this._flattenShelf(node);
                return;
            }
            if (this._settings.hideSearchShelves) {
                node.style.setProperty('display', 'none', 'important');
            }
            return;
        }

        // ── A1. Hide channel cards ─────────────────────────────────────────────
        if (tag === 'ytd-channel-renderer' && this._settings.hideChannelCards) {
            node.style.setProperty('display', 'none', 'important');
            return;
        }

        // ── B. Shorts ─────────────────────────────────────────────────────────
        if (this._isShorts(node)) {
            node.style.setProperty('display', 'none', 'important');
            return;
        }

        // ── C. Grid layout ────────────────────────────────────────────────────
        const container = gridContainer || node.parentElement;
        if (container?.classList.contains(CLASSES.GRID_CONTAINER)) {
            if (
                tag === 'ytd-video-renderer'    ||
                tag === 'ytd-radio-renderer'    ||
                tag === 'ytd-playlist-renderer' ||
                tag === 'ytd-channel-renderer'
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

    _pollForElement(selector, callback, maxWaitMs = 4000, startInterval = 100) {
        const startTime = Date.now();
        let interval = startInterval;

        const check = () => {
            const el = document.querySelector(selector);
            if (el) { callback(el); return; }

            const elapsed = Date.now() - startTime;
            if (elapsed < maxWaitMs) {
                interval = Math.min(interval * 2, 1000);
                setTimeout(check, interval);
            }
        };
        check();
    }
};
