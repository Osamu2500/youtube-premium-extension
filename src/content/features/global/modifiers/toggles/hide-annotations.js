/**
 * Feature: Hide Annotations
 * Description: Removes in-video annotations and popups.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideAnnotations = class HideAnnotations extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideAnnotations', 'hideAnnotations', 'ypp-hide-annotations'); }
};
