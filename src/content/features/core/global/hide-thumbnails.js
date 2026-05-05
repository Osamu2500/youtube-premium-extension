window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideThumbnails = class HideThumbnails extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideThumbnails');
        this._boundUpdate = this._update.bind(this);
    }
    getConfigKey() { return 'hideThumbnails'; }
    async enable() {
        await super.enable();
        this._update();
        window.YPP.events?.on('page:changed', this._boundUpdate);
    }
    async disable() {
        await super.disable();
        document.body.classList.remove('ypp-hide-thumbnails');
        window.YPP.events?.off('page:changed', this._boundUpdate);
    }
    _update() {
        if (this.settings?.hideThumbnails) {
            document.body.classList.add('ypp-hide-thumbnails');
        } else {
            document.body.classList.remove('ypp-hide-thumbnails');
        }
    }
};
