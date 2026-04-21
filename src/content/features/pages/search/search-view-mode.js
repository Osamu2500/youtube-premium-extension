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

    async init() {
        try {
            const savedMode = await window.YPP?.Utils?.getSetting('searchViewMode');
            this._viewMode = savedMode || SearchViewMode.MODES.GRID;
        } catch (_) {
            this._logFn('Failed to load view preference', 'warn');
        }
    }

    run() {
        // Restore persisted view mode
        chrome.storage.local.get(['searchViewMode'], (result) => {
            const mode = result.searchViewMode
                      || localStorage.getItem('ypp_searchViewMode')
                      || 'grid';
            if (mode !== this._viewMode) {
                this._viewMode = mode;
                this.applyViewMode();
            }
        });
    }

    enable() {
        if (!this._boundMessageListener) {
            this._boundMessageListener = (msg) => {
                if (msg.type === 'YPP_SET_SEARCH_VIEW_MODE' && msg.mode) {
                    this._viewMode = msg.mode;
                    this.applyViewMode();
                    try { localStorage.setItem('ypp_searchViewMode', msg.mode); } catch (_) {}
                }
            };
            chrome.runtime.onMessage.addListener(this._boundMessageListener);
        }
        this.applyViewMode();
    }

    disable() {
        if (this._boundMessageListener) {
            chrome.runtime.onMessage.removeListener(this._boundMessageListener);
            this._boundMessageListener = null;
        }
        document.body.classList.remove(
            this._classes.GRID_MODE,
            this._classes.LIST_MODE
        );
    }

    applyViewMode() {
        const body = document.body;
        if (!this._classes.GRID_MODE || !this._classes.LIST_MODE) return;

        if (this._viewMode === SearchViewMode.MODES.GRID) {
            body.classList.add(this._classes.GRID_MODE);
            body.classList.remove(this._classes.LIST_MODE);
        } else {
            body.classList.add(this._classes.LIST_MODE);
            body.classList.remove(this._classes.GRID_MODE);
        }
    }

    async setViewMode(mode) {
        if (!Object.values(SearchViewMode.MODES).includes(mode)) return;

        this._viewMode = mode;
        this.applyViewMode();

        try {
            localStorage.setItem('ypp_searchViewMode', mode);
            chrome.storage.local.set({ searchViewMode: mode });
        } catch (_) {
            this._logFn('Failed to save view mode preference', 'warn');
        }
    }
};
