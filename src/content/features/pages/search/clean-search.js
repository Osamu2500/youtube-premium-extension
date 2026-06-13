/**
 * Clean Search Feature
 * Toggles a CSS class to hide ads, promotional banners, and other junk from the search feed.
 */
class CleanSearch extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'cleanSearch'; }
    
    constructor() {
        super('CleanSearch');
    }

    async enable() {
        document.body.classList.add('ypp-clean-search');
    }

    async disable() {
        document.body.classList.remove('ypp-clean-search');
    }
}

window.YPP.features.CleanSearch = CleanSearch;
