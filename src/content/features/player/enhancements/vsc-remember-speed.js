/**
 * Video Speed Controller: Remember Speed
 * Saves the last used playback speed and restores it automatically for new videos.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class VSCRememberSpeed extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'vscRememberSpeed'; }
    constructor() { super('VSCRememberSpeed'); }
}
window.YPP.features.VSCRememberSpeed = VSCRememberSpeed;
