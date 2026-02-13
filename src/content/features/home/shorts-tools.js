/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts with proper event handling
 */
window.YPP = window.YPP || {};

/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts
 * @class ShortsTools
 */
window.YPP.features.ShortsTools = class ShortsTools {
    /**
     * Initialize Shorts Tools
     * @constructor
     */
    constructor() {
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
        this._TIMINGS = this._CONSTANTS.TIMINGS || {};
        this._checkInterval = this._TIMINGS.SHORTS_CHECK_INTERVAL || 500;
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this._isEnabled = false;
        this._settings = null;
        this._observer = null;
        this._videoRef = null;
        this._isScrolling = false;
        this._isMonitoring = false;
        this._Utils = window.YPP.Utils || {};

        // Bound event handlers for proper cleanup
        this._boundHandleEnded = this._onVideoEnded.bind(this);
        this._boundHandleTimeUpdate = this._onTimeUpdate.bind(this);
        this._boundCheckForVideo = this._checkForVideo.bind(this);
    }

    /**
     * Run the feature with settings
     * @param {Object} settings - User settings
     */
    run(settings) {
        this._update(settings);
    }

    /**
     * Update settings
     * @private
     * @param {Object} settings - Updated settings
     */
    _update(settings) {
        this._settings = settings || {};

        if (this._settings?.shortsAutoScroll) {
            this._enable();
        } else {
            this._disable();
        }
    }

    /**
     * Enable Shorts auto-scroll
     * @private
     */
    _enable() {
        if (this._isEnabled) return;

        this._isEnabled = true;
        this._Utils.log?.('Enabled Shorts Tools', 'SHORTS');
        this._startMonitoring();
    }

    /**
     * Disable Shorts auto-scroll and cleanup
     * @private
     */
    _disable() {
        if (!this._isEnabled) return;

        this._isEnabled = false;
        this._stopMonitoring();
        this._Utils.log?.('Disabled Shorts Tools', 'SHORTS');
    }

    // =========================================================================
    // MONITORING
    // =========================================================================

    /**
     * Start monitoring for Shorts videos
     * @private
     */
    _startMonitoring() {
        if (this._isMonitoring) return;
        this._isMonitoring = true;

        // Determine best container to observe
        const container = this._getShortsContainer();
        const observeSubtree = container === document.body;

        this._Utils.log?.(`Monitoring Shorts container: ${container.tagName}`, 'SHORTS', 'debug');

        // Set up mutation observer
        this._observer = new MutationObserver(this._boundCheckForVideo);
        this._observer.observe(container, {
            childList: true,
            subtree: observeSubtree
        });

        // Initial check
        this._boundCheckForVideo();
    }

    /**
     * Get the best Shorts container to observe
     * @private
     * @returns {Element}
     */
    _getShortsContainer() {
        return document.querySelector(this._SELECTORS.SHORTS_CONTAINER) ||
               document.querySelector(this._SELECTORS.SHORTS_CONTAINER_ALT) ||
               document.body;
    }

    /**
     * Stop monitoring
     * @private
     */
    _stopMonitoring() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        this._removeVideoListeners();
        this._isMonitoring = false;
    }

    // =========================================================================
    // VIDEO DETECTION
    // =========================================================================

    /**
     * Check for and attach to playing video
     * @private
     */
    _checkForVideo() {
        if (!this._isEnabled) return;

        // Only process on Shorts pages
        if (!this._isOnShortsPage()) {
            this._removeVideoListeners();
            return;
        }

        try {
            const activeRenderer = document.querySelector(this._SELECTORS.REEL_SHELF_RENDERER?.replace('ytd-', 'ytd-reel-video-renderer[is-active]') || 'ytd-reel-video-renderer[is-active]');
            let activeVideo = null;

            if (activeRenderer) {
                activeVideo = activeRenderer.querySelector('video');
            }

            // Fallback: Find playing video
            if (!activeVideo) {
                activeVideo = this._findPlayingVideo();
            }

            // Attach to new video
            if (activeVideo && activeVideo !== this._videoRef) {
                this._attachToVideo(activeVideo);
            }
        } catch (error) {
            this._Utils.log?.(`Error checking for video: ${error.message}`, 'SHORTS', 'error');
        }
    }

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
            video.addEventListener('ended', this._boundHandleEnded);
            video.addEventListener('timeupdate', this._boundHandleTimeUpdate);
        } catch (error) {
            this._Utils.log?.(`Error attaching to video: ${error.message}`, 'SHORTS', 'error');
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
        if (!this._isEnabled || !this._settings?.shortsAutoScroll) return;
        this._scrollToNext();
    }

    /**
     * Handle video time update
     * @private
     */
    _onTimeUpdate() {
        if (!this._isEnabled || !this._settings?.shortsAutoScroll || !this._videoRef) return;

        // Handle looped videos
        if (this._videoRef.loop) {
            const timeRemaining = this._videoRef.duration - this._videoRef.currentTime;
            if (timeRemaining < 0.3 && !this._isScrolling) {
                this._scrollToNext();
            }
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
        this._Utils.log?.('Auto-scrolling to next Short...', 'SHORTS');

        try {
            // Strategy 1: Click next button
            const nextBtn = document.querySelector('ytd-reel-video-renderer[is-active] #navigation-button-down button');
            if (nextBtn) {
                nextBtn.click();
                this._finishScroll();
                return;
            }

            // Strategy 2: Simulate down arrow key
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                bubbles: true,
                cancelable: true
            });
            document.body.dispatchEvent(event);
        } catch (error) {
            this._Utils.log?.(`Scroll error: ${error.message}`, 'SHORTS', 'error');
        }

        this._finishScroll();
    }

    /**
     * Finish scrolling after delay
     * @private
     */
    _finishScroll() {
        setTimeout(() => {
            this._isScrolling = false;
        }, 1500);
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Check if feature is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this._isEnabled;
    }

    /**
     * Manually trigger scroll to next
     */
    scrollNext() {
        this._scrollToNext();
    }
};
