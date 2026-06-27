/**
 * Layout Manager (Grid)
 * Enforces a configurable grid layout on the YouTube Home, Search, Channel,
 * and Subscriptions pages.
 * Optimized for performance using requestAnimationFrame and CSS classes.
 */
import './grid-layout.css';

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
        GRID_RENDERER: 'ytd-rich-grid-renderer, yt-rich-grid-renderer, yt-rich-grid-view-model',
        GRID_CONTENTS: '#contents',
        GRID_ITEMS: 'ytd-rich-item-renderer, ytd-rich-grid-media, yt-lockup-view-model, yt-rich-item-view-model',
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
     * Feature configuration key — layout is always active (no toggle)
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
            this.utils.log?.('Initializing grid layout...', 'LAYOUT');

            // Wait for grid to exist before applying
            const grid = await this.waitForElement(GridLayoutManager.SELECTORS.GRID_RENDERER, 10000);
            if (grid) {
                this.applyGridLayout();
            }

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
     * Handle settings updates — debounced via RAF for smooth instant feedback
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
     * Update CSS custom properties based on settings.
     * These vars drive the CSS rules — they survive YouTube's Polymer property resets.
     * @param {Object} settings - User settings
     */
    updateSettings(settings) {
        if (!settings) return;
        
        const root = document.documentElement;

        // Home page manual column count
        const homeCols = Number(settings.homeColumns || 0);
        if (homeCols > 0) {
            root.style.setProperty('--ypp-home-columns', homeCols);
            root.style.setProperty('--ypp-active-columns', homeCols);
        } else {
            root.style.removeProperty('--ypp-home-columns');
            root.style.removeProperty('--ypp-active-columns');
        }

        // Search page
        const searchCols = Number(settings.searchColumns || 0);
        if (searchCols > 0) {
            root.style.setProperty('--ypp-search-columns', searchCols);
        } else {
            root.style.removeProperty('--ypp-search-columns');
        }

        // Subscriptions page
        const subsCols = Number(settings.subscriptionsColumns || 0);
        if (subsCols > 0) {
            root.style.setProperty('--ypp-subscriptions-columns', subsCols);
        } else {
            root.style.removeProperty('--ypp-subscriptions-columns');
        }

        // Channel / @handle pages
        const channelCols = Number(settings.channelColumns || 0);
        if (channelCols > 0) {
            root.style.setProperty('--ypp-channel-columns', channelCols);
        } else {
            root.style.removeProperty('--ypp-channel-columns');
        }

        // History page
        const historyCols = Number(settings.historyColumns || 0);
        if (historyCols > 0) {
            root.style.setProperty('--ypp-history-columns', historyCols);
        } else {
            root.style.removeProperty('--ypp-history-columns');
        }
    }

    /**
     * Start central DOMObserver to watch for grid changes
     */
    startObserver() {
        this.observer.register(
            'layout-manager',
            'ytd-rich-grid-renderer, ytd-rich-item-renderer, ytd-continuation-item-renderer',
            () => this._debouncedApply(),
            false
        );

        this.utils.log?.('Observer started via DOMObserver', 'LAYOUT', 'debug');
    }

    /**
     * Apply layout changes using RAF for smooth updates
     * @private
     */
    _debouncedApply() {
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
        const applyFn = () => this.applyGridLayout();
        const resizeListener = this.utils.debounce(applyFn, GridLayoutManager.CONFIG.DEBOUNCE_DELAY);
        this.addListener(window, 'resize', resizeListener);
    }

    /**
     * Apply grid layout to the current page's grid renderer.
     * @returns {boolean} True if layout was successfully applied
     */
    applyGridLayout() {
        if (!this._isValidPage(window.location.pathname)) return false;

        // Skip if cinematic mode is active
        if (document.body.classList.contains('cinematic-home') || document.body.classList.contains('cinematic')) {
            this._cleanup();
            return false;
        }

        const gridRenderer = document.querySelector(GridLayoutManager.SELECTORS.GRID_RENDERER);
        if (!gridRenderer) return false;

        const contents = gridRenderer.querySelector(GridLayoutManager.SELECTORS.GRID_CONTENTS);
        if (!contents) return false;

        // ── Determine column count per page type ──────────────────────────────
        const path = window.location.pathname;
        let cols;

        if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) {
            // Channel page
            cols = Number(this.settings?.channelColumns || 4);
        } else if (path.startsWith('/results')) {
            // Search page
            cols = Number(this.settings?.searchColumns || 4);
        } else if (path === '/feed/subscriptions') {
            // Subscriptions page
            cols = Number(this.settings?.subscriptionsColumns || 4);
        } else if (path === '/feed/history') {
            // History page
            cols = Number(this.settings?.historyColumns || 4);
        } else {
            // Home page
            const manualCols = Number(this.settings?.homeColumns || 0);

            if (manualCols > 0) {
                // Manual override wins — ignore AutoScaleGrid entirely
                cols = manualCols;
            } else {
                // Auto mode: read --ypp-dynamic-cols published by AutoScaleGrid
                const dynamicCols = document.documentElement.style.getPropertyValue('--ypp-dynamic-cols');
                cols = dynamicCols ? parseInt(dynamicCols, 10) : 4;
            }
        }

        this.utils.log?.('applyGridLayout cols=' + cols + ' path=' + path, 'LAYOUT');

        // cols === 0 should never happen now, but guard just in case
        if (!cols || cols === 0) {
            contents.classList.remove('ypp-grid-container');
            contents.style.removeProperty('grid-template-columns');
            contents.style.removeProperty('grid-auto-flow');
            contents.removeAttribute('data-ypp-cols');
            this._processedContainers.delete(contents);
            return true;
        }

        // Apply ypp-grid-item to newly loaded items
        const items = contents.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ITEMS);
        items.forEach(item => {
            // Skip nested renderers
            if (item.parentElement && item.parentElement.closest('.ypp-grid-item')) {
                item.classList.remove('ypp-grid-item');
                return;
            }
            if (!item.classList.contains('ypp-grid-item')) {
                item.classList.add('ypp-grid-item');
            }
        });

        // Performance: skip if already processed at the same column count
        if (this._processedContainers.has(contents)) {
            const lastCols = parseInt(contents.getAttribute('data-ypp-cols'), 10);
            if (lastCols !== cols || !contents.style.gridTemplateColumns) {
                contents.setAttribute('data-ypp-cols', cols);
                contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');
                contents.style.setProperty('grid-auto-flow', 'dense', 'important');
                
                const manualCols = Number(this.settings?.homeColumns || 0);
                if (manualCols > 0) {
                    document.documentElement.style.setProperty('--ypp-active-columns', cols);
                    document.documentElement.style.removeProperty('--ypp-dynamic-cols');
                } else {
                    document.documentElement.style.removeProperty('--ypp-active-columns');
                }
                
                document.documentElement.style.setProperty('--ypp-grid-column-min', `${Math.floor(100 / cols)}vw`);
            }
            return true;
        }

        // First-time apply
        contents.classList.add('ypp-grid-container');
        contents.setAttribute('data-ypp-cols', cols);
        contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');
        contents.style.setProperty('grid-auto-flow', 'dense', 'important');
        
        const manualColsFirstTime = Number(this.settings?.homeColumns || 0);
        if (manualColsFirstTime > 0) {
            document.documentElement.style.setProperty('--ypp-active-columns', cols);
            document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        } else {
            document.documentElement.style.removeProperty('--ypp-active-columns');
        }
        
        document.documentElement.style.setProperty('--ypp-grid-column-min', `${Math.floor(100 / cols)}vw`);

        this._processedContainers.add(contents);

        return true;
    }

    /**
     * Check if current page should have grid layout
     * @private
     */
    _isValidPage(path) {
        return path === '/' || 
               path === '/index' || 
               path.startsWith('/channel') || 
               path.startsWith('/c/') || 
               path.startsWith('/@') ||
               path === '/feed/subscriptions' ||
               path === '/feed/history' ||
               path.startsWith('/results');
    }

    /**
     * Cleanup all resources and event listeners
     * @private
     */
    _cleanup() {
        if (this.observer) {
            this.observer.unregister('layout-manager');
        }

        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        this._processedContainers = new WeakSet();

        const containers = document.querySelectorAll('.ypp-grid-container, #contents[data-ypp-cols]');
        containers.forEach(el => {
            el.classList.remove('ypp-grid-container');
            el.removeAttribute('data-ypp-cols');
            el.style.removeProperty('grid-template-columns');
            el.style.removeProperty('grid-auto-flow');
        });
        
        const items = document.querySelectorAll('.ypp-grid-item');
        items.forEach(el => el.classList.remove('ypp-grid-item'));
        
        const rows = document.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ROWS);
        rows.forEach(row => {
            row.style.display = '';
        });

        this.utils.log?.('Cleanup complete', 'LAYOUT', 'debug');
    }
};
