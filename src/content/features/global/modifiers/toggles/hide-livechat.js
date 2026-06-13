/**
 * Feature: Hide Live Chat
 * Description: Completely hides the live chat frame and container on live streams and premieres.
 * Strategy: Fast CSS toggle applying display: none to ytd-live-chat-frame and #chat.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideLiveChat = class HideLiveChat extends window.YPP.features.BaseToggleFeature {
    /**
     * Initializes the toggle feature.
     * @param {string} settingsKey - The key in YPP settings (hideLiveChat).
     * @param {string} cssClass - The global CSS class applied to the body.
     */
    constructor() {
        super('HideLiveChat', 'hideLiveChat', 'ypp-hide-livechat');
    }
};
