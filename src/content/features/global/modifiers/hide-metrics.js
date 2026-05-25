window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideMetrics = class HideMetrics
    extends window.YPP.features.BaseFeature {

    constructor() {
        super('HideMetrics');
        this._bound = this._apply.bind(this);
    }

    getConfigKey() { return 'hideMetrics'; }

    async enable() {
        await super.enable();
        this._apply();
        window.YPP.events?.on('page:changed', this._bound);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._bound);
        document.body.classList.remove('ypp-hide-metrics');
    }

    _apply() {
        document.body.classList.add('ypp-hide-metrics');
    }
};
