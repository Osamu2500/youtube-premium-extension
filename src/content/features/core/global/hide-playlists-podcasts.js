window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HidePlaylistsPodcasts = class HidePlaylistsPodcasts extends window.YPP.features.BaseFeature {
    constructor() {
        super('HidePlaylistsPodcasts');
        this._boundApply = this._apply.bind(this);
        this._boundProcess = this._processItems.bind(this);
        this._debounceTimer = null;
    }

    // Return null so this feature runs globally and listens to settings changes manually
    getConfigKey() { return null; }

    async enable() {
        await super.enable();
        this._apply();
        window.YPP.events?.on('page:changed', this._boundApply);
        window.YPP.events?.on('dom:nodes-added', this._boundProcess);
        this._processItems();
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._boundApply);
        window.YPP.events?.off('dom:nodes-added', this._boundProcess);
        document.body.classList.remove('ypp-hide-playlists', 'ypp-hide-podcasts', 'ypp-hide-mixes');
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        
        // Remove stamps
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

        this._processItems();
    }

    _processItems() {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            if (!this.isEnabled) return;
            this._scanElements();
        }, 200);
    }

    _scanElements() {
        const selectors = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-playlist-renderer',
            'ytd-grid-video-renderer'
        ].join(', ');

        const items = document.querySelectorAll(selectors);
        
        items.forEach(el => {
            if (!el || el.hasAttribute('data-ypp-pp-scanned')) return;
            
            const html = el.innerHTML || '';
            const isPlaylist = el.tagName.toLowerCase() === 'ytd-playlist-renderer' || !!el.querySelector('ytd-playlist-thumbnail') || html.includes('list=PL');
            const isPodcast = el.hasAttribute('podcast') || html.includes('/podcast/');
            
            // Mixes typically use start_radio=1 or list=RD or have an aria label saying Mix
            const isMix = html.includes('start_radio=1') || html.includes('list=RD') || html.includes('aria-label="Mix');

            if (isMix) el.setAttribute('data-ypp-is-mix', 'true');
            if (isPlaylist && !isMix) el.setAttribute('data-ypp-is-playlist', 'true');
            if (isPodcast) el.setAttribute('data-ypp-is-podcast', 'true');

            if (isMix || isPlaylist || isPodcast) {
                el.setAttribute('data-ypp-pp-scanned', 'true');
            } else {
                // To avoid rescanning elements that are just normal videos, stamp them too
                el.setAttribute('data-ypp-pp-scanned', 'false');
            }
        });
    }
};
