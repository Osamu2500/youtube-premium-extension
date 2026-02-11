/**
 * Ad Skipper Module
 * Uses mutation observation and periodic checks to detect and fast-forward through ads.
 */
window.YPP = window.YPP || {};
/**
 * Ad Skipper
 * Automatically skips or fast-forwards through YouTube video advertisements.
 * @class AdSkipper
 */
window.YPP.features.AdSkipper = class AdSkipper {
    /**
     * Initialize Ad Skipper
     */
    constructor() {
        this.observer = null;
        this.interval = null;
        this.isActive = false;
        this.Utils = window.YPP.Utils;

        // Performance constants
        this.POLL_INTERVAL = 1000;      // ms - Check for ads every second (reduced from 500ms)
        this.MAX_AD_SPEED = 16;         // Maximum playback speed for ads

        // Comprehensive list of ad selectors
        this.adSelectors = {
            container: ['.ad-showing', '.ad-interrupting'],
            skipButtons: [
                '.ytp-ad-skip-button',
                '.ytp-ad-skip-button-modern',
                '.ytp-skip-ad-button',
                '.videoAdUiSkipButton',
                'button[id^="skip-button"]',
                '.ytp-ad-overlay-close-button' // Close button for overlay ads
            ],
            overlay: '.ytp-ad-module'
        };
    }

    /**
     * Enable ad skipping with settings
     * @param {Object} settings - User settings
     */
    enable(settings) {
        if (settings.adSkipper) {
            this.start();
        } else {
            this.stop();
        }
    }

    /**
     * Disable ad skipping and cleanup
     */
    disable() {
        this.stop();
    }

    /**
     * Start the detection loops.
     */
    start() {
        if (this.isActive) return;
        this.isActive = true;

        this.Utils?.log('Ad Skipper Enabled', 'AD');

        // Check every second (reduced from 500ms for better performance)
        this.interval = setInterval(() => this.checkAndSkip(), this.POLL_INTERVAL);

        // Also check on video mutations (e.g. src change)
        const player = document.querySelector('#movie_player') || document.body;
        if (player) {
            this.observer = new MutationObserver(() => {
                try {
                    this.checkAndSkip();
                } catch (error) {
                    console.warn('[YPP:AD] Observer error:', error);
                    // Observer continues working despite errors
                }
            });
            this.observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
        }
    }

    stop() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        console.log('[YPP:AD] Ad Skipper Disabled');
    }

    /**
     * Check for ads and attempt to skip them
     */
    checkAndSkip() {
        const video = document.querySelector('video');
        if (!video) return;

        // Detection: Is an ad playing?
        const isAd = this.isAdPlaying();

        if (isAd) {
            try {
                // 1. Mute
                video.muted = true;

                // 2. Speed Up (16x is usually safe limit)
                if (video.playbackRate < this.MAX_AD_SPEED) {
                    video.playbackRate = this.MAX_AD_SPEED;
                }

                // 3. Click Skip Button if available
                this.clickSkipButton();

            } catch (e) {
                // Ignore transient errors
            }
        }
    }

    /**
     * Check if an ad is currently playing
     * @returns {boolean} True if ad is detected
     */
    isAdPlaying() {
        // 1. Class on player container (Most reliable)
        const player = document.querySelector('.html5-video-player');
        if (player && this.adSelectors.container.some(cls => player.matches(cls))) return true;

        // 2. Skip button present
        if (this.adSelectors.skipButtons.some(sel => document.querySelector(sel))) return true;

        // 3. Ad showing in video preview (sometimes distinct from player class)
        if (document.querySelector('.ytp-ad-player-overlay')) return true;

        return false;
    }

    /**
     * Attempt to click any visible skip buttons.
     * @returns {boolean} True if clicked
     */
    clickSkipButton() {
        for (const selector of this.adSelectors.skipButtons) {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetParent !== null) { // Check visibility
                btn.click();
                console.log('[YPP:AD] Clicked Skip Button');
                return true;
            }
        }
        return false;
    }
};
