class BasePageManager {
    constructor(utils, settings) {
        this.utils = utils;
        this.settings = settings;
        this.isActive = false;
        this.currentUrl = '';
        this.matchPatterns = []; // e.g. [/^\/watch/]
    }

    /**
     * Checks if the given URL matches this page manager
     */
    matches(urlStr) {
        try {
            const url = new URL(urlStr, window.location.origin);
            return this.matchPatterns.some(pattern => pattern.test(url.pathname));
        } catch (e) {
            return false;
        }
    }

    /**
     * Called by the global router when the page is entered
     */
    activate(url) {
        if (this.isActive && this.currentUrl === url) return;
        this.isActive = true;
        this.currentUrl = url;
        this.utils.log(`Activated ${this.constructor.name}`, 'ROUTER', 'info');
        this.onActivate();
        this.applySettings(this.settings);
    }

    /**
     * Called by the global router when navigating away from this page
     */
    deactivate() {
        if (!this.isActive) return;
        this.isActive = false;
        this.utils.log(`Deactivated ${this.constructor.name}`, 'ROUTER', 'info');
        this.onDeactivate();
    }

    /**
     * Called when settings are updated globally
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        if (this.isActive) {
            this.applySettings(newSettings);
        }
    }

    // --- Lifecycle hooks for subclasses to implement ---
    onActivate() {}
    onDeactivate() {}
    applySettings(settings) {}
}

window.YPP = window.YPP || {};
window.YPP.BasePageManager = BasePageManager;
