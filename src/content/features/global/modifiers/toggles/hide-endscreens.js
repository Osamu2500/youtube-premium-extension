/**
 * Feature: Hide Endscreens
 * Description: Hides the video suggestions and channel avatars that appear during the last 20 seconds of a video.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideEndScreens = class HideEndScreens extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideEndScreens', 'hideEndScreens', 'ypp-hide-endscreens'); }
};
