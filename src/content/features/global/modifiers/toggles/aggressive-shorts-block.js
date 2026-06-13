window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.AggressiveShortsBlock = class AggressiveShortsBlock extends window.YPP.features.BaseFeature {
    constructor() { super('AggressiveShortsBlock'); }
    getConfigKey() { return 'aggressiveShortsBlock'; }

    async enable() {
        await super.enable();
        // Keep the CSS toggle for the non-:has() selectors since they are fast
        document.body.classList.add('ypp-hide-shorts');
        
        // Use observer for the complex :has() feed items
        this.observer.register(
            'hide-shorts',
            'ytd-rich-section-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer',
            (elements) => {
                if (!this.isEnabled) return;
                elements.forEach(el => {
                    if (el.hasAttribute('is-shorts')) {
                        this._hideElement(el);
                        return;
                    }
                    if (el.querySelector('ytd-reel-item-renderer, ytd-rich-shelf-renderer[is-shorts], a[href^="/shorts/"]')) {
                        this._hideElement(el);
                    }
                });
            }
        );
        this.observer.start();
    }

    _hideElement(el) {
        if (el.hasAttribute('data-ypp-hide-shorts')) return;
        el.setAttribute('data-ypp-hide-shorts', 'true');
        el.style.setProperty('display', 'none', 'important');
    }

    async disable() {
        await super.disable();
        document.body.classList.remove('ypp-hide-shorts');
        if (this.observer) this.observer.unregister('hide-shorts');
        document.querySelectorAll('[data-ypp-hide-shorts]').forEach(el => {
            el.removeAttribute('data-ypp-hide-shorts');
            el.style.removeProperty('display');
        });
    }
};
