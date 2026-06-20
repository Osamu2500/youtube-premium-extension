/**
 * Search View Mode
 * Owns the state and logic for toggling between "Grid" and "List"
 * layout views on the search results page.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchViewMode = class SearchViewMode {

    static MODES = {
        GRID: 'grid',
        LIST: 'list',
    };

    constructor() {
        this._viewMode = SearchViewMode.MODES.GRID;
        this._boundMessageListener = null;
        this._classes = {};
        this._logFn = null;
    }

    /**
     * @param {Object} classes - SearchRedesign.CLASSES reference
     * @param {Function} logFn - Optional logging function
     */
    sync(classes, logFn) {
        this._classes = classes || {};
        this._logFn = logFn || ((msg, level) => console[level]?.(`[SearchViewMode] ${msg}`));
    }

    async init() {}
    run() {}
    enable() { this.applyViewMode(); }
    
    disable() {
        document.body.classList.remove(this._classes.GRID_MODE, this._classes.LIST_MODE);
    }

    applyViewMode() {
        const body = document.body;
        if (!this._classes.GRID_MODE) return;

        const isSearch = window.location.pathname === '/results';

        if (!isSearch) {
            body.classList.remove(this._classes.GRID_MODE, this._classes.LIST_MODE);
            return;
        }

        body.classList.add(this._classes.GRID_MODE);
        body.classList.remove(this._classes.LIST_MODE);
    }
};
