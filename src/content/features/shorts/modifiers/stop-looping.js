window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StopShortsLooping = class StopShortsLooping extends window.YPP.features.BaseFeature {
    constructor() {
        super('StopShortsLooping');
        this.handleVideoAdded = this.handleVideoAdded.bind(this);
        this.preventLoop = this.preventLoop.bind(this);
        this._isMonitoring = false;
    }

    getConfigKey() { return 'stopShortsLooping'; }

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
        
        const activeVideo = document.querySelector('ytd-reel-video-renderer[is-active] video');
        if (activeVideo) {
            this.attachToVideo(activeVideo);
            this.preventLoop({ target: activeVideo });
        }

        this.observer.register(
            'shorts-loop-monitor',
            'ytd-reel-video-renderer video',
            this.handleVideoAdded,
            true 
        );
        this._isMonitoring = true;
    }

    stopMonitoring() {
        if (!this._isMonitoring) return;
        this.observer.unregister('shorts-loop-monitor');
        document.querySelectorAll('video[data-ypp-no-loop]').forEach(video => {
            video.removeAttribute('data-ypp-no-loop');
        });
        this._isMonitoring = false;
    }

    handleVideoAdded(elements) {
        if (!elements) return;
        elements.forEach(video => {
            this.attachToVideo(video);
            this.preventLoop({ target: video });
        });
    }

    attachToVideo(video) {
        if (!video || video.hasAttribute('data-ypp-no-loop')) return;
        
        video.setAttribute('data-ypp-no-loop', 'true');
        this.addListener(video, 'play', this.preventLoop);
    }

    preventLoop(e) {
        const video = e.target;
        if (!video) return;

        const reel = video.closest('ytd-reel-video-renderer');
        if (!reel) return;

        if (video.loop) {
            video.loop = false;
            video.removeAttribute('loop');
        }
    }
};
