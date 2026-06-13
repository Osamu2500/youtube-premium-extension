window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AdSkipper = class AdSkipper extends window.YPP.features.BaseFeature {
    constructor() {
        super('AdSkipper');
        this._isAdSkipping = false;
        this._observer = null;
        this._boundHandleMutations = this._handleMutations.bind(this);
    }

    getConfigKey() { return 'adSkipper'; }

    async enable() {
        await super.enable();
        this._startObserver();
        this._skipAdIfPresent(); // Check immediately
    }

    async disable() {
        await super.disable();
        this._stopObserver();
    }

    _startObserver() {
        if (this._observer) return;
        
        const target = document.querySelector('ytd-player') || document.getElementById('movie_player') || document.body;
        if (!target) return;
        
        this._observer = new MutationObserver(this._boundHandleMutations);
        this._observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }

    _stopObserver() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    _handleMutations(mutations) {
        if (!this.isEnabled) return;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                this._skipAdIfPresent();
            }
        }
    }

    _skipAdIfPresent() {
        if (this._isAdSkipping) return;
        
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');
        const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
        
        if (adShowing || skipButton) {
            this._isAdSkipping = true;
            this.utils.log?.('Ad detected. Skipping...', 'AdSkipper');
            
            // Speed up ad if it's unskippable currently
            const video = document.querySelector('video');
            if (video && !video.paused) {
                try {
                    video.playbackRate = 16.0;
                    video.volume = 0;
                    video.muted = true;
                    // Force skip to end of ad
                    if (video.duration && !isNaN(video.duration)) {
                        video.currentTime = video.duration - 0.1;
                    }
                } catch(e) {}
            }
            
            // Click skip button if it exists
            if (skipButton) {
                skipButton.click();
            }
            
            // Hide ad overlays
            const overlayAds = document.querySelectorAll('.ytp-ad-overlay-container, .ytp-ad-image-overlay');
            overlayAds.forEach(el => {
                if (el) el.style.display = 'none';
            });
            
            setTimeout(() => {
                this._isAdSkipping = false;
            }, 1000);
        }
    }
};
