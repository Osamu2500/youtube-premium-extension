window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Dummy config sync feature for the Watch Time Limit slider.
 * The actual limit enforcement is handled by WatchTimeAlert.
 */
window.YPP.features.WatchTimeLimit = class WatchTimeLimit extends window.YPP.features.BaseFeature {
    constructor() {
        super('WatchTimeLimit');
    }

    getConfigKey() {
        return 'watchTimeAlertHours';
    }

    async enable() {
        await super.enable();
        // Configuration sync handled natively by BaseFeature
    }

    async disable() {
        await super.disable();
    }
};
