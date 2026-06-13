window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HidePodcasts = class HidePodcasts extends window.YPP.features.BaseFeature {
    constructor() { super('HidePodcasts'); }
    getConfigKey() { return 'hidePodcasts'; }

    async enable() {
        await super.enable();
        this.observer.register(
            'hide-podcasts',
            'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer',
            (elements) => {
                if (!this.isEnabled) return;
                elements.forEach(el => {
                    if (el.querySelector("a[href*='/podcast/']")) {
                        this._hideElement(el);
                    }
                });
            }
        );
        this.observer.start();
    }

    _hideElement(el) {
        if (el.hasAttribute('data-ypp-hide-podcasts')) return;
        el.setAttribute('data-ypp-hide-podcasts', 'true');
        el.style.setProperty('display', 'none', 'important');
    }

    async disable() {
        await super.disable();
        if (this.observer) this.observer.unregister('hide-podcasts');
        document.querySelectorAll('[data-ypp-hide-podcasts]').forEach(el => {
            el.removeAttribute('data-ypp-hide-podcasts');
            el.style.removeProperty('display');
        });
    }
};
