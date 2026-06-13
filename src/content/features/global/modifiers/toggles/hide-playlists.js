window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HidePlaylists = class HidePlaylists extends window.YPP.features.BaseFeature {
    constructor() { super('HidePlaylists'); }
    getConfigKey() { return 'hidePlaylists'; }

    async enable() {
        await super.enable();
        this.observer.register(
            'hide-playlists',
            'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-playlist-renderer',
            (elements) => {
                if (!this.isEnabled) return;
                elements.forEach(el => {
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'ytd-playlist-renderer') {
                        this._hideElement(el);
                        return;
                    }
                    if (el.querySelector("a[href*='list=PL'], ytd-playlist-thumbnail")) {
                        this._hideElement(el);
                    }
                });
            }
        );
        this.observer.start();
    }

    _hideElement(el) {
        if (el.hasAttribute('data-ypp-hide-playlists')) return;
        el.setAttribute('data-ypp-hide-playlists', 'true');
        el.style.setProperty('display', 'none', 'important');
    }

    async disable() {
        await super.disable();
        if (this.observer) this.observer.unregister('hide-playlists');
        document.querySelectorAll('[data-ypp-hide-playlists]').forEach(el => {
            el.removeAttribute('data-ypp-hide-playlists');
            el.style.removeProperty('display');
        });
    }
};
