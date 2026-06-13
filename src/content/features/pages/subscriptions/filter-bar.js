/**
 * Filter Bar
 * Displays the duration/date filters on the Subscriptions page.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class FilterBar extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'enableFilterBar'; }
    constructor() { super('FilterBar'); }
}
window.YPP.features.FilterBar = FilterBar;
