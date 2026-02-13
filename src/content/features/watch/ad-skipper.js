/**
 * Ad Skipper Module
 * Automatically detects and fast-forwards through YouTube video advertisements
 * Uses centralized constants for configuration
 */
window.YPP = window.YPP || {};

/**
 * Ad Skipper
 * Automatically skips or fast-forwards through YouTube video advertisements
 * @class AdSkipper
 */
window.YPP.features.AdSkipper = class AdSkipper {
    /**
     * Initialize Ad Skipper
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
        this._POLL_INTERVAL = this._TIMINGS.AD_SKIPPER_INTERVAL || 1000;
        this._MAX_AD_SPEED = this._TIMINGS.AD_PLAYBACK_SPEED || 16;
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this._observer = null;
        this._intervalId = null;
        this._isActive = false;
        this._isEnabled = false;
        this._Utils = window.YPP.Utils || {};
        this._boundCheckAndSkip = this._checkAndSkip.bind(this);
        this._boundHandleMutation = this._onMutation.bind(this);
    }

    /**
     * Enable ad skipping
     * @param {Object} settings - User settings
     */
    enable(settings) {
        if (settings?.adSkipper) {
            this._start();
        } else {
            this._stop();
        }
    }

    /**
     * Disable ad skipping
     */
    disable() {
        this._stop();
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    /**
     * Start the ad detection loops
     * @private
     */
    _start() {
        if (this._isActive) return;

        this._isActive = true;
        this._isEnabled = true;
        this._Utils.log?.('Ad Skipper Enabled', 'AD');

        // Start polling interval
        this._intervalId = setInterval(this._boundCheckAndSkip, this._POLL_INTERVAL);

        // Set up mutation observer for player changes
        this._setupObserver();
    }

    /**
     * Stop the ad detection loops
     * @private
     */
    _stop() {
        if (!this._isActive) return;

        this._isActive = false;
        this._isEnabled = false;

        // Clear interval
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }

        // Disconnect observer
        this._cleanupObserver();

        this._Utils.log?.('Ad Skipper Disabled', 'AD');
    }

    /**
     * Set up mutation observer
     * @private
     */
    _setupObserver() {
        try {
            const player = document.querySelector(this._SELECTORS.AD_PLAYER) || document.body;
            if (!player) return;

            this._observer = new MutationObserver(this._boundHandleMutation);

            this._observer.observe(player, {
                attributes: true,
                subtree: true,
                attributeFilter: ['class', 'src']
            });
        } catch (error) {
            this._Utils.log?.(`Observer setup error: ${error.message}`, 'AD', 'error');
        }
    }

    /**
     * Cleanup mutation observer
     * @private
     */
    _cleanupObserver() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    /**
     * Handle mutation events
     * @private
     * @param {MutationRecord[]} mutations
     */
    _onMutation(mutations) {
        try {
            // Only process if we might be in an ad
            this._boundCheckAndSkip();
        } catch (error) {
            // Continue running despite errors
            this._Utils.log?.(`Mutation handler error: ${error.message}`, 'AD', 'warn');
        }
    }

    /**
     * Check for ads and attempt to skip them
     * @private
     */
    _checkAndSkip() {
        if (!this._isEnabled) return;

        const video = document.querySelector(this._SELECTORS.VIDEO);
        if (!video) return;

        try {
            // Check if ad is playing
            if (this._isAdPlaying()) {
                this._skipAd(video);
            }
        } catch (error) {
            this._Utils.log?.(`Ad check error: ${error.message}`, 'AD', 'error');
        }
    }

    /**
     * Check if an ad is currently playing
     * @private
     * @returns {boolean}
     */
    _isAdPlaying() {
        // Check player container class (most reliable method)
        const player = document.querySelector(this._SELECTORS.AD_PLAYER);
        if (player) {
            const adClasses = this._SELECTORS.AD_CONTAINER || [];
            if (adClasses.some(cls => player.matches?.(cls))) {
                return true;
            }
        }

        // Check for skip button
        if (this._hasSkipButton()) {
            return true;
        }

        // Check for ad overlay
        if (document.querySelector(this._SELECTORS.AD_PLAYER_OVERLAY)) {
            return true;
        }

        return false;
    }

    /**
     * Check if skip button is present
     * @private
     * @returns {boolean}
     */
    _hasSkipButton() {
        const skipButtons = this._SELECTORS.AD_SKIP_BUTTON || [];
        return skipButtons.some(selector => document.querySelector(selector));
    }

    /**
     * Skip the current ad
     * @private
     * @param {HTMLVideoElement} video
     */
    _skipAd(video) {
        // Mute the ad
        video.muted = true;

        // Increase playback speed
        if (video.playbackRate < this._MAX_AD_SPEED) {
            video.playbackRate = this._MAX_AD_SPEED;
        }

        // Try to click skip button
        this._clickSkipButton();
    }

    /**
     * Attempt to click any visible skip buttons
     * @private
     * @returns {boolean}
     */
    _clickSkipButton() {
        const skipButtons = this._SELECTORS.AD_SKIP_BUTTON || [];

        for (const selector of skipButtons) {
            const btn = document.querySelector(selector);
            if (btn && this._isVisible(btn)) {
                try {
                    btn.click();
                    this._Utils.log?.('Clicked skip button', 'AD', 'debug');
                    return true;
                } catch (error) {
                    this._Utils.log?.(`Click error: ${error.message}`, 'AD', 'warn');
                }
            }
        }

        return false;
    }

    /**
     * Check if element is visible
     * @private
     * @param {Element} element
     * @returns {boolean}
     */
    _isVisible(element) {
        if (!element) return false;
        return element.offsetParent !== null &&
               !element.hasAttribute?.('hidden') &&
               getComputedStyle(element).display !== 'none';
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Check if ad skipper is active
     * @returns {boolean}
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Manually trigger ad check
     */
    checkNow() {
        this._boundCheckAndSkip();
    }
};
