window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CustomScrollbar = class CustomScrollbar extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('CustomScrollbar', 'customScrollbar', window.YPP.CONSTANTS?.CSS_CLASSES?.CUSTOM_SCROLLBAR || 'ypp-custom-scrollbar');
    }

    async enable() {
        // Only enable if hideScrollbar is false
        if (this.settings?.hideScrollbar) {
            this.disable();
            return;
        }
        super.enable();
    }
};
