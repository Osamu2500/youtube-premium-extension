window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CustomCSS = class CustomCSS extends window.YPP.features.BaseFeature {
    constructor() {
        super();
        this.styleElement = null;
    }

    getConfigKey() {
        return 'enableCustomCSS';
    }

    enable() {
        if (!this.styleElement) {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'ypp-custom-css';
            document.documentElement.appendChild(this.styleElement);
        }
        
        // Immediately apply existing CSS from settings
        this._updateCSS();

        // Listen for changes specifically to the customCSSCode setting
        window.YPP.EventBus.on('settings:changed:customCSSCode', this._onCSSChanged);
    }

    disable() {
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }
        window.YPP.EventBus.off('settings:changed:customCSSCode', this._onCSSChanged);
    }

    _onCSSChanged = (newCode) => {
        // Only update if we're enabled
        if (this.isEnabled && this.styleElement) {
            this.styleElement.textContent = newCode || '';
        }
    }

    _updateCSS() {
        if (this.styleElement && this._settings) {
            this.styleElement.textContent = this._settings.customCSSCode || '';
        }
    }
}
