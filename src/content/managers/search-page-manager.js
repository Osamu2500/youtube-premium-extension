class SearchPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/results/];
        
        // Initialize features managed by this page
        this.features = {
            searchRedesign: window.YPP.features.SearchRedesign ? new window.YPP.features.SearchRedesign() : null,
            searchObserver: window.YPP.features.SearchObserver ? new window.YPP.features.SearchObserver() : null,
            // Ensure search toggles are managed here
            cleanSearch: window.YPP.features.CleanSearch ? new window.YPP.features.CleanSearch() : null,
            hideSearchShelves: window.YPP.features.HideSearchShelves ? new window.YPP.features.HideSearchShelves() : null
        };
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
        this.settings = settings;
        if (!this.isActive) return;

        if (this.features.cleanSearch) {
            // Assume the feature has some toggle name like "cleanSearch" or it just runs when enabled
            if (settings.cleanSearch !== false) {
                this.features.cleanSearch.enable();
            } else {
                this.features.cleanSearch.disable();
            }
        }

        if (this.features.hideSearchShelves) {
            // Assume the feature has some toggle name like "hideSearchShelves"
            if (settings.hideSearchShelves !== false) {
                this.features.hideSearchShelves.enable();
            } else {
                this.features.hideSearchShelves.disable();
            }
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.SearchPageManager = SearchPageManager;
