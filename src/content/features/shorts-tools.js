/**
 * Shorts Tools
 * Adds auto-scroll functionality to YouTube Shorts.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsTools = class ShortsTools {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.settings = null;
        this.observer = null;
        this.videoRef = null;
        this.autoScrollTimer = null;
        this.isScrolling = false;
    }

    run(settings) {
        this.update(settings);
    }

    update(settings) {
        this.settings = settings;
        if (settings.shortsAutoScroll) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.Utils.log('Enabled Shorts Tools', 'SHORTS');
        this.monitorShorts();
    }

    disable() {
        this.isActive = false;
        this.stopMonitoring();
    }

    monitorShorts() {
        // We need to continuously check if we are on a Shorts page and if a video is playing
        if (this.observer) return;

        this.observer = new MutationObserver(() => {
            this.checkForVideo();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
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

        // Find the ACTIVELY PLAYING video
        // Shorts usually has multiple video elements, but only one actives
        const videos = document.querySelectorAll('video');
        let activeVideo = null;

        videos.forEach(v => {
            // Heuristic: The one that is playing and visible
            if (!v.paused && v.offsetWidth > 0) {
                activeVideo = v;
            }
        });

        // Fallback: If no video is playing (just loaded), usually the first one or the one in the active ytd-reel-video-renderer
        if (!activeVideo) {
            const activeRenderer = document.querySelector('ytd-reel-video-renderer[is-active]');
            if (activeRenderer) {
                activeVideo = activeRenderer.querySelector('video');
            }
        }

        if (activeVideo && activeVideo !== this.videoRef) {
            this.removeVideoListeners();
            this.videoRef = activeVideo;
            this.addVideoListeners();
        }
    }

    addVideoListeners() {
        if (!this.videoRef) return;
        this.videoRef.addEventListener('ended', this.handleVideoEnded.bind(this));
        // Also listen for timeupdate to catch near-end if 'ended' is unreliable on loop
        this.videoRef.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));
        this.videoRef.loop = false; // Force loop off to allow 'ended' event
    }

    removeVideoListeners() {
        if (this.videoRef) {
            this.videoRef.removeEventListener('ended', this.handleVideoEnded.bind(this));
            this.videoRef.removeEventListener('timeupdate', this.handleTimeUpdate.bind(this));
            this.videoRef = null;
        }
    }

    handleVideoEnded() {
        if (!this.isActive || !this.settings.shortsAutoScroll) return;
        this.scrollToNext();
    }

    handleTimeUpdate() {
        if (!this.isActive || !this.settings.shortsAutoScroll || !this.videoRef) return;

        // Some shorts loop automatically before firing 'ended'.
        // If we are within 0.5s of end, and loop is true, we might want to manually intervene
        // But simply setting loop = false in addVideoListeners should handle it.
        if (this.videoRef.loop) this.videoRef.loop = false;
    }

    scrollToNext() {
        if (this.isScrolling) return;
        this.isScrolling = true;

        this.Utils.log('Auto-scrolling to next Short...', 'SHORTS');

        // Strategy 1: Simulate Down Arrow Key (Most reliable for YouTube's strict event handling)
        const event = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            bubbles: true,
            cancelable: true
        });
        document.body.dispatchEvent(event);

        // Strategy 2: Click the "Next" button if available (floating down button)
        const nextBtn = document.querySelector('ytd-reel-video-renderer[is-active] #navigation-button-down button');
        if (nextBtn) nextBtn.click();

        setTimeout(() => {
            this.isScrolling = false;
        }, 1500); // Debounce
    }
};
