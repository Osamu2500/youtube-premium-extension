/**
 * Feature: Hide Cards
 * Description: Hides YouTube info cards (the "i" icon and its flyouts) from the top right of the player.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideCards = class HideCards extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideCards', 'hideCards', 'ypp-hide-cards'); }
};
