/**
 * Feature: Hide Fundraiser/Donations
 * Description: Removes the YouTube giving and donation shelf that sometimes appears below videos.
 * Strategy: Fast CSS toggle applying display: none to ytd-donation-shelf-renderer.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideFundraiser = class HideFundraiser extends window.YPP.features.BaseToggleFeature {
    /**
     * Initializes the toggle feature.
     * @param {string} settingsKey - The key in YPP settings (hideFundraiser).
     * @param {string} cssClass - The global CSS class applied to the body.
     */
    constructor() {
        super('HideFundraiser', 'hideFundraiser', 'ypp-hide-fundraiser');
    }
};
