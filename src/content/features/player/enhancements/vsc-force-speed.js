/**
 * Video Speed Controller: Force Speed
 * Prevents YouTube's SPA logic from fighting back and resetting custom playback rates.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class VSCForceSpeed extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'vscForceSpeed'; }
    constructor() { super('VSCForceSpeed'); }
}
window.YPP.features.VSCForceSpeed = VSCForceSpeed;
