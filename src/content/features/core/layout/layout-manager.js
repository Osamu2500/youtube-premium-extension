/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
 * Optimized for performance using requestAnimationFrame and CSS classes.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Layout = class GridLayoutManager extends window.YPP.features.BaseFeature {
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
        super('GridLayoutManager');
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this._initState();
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        /** @type {number|null} RequestAnimationFrame ID */
        this._rafId = null;
        
        /** @type {number} Current retry attempt count */
        this._retryCount = 0;

        /** @type {WeakSet<Element>} Track processed containers to avoid reprocessing */
        this._processedContainers = new WeakSet();

        // Bind methods for performance
        this._boundApplyLayout = this.applyGridLayout.bind(this);
    }

    /**
     * Feature configuration key
     */
    getConfigKey() {
        return 'grid4x4';
    }

    /**
     * Run the feature with given settings
     */
    async enable() {
        await super.enable();
        
        if (this.settings) {
            this.updateSettings(this.settings);
        }
        
        this._retryCount = 0;
        this.utils.log?.('Initializing 4x4 grid...', 'LAYOUT');

        this._applyWithRetry();
        this.startObserver();
        this.addResizeListener();
    }

    /**
     * Disable grid layout and cleanup resources
     */
    async disable() {
        await super.disable();
        this._cleanup();
        this.utils.log?.('Grid Layout Disabled', 'LAYOUT');
    }

    /**
     * Handle settings updates
     */
    async onUpdate() {
        if (this.settings) {
            this.updateSettings(this.settings);
            // Force re-apply of grid structural styles when settings change
            this._processedContainers = new WeakSet();
            this._debouncedApply();
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
     * Start central DOMObserver to watch for grid changes
     */
    startObserver() {
        // Register observer for main app container changes
        this.observer.register(
            'layout-manager',
            GridLayoutManager.SELECTORS.APP_CONTAINER,
            () => this._debouncedApply(),
            false // Process handled by init()'s applyWithRetry
        );

        this.utils.log?.('Observer started via DOMObserver', 'LAYOUT', 'debug');
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
        // Use shared utils.debounce
        const applyFn = () => this._applyWithRetry();
        
        const resizeListener = this.utils.debounce(applyFn, GridLayoutManager.CONFIG.DEBOUNCE_DELAY);
            
        this.addListener(window, 'resize', resizeListener);
    }

    /**
     * Apply layout with exponential backoff retry
     * @private
     */
    _applyWithRetry() {
        const success = this.applyGridLayout();
        
        if (!success && this._retryCount < GridLayoutManager.CONFIG.MAX_RETRIES) {
            this._retryCount++;
            const delay = GridLayoutManager.CONFIG.BASE_RETRY_DELAY * 
                         Math.pow(GridLayoutManager.CONFIG.RETRY_BACKOFF_FACTOR, this._retryCount - 1);
            
            this.utils.log?.(`Retry ${this._retryCount}/${GridLayoutManager.CONFIG.MAX_RETRIES} in ${delay}ms`, 'LAYOUT', 'debug');
            setTimeout(() => this._applyWithRetry(), delay);
        } else if (!success) {
            this.utils.log?.('Max retries reached, grid application failed', 'LAYOUT', 'warn');
        }
    }

    /**
     * Apply grid layout classes to DOM elements
     * @returns {boolean} True if layout was successfully applied
     */
    applyGridLayout() {
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

        // Determine active columns
        let cols = this.settings?.homeColumns || 4;
        const path = window.location.pathname;
        if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) {
            cols = this.settings?.channelColumns || 4;
        } else if (path.startsWith('/results')) {
            cols = this.settings?.searchColumns || 4;
        }
        contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');

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
            this.observer.unregister('layout-manager');
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

        this.utils.log?.('Cleanup complete', 'LAYOUT', 'debug');
    }
};
