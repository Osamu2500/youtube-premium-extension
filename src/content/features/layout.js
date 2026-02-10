/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Layout = class GridLayoutManager {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.observer = null;
        this.resizeListener = null;
        // Debounce apply to prevent layout thrashing
        this.debouncedApply = this.Utils.debounce(() => this.applyGridLayout(), 300);
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
        this.isActive = false;

        this.stopObserver();
        this.removeResizeListener();

        // Revert Styles
        requestAnimationFrame(() => {
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
                contents.style.flexWrap = '';
                contents.style.justifyContent = '';
                contents.style.width = '';
            }
        });

        this.Utils.log('Grid Layout Disabled', 'LAYOUT');
    }

    /**
     * Initialize the feature.
     */
    init() {
        if (this.isActive) return;
        this.Utils.log('Initializing 4x4 grid...', 'LAYOUT');
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

            // Force container styles
            const contents = gridRenderer.querySelector(this.CONSTANTS.SELECTORS.GRID_CONTENTS);
            if (contents) {
                contents.style.display = 'flex';
                contents.style.flexWrap = 'wrap';
                contents.style.justifyContent = 'flex-start';
                contents.style.width = '100%';
            }

            // Force item styles
            const items = document.querySelectorAll(this.CONSTANTS.SELECTORS.VIDEO_ITEM);
            items.forEach(item => this._styleVideoItem(item));

            // Hide rows wrapper to allow flex items to flow naturally
            const rows = document.querySelectorAll(this.CONSTANTS.SELECTORS.GRID_ROW);
            rows.forEach(row => row.style.display = 'contents');
        } catch (error) {
            console.error('[YPP:LAYOUT] Apply error:', error);
        }
    }

    /**
     * Style a individual video item for the grid.
     * @param {HTMLElement} item 
     */
    _styleVideoItem(item) {
        // Calculate width based on 4 items per row accounting for gaps
        const gap = this.CONSTANTS.GRID.ITEM_GAP || 16;
        const rowGap = this.CONSTANTS.GRID.ROW_GAP || 40;

        // Use calc for fluid width: (100% - (3 * gap)) / 4
        const width = `calc(25% - ${gap}px)`;

        item.style.width = width;
        item.style.maxWidth = width;
        item.style.minWidth = `${this.CONSTANTS.GRID.MIN_ITEM_WIDTH || 200}px`;
        item.style.flex = `0 0 ${width}`;
        // Standardize margins
        item.style.margin = `0 ${gap / 2}px ${rowGap}px ${gap / 2}px`;
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
