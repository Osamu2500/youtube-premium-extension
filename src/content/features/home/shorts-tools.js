/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts with proper event handling
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts
 * @class ShortsTools
 */
window.YPP.features.ShortsTools = class ShortsTools extends window.YPP.features.BaseFeature {
    /**
     * Initialize Shorts Tools
     * @constructor
     */
    constructor() {
        super('ShortsTools');
        this._initConstants();

        this._videoRef = null;
        this._isScrolling = false;

        // Bound event handlers for proper cleanup
        this._boundHandleEnded = this._onVideoEnded.bind(this);
        // Throttle time update to run at most every 200ms
        this._boundHandleTimeUpdate = this.utils.throttle(this._onTimeUpdate.bind(this), 200);
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
    }

    getConfigKey() {
        return 'shortsAutoScroll'; // This feature specifically handles auto-scrolling
    }

    async enable() {
        if (!this._isOnShortsPage()) return;
        await super.enable();
        
        this.utils.log?.('Enabled Shorts Auto-Scroll', 'SHORTS');
        
        // Listen for internal navigation to start/stop observing
        this.addListener(window, 'yt-navigate-finish', () => {
             if (this._isOnShortsPage() && this.isEnabled) {
                 this._startMonitoring();
             } else {
                 this._stopMonitoring();
             }
        });

        this._startMonitoring();
    }

    async disable() {
        await super.disable();
        this._stopMonitoring();
        this.utils.log?.('Disabled Shorts Auto-Scroll', 'SHORTS');
    }

    // =========================================================================
    // MONITORING
    // =========================================================================

    /**
     * Start monitoring for Shorts videos using BaseFeature's DOMObserver
     * @private
     */
    _startMonitoring() {
        this.observer.start();
        
        // Watch for the active reel video renderer becoming available
        const activeContainerSelector = this._SELECTORS.REEL_SHELF_RENDERER?.replace('ytd-', 'ytd-reel-video-renderer[is-active]') || 'ytd-reel-video-renderer[is-active]';
        
        this.observer.register('active-short', activeContainerSelector, (activeRenderer) => {
             if (!this.isEnabled) return;
             const newVideo = activeRenderer.querySelector('video');
             
             if (!newVideo) {
                 // Fallback if video tag not immediately within active container
                 const playing = this._findPlayingVideo();
                 if (playing && playing !== this._videoRef) {
                     this._attachToVideo(playing);
                 }
                 return;
             }

             if (newVideo !== this._videoRef) {
                 this._attachToVideo(newVideo);
             }
        }, true);
    }

    /**
     * Stop monitoring
     * @private
     */
    _stopMonitoring() {
        this.observer.stop();
        this.observer.unregister('active-short');
        this._removeVideoListeners();
    }

    // =========================================================================
    // VIDEO DETECTION
    // =========================================================================

    /**
     * Check if on Shorts page
     * @private
     * @returns {boolean}
     */
    _isOnShortsPage() {
        const path = window.location.pathname;
        return path.startsWith('/shorts/') || path === '/shorts';
    }

    /**
     * Find a playing video element
     * @private
     * @returns {HTMLVideoElement|null}
     */
    _findPlayingVideo() {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
            if (!v.paused && v.offsetWidth > 0 && v.offsetHeight > 0) {
                return v;
            }
        }
        return null;
    }

    /**
     * Attach event listeners to video
     * @private
     * @param {HTMLVideoElement} video
     */
    _attachToVideo(video) {
        this._removeVideoListeners();
        this._videoRef = video;

        try {
            // We use standard addEventListener here instead of BaseFeature's addListener
            // because we constantly attach/detach from different video elements as the user scrolls,
            // and we need precise low-level control of this specific cleanup without wiping
            // the feature-level listeners (like the yt-navigate-finish).
            video.addEventListener('ended', this._boundHandleEnded);
            video.addEventListener('timeupdate', this._boundHandleTimeUpdate);
            // Shorts usually loop natively, so we ensure the ended event might fire if loop is false,
            // but rely primarily on timeupdate for looped shorts.
        } catch (error) {
            this.utils.log?.(`Error attaching to video: ${error.message}`, 'SHORTS', 'error');
        }
    }

    /**
     * Remove video event listeners
     * @private
     */
    _removeVideoListeners() {
        if (this._videoRef) {
            try {
                this._videoRef.removeEventListener('ended', this._boundHandleEnded);
                this._videoRef.removeEventListener('timeupdate', this._boundHandleTimeUpdate);
            } catch (error) {
                // Ignore removal errors
            }
            this._videoRef = null;
        }
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    /**
     * Handle video ended event
     * @private
     */
    _onVideoEnded() {
        if (!this.isEnabled) return;
        this._scrollToNext();
    }

    /**
     * Handle video time update
     * @private
     */
    _onTimeUpdate() {
        if (!this.isEnabled || !this._videoRef) return;

        const currentTime = this._videoRef.currentTime;
        const duration = this._videoRef.duration;

        if (!duration) return;

        // Handle looped videos: Shorts naturally loop.
        // If we are within the last ~100ms of the video, trigger scroll.
        const timeRemaining = duration - currentTime;
        if (timeRemaining <= 0.15 && !this._isScrolling) {
            this._scrollToNext();
        }
    }

    // =========================================================================
    // SCROLL LOGIC
    // =========================================================================

    /**
     * Scroll to next Shorts video
     * @private
     */
    _scrollToNext() {
        if (this._isScrolling) return;

        this._isScrolling = true;
        this.utils.log?.('Auto-scrolling to next Short...', 'SHORTS');
        
        if (this.utils.createToast) {
             this.utils.createToast('Auto-scrolling...', 'info');
        }

        try {
            // Strategy 1: Click next button (Most reliable for SPA state)
            const nextBtn = document.querySelector('ytd-reel-video-renderer[is-active] #navigation-button-down button');
            if (nextBtn) {
                nextBtn.click();
                this._finishScroll();
                return;
            }

            // Strategy 2: Simulate down arrow key (Fallback)
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                bubbles: true,
                cancelable: true,
                view: window
            });
            document.body.dispatchEvent(event);
            
        } catch (error) {
            this.utils.log?.(`Scroll error: ${error.message}`, 'SHORTS', 'error');
        }

        this._finishScroll();
    }

    /**
     * Finish scrolling after delay to prevent rapid-fire skipping
     * @private
     */
    _finishScroll() {
        // Prevents triggering multiple scrolls for the same end-of-video event
        setTimeout(() => {
            this._isScrolling = false;
        }, 1500);
    }
};
