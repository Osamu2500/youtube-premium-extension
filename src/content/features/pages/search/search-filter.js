window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchFilter = class SearchFilter extends window.YPP.features.BaseFeature {
    constructor() {
        super('SearchFilter');
        this._boundHandlePageChange = this._handlePageChange.bind(this);
    }
    
    getConfigKey() { 
        return 'autoVideoFilter'; 
    }

    async enable() {
        await super.enable();
        window.YPP.events?.on('app:pageChange', this._boundHandlePageChange);
        this._handlePageChange();
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('app:pageChange', this._boundHandlePageChange);
    }

    _handlePageChange() {
        if (!this.isEnabled) return;
        
        if (!window.location.pathname.startsWith('/results')) return;

        const urlParams = new URLSearchParams(window.location.search);
        
        // If we don't have a search_query, this isn't a real search page.
        if (!urlParams.has('search_query')) return;

        // The 'sp' param represents filters.
        // 'EgIQAQ==' is the decoded value for "Videos"
        if (!urlParams.has('sp')) {
            // Disabled: Forcing 'sp=EgIQAQ==' destroys music results and mixes, and causes infinite loops / double refreshes.
            // urlParams.set('sp', 'EgIQAQ==');
            // const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
            // window.location.replace(newUrl);
        }
    }
};
