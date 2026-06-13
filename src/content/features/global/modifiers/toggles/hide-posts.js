window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HidePosts = class HidePosts extends window.YPP.features.BaseFeature {
    constructor() { super('HidePosts'); }
    getConfigKey() { return 'hidePosts'; }

    async enable() {
        await super.enable();
        this.observer.register(
            'hide-posts',
            'ytd-rich-item-renderer, ytd-rich-section-renderer',
            (elements) => {
                if (!this.isEnabled) return;
                elements.forEach(el => {
                    if (el.querySelector('ytd-post-renderer, ytd-shared-post-renderer')) {
                        this._hideElement(el);
                    }
                });
            }
        );
        this.observer.start();
    }

    _hideElement(el) {
        if (el.hasAttribute('data-ypp-hide-posts')) return;
        el.setAttribute('data-ypp-hide-posts', 'true');
        el.style.setProperty('display', 'none', 'important');
    }

    async disable() {
        await super.disable();
        if (this.observer) this.observer.unregister('hide-posts');
        document.querySelectorAll('[data-ypp-hide-posts]').forEach(el => {
            el.removeAttribute('data-ypp-hide-posts');
            el.style.removeProperty('display');
        });
    }
};
