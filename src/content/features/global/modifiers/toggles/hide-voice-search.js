/**
 * Feature: Hide Voice Search
 * Description: Hides the voice search microphone icon from the masthead search bar.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideVoiceSearch = class HideVoiceSearch extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideVoiceSearch', 'hideVoiceSearch', 'ypp-hide-voice-search'); }
};
