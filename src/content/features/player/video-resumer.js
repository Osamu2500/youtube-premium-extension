/**
 * Feature: Smart Video Resumer
 * Remembers exact playback position locally utilizing localStorage.
 * Automatically seeks to saved position on load.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoResumer = class VideoResumer extends window.YPP.features.BaseFeature {
    constructor() {
        super('VideoResumer');
        
        this.videoElement = null;
        this.videoId = null;
        this.saveInterval = null;
        
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        this.STORAGE_KEY_PREFIX = 'ypp_resume_';
    }

    getConfigKey() {
        return 'videoResumer';
    }

    async enable() {
        await super.enable();
        
        // Listen for SPA navigation
        this.addListener(window, 'yt-navigate-finish', this.handleNavigation);
        
        if (this.utils.isWatchPage()) {
            this.init();
        }
    }

    async disable() {
        await super.disable();
        this.cleanup();
    }

    async onUpdate() {
        if (this.utils.isWatchPage() && !this.videoElement) {
            this.init();
        }
    }

    handleNavigation() {
        this.cleanup();
        if (this.utils.isWatchPage() && this.isEnabled) {
            this.init();
        }
    }

    cleanup() {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        if (this.videoElement) {
            this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate);
        }
        this.videoElement = null;
        this.videoId = null;
    }

    getVideoId() {
        return new URLSearchParams(window.location.search).get('v');
    }

    async init() {
        this.videoId = this.getVideoId();
        if (!this.videoId) return;

        try {
            const video = await this.utils.pollFor(() => {
                const v = document.querySelector('video.video-stream.html5-main-video');
                // Ensure the video is actually for this page
                if (v && v.readyState >= 1) return v;
                return null;
            }, 10000, 500);

            if (video && this.isEnabled) {
                this.videoElement = video;
                
                // Restore previous time if available
                this.restoreTime();

                // Save time periodically
                this.addListener(this.videoElement, 'timeupdate', this.handleTimeUpdate);
            }
        } catch (e) {
            this.utils.log?.('Smart Video Resumer timed out', 'RESUMER', 'warn');
        }
    }

    restoreTime() {
        if (!this.videoId || !this.videoElement) return;
        
        const savedTimeStr = localStorage.getItem(this.STORAGE_KEY_PREFIX + this.videoId);
        if (!savedTimeStr) return;

        const savedTime = parseFloat(savedTimeStr);
        if (isNaN(savedTime)) return;
        
        // Don't seek if we're already past it or it's within the first 5 seconds (YouTube naturally handles basic resume sometimes)
        // But YouTube's native resume is hit or miss, so we enforce ours.
        if (this.videoElement.currentTime < savedTime && savedTime > 5) {
            
            // Check if it's near the end (e.g. 95%) - if so, don't resume, treat as watched
            const duration = this.videoElement.duration;
            if (duration && savedTime / duration > 0.95) {
                // Basically finished
                localStorage.removeItem(this.STORAGE_KEY_PREFIX + this.videoId);
                return;
            }

            this.videoElement.currentTime = savedTime;
            this.utils.log?.(`Resumed at ${savedTime}s`, 'RESUMER');
            
            if (this.utils.createToast) {
                this.utils.createToast('Playback Resumed', 'info');
            }
        }
    }

    handleTimeUpdate() {
        // Throttle saves directly in connection with time update to avoid `setInterval` drift bugs
        if (!this.videoElement || !this.videoId) return;
        
        const now = Date.now();
        if (!this.lastSave || now - this.lastSave > 2000) {
            const currentTime = this.videoElement.currentTime;
            const duration = this.videoElement.duration;
            
            // If watched over 95%, clear it
            if (duration && (currentTime / duration > 0.95)) {
                localStorage.removeItem(this.STORAGE_KEY_PREFIX + this.videoId);
            } else if (currentTime > 5) {
                localStorage.setItem(this.STORAGE_KEY_PREFIX + this.videoId, currentTime.toString());
            }

            this.lastSave = now;
        }
    }
};
