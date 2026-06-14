class SearchPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/results/];
        
        this.state = {
            viewMode: 'default', // 'default', 'grid', 'list', 'cinematic'
            cleanSearch: 'default' // 'default', 'enabled'
        };
    }

    onActivate() {
        this.utils.log('Search Page Active', 'SEARCH_MANAGER', 'info');
        this._applyDOM();
    }

    onDeactivate() {
        this._cleanupDOM();
    }

    applySettings(settings) {
        let newMode = 'default';
        let newClean = 'default';

        if (settings.searchGridMode) newMode = 'grid';
        else if (settings.searchListMode) newMode = 'list';
        else if (settings.cinematicMode) newMode = 'cinematic'; // Watch page cinematic mode might leak or there might be a specific search cinematic

        if (settings.cleanSearch) newClean = 'enabled';

        this.setState({
            viewMode: newMode,
            cleanSearch: newClean
        });
    }

    setState(newState) {
        let changed = false;
        for (const [key, value] of Object.entries(newState)) {
            if (this.state[key] !== value) {
                this.state[key] = value;
                changed = true;
            }
        }
        
        if (changed && this.isActive) {
            this._applyDOM();
        }
    }

    _applyDOM() {
        const body = document.body;
        
        const classesToRemove = [
            'ypp-search-grid-mode', 'ypp-search-list-mode', 'ypp-clean-search-enabled', 'ypp-search-cinematic'
        ];
        body.classList.remove(...classesToRemove);

        if (this.state.viewMode === 'grid') body.classList.add('ypp-search-grid-mode');
        else if (this.state.viewMode === 'list') body.classList.add('ypp-search-list-mode');
        else if (this.state.viewMode === 'cinematic') body.classList.add('ypp-search-cinematic');

        if (this.state.cleanSearch === 'enabled') body.classList.add('ypp-clean-search-enabled');

        window.dispatchEvent(new CustomEvent('ypp-search-mode-changed', { 
            detail: this.state
        }));
    }

    _cleanupDOM() {
        const classesToRemove = [
            'ypp-search-grid-mode', 'ypp-search-list-mode', 'ypp-clean-search-enabled', 'ypp-search-cinematic'
        ];
        document.body.classList.remove(...classesToRemove);
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.SearchPageManager = SearchPageManager;
