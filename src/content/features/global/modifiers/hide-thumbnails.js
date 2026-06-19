window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideThumbnails = class HideThumbnails extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideThumbnails');
    }

    getConfigKey() { 
        return 'hideThumbnails'; 
    }

    async enable() {
        document.body.classList.add('ypp-hide-thumbnails');
    }

    async disable() {
        document.body.classList.remove('ypp-hide-thumbnails');
    }
};
