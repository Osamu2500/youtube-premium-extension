window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Base Class for all YouTube Premium Plus Features
 * Enforces a standard lifecycle: init -> enable/disable -> update -> destroy
 */
window.YPP.features.BaseFeature = class BaseFeature {
    static CONFIG = {
        LOG_CATEGORY: 'MAIN',
        LOG_LEVEL: 'debug'
    };

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
        this.settings = { ...this.settings, ...settings };

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
            this.utils?.log(`Enabling feature: ${this.name}`, BaseFeature.CONFIG.LOG_CATEGORY, BaseFeature.CONFIG.LOG_LEVEL);
            this._abortController = new AbortController();
            await this.enable();
            this.isEnabled = true;
        } else if (!shouldBeEnabled && this.isEnabled) {
            this.utils?.log(`Disabling feature: ${this.name}`, BaseFeature.CONFIG.LOG_CATEGORY, BaseFeature.CONFIG.LOG_LEVEL);
            if (this._abortController) {
                this._abortController.abort();
                this._abortController = null;
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
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<Element>}
     */
    waitForElement(selector, timeout) {
        return this.utils.waitForElement(selector, timeout, this._abortController?.signal);
    }

    /**
     * Poll for condition, bound to feature's lifecycle (aborts if feature disabled)
     * @param {Function} conditionFn - Function returning truthy value
     * @param {number} timeout - Timeout in ms
     * @param {number} intervalMs - Polling interval in ms
     * @returns {Promise<any>}
     */
    pollFor(conditionFn, timeout, intervalMs) {
        return this.utils.pollFor(conditionFn, timeout, intervalMs, this._abortController?.signal);
    }

    /**
     * Safely add an event listener and track it for automatic cleanup
     * @param {EventTarget} target - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {boolean|Object} options - Event listener options
     */
    addListener(target, event, handler, options = false) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(event, handler, options);
        this.eventListeners.push({ target, event, handler, options });
    }

    /**
     * Safely remove an event listener and untrack it
     * @param {EventTarget} target - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {boolean|Object} options - Event listener options
     */
    removeListener(target, event, handler, options = false) {
        if (!target || !target.removeEventListener) return;
        target.removeEventListener(event, handler, options);
        this.eventListeners = this.eventListeners.filter(
            l => !(l.target === target && l.event === event && l.handler === handler)
        );
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
                this.utils?.log(`Cleanup error: ${e.message}`, BaseFeature.CONFIG.LOG_CATEGORY, 'error');
            }
        });
        this.eventListeners = [];
        
        // EventBus listeners
        this.busListeners.forEach(unsub => {
            try { unsub(); } catch (e) {
                this.utils?.log(`Bus cleanup error: ${e.message}`, BaseFeature.CONFIG.LOG_CATEGORY, 'error');
            }
        });
        this.busListeners = [];
    }

    /**
     * Safely subscribe to the EventBus and track it for cleanup
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
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
