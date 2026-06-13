window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideMixes = class HideMixes extends window.YPP.features.BaseFeature {
    constructor() { super('HideMixes'); }
    getConfigKey() { return 'hideMixes'; }

    async enable() {
        await super.enable();
        this.observer.register(
            'hide-mixes',
            'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-radio-renderer',
            (elements) => {
                if (!this.isEnabled) return;
                elements.forEach(el => {
                    const tag = el.tagName.toLowerCase();
                    if (tag === 'ytd-compact-radio-renderer' || tag === 'ytd-radio-renderer') {
                        this._hideElement(el);
                        return;
                    }
                    if (el.querySelector("a[href*='start_radio'], a[href*='list=RD'], ytd-thumbnail-overlay-bottom-panel-renderer")) {
                        this._hideElement(el);
                    }
                });
            }
        );
        this.observer.start();
    }

    _hideElement(el) {
        if (el.hasAttribute('data-ypp-hide-mixes')) return;
        el.setAttribute('data-ypp-hide-mixes', 'true');
        el.style.setProperty('display', 'none', 'important');
    }

    async disable() {
        await super.disable();
        if (this.observer) this.observer.unregister('hide-mixes');
        document.querySelectorAll('[data-ypp-hide-mixes]').forEach(el => {
            el.removeAttribute('data-ypp-hide-mixes');
            el.style.removeProperty('display');
        });
    }
};
