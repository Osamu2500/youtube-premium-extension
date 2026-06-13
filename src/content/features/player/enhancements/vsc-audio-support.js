/**
 * Video Speed Controller: Audio Support
 * Allows the custom speed controller to attach to HTML5 <audio> elements.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class VSCAudioSupport extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'vscAudioSupport'; }
    constructor() { super('VSCAudioSupport'); }
}
window.YPP.features.VSCAudioSupport = VSCAudioSupport;
