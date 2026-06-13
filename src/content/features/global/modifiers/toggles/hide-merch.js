/**
 * Feature: Hide Merch
 * Description: Removes the merchandise shelf and ticket offers that appear below videos and on channel pages.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideMerch = class HideMerch extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideMerch', 'hideMerch', 'ypp-hide-merch'); }
};
