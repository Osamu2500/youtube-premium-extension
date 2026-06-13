window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideShortsInteraction = class HideShortsInteraction extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideShortsInteraction');
        this._styleId = 'ypp-hide-shorts-interaction-style';
    }

    getConfigKey() { return 'hideShortsInteraction'; }

    async enable() {
        await super.enable();
        this.applySettings();
    }

    async disable() {
        await super.disable();
        this._cleanup();
    }

    onUpdate() {
        this.applySettings();
    }

    applySettings() {
        if (this.settings.hideShortsInteraction) {
            this._injectStyles();
        } else {
            this._cleanup();
        }
    }

    _injectStyles() {
        let styleEl = document.getElementById(this._styleId);
        
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = this._styleId;
            document.head.appendChild(styleEl);
        }

        styleEl.textContent = `
            ytd-reel-video-renderer #actions {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
        `;
    }

    _cleanup() {
        const styleEl = document.getElementById(this._styleId);
        if (styleEl) styleEl.remove();
    }
};
