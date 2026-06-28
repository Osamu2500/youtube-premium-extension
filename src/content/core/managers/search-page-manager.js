class SearchPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/results/];
        
        // Initialize features managed by this page
        this.features = {
            searchRedesign: window.YPP.features.SearchRedesign ? new window.YPP.features.SearchRedesign() : null,
            searchObserver: window.YPP.features.SearchObserver ? new window.YPP.features.SearchObserver() : null
        };

        if (this.features.searchRedesign) {
            this.features.searchRedesign.init(this.settings);
        }
    }

    onActivate() {
        this.utils.log('Search Page Active', 'SEARCH_MANAGER', 'info');
        // Features without specific toggles (like the redesign itself if it's always on or managed differently)
        if (this.features.searchRedesign?.enable) {
            this.features.searchRedesign.enable();
        }
        if (this.features.searchObserver?.enable) {
            this.features.searchObserver.enable();
        }
    }

    onDeactivate() {
        this.utils.log('Search Page Deactivated', 'SEARCH_MANAGER', 'info');
        Object.values(this.features).forEach(feature => {
            if (feature?.disable) feature.disable();
        });
    }

    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        if (this.features.searchRedesign) {
            this.features.searchRedesign.run(this.settings);
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.SearchPageManager = SearchPageManager;
