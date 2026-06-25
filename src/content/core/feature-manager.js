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
        /** @type {number} Track execution loops to cancel stale ones */
        this._currentApplyId = 0;
        
        // --- Queue state for applyFeatures ---
        this._applyQueue = [];
        this._processingQueue = false;

        // --- Error logging rate limits ---
        this._errorLogTimestamps = {};
        this._errorLogRateLimit = 5000;
    }

    /**
     * Initialize the Feature Manager with user settings.
     * Instantiates features on first call, then applies settings to all features.
     * @param {Object} settings - User settings from chrome.storage
     * @returns {void}
     */
    init(settings) {
        // Defensive: Ensure settings exist, fallback to defaults
        this.settings = { ...this.settings, ...(settings || window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {}) };

        // Self-Healing: Reset error counts on re-initialization ONLY if enough time has passed
        // This prevents infinite retry loops if a feature crashes immediately upon load
        const now = Date.now();
        if (!this.lastReset || (now - this.lastReset > 5000)) {
            this.resetErrors();
            this.lastReset = now;
        }

        if (!this.instantiated) {
            this.instantiateFeatures();
            this.instantiated = true;
            this.setupLifecycleBindings();
        }

        this.applyFeatures();
    }

    /**
     * Bind to the central EventBus to relay lifecycle events to all features
     */
    setupLifecycleBindings() {
        if (!window.YPP.events) return;

        window.YPP.events.on('app:pageChange', (url) => {
            Object.entries(this.features).forEach(([name, feature]) => {
                if (this.errorCounts[name] >= this.MAX_ERRORS) return;
                if (feature.isEnabled && typeof feature.onPageChange === 'function') {
                    this.safeRun(name, () => feature.onPageChange(url));
                }
            });
        });

        window.YPP.events.on('app:videoChange', (videoId) => {
            Object.entries(this.features).forEach(([name, feature]) => {
                if (this.errorCounts[name] >= this.MAX_ERRORS) return;
                if (feature.isEnabled && typeof feature.onVideoChange === 'function') {
                    this.safeRun(name, () => feature.onVideoChange(videoId));
                }
            });
        });
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
        // Use centralized feature map
        const featureMap = window.YPP?.CONSTANTS?.FEATURE_MAP;

        if (!featureMap) {
             window.YPP.Utils.log('FEATURE_MAP not found in Constants. Features will not load.', 'MANAGER', 'error');
             return;
        }

        // Defensive: Ensure window.YPP.features exists
        if (!window.YPP?.features) {
            window.YPP.Utils.log('window.YPP.features namespace not found', 'MANAGER', 'error');
            return;
        }

        let successCount = 0;
        let failCount = 0;
        const totalFeatures = Object.keys(featureMap).length;
        
        // Clean up stale features that were removed from FEATURE_MAP
        const currentKeys = new Set(Object.keys(featureMap));
        for (const key of Object.keys(this.features)) {
            if (!currentKeys.has(key)) {
                try {
                    if (typeof this.features[key].disable === 'function') {
                        this.features[key].disable();
                    }
                } catch (e) {
                    // Ignore error on cleanup
                }
                delete this.features[key];
            }
        }

        const missing = [];

        for (const [key, className] of Object.entries(featureMap)) {
            try {
                // Skip if already instantiated
                if (this.features[key]) {
                    successCount++;
                    continue;
                }

                // Ensure the class exists in the global namespace
                if (typeof window.YPP.features[className] === 'function') {
                    this.features[key] = new window.YPP.features[className]();
                    this.errorCounts[key] = 0;
                    successCount++;
                } else {
                    failCount++;
                    missing.push(`${key} → ${className}`);
                }
            } catch (e) {
                failCount++;
                window.YPP.Utils.log(`Failed to instantiate '${className}': ${e?.message || 'Unknown error'}`, 'MANAGER', 'error');
            }
        }

        if (failCount > 0 && missing.length > 0) {
            window.YPP.Utils.log(`Missing features: ${missing.join(', ')}`, 'MANAGER', 'warn');
        }

        window.YPP.Utils.log(
            `Feature instantiation complete: ${successCount}/${totalFeatures} loaded` +
            (failCount > 0 ? `, ${failCount} failed/unavailable` : ''),
            'MANAGER',
            'info'
        );
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
     * Calls update() or run() on each feature instance asynchronously.
     * @returns {Promise<void>}
     */
    async applyFeatures() {
        this._applyQueue.push(++this._currentApplyId);
        if (this._processingQueue) return;

        this._processingQueue = true;
        try {
            while (this._applyQueue.length > 0) {
                const applyId = this._applyQueue.shift();
                await this._executeApply(applyId);
            }
        } finally {
            this._processingQueue = false;
        }
    }

    /**
     * Internal executor for feature application with priority sorting
     * @param {number} applyId 
     * @private
     */
    async _executeApply(applyId) {
        if (this._currentApplyId !== applyId) return; // Cancelled by newer run

        const PRIORITY_ORDER = [
            'theme', 'headerNav', 'sidebarLayout', 'layout', 'autoScaleLayout',
            'keyboardShortcuts', 'videoSpeedController',
            'playlistRedesign', 'gridAnimator', 'ambientMode'
        ];

        const sorted = Object.entries(this.features).sort((a, b) => {
            const idxA = PRIORITY_ORDER.indexOf(a[0]);
            const idxB = PRIORITY_ORDER.indexOf(b[0]);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        });

        // 1. Apply layout-critical UI features in strict order to avoid race conditions:
        //    - layout MUST run before autoScaleLayout because AutoScaleGrid.disable() clears
        //      --ypp-active-columns, and GridLayoutManager.onUpdate() must re-set it last.
        const SEQUENTIAL_UI = ['theme', 'headerNav', 'sidebarLayout', 'layout'];
        const AFTER_LAYOUT  = ['autoScaleLayout'];
        const uiFeatures    = sorted.filter(([name]) => SEQUENTIAL_UI.includes(name));
        const postLayout    = sorted.filter(([name]) => AFTER_LAYOUT.includes(name));

        await Promise.all(uiFeatures.map(([name, instance]) =>
            this._runFeatureUpdate(name, instance, applyId)
        ));

        // autoScaleLayout runs after layout so its side-effects don't clobber layout's CSS vars
        await Promise.all(postLayout.map(([name, instance]) =>
            this._runFeatureUpdate(name, instance, applyId)
        ));


        // 2. Apply the rest of the features in background or later frames
        const ALL_UI = new Set([...SEQUENTIAL_UI, ...AFTER_LAYOUT]);
        const heavyFeatures = sorted.filter(([name]) => !ALL_UI.has(name));


        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                if (this._currentApplyId !== applyId) return;
                heavyFeatures.forEach(([name, instance]) => {
                    this._runFeatureUpdate(name, instance, applyId);
                });
                
                // Notify system after heavy features
                if (window.YPP.events) {
                    window.YPP.events.emit('features:updated', this.settings);
                }
            }, { timeout: 2000 });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                if (this._currentApplyId !== applyId) return;
                heavyFeatures.forEach(([name, instance]) => {
                    this._runFeatureUpdate(name, instance, applyId);
                });
                
                if (window.YPP.events) {
                    window.YPP.events.emit('features:updated', this.settings);
                }
            }, 0);
        }
    }

    /**
     * Executes the update logic for a single feature instance
     * @private
     */
    async _runFeatureUpdate(name, instance, applyId) {
        if (this._currentApplyId !== applyId) return;
        if (this.errorCounts[name] >= this.MAX_ERRORS) return;

        return this.safeRun(name, async () => {
            if (typeof instance.enable === 'function' && typeof instance.disable === 'function') {
                if (typeof instance.update === 'function') {
                    await instance.update(this.settings);
                } else if (typeof instance.run === 'function') {
                    await instance.run(this.settings);
                }
            } else if (typeof instance.run === 'function') {
                await instance.run(this.settings);
            }
        });
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
        if (this.errorCounts[name] >= this.MAX_ERRORS) {
            return; // Abort early if feature is considered permanently broken
        }
        
        try {
            await fn();
        } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) {
                // Ignore silent context invalidation on extension reload
                return;
            }

            this.errorCounts[name] = (this.errorCounts[name] || 0) + 1;
            window.YPP.Utils.log(`Error in feature '${name}' (${this.errorCounts[name]}/${this.MAX_ERRORS}): ${e.message}`, 'MANAGER', 'error');
            
            const now = Date.now();
            if (now - (this._errorLogTimestamps[name] || 0) > this._errorLogRateLimit) {
                console.error(`[YPP:${name}]`, e.message); // Log message, avoid full stack trace flood
                this._errorLogTimestamps[name] = now;
            }

            if (this.errorCounts[name] >= this.MAX_ERRORS) {
                window.YPP.Utils.log(`Feature '${name}' disabled due to excessive errors. Attempting cleanup...`, 'MANAGER', 'warn');
                
                // Step 1: Attempt graceful unmount via the feature's own disable()
                // This gives features a chance to remove their listeners / timers cleanly.
                let disableSucceeded = false;
                try {
                    const instance = this.getFeature(name);
                    if (instance && typeof instance.disable === 'function') {
                        instance.disable();
                        disableSucceeded = true;
                    }
                } catch (cleanupError) {
                    window.YPP.Utils.log(`Failed to cleanly disable broken feature '${name}': ${cleanupError.message}`, 'MANAGER', 'debug');
                }

                // Step 2: DOM sweep fallback — guaranteed cleanup even when disable() throws.
                // Removes all elements injected by this feature that carry the
                // data-ypp-feature="<name>" attribute, preventing zombie DOM nodes.
                if (!disableSucceeded) {
                    this._domSweep(name);
                }

                if (window.YPP.events) {
                    window.YPP.events.emit('feature:disabled', { name, error: e.message });
                }
            }
        }
    }

    /**
     * DOM sweep fallback — removes all elements tagged with
     * data-ypp-feature="<featureName>" from the document.
     * Called when a feature's disable() method itself throws.
     * @param {string} name - Feature key used as the data-ypp-feature value
     * @private
     */
    _domSweep(name) {
        try {
            const safeName = CSS.escape(name);
            const tagged = document.querySelectorAll(`[data-ypp-feature="${safeName}"]`);
            if (tagged.length === 0) return;

            tagged.forEach(el => {
                try { el.remove(); } catch (_) { /* ignore individual removal errors */ }
            });

            window.YPP.Utils.log(
                `DOM sweep removed ${tagged.length} orphaned element(s) for broken feature '${name}'`,
                'MANAGER', 'warn'
            );
        } catch (sweepError) {
            // Last-resort: even the sweep failed — nothing more we can do.
            window.YPP.Utils.log(`DOM sweep failed for '${name}': ${sweepError.message}`, 'MANAGER', 'error');
        }
    }


    /**
     * Gracefully disable all active features instance
     */
    disableAll() {
        if (!this.features) return;
        Object.entries(this.features).forEach(([name, instance]) => {
            if (instance && typeof instance.disable === 'function') {
                try {
                    instance.disable();
                } catch (e) {
                    window.YPP.Utils?.log(`Error disabling feature '${name}': ${e.message}`, 'MANAGER', 'error');
                }
            }
        });

        // Only remove page-context classes — NOT theme/state classes added by features.
        // Removing all ypp- classes wipes theme variables and leaves the page black on re-init.
        const CONTEXT_CLASSES = [
            'ypp-watch-page', 'ypp-shorts-page', 'ypp-home-page', 'ypp-search-page',
            'ypp-channel-page', 'ypp-playlist-page', 'ypp-library-page',
            'ypp-history-page', 'ypp-subscriptions-page', 'ypp-feed-page',
        ];

        ['body', 'documentElement'].forEach(elName => {
            const el = document[elName];
            if (!el) return;

            // Only remove context classes, not all ypp- classes
            CONTEXT_CLASSES.forEach(c => el.classList.remove(c));

            // Remove inline CSS variables that are grid/layout runtime values (not theme tokens)
            const LAYOUT_VARS = [
                '--ypp-active-columns', '--ypp-dynamic-cols', '--ypp-auto-scale',
                '--ypp-home-columns', '--ypp-search-columns', '--ypp-grid-column-min',
            ];
            LAYOUT_VARS.forEach(v => el.style.removeProperty(v));

            // Remove data attributes added at runtime (not theme data-attrs)
            const attrs = Array.from(el.attributes);
            attrs.forEach(attr => {
                if (attr.name.startsWith('data-ypp-page') || attr.name === 'data-ypp-cols') {
                    el.removeAttribute(attr.name);
                }
            });
        });
    }
};
