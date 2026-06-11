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
        return null;
    }

    /**
     * Run the feature with given settings
     */
    async enable() {
        await super.enable();
        
        try {
            if (this.settings) {
                this.updateSettings(this.settings);
            }
            
            this._retryCount = 0;
            this.utils.log?.('Initializing 4x4 grid...', 'LAYOUT');

            this._applyWithRetry();
            this.startObserver();
            this.addResizeListener();
        } catch (e) {
            this.utils.log?.('Error enabling grid layout', 'LAYOUT', 'error', e);
        }
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
        } else {
            root.style.removeProperty('--ypp-home-columns');
        }
        
        if (settings.searchColumns) {
            root.style.setProperty('--ypp-search-columns', settings.searchColumns);
        } else {
            root.style.removeProperty('--ypp-search-columns');
        }
        
        if (settings.channelColumns) {
            root.style.setProperty('--ypp-channel-columns', settings.channelColumns);
        } else {
            root.style.removeProperty('--ypp-channel-columns');
        }
        
        if (settings.subscriptionsColumns) {
            root.style.setProperty('--ypp-subscriptions-columns', settings.subscriptionsColumns);
        } else {
            root.style.removeProperty('--ypp-subscriptions-columns');
        }
    }

    /**
     * Start central DOMObserver to watch for grid changes
     */
    startObserver() {
        // Register observer for targeted grid container changes to avoid high-frequency callbacks
        this.observer.register(
            'layout-manager',
            'ytd-rich-grid-renderer, ytd-rich-item-renderer, ytd-continuation-item-renderer',
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
            this.utils.log?.('Max retries reached, grid application failed', 'LAYOUT', 'debug');
        }
    }

    /**
     * Apply grid layout classes to DOM elements
     * @returns {boolean} True if layout was successfully applied
     */
    applyGridLayout() {
        // Calculate global UI scale factor for fixed elements (like player bars)
        if (this.settings?.autoScaleLayout) {
            const availableWidth = window.innerWidth;
            const uiScale = Math.max(0.7, Math.min(1.3, availableWidth / 1280));
            document.documentElement.style.setProperty('--ypp-auto-scale', uiScale);
        } else {
            document.documentElement.style.setProperty('--ypp-auto-scale', 1);
        }

        if (!this._isValidPage(window.location.pathname)) return false;

        // Skip layout manager entirely if cinematic mode is active
        if (document.body.classList.contains('cinematic-home') || document.body.classList.contains('cinematic')) {
            this._cleanup();
            return false;
        }

        const gridRenderer = document.querySelector(GridLayoutManager.SELECTORS.GRID_RENDERER);
        if (!gridRenderer) return false;

        const contents = gridRenderer.querySelector(GridLayoutManager.SELECTORS.GRID_CONTENTS);
        if (!contents) return false;

        // Determine column count from user settings per page type
        let cols = this.settings?.homeColumns ?? 4;
        const path = window.location.pathname;
        if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) {
            cols = this.settings?.channelColumns ?? 4;
        } else if (path.startsWith('/results')) {
            cols = this.settings?.searchColumns ?? 4;
        } else if (path === '/feed/subscriptions') {
            cols = this.settings?.subscriptionsColumns ?? 4;
        }

        // Apply auto-scale grid logic if enabled, but ONLY on the home page
        const isHome = path === '/' || path === '/index';
        if (this.settings?.autoScaleLayout && isHome) {
            let width = window.innerWidth;
            if (gridRenderer && gridRenderer.clientWidth > 0) {
                width = gridRenderer.clientWidth;
            }
            if (width >= 2100) cols = 6;
            else if (width >= 1800) cols = 5;
            else if (width >= 1400) cols = 4;
            else if (width >= 1000) cols = 3;
            else if (width >= 600) cols = 2;
            else cols = 1;
        }

        // If cols is 0 (Auto), remove the custom grid container styling to let YouTube handle it natively
        if (cols === 0) {
            contents.classList.remove('ypp-grid-container');
            contents.style.removeProperty('grid-template-columns');
            contents.style.removeProperty('grid-auto-flow');
            contents.removeAttribute('data-ypp-cols');
            this._processedContainers.delete(contents);
            return true;
        }

        // Fix YouTube's row wrappers (use display: contents to flatten)
        // Moved to styles.css for massive performance boost.

        // Apply ypp-grid-item to any newly loaded items immediately
        const items = contents.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ITEMS);
        items.forEach(item => {
            if (!item.classList.contains('ypp-grid-item')) {
                item.classList.add('ypp-grid-item');
            }
        });

        // Performance: Skip if already processed and unchanged
        if (this._processedContainers.has(contents)) {
            const lastCols = parseInt(contents.getAttribute('data-ypp-cols'), 10);
            if (lastCols !== cols || !contents.style.gridTemplateColumns) {
                contents.setAttribute('data-ypp-cols', cols);
                contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');
                contents.style.setProperty('grid-auto-flow', 'dense', 'important');
                document.documentElement.style.setProperty('--ypp-active-columns', cols);
                document.documentElement.style.setProperty('--ypp-grid-column-min', `${Math.floor(100 / cols)}vw`);
            }
            return true;
        }

        // Apply grid container class
        contents.classList.add('ypp-grid-container');
        contents.setAttribute('data-ypp-cols', cols);



        // Use repeat(N, 1fr) — reliable exact column count.
        // minmax(0, 1fr) ensures columns never overflow when cards have wide content.
        contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');

        // Also set dense auto-flow so hidden items (Shorts, watched, filtered) don't leave blank cells
        contents.style.setProperty('grid-auto-flow', 'dense', 'important');

        // Ensure CSS knows the active column count
        document.documentElement.style.setProperty('--ypp-active-columns', cols);

        // Update the CSS min-column variable so responsive breakpoints in styles.css stay consistent
        document.documentElement.style.setProperty('--ypp-grid-column-min', `${Math.floor(100 / cols)}vw`);


        // (Row wrappers flattening is now handled earlier in the function)

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
               path === '/feed/subscriptions' ||
               path.startsWith('/results');
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

        // Remove applied classes and inline grid styles
        const containers = document.querySelectorAll('.ypp-grid-container, #contents[data-ypp-cols]');
        containers.forEach(el => {
            el.classList.remove('ypp-grid-container');
            el.removeAttribute('data-ypp-cols');
            el.style.removeProperty('grid-template-columns');
            el.style.removeProperty('grid-auto-flow');
        });
        
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
