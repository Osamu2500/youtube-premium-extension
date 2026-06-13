/**
 * Feature: Hide Feed
 * Description: Hides the default homepage feed, presenting a clean, blank slate or custom background.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideFeed = class HideFeed extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideFeed', 'hideFeed', 'ypp-hide-feed'); }
};
