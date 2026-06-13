/**
 * Group Sidebar (enableSubsManager)
 * Displays the UI sidebar for subscription groups.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class GroupSidebar extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'enableSubsManager'; }
    constructor() { super('GroupSidebar'); }
}
window.YPP.features.GroupSidebar = GroupSidebar;
