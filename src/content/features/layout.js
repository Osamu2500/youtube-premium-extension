/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
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
     */
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.observer = null;
        this.resizeListener = null;

        // Fallback if debounce not available
        const debounce = this.Utils?.debounce || ((fn, wait) => {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn.apply(this, args), wait);
            };
        });

        // Debounce apply to prevent layout thrashing
        this.debouncedApply = debounce(() => this.applyGridLayout(), 300);
    }

    /**
     * Enable the 4x4 grid layout.
     * @param {Object} settings 
     */
    enable(settings) {
        if (settings.grid4x4) {
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

        this.stopObserver();
        this.removeResizeListener();

        // Synchronous cleanup to prevent race conditions
        const items = document.querySelectorAll(this.CONSTANTS.SELECTORS.VIDEO_ITEM);
        items.forEach(item => {
            item.style.width = '';
            item.style.maxWidth = '';
            item.style.minWidth = '';
            item.style.flex = '';
            item.style.margin = '';
            item.style.boxSizing = '';
        });

        const contents = document.querySelector(this.CONSTANTS.SELECTORS.GRID_CONTENTS);
        if (contents) {
            contents.style.display = '';
            contents.style.gridTemplateColumns = '';
            contents.style.gap = '';
            contents.style.flexWrap = '';
            contents.style.justifyContent = '';
            contents.style.width = '';
            contents.style.padding = '';
        }

        // Set flag AFTER cleanup completes
        this.isActive = false;
        this.Utils.log('Grid Layout Disabled', 'LAYOUT');
    }

    /**
     * Initialize the feature.
     */
    init() {
        if (this.isActive) return;
        this.Utils?.log('Initializing 4x4 grid...', 'LAYOUT');
        this.isActive = true;

        // Initial Apply
        this.applyGridLayout();
        this.startObserver();
        this.addResizeListener();
    }

    /**
     * Apply the grid styles to the DOM.
     */
    applyGridLayout() {
        if (!this.isActive) return;

        // Check compatibility with current page
        // Primary targets: Home ('/') and Channels
        const path = location.pathname;
        const isValidPage = path === '/' || path === '/index' || path.startsWith('/channel') || path.startsWith('/c/') || path.startsWith('/@');

        if (!isValidPage) return;

        try {
            const gridRenderer = document.querySelector(this.CONSTANTS.SELECTORS.GRID_RENDERER);
            if (!gridRenderer) return;

            // Force CSS Grid on contents container
            const contents = gridRenderer.querySelector(this.CONSTANTS.SELECTORS.GRID_CONTENTS);
            if (contents) {
                contents.style.display = 'grid';
                contents.style.gridTemplateColumns = 'repeat(4, 1fr)';
                contents.style.gap = `${this.CONSTANTS.GRID.ROW_GAP || 24}px ${this.CONSTANTS.GRID.ITEM_GAP || 16}px`;
                contents.style.width = '100%';
                contents.style.padding = '0';
            }

            // Style individual items for grid
            const items = document.querySelectorAll(this.CONSTANTS.SELECTORS.VIDEO_ITEM);
            items.forEach(item => this._styleVideoItem(item));

            // Force rows to use display: contents for grid
            const rows = document.querySelectorAll(this.CONSTANTS.SELECTORS.GRID_ROW);
            rows.forEach(row => row.style.display = 'contents');
        } catch (error) {
            this.Utils?.log('Apply error:', error, 'LAYOUT', 'error');
        }
    }

    /**
     * Style a individual video item for the grid.
     * @param {HTMLElement} item 
     */
    _styleVideoItem(item) {
        // For CSS Grid, items don't need width calculations
        // Just ensure proper sizing and remove any YouTube defaults
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
        if (!targetNode) return;

        this.observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue; // Element nodes only

                        const tag = node.tagName;
                        if (tag === 'YTD-RICH-ITEM-RENDERER' ||
                            tag === 'YTD-RICH-GRID-ROW' ||
                            tag === 'YTD-CONTINUATION-ITEM-RENDERER' ||
                            node.id === 'contents') {
                            shouldReapply = true;
                            break;
                        }
                    }
                }
                if (shouldReapply) break;
            }
            if (shouldReapply) this.debouncedApply();
        });

        this.observer.observe(targetNode, { childList: true, subtree: true });
    }

    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    addResizeListener() {
        if (!this.resizeListener) {
            this.resizeListener = this.Utils.debounce(() => {
                if (this.isActive) this.applyGridLayout();
            }, 150);
            window.addEventListener('resize', this.resizeListener);
        }
    }

    removeResizeListener() {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
    }
};
