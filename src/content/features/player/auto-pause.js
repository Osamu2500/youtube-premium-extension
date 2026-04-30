/**
 * Auto Pause Feature
 * Automatically pauses the video when the tab loses visibility and resumes it when focused.
 * Intelligent enough to ignore Picture-in-Picture mode and wait for the SPA player to initialize.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoPause = class AutoPause extends window.YPP.features.BaseFeature {
    constructor() {
        super('AutoPause');
        
        // Bound handlers to ensure proper context when added/removed as event listeners
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        
        // State tracking
        this.wasPlaying = false;
        this.video = null;
    }

    /**
     * Maps this class to the 'autoPause' configuration toggle in settings
     * @returns {string} The configuration key
     */
    getConfigKey() { 
        return 'autoPause'; 
    }

    /**
     * Lifecycle method: Called when the feature is enabled
     * Binds the global visibilitychange listener.
     */
    async enable() {
        await super.enable();
        
        // BaseFeature automatically tracks and cleans up this listener when disabled
        this.addListener(document, 'visibilitychange', this.handleVisibilityChange);
        
        // Attempt to find the video immediately if already on a watch page
        if (this.utils.isWatchPage()) {
            this._cacheVideoElement();
        }
    }

    /**
     * Lifecycle method: Called when the feature is disabled
     */
    async disable() {
        await super.disable();
        this.video = null;
        this.wasPlaying = false;
    }

    /**
     * Lifecycle method: Hook fired when YouTube SPA navigates to a new video
     * @param {string} videoId - The YouTube Video ID
     */
    onVideoChange(videoId) {
        if (!this.isEnabled) return;
        
        // Reset state for the new video
        this.wasPlaying = false;
        this._cacheVideoElement();
    }

    /**
     * Asynchronously retrieves and caches the video element to prevent synchronous
     * null errors during SPA transitions where the DOM isn't fully ready.
     * @private
     */
    async _cacheVideoElement() {
        const videoSelectors = window.YPP.CONSTANTS?.SELECTORS?.VIDEO || 'video.html5-main-video';
        
        try {
            // Wait up to 5 seconds for the video element to exist in the DOM
            this.video = await this.waitForElement(videoSelectors, 5000);
        } catch (error) {
            this.utils.log?.('Failed to find video element for AutoPause', 'AutoPause', 'warn');
            this.video = null;
        }
    }

    /**
     * Core logic handler for document visibility changes
     */
    handleVisibilityChange() {
        // Exit early if feature is disabled or we aren't on a watch page
        if (!this.isEnabled || !this.utils.isWatchPage()) return;
        
        // Fallback: if cache failed, attempt synchronous fetch
        if (!this.video) {
            const videoSelectors = window.YPP.CONSTANTS?.SELECTORS?.VIDEO || 'video.html5-main-video';
            this.video = document.querySelector(videoSelectors);
        }

        // If no video is present in the DOM, there's nothing to pause
        if (!this.video) return;

        // CRITICAL EDGE CASE: Picture-in-Picture
        // If the user has explicitly triggered PiP, they want the video to play while hidden.
        // We MUST NOT pause the video in this scenario.
        if (document.pictureInPictureElement) {
            this.wasPlaying = false; // Reset state so it doesn't auto-play unexpectedly later
            return;
        }

        if (document.hidden) {
            // Tab is hidden
            if (!this.video.paused && !this.video.ended) {
                this.wasPlaying = true;
                
                // Pause the video and explicitly catch any Promise rejections (in case of fast UI interactions)
                const pausePromise = this.video.pause();
                if (pausePromise !== undefined) {
                    pausePromise.catch(err => this.utils.log?.(`Pause prevented: ${err}`, 'AutoPause', 'warn'));
                }
                
                this.utils.log?.('Auto paused video (tab hidden)', 'AutoPause');
            } else {
                this.wasPlaying = false;
            }
        } else {
            // Tab is visible again
            if (this.wasPlaying && this.video.paused) {
                // Resume the video
                const playPromise = this.video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(err => this.utils.log?.(`Play prevented by browser: ${err}`, 'AutoPause', 'warn'));
                }
                
                this.utils.log?.('Auto resumed video (tab visible)', 'AutoPause');
            }
            
            // Always reset state after becoming visible
            this.wasPlaying = false;
        }
    }
};
