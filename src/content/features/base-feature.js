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
        
        // Next-Gen Architecture
        this.events = window.YPP.events;
        this.domApi = window.YPP.DomAPI;
        this.observer = window.YPP.sharedObserver;
        
        this.eventListeners = [];
        this.busListeners = [];
    }

    /**
     * Called by FeatureManager with new settings
     * @param {Object} settings Current extension settings
     */
    async update(settings) {
        this.settings = settings;

        // Fallback for features that extend BaseFeature but implement run() instead of update()/enable()
        if (typeof this.run === 'function' && this.run !== window.YPP.features.BaseFeature.prototype.run) {
            return this.run(settings);
        }

        const configKey = this.getConfigKey();
        
        let shouldBeEnabled = true;
        if (configKey && settings.hasOwnProperty(configKey)) {
            shouldBeEnabled = !!settings[configKey];
        }

        if (shouldBeEnabled && !this.isEnabled) {
            this.utils?.log(`Enabling feature: ${this.name}`, 'MAIN', 'debug');
            this.abortController = new AbortController();
            await this.enable();
            this.isEnabled = true;
        } else if (!shouldBeEnabled && this.isEnabled) {
            this.utils?.log(`Disabling feature: ${this.name}`, 'MAIN', 'debug');
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            await this.disable();
            this.isEnabled = false;
        } else if (this.isEnabled && typeof this.onUpdate === 'function') {
            await this.onUpdate();
        }
    }

    /**
     * Override this to return the settings key for this feature.
     * By default, it camelCases the class name.
     * Return null explicitly if the feature is always on.
     * @returns {string|null}
     */
    getConfigKey() {
        if (!this.name) return null;
        return this.name.charAt(0).toLowerCase() + this.name.slice(1);
    }

    /**
     * Enable the feature. Override this method in child classes.
     */
    async enable() {
        // Base implementation does nothing
    }

    /**
     * Disable the feature. Override this method in child classes.
     */
    async disable() {
        this.cleanupEvents();
    }

    /**
     * Wait for element, bound to feature's lifecycle (aborts if feature disabled)
     */
    waitForElement(selector, timeout) {
        return this.utils.waitForElement(selector, timeout, this.abortController?.signal);
    }

    /**
     * Poll for condition, bound to feature's lifecycle (aborts if feature disabled)
     */
    pollFor(conditionFn, timeout, intervalMs) {
        return this.utils.pollFor(conditionFn, timeout, intervalMs, this.abortController?.signal);
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
        // Standard DOM event listeners
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
        
        // EventBus listeners
        this.busListeners.forEach(unsub => {
            try { unsub(); } catch (e) {}
        });
        this.busListeners = [];
    }

    /**
     * Safely subscribe to the EventBus and track it for cleanup
     */
    onBusEvent(event, handler) {
        if (!this.events) return;
        const unsub = this.events.on(event, handler.bind(this));
        this.busListeners.push(unsub);
    }

    /**
     * Lifecycle Hook: Called when standard YouTube SPA navigation completes
     */
    onPageChange(url) {
        // Override in child class
    }

    /**
     * Lifecycle Hook: Called when the YouTube player loads a new video
     */
    onVideoChange(videoId) {
        // Override in child class
    }

    /**
     * Legacy run support for older FeatureManager approach
     * @param {Object} settings 
     */
    async run(settings) {
        return this.update(settings);
    }
};
