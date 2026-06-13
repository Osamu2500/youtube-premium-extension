/**
 * Feature: Hide Trending
 * Description: Removes the Trending and Explore tabs from the sidebar and guide navigation.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideTrending = class HideTrending extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideTrending', 'hideTrending', 'ypp-hide-trending'); }
};
