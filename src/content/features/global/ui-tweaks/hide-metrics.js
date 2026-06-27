window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideMetrics = class HideMetrics extends window.YPP.features.BaseFilterFeature {

    constructor() {
        super('HideMetrics');
        this._bound = this._apply.bind(this);
    }

    getConfigKey() { return 'hideMetrics'; }

    async enable() {
        await super.enable();
        this._injectStyles();
        this._apply();
        window.YPP.events?.on('page:changed', this._bound);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._bound);
        document.body.classList.remove('ypp-hide-metrics');
    }

    _apply() {
        if (!this.isEnabled) return;
        
        const path = window.location.pathname;
        const isWatchPage = path === '/watch' || path.startsWith('/shorts/');
        const isChannelPage = path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/');
        
        // HideMetrics does not use standard _shouldRunOnCurrentPage because it might be active globally EXCEPT watch/channel
        if (isWatchPage || isChannelPage) {
            document.body.classList.remove('ypp-hide-metrics');
            return;
        }
        
        document.body.classList.add('ypp-hide-metrics');
    }

    _injectStyles() {
        if (document.getElementById('ypp-hide-metrics-css')) return;
        const style = document.createElement('style');
        style.id = 'ypp-hide-metrics-css';
        style.textContent = `
            body.ypp-hide-metrics ytd-video-meta-block #metadata-line span,
            body.ypp-hide-metrics ytd-video-meta-block #metadata-line .ytd-video-meta-block {
                display: none !important;
            }
            body.ypp-hide-metrics ytd-video-meta-block #metadata-line span:first-child {
                display: inline !important; /* Keep upload date, hide views */
            }
        `;
        document.head.appendChild(style);
    }
};
