window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HidePlaylistsPodcasts = class HidePlaylistsPodcasts extends window.YPP.features.BaseFeature {
    constructor() {
        super('HidePlaylistsPodcasts');
        this._boundApply = this._apply.bind(this);
    }

    // Return null so this feature runs globally and listens to settings changes manually
    getConfigKey() { return null; }

    async enable() {
        await super.enable();
        this._apply();
        window.YPP.events?.on('page:changed', this._boundApply);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._boundApply);
        document.body.classList.remove('ypp-hide-playlists', 'ypp-hide-podcasts', 'ypp-hide-mixes', 'ypp-hide-posts');
        
        // Remove legacy stamps just in case they exist from an older session
        document.querySelectorAll('[data-ypp-is-playlist], [data-ypp-is-podcast], [data-ypp-is-mix], [data-ypp-pp-scanned]').forEach(el => {
            el.removeAttribute('data-ypp-is-playlist');
            el.removeAttribute('data-ypp-is-podcast');
            el.removeAttribute('data-ypp-is-mix');
            el.removeAttribute('data-ypp-pp-scanned');
        });
    }

    onUpdate() {
        this._apply();
    }

    _apply() {
        const settings = this.settings || {};
        
        if (settings.hidePlaylists) {
            document.body.classList.add('ypp-hide-playlists');
        } else {
            document.body.classList.remove('ypp-hide-playlists');
        }

        if (settings.hidePodcasts) {
            document.body.classList.add('ypp-hide-podcasts');
        } else {
            document.body.classList.remove('ypp-hide-podcasts');
        }
        
        if (settings.hideMixes) {
            document.body.classList.add('ypp-hide-mixes');
        } else {
            document.body.classList.remove('ypp-hide-mixes');
        }

        if (settings.hidePosts) {
            document.body.classList.add('ypp-hide-posts');
        } else {
            document.body.classList.remove('ypp-hide-posts');
        }
    }
};
