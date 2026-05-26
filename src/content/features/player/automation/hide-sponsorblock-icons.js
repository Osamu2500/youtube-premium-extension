/**
 * Feature: Hide External SponsorBlock Icons
 * Hides the buttons injected by the external SponsorBlock extension
 * from the YouTube player control bar when this setting is enabled.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideSponsorBlockIcons = class HideSponsorBlockIcons extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideSponsorBlockIcons');
    }

    getConfigKey() {
        return 'hideSponsorBlockIcons';
    }

    async enable() {
        await super.enable();
        document.documentElement.classList.add('ypp-hide-sponsorblock-icons');
        this._injectCSS();
    }

    async disable() {
        await super.disable();
        document.documentElement.classList.remove('ypp-hide-sponsorblock-icons');
    }

    _injectCSS() {
        if (document.getElementById('ypp-hide-sb-icons-style')) return;

        const style = document.createElement('style');
        style.id = 'ypp-hide-sb-icons-style';
        style.textContent = `
            /* Hide the external SponsorBlock buttons in the player */
            html.ypp-hide-sponsorblock-icons .ytp-chrome-controls [id^="sponsorBlock"],
            html.ypp-hide-sponsorblock-icons .ytp-chrome-controls .sponsorBlockMenu,
            html.ypp-hide-sponsorblock-icons .ytp-chrome-controls #sponsorBlockControlTemplate {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }
};
