/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
 * Optimized for performance using requestAnimationFrame and CSS classes.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Layout = class GridLayoutManager {
    /**
     * Configuration constants
     * @readonly
     */
    static CONFIG = {
        MAX_RETRIES: 5,
        BASE_RETRY_DELAY: 500,
        RETRY_BACKOFF_FACTOR: 1.5,
        DEBOUNCE_DELAY: 150,
        OBSERVER_THROTTLE: 100
    };

    /**
     * CSS selectors used by the layout manager
     * @readonly
     */
    static SELECTORS = {
        APP_CONTAINER: 'ytd-app',
        GRID_RENDERER: 'ytd-rich-grid-renderer',
        GRID_CONTENTS: '#contents',
        GRID_ITEMS: 'ytd-rich-item-renderer, ytd-rich-grid-media',
        GRID_ROWS: 'ytd-rich-grid-row'
    };

    /**
     * Target node types to watch for in MutationObserver
     * @readonly
     */
    static WATCHED_TAGS = new Set([
        'YTD-RICH-GRID-RENDERER',
        'YTD-RICH-ITEM-RENDERER',
        'YTD-CONTINUATION-ITEM-RENDERER'
    ]);

    constructor() {
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constant references
     * @private
     */
    _initConstants() {
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this.SELECTORS = this.CONSTANTS.SELECTORS || {};
        this.Utils = window.YPP.Utils || {};
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        /** @type {boolean} Feature active state */
        this.isActive = false;
        
        /** @type {MutationObserver|null} DOM mutation observer */
        this.observer = null;
        
        /** @type {Function|null} Window resize event listener */
        this.resizeListener = null;
        
        /** @type {number|null} RequestAnimationFrame ID */
        this._rafId = null;
        
        /** @type {number} Current retry attempt count */
        this._retryCount = 0;

        /** @type {WeakSet<Element>} Track processed containers to avoid reprocessing */
        this._processedContainers = new WeakSet();

        // Bind methods for performance
        this._boundApplyLayout = this.applyGridLayout.bind(this);
        this._boundHandleMutation = this._handleMutation.bind(this);
    }

    /**
     * Run the feature with given settings
     * @param {Object} settings - User settings
     */
    run(settings) {
        this.enable(settings);
    }

    /**
     * Enable grid layout with settings
     * @param {Object} settings - User settings object
     */
    enable(settings) {
        if (!settings) return;
        
        this.updateSettings(settings);
        
        if (settings.grid4x4) {
            this.init();
        } else {
            this.disable();
        }
    }

    /**
     * Update CSS custom properties based on settings
     * @param {Object} settings - User settings
     */
    updateSettings(settings) {
        if (!settings) return;
        
        const root = document.documentElement;
        
        if (settings.homeColumns) {
            root.style.setProperty('--ypp-home-columns', settings.homeColumns);
        }
        if (settings.searchColumns) {
            root.style.setProperty('--ypp-search-columns', settings.searchColumns);
        }
        if (settings.channelColumns) {
            root.style.setProperty('--ypp-channel-columns', settings.channelColumns);
        }
    }

    /**
     * Disable grid layout and cleanup resources
     */
    disable() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this._cleanup();
        this.Utils.log?.('Grid Layout Disabled', 'LAYOUT');
    }

    /**
     * Initialize grid layout system
     */
    init() {
        if (this.isActive) return;
        
        this.isActive = true;
        this._retryCount = 0;
        this.Utils.log?.('Initializing 4x4 grid...', 'LAYOUT');

        this._applyWithRetry();
        this.startObserver();
        this.addResizeListener();
    }

    /**
     * Start mutation observer to watch for DOM changes
     */
    startObserver() {
        if (this.observer) return;

        // Target specific container instead of entire body
        const targetNode = document.querySelector(GridLayoutManager.SELECTORS.APP_CONTAINER);
        if (!targetNode) {
            this.Utils.log?.('App container not found, retrying...', 'LAYOUT', 'warn');
            setTimeout(() => this.startObserver(), 1000);
            return;
        }

        this.observer = new MutationObserver(this._boundHandleMutation);

        // Watch only relevant parts of the DOM tree
        this.observer.observe(targetNode, { 
            childList: true, 
            subtree: true,
            // Don't watch attributes - we only care about new nodes
            attributes: false
        });

        this.Utils.log?.('Observer started', 'LAYOUT', 'debug');
    }

    /**
     * Handle mutation events with optimized filtering
     * @private
     * @param {MutationRecord[]} mutations - Array of mutation records
     */
    _handleMutation(mutations) {
        if (!this.isActive) return;

        // Early exit: Check if any relevant nodes were added
        let shouldUpdate = false;
        
        for (const mutation of mutations) {
            if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
                continue;
            }

            // Check if any added node is relevant
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                
                const tag = node.tagName;
                if (GridLayoutManager.WATCHED_TAGS.has(tag) || node.id === 'contents') {
                    shouldUpdate = true;
                    break;
                }
            }

            if (shouldUpdate) break;
        }

        if (shouldUpdate) {
            this._debouncedApply();
        }
    }

    /**
     * Apply layout changes using RAF for smooth updates
     * @private
     */
    _debouncedApply() {
        // Cancel pending RAF to avoid duplicate calls
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
        }
        
        this._rafId = requestAnimationFrame(() => {
            this.applyGridLayout();
            this._rafId = null;
        });
    }

    /**
     * Add window resize listener with debouncing
     */
    addResizeListener() {
        if (this.resizeListener) return;
        
        // Use shared Utils.debounce if available
        const applyFn = () => this._applyWithRetry();
        
        this.resizeListener = this.Utils.debounce ? 
            this.Utils.debounce(applyFn, GridLayoutManager.CONFIG.DEBOUNCE_DELAY) : 
            this._createSimpleDebounce(applyFn, GridLayoutManager.CONFIG.DEBOUNCE_DELAY);
            
        window.addEventListener('resize', this.resizeListener);
    }

    /**
     * Simple debounce implementation as fallback
     * @private
     * @param {Function} func - Function to debounce
     * @param {number} delay - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    _createSimpleDebounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * Apply layout with exponential backoff retry
     * @private
     */
    _applyWithRetry() {
        if (!this.isActive) return;
        
        const success = this.applyGridLayout();
        
        if (!success && this._retryCount < GridLayoutManager.CONFIG.MAX_RETRIES) {
            this._retryCount++;
            const delay = GridLayoutManager.CONFIG.BASE_RETRY_DELAY * 
                         Math.pow(GridLayoutManager.CONFIG.RETRY_BACKOFF_FACTOR, this._retryCount - 1);
            
            this.Utils.log?.(`Retry ${this._retryCount}/${GridLayoutManager.CONFIG.MAX_RETRIES} in ${delay}ms`, 'LAYOUT', 'debug');
            setTimeout(() => this._applyWithRetry(), delay);
        } else if (!success) {
            this.Utils.log?.('Max retries reached, grid application failed', 'LAYOUT', 'warn');
        }
    }

    /**
     * Apply grid layout classes to DOM elements
     * @returns {boolean} True if layout was successfully applied
     */
    applyGridLayout() {
        if (!this.isActive) return false;
        if (!this._isValidPage(window.location.pathname)) return false;

        const gridRenderer = document.querySelector(GridLayoutManager.SELECTORS.GRID_RENDERER);
        if (!gridRenderer) return false;

        const contents = gridRenderer.querySelector(GridLayoutManager.SELECTORS.GRID_CONTENTS);
        if (!contents) return false;

        // Performance: Skip if already processed and unchanged
        if (this._processedContainers.has(contents)) {
            return true;
        }

        // Apply grid container class
        contents.classList.add('ypp-grid-container');

        // Style grid items
        const items = contents.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ITEMS);
        items.forEach(item => {
            if (!item.classList.contains('ypp-grid-item')) {
                item.classList.add('ypp-grid-item');
            }
        });

        // Fix YouTube's row wrappers (use display: contents to flatten)
        const rows = gridRenderer.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ROWS);
        rows.forEach(row => {
            if (row.style.display !== 'contents') {
                row.style.display = 'contents';
            }
        });

        // Mark as processed
        this._processedContainers.add(contents);

        return true;
    }

    /**
     * Check if current page should have grid layout
     * @private
     * @param {string} path - URL pathname
     * @returns {boolean} True if page is valid for grid
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
     * Cleanup all resources and event listeners
     * @private
     */
    _cleanup() {
        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Remove resize listener
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }

        // Cancel pending animation frame
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // Clear processed containers
        this._processedContainers = new WeakSet();

        // Remove applied classes
        const containers = document.querySelectorAll('.ypp-grid-container');
        containers.forEach(el => el.classList.remove('ypp-grid-container'));
        
        const items = document.querySelectorAll('.ypp-grid-item');
        items.forEach(el => el.classList.remove('ypp-grid-item'));
        
        // Reset row displays
        const rows = document.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ROWS);
        rows.forEach(row => {
            row.style.display = '';
        });

        this.Utils.log?.('Cleanup complete', 'LAYOUT', 'debug');
    }
};
