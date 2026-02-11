/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
 * Uses centralized constants for configuration.
 */
window.YPP = window.YPP || {};

/**
 * Grid Layout Manager
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
 * @class GridLayoutManager
 */
window.YPP.features.Layout = class GridLayoutManager {
    /**
     * Initialize Grid Layout Manager
     * @constructor
     */
    constructor() {
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
        this._GRID = this._CONSTANTS.GRID || {};
        this._Utils = window.YPP.Utils || {};
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this.isActive = false;
        this.observer = null;
        this.resizeListener = null;
        this._retryCount = 0;
        this._maxRetries = 5;

        // Bound methods
        this._boundApplyLayout = this.applyGridLayout.bind(this);
    }

    /**
     * Enable the 4x4 grid layout.
     * @param {Object} settings - User settings
     */
    enable(settings) {
        if (settings?.grid4x4) {
            this.init();
        } else {
            this.disable();
        }
    }

    /**
     * Disable the grid layout and revert styles.
     */
    disable() {
        if (!this.isActive) return;

        this._cleanup();
        this.isActive = false;
        this._Utils.log?.('Grid Layout Disabled', 'LAYOUT');
    }

    /**
     * Initialize the feature.
     */
    init() {
        if (this.isActive) return;
        this._Utils.log?.('Initializing 4x4 grid...', 'LAYOUT');
        this.isActive = true;
        this._retryCount = 0;

        // Initial Apply with retry
        this._applyWithRetry();
        this.startObserver();
        this.addResizeListener();
    }

    /**
     * Apply layout with retry mechanism
     * @private
     */
    _applyWithRetry() {
        if (!this.isActive) return;

        const applied = this._safeApply();

        if (!applied && this._retryCount < this._maxRetries) {
            this._retryCount++;
            this._Utils.log?.(`Grid apply retry ${this._retryCount}/${this._maxRetries}`, 'LAYOUT', 'debug');

            // Retry after delay
            setTimeout(() => {
                if (this.isActive) {
                    this._applyWithRetry();
                }
            }, 500);
        }
    }

    /**
     * Safely apply grid layout
     * @private
     * @returns {boolean}
     */
    _safeApply() {
        try {
            return this.applyGridLayout();
        } catch (error) {
            this._Utils.log?.(`Grid apply error: ${error.message}`, 'LAYOUT', 'error');
            return false;
        }
    }

    /**
     * Apply the grid styles to the DOM.
     * @returns {boolean}
     */
    applyGridLayout() {
        if (!this.isActive) return false;

        // Check compatibility with current page
        const path = window.location.pathname;
        const isValidPage = this._isValidPage(path);

        if (!isValidPage) return false;

        // Find grid renderer
        const gridRenderer = document.querySelector(this._SELECTORS.GRID_RENDERER);
        if (!gridRenderer) {
            this._Utils.log?.('Grid renderer not found', 'LAYOUT', 'debug');
            return false;
        }

        // Find contents container
        const contents = gridRenderer.querySelector(this._SELECTORS.GRID_CONTENTS);
        if (!contents) {
            this._Utils.log?.('Grid contents not found', 'LAYOUT', 'debug');
            return false;
        }

        // Apply CSS Grid
        contents.style.display = 'grid';
        contents.style.gridTemplateColumns = 'repeat(4, 1fr)';
        contents.style.gap = `${this._GRID.ROW_GAP || 24}px ${this._GRID.ITEM_GAP || 16}px`;
        contents.style.width = '100%';
        contents.style.padding = '0';

        // Apply item styles
        const items = contents.querySelectorAll(this._SELECTORS.VIDEO_ITEM);
        items.forEach(item => this._styleVideoItem(item));

        // Force rows to use display: contents
        const rows = gridRenderer.querySelectorAll(this._SELECTORS.GRID_ROW);
        rows.forEach(row => {
            row.style.display = 'contents';
        });

        // Also style nested items in rows
        const nestedItems = contents.querySelectorAll('ytd-rich-item-renderer');
        nestedItems.forEach(item => this._styleVideoItem(item));

        this._Utils.log?.('Grid layout applied successfully', 'LAYOUT', 'debug');
        return true;
    }

    /**
     * Check if page is valid for grid layout
     * @private
     * @param {string} path
     * @returns {boolean}
     */
    _isValidPage(path) {
        return path === '/' ||
               path === '/index' ||
               path.startsWith('/channel') ||
               path.startsWith('/c/') ||
               path.startsWith('/@') ||
               path === '/feed/subscriptions';
    }

    /**
     * Style an individual video item for the grid.
     * @param {HTMLElement} item
     */
    _styleVideoItem(item) {
        if (!item) return;

        // For CSS Grid, items don't need width calculations
        item.style.width = 'auto';
        item.style.maxWidth = 'none';
        item.style.minWidth = 'auto';
        item.style.flex = 'none';
        item.style.margin = '0';
        item.style.boxSizing = 'border-box';
    }

    /**
     * Start observing DOM for new video items.
     */
    startObserver() {
        if (this.observer) return;

        const targetNode = document.querySelector('ytd-app');
        if (!targetNode) {
            this._Utils.log?.('ytd-app not found for observer', 'LAYOUT', 'warn');
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldReapply = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue;

                        const tag = node.tagName;
                        if (tag === 'YTD-RICH-ITEM-RENDERER' ||
                            tag === 'YTD-RICH-GRID-ROW' ||
                            tag === 'YTD-CONTINUATION-ITEM-RENDERER' ||
                            tag === 'YTD-RICH-GRID-SLICE-RENDERER' ||
                            node.id === 'contents' ||
                            node.classList?.contains('ytd-rich-grid-renderer')) {
                            shouldReapply = true;
                            break;
                        }
                    }
                }
                if (shouldReapply) break;
            }

            if (shouldReapply) {
                this._debouncedApply();
            }
        });

        this.observer.observe(targetNode, { childList: true, subtree: true });
        this._Utils.log?.('MutationObserver started', 'LAYOUT', 'debug');
    }

    /**
     * Debounced apply
     * @private
     */
    _debouncedApply() {
        const wait = this._GRID?.TIMINGS?.DEBOUNCE_RESIZE || 150;
        const debounce = this._Utils?.debounce || this._createDebounce();

        if (!this._debouncedFn) {
            this._debouncedFn = debounce(this._boundApplyLayout, wait);
        }
        this._debouncedFn();
    }

    /**
     * Create debounce function as fallback
     * @private
     */
    _createDebounce() {
        let timeoutId = null;
        return (func, wait) => {
            return () => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func(), wait);
            };
        };
    }

    /**
     * Stop observing
     */
    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            this._Utils.log?.('MutationObserver stopped', 'LAYOUT', 'debug');
        }
    }

    /**
     * Add resize listener
     */
    addResizeListener() {
        if (this.resizeListener) return;

        const wait = this._GRID?.TIMINGS?.DEBOUNCE_RESIZE || 150;
        const debounce = this._Utils?.debounce || this._createDebounce();

        this.resizeListener = debounce(() => {
            if (this.isActive) {
                this._applyWithRetry();
            }
        }, wait);

        window.addEventListener('resize', this.resizeListener);
    }

    /**
     * Remove resize listener
     */
    removeResizeListener() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }

    /**
     * Cleanup styles
     * @private
     */
    _cleanup() {
        // Cleanup items
        const items = document.querySelectorAll(this._SELECTORS.VIDEO_ITEM);
        items.forEach(item => {
            item.style.width = '';
            item.style.maxWidth = '';
            item.style.minWidth = '';
            item.style.flex = '';
            item.style.margin = '';
            item.style.boxSizing = '';
        });

        // Cleanup contents
        const contents = document.querySelector(this._SELECTORS.GRID_CONTENTS);
        if (contents) {
            contents.style.display = '';
            contents.style.gridTemplateColumns = '';
            contents.style.gap = '';
            contents.style.flexWrap = '';
            contents.style.justifyContent = '';
            contents.style.width = '';
            contents.style.padding = '';
        }

        // Cleanup rows
        const rows = document.querySelectorAll(this._SELECTORS.GRID_ROW);
        rows.forEach(row => {
            row.style.display = '';
        });

        this._cleanupObserver();
        this._removeResizeListener();
    }

    /**
     * Cleanup observer
     * @private
     */
    _cleanupObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Remove resize listener
     * @private
     */
    _removeResizeListener() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Force reapply grid layout
     */
    reapply() {
        if (this.isActive) {
            this._retryCount = 0;
            this._applyWithRetry();
        }
    }

    /**
     * Check if grid is active
     * @returns {boolean}
     */
    isGridActive() {
        return this.isActive;
    }
};
