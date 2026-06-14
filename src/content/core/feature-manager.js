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
                    // Silently track missing features (they might not be loaded yet)
                }
            } catch (e) {
                failCount++;
                window.YPP.Utils.log(`Failed to instantiate '${className}': ${e?.message || 'Unknown error'}`, 'MANAGER', 'error');
            }
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
        const applyId = ++this._currentApplyId;
        const entries = Object.entries(this.features);
        
        // Phase 5: Chunk processing to avoid blocking main thread on boot
        // Processes 4 features per event loop tick to maintain 60fps responsiveness
        const CHUNK_SIZE = 4;
        
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            if (this._currentApplyId !== applyId) return; // Cancelled by newer run

            const chunk = entries.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map(([name, instance]) => {
                if (this.errorCounts[name] >= this.MAX_ERRORS) {
                    return Promise.resolve();
                }

                return this.safeRun(name, async () => {
                    // Standard: check for enable/disable methods and update logic
                    if (typeof instance.enable === 'function' && typeof instance.disable === 'function') {
                        // Method 1: Feature has strict 'update' method (Preferred)
                        if (typeof instance.update === 'function') {
                            await instance.update(this.settings);
                        }
                        // Method 2: Fallback to 'run' method for simple features
                        else if (typeof instance.run === 'function') {
                            await instance.run(this.settings);
                        }
                    }
                    // Legacy support for older features
                    else if (typeof instance.run === 'function') {
                        await instance.run(this.settings);
                    }
                });
            });

            // Await this chunk concurrently
            await Promise.allSettled(chunkPromises);

            // Yield to browser paint cycle if there are more chunks
            if (i + CHUNK_SIZE < entries.length) {
                await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            }
        }

        // Notify system that all features have been applied/updated
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
            
            // Preserve stack trace in console for debugging
            console.error(`[YPP:${name}]`, e);

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

        // Global Sanitize: Remove orphaned injected classes, variables, and attributes
        ['body', 'documentElement'].forEach(elName => {
            const el = document[elName];
            if (!el) return;
            
            // Remove classes
            const yppClasses = Array.from(el.classList).filter(c => c.startsWith('ypp-') || c === 'yt-premium-plus-theme');
            yppClasses.forEach(c => el.classList.remove(c));
            
            // Remove inline variables
            for (let i = el.style.length - 1; i >= 0; i--) {
                const prop = el.style[i];
                if (prop && prop.startsWith('--ypp-')) {
                    el.style.removeProperty(prop);
                }
            }
            
            // Remove data attributes
            const attrs = Array.from(el.attributes);
            attrs.forEach(attr => {
                if (attr.name.startsWith('data-ypp-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });
    }
};
