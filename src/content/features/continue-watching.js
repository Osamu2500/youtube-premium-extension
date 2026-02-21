/**
 * Feature: Continue Watching Label
 * Ports the 'YouTube Refined' logic to tag previously watched videos in the related sidebar.
 */
window.YPP = window.YPP || {};
window.YPP.Features = window.YPP.Features || {};

window.YPP.Features.ContinueWatching = class ContinueWatching {
    constructor() {
        this.name = 'continue_watching';
        this.observer = null;
        this.Utils = window.YPP.Utils;
    }

    /**
     * Initialize the feature
     * @param {Object} settings - User settings
     */
    init(settings) {
        if (!settings?.premiumTheme) {
            this.cleanup();
            return;
        }

        this.startObserver();
    }

    /**
     * Start observing for related videos that might be unfinished
     */
    startObserver() {
        if (this.observer) return;

        // Use our robust DOMObserver
        this.observer = new this.Utils.DOMObserver();
        
        // Register the selector to watch for new related videos
        this.observer.register('related_videos_continue', 
            'ytd-watch-next-secondary-results-renderer #items ytd-compact-video-renderer:not(.previously-watched-video)',
            this.handleNewVideo.bind(this)
        );

        // Start observing the target container 
        // Note: The container might not exist immediately, DOMObserver handles this safely if passed `document.body`
        const target = document.querySelector('ytd-watch-next-secondary-results-renderer') || document.body;
        this.observer.start(target);
    }

    /**
     * Callback when a new video card is found
     * @param {Element} video - The video card element
     */
    handleNewVideo(video) {
        if (!video) return;

        // Check if it has the red resume playback bar
        if (video.querySelector("ytd-thumbnail-overlay-resume-playback-renderer")) {
            video.classList.add("previously-watched-video");
        }
    }

    /**
     * Clean up the feature
     */
    cleanup() {
        if (this.observer) {
            this.observer.stop();
            this.observer = null;
        }
    }
};
