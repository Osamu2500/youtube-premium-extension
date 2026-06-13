/**
 * Hide Channel Cards Feature
 * Removes channel recommendation cards from search results.
 */
class HideChannelCards extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'hideChannelCards'; }
    
    constructor() {
        super('HideChannelCards');
    }

    async enable() {
        document.body.classList.add('ypp-hide-channel-cards');
    }

    async disable() {
        document.body.classList.remove('ypp-hide-channel-cards');
    }
}

window.YPP.features.HideChannelCards = HideChannelCards;
