/**
 * Search Redesign — Orchestrator
 * Owns: enable/disable lifecycle, SPA navigation handling, and view-mode toggle.
 * Delegates observation/processing to SearchObserver and filter logic to SearchFilter.
 *
 * Architecture:
 * - Uses a distinct "Grid Mode" (ypp-search-grid-mode) on body.
 * - Hides Shorts via CSS for performance/stability.
 * - Implements a responsive CSS Grid for results.
 * - Features a persistent View Toggle (Grid/List).
 */

class SearchRedesign extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'searchGrid'; }

    // =========================================================================
    // CONSTANTS & CONFIG
    // =========================================================================

    /** CSS classes used for styling and state management */
    static CLASSES = {
        GRID_MODE:       'ypp-search-grid-mode',
        LIST_MODE:       'ypp-search-list-mode',
        GRID_CONTAINER:  'ypp-search-grid-container',
        GRID_ITEM:       'ypp-grid-item',
        FULL_WIDTH:      'ypp-full-width-item',
        HIDDEN_SHORT:    'ypp-hidden-short',
        TOGGLE_BTN:      'ypp-toggle-btn',
        TOGGLE_CONTAINER:'ypp-view-mode-toggle',
        ACTIVE:          'active',
    };

    /** DOM selectors for targeting YouTube elements */
    static SELECTORS = {
        SEARCH_CONTAINER: 'ytd-search',
        SECTION_LIST:     'ytd-section-list-renderer',
        ITEM_SECTION:     'ytd-item-section-renderer',
        CONTENTS:         '#contents',
        FILTER_HEADER:    'ytd-search-sub-menu-renderer',
        TOOLS_CONTAINER:  '#filter-menu',
        VIDEO:            'ytd-video-renderer',
        PLAYLIST:         'ytd-playlist-renderer',
        CHANNEL:          'ytd-channel-renderer',
        SHELF:            'ytd-shelf-renderer',
        RADIO:            'ytd-radio-renderer',
        REEL_SHELF:       'ytd-reel-shelf-renderer',
        RICH_SHELF:       'ytd-rich-shelf-renderer',
    };

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    constructor() {
        /** @type {boolean} Feature enabled state */
        this._isEnabled  = false;

        /** @type {Object} Current user settings */
        this._settings   = {};

        /** @type {boolean} Batching guard (legacy compat) */
        this._batching   = false;

        /** @type {string|null} Last seen query (nav-away reset) */
        this._lastQuery  = null;

        // ── Sub-modules ────────────────────────────────────────────────────
        this._searchObserver = new window.YPP.features.SearchObserver();
        this._searchFilter   = new window.YPP.features.SearchFilter();
        this._searchViewMode = new window.YPP.features.SearchViewMode();

        // Bind navigation handler once
        this._handleNavigation = this._handleNavigation.bind(this);
    }

    /**
     * Called by FeatureManager on first load with persisted settings.
     * @param {Object} settings
     */
    async init(settings) {
        this._settings = settings || {};

        this._searchViewMode.sync(SearchRedesign.CLASSES, this._log.bind(this));
        await this._searchViewMode.init();

        if (this._settings.searchGrid || this._settings.autoVideoFilter) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * FeatureManager entry point — called on every settings update / navigation.
     * @param {Object} settings
     */
    run(settings) {
        this._settings = settings || {};

        // Reset processed-node cache so a fresh page starts clean
        this._searchObserver.resetProcessedNodes();
        this._searchFilter.updateSettings(this._settings);
        
        this._searchViewMode.run();

        const shouldEnable = this._settings.searchGrid || this._settings.cleanSearch;
        if (shouldEnable) {
            this.enable();
        } else {
            this.disable();
        }
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    /** Enable the feature, wire navigation listener, process current page. */
    enable() {
        if (this._isEnabled) {
            // Already enabled — re-process in case settings changed
            this._handleNavigation();
            return;
        }
        this._isEnabled = true;

        window.addEventListener('yt-navigate-finish', this._handleNavigation);

        this._searchViewMode.enable();

        this._handleNavigation();
        this._log('SearchRedesign enabled', 'info');
    }

    /** Disable the feature and clean up. */
    disable() {
        if (!this._isEnabled) return;
        this._isEnabled = false;

        this._searchObserver.stop();
        this._searchViewMode.disable();

        document.body.classList.remove(
            SearchRedesign.CLASSES.GRID_MODE,
            SearchRedesign.CLASSES.LIST_MODE,
            'ypp-search-clean-grid'
        );
        document.body.classList.remove('ypp-filter-pending');

        window.removeEventListener('yt-navigate-finish', this._handleNavigation);
    }

    // =========================================================================
    // NAVIGATION
    // =========================================================================

    /**
     * Handle SPA navigation — delegate work to sub-modules.
     * @private
     */
    _handleNavigation() {
        if (!this._isEnabled) return;

        const isSearch = window.location.pathname === '/results';

        if (isSearch) {
            // Push fresh state into sub-modules before they act
            this._searchObserver.sync(
                this._settings,
                () => this._isEnabled,
                SearchRedesign.CLASSES
            );
            this._searchFilter.updateSettings(this._settings);

            if (this._settings.searchGrid) {
                this._searchViewMode.applyViewMode();
                this._searchObserver.start(SearchRedesign.SELECTORS.SEARCH_CONTAINER);
            }

            if (this._settings.hideSearchShelves) {
                document.body.classList.add('ypp-search-clean-grid');
            } else {
                document.body.classList.remove('ypp-search-clean-grid');
            }

            if (this._settings.autoVideoFilter) {
                this._searchFilter.checkAndApply();
            }
        } else {
            this._searchObserver.stop();
            document.body.classList.remove('ypp-search-clean-grid');
            this._lastQuery = null;
        }
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    _log(msg, level = 'info') {
        if (window.YPP?.Utils?.log) {
            window.YPP.Utils.log(msg, 'SEARCH', level);
        } else {
            console[level]?.(`[SearchRedesign] ${msg}`);
        }
    }

    _removeClasses() {
        document.body.classList.remove(
            SearchRedesign.CLASSES.GRID_MODE,
            SearchRedesign.CLASSES.LIST_MODE
        );
    }
}

// Expose to global namespace for FeatureManager
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.SearchRedesign = SearchRedesign;
