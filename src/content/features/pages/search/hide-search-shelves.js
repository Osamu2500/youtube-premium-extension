/**
 * Hide Search Shelves Feature
 * Removes "For You", "People Also Watched", and other noise shelves from search results.
 * Relies on SearchObserver to tag noise sections with .ypp-noise-section.
 */
class HideSearchShelves extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'hideSearchShelves'; }
    
    constructor() {
        super('HideSearchShelves');
    }

    async enable() {
        document.body.classList.add('ypp-hide-search-shelves');
    }

    async disable() {
        document.body.classList.remove('ypp-hide-search-shelves');
    }
}

window.YPP.features.HideSearchShelves = HideSearchShelves;
