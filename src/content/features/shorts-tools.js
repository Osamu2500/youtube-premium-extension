/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts.
 */
window.YPP = window.YPP || {};
/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts.
 * @class ShortsTools
 */
window.YPP.features.ShortsTools = class ShortsTools {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        /** @type {boolean} Internal state tracking if the manager is active */
        this.isEnabled = false;
        /** @type {Object|null} Current user settings */
        this.settings = null;
        this.observer = null;
        /** @type {HTMLVideoElement|null} Reference to the currently active video */
        this.videoRef = null;
        this.isScrolling = false;

        // Bind event handlers once to allow proper cleanup
        this._boundHandleEnded = this.handleVideoEnded.bind(this);
        this._boundHandleTimeUpdate = this.handleTimeUpdate.bind(this);
    }

    run(settings) {
        this.update(settings);
    }

    /**
     * Update settings
     * @param {Object} settings - Updated settings
     */
    update(settings) {
        this.settings = settings;
        if (settings?.shortsAutoScroll) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable Shorts auto-scroll
     */
    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.Utils.log('Enabled Shorts Tools', 'SHORTS');
        this.monitorShorts();
    }

    /**
     * Disable Shorts auto-scroll and cleanup
     */
    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        this.stopMonitoring();
        this.Utils.log('Disabled Shorts Tools', 'SHORTS');
    }

    monitorShorts() {
        // We need to continuously check if we are on a Shorts page and if a video is playing
        if (this.observer) return;

        // Target specific Shorts container for better performance
        const container = document.querySelector('ytd-shorts') ||
            document.querySelector('#shorts-container') ||
            document.body;  // Fallback to body if specific container not found

        this.observer = new MutationObserver(() => {
            if (this.isEnabled) this.checkForVideo();
        });

        // Only observe subtree if we're using the fallback (document.body)
        const observeSubtree = container === document.body;
        this.observer.observe(container, {
            childList: true,
            subtree: observeSubtree
        });

        this.Utils.log(`Monitoring Shorts (container: ${container.tagName}, subtree: ${observeSubtree})`, 'SHORTS');
        this.checkForVideo();
    }

    stopMonitoring() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.removeVideoListeners();
    }

    checkForVideo() {
        if (!window.location.pathname.startsWith('/shorts/')) {
            this.removeVideoListeners();
            return;
        }

        try {
            // Find the ACTIVELY PLAYING video
            // Shorts usually has multiple ytd-reel-video-renderer elements, but only one is is-active
            const activeRenderer = document.querySelector('ytd-reel-video-renderer[is-active]');
            let activeVideo = activeRenderer ? activeRenderer.querySelector('video') : null;

            // Fallback: Check all videos for playing state if specific structure not found
            if (!activeVideo) {
                const videos = document.querySelectorAll('video');
                for (const v of videos) {
                    if (!v.paused && v.offsetWidth > 0 && v.offsetHeight > 0) {
                        activeVideo = v;
                        break;
                    }
                }
            }

            if (activeVideo && activeVideo !== this.videoRef) {
                this.removeVideoListeners();
                this.videoRef = activeVideo;
                this.addVideoListeners();
            }
        } catch (error) {
            this.Utils.log(`Error checking for video: ${error.message}`, 'SHORTS', 'error');
        }
    }

    addVideoListeners() {
        if (!this.videoRef) return;
        try {
            this.videoRef.addEventListener('ended', this._boundHandleEnded);
            this.videoRef.addEventListener('timeupdate', this._boundHandleTimeUpdate);
            // NOTE: Do NOT force loop = false here. It conflicts with YouTube's native 'Loop' context menu option.
            // Instead, we handle the loop behavior logically in handleTimeUpdate.
        } catch (error) {
            this.Utils.log(`Error adding video listeners: ${error.message}`, 'SHORTS', 'error');
        }
    }

    removeVideoListeners() {
        if (this.videoRef) {
            try {
                this.videoRef.removeEventListener('ended', this._boundHandleEnded);
                this.videoRef.removeEventListener('timeupdate', this._boundHandleTimeUpdate);
            } catch (error) {
                // Ignore removal errors
            }
            this.videoRef = null;
        }
    }

    handleVideoEnded() {
        if (!this.isEnabled || !this.settings.shortsAutoScroll) return;
        this.scrollToNext();
    }

    handleTimeUpdate() {
        if (!this.isEnabled || !this.settings.shortsAutoScroll || !this.videoRef) return;

        // Native Loop Support:
        // YouTube videos have a 'loop' property. If it's true, the video will replay.
        // We should respect this if the user explicitly enabled loop via right-click.
        // However, standard Shorts behavior is to loop by default.
        // If we want Auto-Scroll, we effectively want to BREAK that loop.

        // Check for specific "near end" condition to simulate 'ended' if loop is active
        // But only if we are confident we should scroll.
        // For now, let's rely on 'ended' event which fires if loop is false.

        // If the video loops, 'ended' might not fire.
        // We can check if currentTime is very close to duration and loop is true
        if (this.videoRef.loop) {
            const timeRemaining = this.videoRef.duration - this.videoRef.currentTime;
            if (timeRemaining < 0.3 && !this.isScrolling) {
                // Optimization: Instead of forcing loop=false, just trigger scroll
                this.scrollToNext();
            }
        }
    }

    scrollToNext() {
        if (this.isScrolling) return;
        this.isScrolling = true;

        this.Utils.log('Auto-scrolling to next Short...', 'SHORTS');

        try {
            // Strategy 1: Click the "Next" button (Best practice - mimics user interaction)
            const nextBtn = document.querySelector('ytd-reel-video-renderer[is-active] #navigation-button-down button');
            if (nextBtn) {
                nextBtn.click();
            } else {
                // Strategy 2: Simulate Down Arrow Key (Fallback)
                const event = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    code: 'ArrowDown',
                    keyCode: 40,
                    bubbles: true,
                    cancelable: true
                });
                document.body.dispatchEvent(event);
            }
        } catch (e) {
            this.Utils.log(`Error scrolling: ${e.message}`, 'SHORTS', 'error');
        }

        setTimeout(() => {
            this.isScrolling = false;
        }, 1500); // Debounce
    }
};
