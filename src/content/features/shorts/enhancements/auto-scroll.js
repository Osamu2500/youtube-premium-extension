window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsAutoScroll = class ShortsAutoScroll extends window.YPP.features.BaseFeature {
    constructor() {
        super('ShortsAutoScroll');
        this._autoScrollInterval = null;
        this._isMonitoring = false;
        // Keep track of the last scrolled video to prevent double-skipping
        this._lastScrolledVideo = null;
    }

    getConfigKey() { return 'shortsAutoScroll'; }

    async enable() {
        await super.enable();
        if (location.pathname.startsWith('/shorts/')) {
            this.startMonitoring();
        }
    }

    async disable() {
        await super.disable();
        this.stopMonitoring();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        if (url.includes('/shorts/')) {
            this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
    }

    startMonitoring() {
        if (this._isMonitoring) return;
        this.utils?.log('Starting Shorts Auto-Scroll interval monitoring', 'AutoScroll');
        
        this._autoScrollInterval = setInterval(() => {
            if (document.hidden) return;
            this._checkAndScroll();
        }, 200);

        this._isMonitoring = true;
    }

    stopMonitoring() {
        if (!this._isMonitoring) return;
        if (this._autoScrollInterval) {
            clearInterval(this._autoScrollInterval);
            this._autoScrollInterval = null;
        }
        this._isMonitoring = false;
        this._lastScrolledVideo = null;
        this.utils?.log('Stopped Shorts Auto-Scroll monitoring', 'AutoScroll');
    }

    _checkAndScroll() {
        const activeReel = document.querySelector('ytd-reel-video-renderer[is-active]');
        if (!activeReel) return;
        
        const video = activeReel.querySelector('video');
        if (!video || isNaN(video.duration) || video.duration === 0) return;

        // If the video has ended naturally OR is within 0.1s of ending (which catches it before it loops)
        if (video.ended || (video.currentTime > 0 && video.duration > 0 && video.duration - video.currentTime <= 0.1)) {
            
            // Prevent scrolling multiple times for the same video instance during transition
            if (this._lastScrolledVideo === video && video.currentTime > 0.5) {
                return;
            }

            const nextButton = document.querySelector('#navigation-button-down ytd-button-renderer button, .navigation-button.down button');
            if (nextButton) {
                this._lastScrolledVideo = video;
                this.utils?.log('Short ended. Auto-scrolling to next.', 'AutoScroll', 'info');
                nextButton.click();
            }
        } else {
            // Reset last scrolled video if we're playing a new video
            if (this._lastScrolledVideo && video !== this._lastScrolledVideo && video.currentTime < 1) {
                this._lastScrolledVideo = null;
            }
        }
    }
};
