/**
 * Feature Manager (Orchestrator)
 * Responsible for instantiating, initializing, and updating all extension features.
 */
window.YPP = window.YPP || {};

/**
 * Feature Manager - Orchestrates all extension features
 * Handles instantiation, initialization, error tracking, and updates
 */
window.YPP.FeatureManager = class FeatureManager {
    constructor() {
        /** @type {Object<string, Object>} Feature instances keyed by name */
        this.features = {};
        /** @type {boolean} Whether features have been instantiated */
        this.instantiated = false;
        /** @type {Object|null} Current user settings */
        this.settings = null;
        /** @type {Object<string, number>} Error counts per feature */
        this.errorCounts = {};
        /** @type {number} Maximum errors before disabling feature */
        this.MAX_ERRORS = 3;
    }

    /**
     * Initialize the Feature Manager with user settings.
     * Instantiates features on first call, then applies settings to all features.
     * @param {Object} settings - User settings from chrome.storage
     * @returns {void}
     */
    init(settings) {
        // Defensive: Ensure settings exist, fallback to defaults
        this.settings = settings || window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};

        // Self-Healing: Reset error counts on re-initialization (e.g., settings change or navigation)
        // This allows features to recover if they crashed due to transient issues or bad settings
        this.resetErrors();

        if (!this.instantiated) {
            this.instantiateFeatures();
            this.instantiated = true;
        }

        this.applyFeatures();
    }

    /**
     * Reset error counts to allow features to retry
     */
    resetErrors() {
        this.errorCounts = {};
    }

    /**
     * Instantiate all available feature classes.
     * Maps internal keys to global class names.
     */
    instantiateFeatures() {
        const featureMap = {
            theme: 'Theme',
            layout: 'Layout',
            homeOrganizer: 'HomeOrganizer',
            subsOrganizer: 'SubscriptionsOrganizer',
            advancedFilter: 'AdvancedFilter',
            zenMode: 'ZenMode',
            studyMode: 'StudyMode',
            focusMode: 'FocusMode',
            player: 'Player',
            contentControl: 'ContentControl',
            sidebar: 'SidebarManager',
            headerNav: 'HeaderNav',
            searchRedesign: 'SearchRedesign',
            shortsTools: 'ShortsTools',
            playerTools: 'PlayerTools',
            // New Features
            playlistDuration: 'PlaylistDuration',
            statsVisualizer: 'StatsVisualizer',
            watchHistory: 'WatchHistoryTracker',
            historyTracker: 'HistoryTracker',
            historyRedesign: 'HistoryRedesign',
            playlistRedesign: 'PlaylistRedesign',
            ambientMode: 'AmbientMode',
            audioMode: 'AudioMode',
            videoControls: 'VideoControls',
            videoControls: 'VideoControls',
            returnYouTubeDislike: 'ReturnDislike',
            sponsorBlock: 'SponsorBlock',
            miniPlayer: 'MiniPlayer',
            videoFilters: 'VideoFilters',
            reversePlaylist: 'ReversePlaylist',
            dataAPI: 'DataAPI',
            contextMenu: 'ContextMenu'
        };

        // Defensive: Ensure window.YPP.features exists
        if (!window.YPP?.features) {
            window.YPP.Utils.log('window.YPP.features namespace not found', 'MANAGER', 'error');
            return;
        }

        for (const [key, className] of Object.entries(featureMap)) {
            try {
                // Ensure the class exists in the global namespace
                if (typeof window.YPP.features[className] === 'function') {
                    this.features[key] = new window.YPP.features[className]();
                    this.errorCounts[key] = 0;
                    // window.YPP.Utils.log(`Feature Loaded: ${key}`, 'MANAGER'); // reduce noise
                } else {
                    window.YPP.Utils.log(`Feature class '${className}' not found. Check file inclusion.`, 'MANAGER', 'warn');
                }
            } catch (e) {
                window.YPP.Utils.log(`Failed to instantiate '${className}': ${e?.message || 'Unknown error'}`, 'MANAGER', 'error');
            }
        }
    }

    /**
     * Retrieve a specific feature instance by name.
     * @param {string} name - Feature key (e.g., 'sidebar', 'theme')
     * @returns {Object|null} Feature instance or null if not found
     */
    getFeature(name) {
        return this.features[name] || null;
    }

    /**
     * Apply or update all features based on current settings.
     * Calls update() or run() on each feature instance.
     * @returns {void}
     */
    applyFeatures() {
        Object.entries(this.features).forEach(([name, instance]) => {
            // Skip if feature is broken
            if (this.errorCounts[name] >= this.MAX_ERRORS) return;

            this.safeRun(name, () => {
                // Standard: check for enable/disable methods and update logic
                if (typeof instance.enable === 'function' && typeof instance.disable === 'function') {
                    // Method 1: Feature has strict 'update' method (Preferred)
                    if (typeof instance.update === 'function') {
                        instance.update(this.settings);
                    }
                    // Method 2: Fallback to 'run' method for simple features
                    else if (typeof instance.run === 'function') {
                        instance.run(this.settings);
                    }
                }
                // Legacy support for older features
                else if (typeof instance.run === 'function') {
                    instance.run(this.settings);
                }
            });
        });

        // Notify system that features have been applied/updated
        if (window.YPP.events) {
            window.YPP.events.emit('features:updated', this.settings);
        }
    }

    /**
     * Safely execute a feature's method with error tracking.
     * Prevents one broken feature from crashing the entire extension.
     * Disables features after MAX_ERRORS consecutive failures.
     * @param {string} name - Feature name for error tracking
     * @param {Function} fn - Async or Sync function to execute
     * @returns {Promise<void>}
     */
    async safeRun(name, fn) {
        try {
            await fn();
        } catch (e) {
            this.errorCounts[name] = (this.errorCounts[name] || 0) + 1;
            window.YPP.Utils.log(`Error in feature '${name}' (${this.errorCounts[name]}/${this.MAX_ERRORS}): ${e.message}`, 'MANAGER', 'error');
            console.error(e);

            if (this.errorCounts[name] >= this.MAX_ERRORS) {
                window.YPP.Utils.log(`Feature '${name}' disabled due to excessive errors.`, 'MANAGER', 'warn');
                if (window.YPP.events) {
                    window.YPP.events.emit('feature:disabled', { name, error: e.message });
                }
            }
        }
    }
};
