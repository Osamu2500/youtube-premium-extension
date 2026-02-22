/**
 * Mini Player Feature
 * Automatically switches to Picture-in-Picture mode when scrolling down.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MiniPlayer = class MiniPlayer extends window.YPP.features.BaseFeature {
    constructor() {
        super('MiniPlayer');
        
        this.observer = null; // IntersectionObserver
        this.videoElement = null;
        this.playerContainer = null;
        this.isPipActive = false;
        this.userManuallyExited = false; // improved logic: if user closes pip manually, don't reopen until scroll up reset

        this.handleIntersection = this.handleIntersection.bind(this);
        this.handlePipLeave = this.handlePipLeave.bind(this);
    }

    getConfigKey() {
        return 'miniPlayer';
    }

    async enable() {
        if (!this.utils.isWatchPage()) return;
        await super.enable();

        this.init();
        
        // Handle SPA Navigation
        this.addListener(window, 'yt-navigate-finish', () => {
             this.cleanup();
             if (this.utils.isWatchPage() && this.isEnabled) {
                 setTimeout(() => this.init(), 1000);
             }
        });
    }

    async disable() {
        await super.disable();
        this.cleanup();
    }

    async onUpdate() {
        if (this.utils.isWatchPage() && !this.observer) {
            this.init();
        }
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.videoElement) {
            try {
                this.videoElement.removeEventListener('leavepictureinpicture', this.handlePipLeave);
            } catch(e) {}
            
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
        try {
            const elements = await this.utils.pollFor(() => {
                // Find primary video container that scrolls out of view
                const container = document.getElementById('player-container') || document.getElementById('movie_player');
                const video = document.querySelector('video');
                
                if (container && video && video.readyState >= 1) {
                    return { container, video };
                }
                return null;
            }, 5000, 500);

            if (elements) {
                this.playerContainer = elements.container;
                this.videoElement = elements.video;
                this.startObserving();
            }
        } catch (error) {
            this.utils.log?.('MiniPlayer initialization timed out waiting for player elements', 'MINIPLAYER', 'warn');
        }
    }

    startObserving() {
        if (!window.IntersectionObserver || !this.playerContainer || !this.videoElement) return;

        // Use custom listener for manual PiP exit detection
        this.videoElement.addEventListener('leavepictureinpicture', this.handlePipLeave);

        const options = {
            root: null, // viewport
            threshold: 0.1 // 10% visibility (triggers when almost completely scrolled past)
        };

        this.observer = new IntersectionObserver(this.handleIntersection, options);
        this.observer.observe(this.playerContainer);
    }

    handleIntersection(entries) {
        if (!this.isEnabled || !this.videoElement) return;

        entries.forEach(entry => {
            // Check if scrolling down past video
            if (!entry.isIntersecting && !this.isPipActive && !this.userManuallyExited) {
                // Only activate if playing
                if (!this.videoElement.paused && !this.videoElement.ended) {
                    this.requestPip();
                }
            }
            // Scrolling back up to video
            else if (entry.isIntersecting) {
                this.userManuallyExited = false; // Reset manual exit flag
                if (this.isPipActive) {
                    this.exitPip();
                }
            }
        });
    }

    async requestPip() {
        try {
            if (document.pictureInPictureElement) return; // Already in Pip
            
            if (document.pictureInPictureEnabled) {
                await this.videoElement.requestPictureInPicture();
                this.isPipActive = true;
                if (this.utils.createToast) this.utils.createToast('Mini Player Active', 'info');
            }
        } catch (e) {
            this.utils.log?.('Failed to enter PiP: ' + e.message, 'MINIPLAYER', 'debug');
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

    handlePipLeave(event) {
        this.isPipActive = false;
        // If the player is still out of view intersection-wise, 
        // the user likely closed the PiP window manually
        if (this.isEnabled && this.observer) {
            this.userManuallyExited = true;
        }
    }
};
