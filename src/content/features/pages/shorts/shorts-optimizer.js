/**
 * Shorts Optimizer
 * Handles Shorts-specific quality-of-life enhancements: Volume Normalization, Auto-Scroll, Interaction Hiding
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsOptimizer = class ShortsOptimizer extends window.YPP.features.BaseFeature {
    constructor() {
        super('ShortsOptimizer');
        this._isShortsPage = false;
        this._autoScrollInterval = null;
        this._volumeEnforceInterval = null;
    }

    getConfigKey() { return null; }

    async enable() {
        await super.enable();
        this._isShortsPage = window.location.pathname.startsWith('/shorts/');
        this.applySettings();
    }

    async disable() {
        await super.disable();
        this._cleanup();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        this._isShortsPage = url.includes('/shorts/');
        this.applySettings();
    }

    onUpdate() {
        this.applySettings();
    }

    applySettings() {
        this._cleanup();
        
        if (!this._isShortsPage) return;

        // 1. Hide Interaction Bar
        document.body.classList.toggle('ypp-hide-shorts-interaction', !!this.settings.hideShortsInteraction);

        // 2. Volume Normalizer
        if (this.settings.shortsVolumeNormalizer) {
            this._startVolumeNormalizer();
        }

        // 3. Auto Scroll
        if (this.settings.shortsAutoScroll) {
            this._startAutoScroll();
        }
    }

    _cleanup() {
        document.body.classList.remove('ypp-hide-shorts-interaction');
        if (this._autoScrollInterval) {
            clearInterval(this._autoScrollInterval);
            this._autoScrollInterval = null;
        }
        if (this._volumeEnforceInterval) {
            clearInterval(this._volumeEnforceInterval);
            this._volumeEnforceInterval = null;
        }
    }

    _startVolumeNormalizer() {
        // Read user's default volume from standard YouTube localStorage
        let defaultVolume = 1.0;
        try {
            const ytVolumeData = localStorage.getItem('yt-player-volume');
            if (ytVolumeData) {
                const parsed = JSON.parse(ytVolumeData);
                const dataObj = JSON.parse(parsed.data);
                if (dataObj && typeof dataObj.volume === 'number') {
                    defaultVolume = dataObj.volume / 100;
                }
            }
        } catch(e) {
            this.utils?.log('Error reading yt-player-volume from localStorage', 'SHORTS', 'warn');
        }

        // Apply it continuously to any playing shorts video to prevent jumps
        this._volumeEnforceInterval = setInterval(() => {
            const video = document.querySelector('ytd-reel-video-renderer[is-active] video');
            if (video && video.volume !== defaultVolume) {
                video.volume = defaultVolume;
                this.utils?.log(`Enforced Shorts Volume: ${defaultVolume}`, 'SHORTS', 'debug');
            }
        }, 500);
    }

    _startAutoScroll() {
        this._autoScrollInterval = setInterval(() => {
            const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
            if (!activeReel) return;
            const video = activeReel.querySelector('video');
            if (video && video.ended) {
                const nextButton = document.querySelector('#navigation-button-down ytd-button-renderer button, .navigation-button.down button');
                if (nextButton) {
                    this.utils?.log('Short ended. Auto-scrolling to next.', 'SHORTS', 'info');
                    nextButton.click();
                }
            }
        }, 500);
    }
};
