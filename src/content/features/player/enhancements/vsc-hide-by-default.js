/**
 * Video Speed Controller: Hide By Default
 * Configures the controller UI to be hidden until the user manually changes the speed.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class VSCHideByDefault extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'vscHideByDefault'; }
    constructor() { super('VSCHideByDefault'); }
}
window.YPP.features.VSCHideByDefault = VSCHideByDefault;
