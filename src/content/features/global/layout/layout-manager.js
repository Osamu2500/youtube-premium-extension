/**
 * Layout Manager (Grid)
 * Enforces a 4x4 grid layout on the YouTube Home and Channel pages.
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
     * Handle settings updates
     */
    async onUpdate() {
        if (this.settings) {
            this.utils.log?.('GridLayoutManager onUpdate triggered. Settings homeColumns: ' + this.settings.homeColumns, 'LAYOUT');
            this.updateSettings(this.settings);

            // Proactively write --ypp-active-columns NOW (synchronous) so any code
            // that reads this CSS variable immediately (e.g. after AutoScaleGrid clears it)
            // gets the correct manual value — not a stale/missing one.
            const manualCols = Number(this.settings.homeColumns || 0);
            if (manualCols > 0) {
                document.documentElement.style.setProperty('--ypp-active-columns', manualCols);
                document.documentElement.style.removeProperty('--ypp-dynamic-cols');
            }

            // Apply instantly (synchronous) so the column change is visible
            // in the same animation frame as the slider input event —
            // don't wait for the RAF debounce or featureManager.init() chain.
            this._processedContainers = new WeakSet();
            this.applyGridLayout();
        }
    }

    /**
     * Update CSS custom properties based on settings
     * @param {Object} settings - User settings
     */
    updateSettings(settings) {
        if (!settings) return;
        
        const root = document.documentElement;

        // Write CSS vars for ALL page types immediately.
        // CSS vars on :root survive YouTube's Polymer property resets (unlike inline styles on #contents).
        // Each page-type grid's CSS uses its own var as the column count.

        // Home page
        const homeCols = Number(settings.homeColumns || 0);
        if (homeCols > 0) {
            root.style.setProperty('--ypp-home-columns', homeCols);
            root.style.setProperty('--ypp-active-columns', homeCols); // drives --ytd-rich-grid-items-per-row via CSS
        } else {
            root.style.removeProperty('--ypp-home-columns');
            // Auto mode: do NOT touch --ypp-active-columns here — AutoScaleGrid owns it in auto mode.
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
        const applyFn = () => this.applyGridLayout();
        
        const resizeListener = this.utils.debounce(applyFn, GridLayoutManager.CONFIG.DEBOUNCE_DELAY);
            
        this.addListener(window, 'resize', resizeListener);
    }



    /**
     * Apply grid layout classes to DOM elements
     * @returns {boolean} True if layout was successfully applied
     */
    applyGridLayout() {
        if (!this._isValidPage(window.location.pathname)) return false;

        // Skip layout manager entirely if cinematic mode is active
        if (document.body.classList.contains('cinematic-home') || document.body.classList.contains('cinematic')) {
            this._cleanup();
            return false;
        }

        const gridRenderers = document.querySelectorAll(GridLayoutManager.SELECTORS.GRID_RENDERER);
        if (!gridRenderers || gridRenderers.length === 0) return false;
        
        let applied = false;

        gridRenderers.forEach(gridRenderer => {
            const contents = gridRenderer.querySelector(GridLayoutManager.SELECTORS.GRID_CONTENTS);
            if (!contents) return;

            // Determine column count from user settings per page type.
            // homeColumns === 0 means "auto" — use AutoScaleGrid.calculateColumns().
            // homeColumns >= 1 means manual slider — use that value directly, no AutoScaleGrid involved.
            let cols = Number(this.settings?.homeColumns || 0);
            const path = window.location.pathname;
            if (path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/')) {
                cols = Number(this.settings?.channelColumns || 4);
            } else if (path.startsWith('/results')) {
                cols = Number(this.settings?.searchColumns || 4);
            } else if (path === '/feed/subscriptions') {
                cols = Number(this.settings?.subscriptionsColumns || 4);
            }

            // Auto mode on home page: call AutoScaleGrid directly (no CSS var middleman).
            // This eliminates any race condition — the calculation is synchronous and pure.
            const isHome = path === '/' || path === '/index';
            if (isHome && cols === 0) {
                if (this.settings?.autoScaleLayout &&
                    typeof window.YPP?.features?.AutoScaleGrid?.calculateColumns === 'function') {
                    cols = window.YPP.features.AutoScaleGrid.calculateColumns();
                    this.utils.log?.('Auto mode: AutoScaleGrid.calculateColumns()=' + cols, 'LAYOUT');
                } else {
                    cols = 4; // AutoScaleGrid off + no manual value → safe default
                    this.utils.log?.('Auto mode: AutoScaleGrid disabled, defaulting to 4', 'LAYOUT');
                }
            }

            
            this.utils.log?.('applyGridLayout cols evaluated to: ' + cols + ' for path: ' + path, 'LAYOUT');

            // If cols is 0 (Auto), remove the custom grid container styling to let YouTube handle it natively
            if (cols === 0) {
                contents.classList.remove('ypp-grid-container');
                contents.style.removeProperty('grid-template-columns');
                contents.style.removeProperty('grid-auto-flow');
                contents.removeAttribute('data-ypp-cols');
                this._processedContainers.delete(contents);
                applied = true;
                return;
            }

            // Apply ypp-grid-item to any newly loaded items immediately, but ONLY to the top-level cards
            const items = contents.querySelectorAll(GridLayoutManager.SELECTORS.GRID_ITEMS);
            items.forEach(item => {
                // Skip if it's a nested renderer (e.g. lockup inside rich-item)
                if (item.parentElement && item.parentElement.closest('.ypp-grid-item')) {
                    item.classList.remove('ypp-grid-item');
                    return;
                }
                if (!item.classList.contains('ypp-grid-item')) {
                    item.classList.add('ypp-grid-item');
                }
            });

            // Cleanup any nested .ypp-grid-items that might have sneaked in
            const allGridItems = contents.querySelectorAll('.ypp-grid-item');
            allGridItems.forEach(item => {
                if (item.parentElement && item.parentElement.closest('.ypp-grid-item')) {
                    item.classList.remove('ypp-grid-item');
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
                applied = true;
                return;
            }

            // Apply grid container class
            contents.classList.add('ypp-grid-container');
            contents.setAttribute('data-ypp-cols', cols);

            // Use repeat(N, 1fr) — reliable exact column count.
            // minmax(0, 1fr) ensures columns never overflow when cards have wide content.
            contents.style.setProperty('grid-template-columns', `repeat(${cols}, minmax(0, 1fr))`, 'important');

            // Also set dense auto-flow so hidden items (Shorts, watched, filtered) don't leave blank cells
            contents.style.setProperty('grid-auto-flow', 'dense', 'important');

            // Ensure CSS knows the active column count (drives --ytd-rich-grid-items-per-row via CSS rule)
            document.documentElement.style.setProperty('--ypp-active-columns', cols);

            // Update the CSS min-column variable so responsive breakpoints in styles.css stay consistent
            document.documentElement.style.setProperty('--ypp-grid-column-min', `${Math.floor(100 / cols)}vw`);

            // Mark as processed
            this._processedContainers.add(contents);
            
            applied = true;
        });

        return applied;
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
