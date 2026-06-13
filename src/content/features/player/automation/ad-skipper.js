window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AdSkipper = class AdSkipper extends window.YPP.features.BaseFeature {
    constructor() {
        super('AdSkipper');
        this.selectors = [
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button',
            '.ytp-skip-ad-button',
            '.videoAdUiSkipButton'
        ];
        
        // Use a bound method for the observer callback
        this._boundHandleMutations = this._handleMutations.bind(this);
    }

    getConfigKey() {
        return 'adSkipper';
    }

    async enable() {
        await super.enable();
        
        if (window.YPP.sharedObserver) {
            // Register for any DOM mutations inside the player
            window.YPP.sharedObserver.register('ad-skipper', 'ytd-player, #player-container', (elements) => {
                const player = elements[0];
                if (player) {
                    this._checkForAds(player);
                }
            }, true);
            
            // Register a mutation observer on the document body or player to catch dynamically added ad buttons
            this.addListener(document.body, 'DOMNodeInserted', this._boundHandleMutations);
        }
        
        // Initial check
        this._checkForAds();
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('ad-skipper');
        }
    }

    _handleMutations(e) {
        if (!this.isEnabled) return;
        // Optimization: only process if the inserted node or its parent might be related to ads
        if (e.target && e.target.className && typeof e.target.className === 'string' && e.target.className.includes('ad')) {
            this._checkForAds();
        }
    }

    _checkForAds(container = document) {
        // 1. Click skip buttons
        for (const selector of this.selectors) {
            const btn = container.querySelector(selector);
            if (btn && btn.offsetParent !== null) { // is visible
                btn.click();
                this.utils?.log?.('Skipped Ad via Button Click', 'AD_SKIPPER', 'debug');
                return;
            }
        }

        // 2. Fast forward unskippable ads
        const player = document.querySelector('.html5-video-player');
        if (player && player.classList.contains('ad-showing')) {
            const video = player.querySelector('video');
            if (video && !video.paused) {
                // If it's a long ad without skip button, speed it up
                if (video.playbackRate !== 16) {
                    video.playbackRate = 16;
                    // Optional: mute the ad
                    if (!video.muted) video.muted = true;
                    this.utils?.log?.('Fast-forwarding unskippable ad', 'AD_SKIPPER', 'debug');
                }
            }
        } else {
             // Reset playback rate if we sped it up, but usually video element gets reset or we don't know the user's preferred speed.
             // Best to rely on the video speed controller to restore the speed if it was overridden.
        }
    }
};
