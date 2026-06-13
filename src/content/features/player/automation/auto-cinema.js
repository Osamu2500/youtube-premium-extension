/**
 * Auto Cinema — YouTube Premium Plus
 * Automatically clicks the theater button whenever a watch page loads
 * to ensure the video expands.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoCinema = class AutoCinema extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'autoCinema'; }

    constructor() {
        super('AutoCinema');
        this._navHandler = this._onNavigation.bind(this);
        this._resizeHandler = this._onResize.bind(this);
        this._resizeTimeout = null;
    }

    enable() {
        // Run immediately if we're on a watch page
        if (location.pathname === '/watch') {
            this._clickTheaterButton();
        }
        // And on every subsequent navigation
        this.addListener(window, 'yt-navigate-finish', this._navHandler);
        // And window resizes (YouTube sometimes breaks theater on resize)
        this.addListener(window, 'resize', this._resizeHandler);
        
        this.utils?.log?.('Auto Cinema enabled', 'AUTO_CINEMA');
    }

    disable() {
        window.removeEventListener('yt-navigate-finish', this._navHandler);
        window.removeEventListener('resize', this._resizeHandler);
        if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
        this.utils?.log?.('Auto Cinema disabled', 'AUTO_CINEMA');
    }

    _onNavigation() {
        if (location.pathname === '/watch') {
            this._clickTheaterButton();
        }
    }

    _onResize() {
        if (location.pathname !== '/watch') return;
        
        // Debounce resize
        if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
        this._resizeTimeout = setTimeout(() => {
            this._clickTheaterButton();
        }, 500);
    }

    async _clickTheaterButton() {
        try {
            const btn = await this.utils?.pollFor?.(
                () => document.querySelector('.ytp-size-button'),
                6000, 400
            );
            if (!btn) return;
            const isTheater = !!document.querySelector('ytd-watch-flexy[theater]');
            if (!isTheater) btn.click();
        } catch (_) { /* silent fail */ }
    }
};
