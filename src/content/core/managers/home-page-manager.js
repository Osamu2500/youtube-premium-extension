class HomePageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        // Match root, or explicitly /?.*  (but not /watch, /results, etc)
        this.matchPatterns = [/^\/$/, /^\/\?.*/];
        
        // Initialize features managed by this page
        this.features = {
            homeOrganizer: new window.YPP.features.HomeOrganizer()
        };
    }

    onActivate() {
        this.utils.log('Home Page Active', 'HOME_MANAGER', 'info');
        // Initial application of settings is handled by activate() calling applySettings()
    }

    onDeactivate() {
        this.utils.log('Home Page Deactivated', 'HOME_MANAGER', 'info');
        // Disable all features managed by this page
        Object.values(this.features).forEach(feature => {
            if (feature.disable) feature.disable();
        });
    }

    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        if (!this.isActive) return;

        // Home Organizer (manages tagging unless hideFeed is active)
        if (this.features.homeOrganizer) {
            if (this.settings.hideFeed) {
                // If hideFeed is true, we hide everything, so organizer should be disabled
                this.features.homeOrganizer.disable();
            } else {
                if (this.features.homeOrganizer.run) {
                    this.features.homeOrganizer.run(this.settings);
                } else if (this.features.homeOrganizer.enable) {
                    this.features.homeOrganizer.enable();
                }
            }
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.HomePageManager = HomePageManager;
