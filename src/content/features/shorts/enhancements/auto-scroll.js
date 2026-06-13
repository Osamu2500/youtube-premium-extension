window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsAutoScroll = class ShortsAutoScroll extends window.YPP.features.BaseFeature {
    constructor() {
        super('ShortsAutoScroll');
        this.handleVideoAdded = this.handleVideoAdded.bind(this);
        this.handleVideoEnded = this.handleVideoEnded.bind(this);
        this._isMonitoring = false;
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
        this.utils?.log('Starting Shorts Auto-Scroll monitoring', 'AutoScroll');
        
        // Find existing video to attach to immediately
        const activeVideo = document.querySelector('ytd-reel-video-renderer[is-active] video');
        if (activeVideo) {
            this.attachToVideo(activeVideo);
        }

        // Monitor for new videos getting added/activated
        this.observer.register(
            'shorts-video-monitor',
            'ytd-reel-video-renderer video',
            this.handleVideoAdded,
            true 
        );
        this._isMonitoring = true;
    }

    stopMonitoring() {
        if (!this._isMonitoring) return;
        this.observer.unregister('shorts-video-monitor');
        // Remove event listeners from all tracked videos
        document.querySelectorAll('video[data-ypp-autoscroll]').forEach(video => {
            video.removeEventListener('ended', this.handleVideoEnded);
            video.removeAttribute('data-ypp-autoscroll');
        });
        this._isMonitoring = false;
        this.utils?.log('Stopped Shorts Auto-Scroll monitoring', 'AutoScroll');
    }

    handleVideoAdded(elements) {
        if (!elements) return;
        elements.forEach(video => {
            this.attachToVideo(video);
        });
    }

    attachToVideo(video) {
        if (!video || video.hasAttribute('data-ypp-autoscroll')) return;
        
        video.setAttribute('data-ypp-autoscroll', 'true');
        video.addEventListener('ended', this.handleVideoEnded);
    }

    handleVideoEnded(e) {
        // Ensure this is the currently active reel
        const reel = e.target.closest('ytd-reel-video-renderer');
        if (!reel || !reel.hasAttribute('is-active')) return;

        const nextButton = document.querySelector('#navigation-button-down ytd-button-renderer button, .navigation-button.down button');
        if (nextButton) {
            this.utils?.log('Short ended. Auto-scrolling to next.', 'AutoScroll', 'info');
            nextButton.click();
        }
    }
};
