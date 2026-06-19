class HomePageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        // Match root, or explicitly /?.*  (but not /watch, /results, etc)
        this.matchPatterns = [/^\/$/, /^\/\?.*/];
        
        // Initialize features managed by this page
        this.features = {
            homeOrganizer: new window.YPP.features.HomeOrganizer(),
            cinematicMode: new window.YPP.features.CinematicMode()
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
        this.settings = settings;
        if (!this.isActive) return;

        // Apply page-specific toggles directly
        if (settings.hideTrending) {
            document.body.classList.add('ypp-hide-trending');
        } else {
            document.body.classList.remove('ypp-hide-trending');
        }

        if (settings.hideExploreTopics) {
            document.body.classList.add('ypp-hide-explore-topics');
        } else {
            document.body.classList.remove('ypp-hide-explore-topics');
        }

        // Home Organizer (manages tagging unless hideFeed is active)
        if (this.features.homeOrganizer) {
            if (settings.hideFeed) {
                // If hideFeed is true, we hide everything, so organizer should be disabled
                this.features.homeOrganizer.disable();
                document.body.classList.add('ypp-hide-feed');
            } else {
                document.body.classList.remove('ypp-hide-feed');
                if (this.features.homeOrganizer.run) {
                    this.features.homeOrganizer.run(settings);
                } else if (this.features.homeOrganizer.enable) {
                    this.features.homeOrganizer.enable();
                }
            }
        }

        // Cinematic Mode
        if (this.features.cinematicMode) {
            if (settings.cinematicMode && !settings.hideFeed) {
                this.features.cinematicMode.enable();
            } else {
                this.features.cinematicMode.disable();
            }
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.HomePageManager = HomePageManager;
