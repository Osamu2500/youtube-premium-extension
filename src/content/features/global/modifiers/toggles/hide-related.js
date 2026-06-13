/**
 * Feature: Hide Related
 * Description: Hides the secondary sidebar feed containing suggested videos next to the main player.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideRelated = class HideRelated extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideRelated', 'hideRelated', 'ypp-hide-related'); }
};
