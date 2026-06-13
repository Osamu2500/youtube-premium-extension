/**
 * Feature: Hide Comments
 * Description: Completely hides the comments section underneath the video player.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideComments = class HideComments extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideComments', 'hideComments', 'ypp-hide-comments'); }
};
