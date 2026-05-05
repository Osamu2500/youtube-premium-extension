window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HidePlaylistsPodcasts = class HidePlaylistsPodcasts
    extends window.YPP.features.BaseFeature {

    constructor() {
        super('HidePlaylistsPodcasts');
        this._bound = this._apply.bind(this);
    }

    getConfigKey() { return 'hidePlaylists'; }

    async enable() {
        await super.enable();
        this._apply();
        window.YPP.events?.on('page:changed', this._bound);
        window.YPP.events?.on('dom:nodes-added', this._bound);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._bound);
        window.YPP.events?.off('dom:nodes-added', this._bound);
        document.body.classList.remove('ypp-hide-playlists');
        document.body.classList.remove('ypp-hide-podcasts');
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
    }
};
