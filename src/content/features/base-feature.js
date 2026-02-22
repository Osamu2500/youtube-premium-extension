window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Base Class for all YouTube Premium Plus Features
 * Enforces a standard lifecycle: init -> enable/disable -> update -> destroy
 */
window.YPP.features.BaseFeature = class BaseFeature {
    constructor(name) {
        this.name = name || this.constructor.name;
        this.isEnabled = false;
        this.settings = {};
        this.utils = window.YPP.Utils;
        
        // Each feature gets its own optimized observer
        if (this.utils && this.utils.DOMObserver) {
            this.observer = new this.utils.DOMObserver();
        } else {
            console.warn(`[YPP:${this.name}] Utils or DOMObserver not found`);
        }
        
        this.eventListeners = [];
    }

    /**
     * Called by FeatureManager with new settings
     * @param {Object} settings Current extension settings
     */
    async update(settings) {
        this.settings = settings;
        const configKey = this.getConfigKey();
        
        // Determine if feature should be enabled based on settings
        // If there's no specific config key, assume it's an always-on feature
        const shouldBeEnabled = configKey ? !!settings[configKey] : true;

        if (shouldBeEnabled && !this.isEnabled) {
            this.utils?.log(`Enabling feature: ${this.name}`, 'MAIN', 'debug');
            await this.enable();
            this.isEnabled = true;
        } else if (!shouldBeEnabled && this.isEnabled) {
            this.utils?.log(`Disabling feature: ${this.name}`, 'MAIN', 'debug');
            await this.disable();
            this.isEnabled = false;
        } else if (this.isEnabled && typeof this.onUpdate === 'function') {
            // Feature is already enabled, but settings changed
            await this.onUpdate();
        }
    }

    /**
     * Override this to return the settings key for this feature
     * e.g., return 'enableFocusMode'
     * Return null if the feature is always on.
     * @returns {string|null}
     */
    getConfigKey() {
        return null;
    }

    /**
     * Enable the feature. Override this method in child classes.
     */
    async enable() {
        if (this.observer) this.observer.start();
    }

    /**
     * Disable the feature. Override this method in child classes.
     */
    async disable() {
        if (this.observer) this.observer.stop();
        this.cleanupEvents();
    }

    /**
     * Safely add an event listener and track it for automatic cleanup
     */
    addListener(target, event, handler, options = false) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }

    /**
     * Remove all tracked event listeners
     */
    cleanupEvents() {
        this.eventListeners.forEach(({ target, event, handler, options }) => {
            try {
                if (target.removeEventListener) {
                    target.removeEventListener(event, handler, options);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });
        this.eventListeners = [];
    }

    /**
     * Legacy run support for older FeatureManager approach
     * @param {Object} settings 
     */
    async run(settings) {
        return this.update(settings);
    }
};
