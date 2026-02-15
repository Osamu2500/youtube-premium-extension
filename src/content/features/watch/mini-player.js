/**
 * Mini Player Feature
 * Automatically switches to Picture-in-Picture mode when scrolling down.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MiniPlayer = class MiniPlayer {
    constructor() {
        this.isActive = false;
        this.observer = null;
        this.videoElement = null;
        this.playerContainer = null;
        this.isPipActive = false;
        this.userManuallyExited = false; // improved logic: if user closes pip manually, don't reopen until scroll up reset

        this.handleIntersection = this.handleIntersection.bind(this);
        this.handlePipLeave = this.handlePipLeave.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;
        this.settings = settings;

        if (this.isWatchPage()) {
            this.init();
        }
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.cleanup();
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
    }

    run(settings) {
        this.enable(settings);
    }

    update(settings) {
        this.settings = settings;
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        this.cleanup();
        if (this.isActive && this.isWatchPage()) {
            // Slight delay to ensure DOM is ready after navigation
            setTimeout(() => this.init(), 1000);
        }
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.videoElement) {
            this.videoElement.removeEventListener('leavepictureinpicture', this.handlePipLeave);
            // If we are still in PiP and we caused it, maybe exit? 
            // Usually navigating away handles this, but good to be safe.
            if (document.pictureInPictureElement === this.videoElement) {
                document.exitPictureInPicture().catch(() => {});
            }
        }
        this.videoElement = null;
        this.playerContainer = null;
        this.isPipActive = false;
        this.userManuallyExited = false;
    }

    async init() {
        // Find the player container to observe (the "hole" where video sits)
        // #player-container or #movie_player
        this.playerContainer = document.getElementById('player-container');
        if (!this.playerContainer) {
            this.playerContainer = document.getElementById('movie_player');
        }

        this.videoElement = document.querySelector('video');

        if (!this.playerContainer || !this.videoElement) {
            // Retry once
            setTimeout(() => {
                this.playerContainer = document.getElementById('player-container') || document.getElementById('movie_player');
                this.videoElement = document.querySelector('video');
                if (this.playerContainer && this.videoElement) this.startObserving();
            }, 1000);
            return;
        }

        this.startObserving();
    }

    startObserving() {
        if (!window.IntersectionObserver) return;

        // Listen for user manually exiting PiP to avoid annoyance
        this.videoElement.addEventListener('leavepictureinpicture', this.handlePipLeave);

        const options = {
            root: null, // viewport
            threshold: 0.5 // 50% visibility
        };

        this.observer = new IntersectionObserver(this.handleIntersection, options);
        this.observer.observe(this.playerContainer);
    }

    handleIntersection(entries) {
        if (!this.isActive || !this.videoElement) return;

        entries.forEach(entry => {
            // If video is scrolling OUT of view (isIntersecting false)
            if (!entry.isIntersecting && !this.isPipActive && !this.userManuallyExited) {
                // Check if video is playing
                if (!this.videoElement.paused && !this.videoElement.ended) {
                    this.requestPip();
                }
            }
            // If video is scrolling BACK into view
            else if (entry.isIntersecting) {
                // Reset manual exit flag so it can work again
                this.userManuallyExited = false;

                if (this.isPipActive) {
                    this.exitPip();
                }
            }
        });
    }

    async requestPip() {
        try {
            if (document.pictureInPictureElement) return; // Already in Pip
            
            // Check if API is enabled
            if (document.pictureInPictureEnabled) {
                await this.videoElement.requestPictureInPicture();
                this.isPipActive = true;
            }
        } catch (e) {
            console.error('[YPP MiniPlayer] Failed to enter PiP:', e);
        }
    }

    async exitPip() {
        try {
            if (document.pictureInPictureElement === this.videoElement) {
                await document.exitPictureInPicture();
                this.isPipActive = false;
            }
        } catch (e) {
            // Ignore (maybe already exited)
        }
    }

    handlePipLeave() {
        this.isPipActive = false;
        // If we are still looking at the page (not navigating away), 
        // and the player is likely out of view, assume user closed it manually
        // and doesn't want it popping back up immediately until they scroll up once.
        if (this.isActive) {
            this.userManuallyExited = true;
        }
    }
};
