/**
 * Channel Health
 * Displays the health scanner on the Subscriptions page.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class ChannelHealth extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'enableChannelHealth'; }
    constructor() { super('ChannelHealth'); }
}
window.YPP.features.ChannelHealth = ChannelHealth;
