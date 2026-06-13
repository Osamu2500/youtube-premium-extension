window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.BaseToggleFeature = class BaseToggleFeature extends window.YPP.features.BaseFeature {
    /**
     * @param {string} featureName - Internal name (e.g. 'HideComments')
     * @param {string} configKey - Setting key (e.g. 'hideComments')
     * @param {string} cssClass - CSS class to toggle on body (e.g. 'ypp-hide-comments')
     */
    constructor(featureName, configKey, cssClass) {
        super(featureName);
        this._configKey = configKey;
        this._cssClass = cssClass;
    }

    getConfigKey() {
        return this._configKey;
    }

    async enable() {
        await super.enable();
        document.body.classList.add(this._cssClass);
    }

    async disable() {
        await super.disable();
        document.body.classList.remove(this._cssClass);
    }
};
