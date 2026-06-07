/**
 * Shorts Tools (Auto-Scroll)
 * Automatically scrolls to the next Short when the current one ends.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsTools = class ShortsTools extends window.YPP.features.BaseFeature {
    static SELECTORS = {
        ACTIVE_VIDEO: 'ytd-reel-video-renderer[is-active] video',
        NEXT_BTN: '#navigation-button-down button',
        NEXT_BTN_FALLBACK: '#navigation-button-down ytd-button-renderer button'
    };

    constructor() {
        super('ShortsTools');
        
        this._videoRef = null;
        this._isScrolling = false;

        this._boundHandleEnded = this._onVideoEnded.bind(this);
        this._boundHandleTimeUpdate = this.utils.throttle(this._onTimeUpdate.bind(this), 200);
    }

    getConfigKey() { return 'shortsAutoScroll'; }

    async enable() {
        await super.enable();
        try {
            this._checkAndAttach();
        } catch (e) {
            this.utils.log?.(`Enable error: ${e.message}`, 'ShortsTools', 'error');
        }
    }

    async disable() {
        await super.disable();
        this._videoRef = null;
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (this._isOnShortsPage()) {
            this._checkAndAttach();
        } else {
            this._videoRef = null; // Let BaseFeature handle global cleanup on disable/teardown if needed
        }
    }

    update() {
        if (!this.isEnabled || !this._isOnShortsPage()) return;
        this._checkAndAttach();
    }

    /**
     * @returns {boolean}
     */
    _isOnShortsPage() {
        const path = window.location.pathname;
        return path.startsWith('/shorts/') || path === '/shorts';
    }

    /**
     * Polls for the active short video and attaches listeners
     */
    _checkAndAttach() {
        this.pollFor('active-short-video', ShortsTools.SELECTORS.ACTIVE_VIDEO, (video) => {
            if (this._videoRef !== video) {
                this._attachToVideo(video);
            }
        });
    }

    /**
     * @param {HTMLElement} video 
     */
    _attachToVideo(video) {
        // If we already had a video, we rely on the node being replaced to drop listeners
        // or we remove them explicitly if this.removeListener exists.
        if (this._videoRef && this.removeListener) {
            try {
                this.removeListener(this._videoRef, 'ended', this._boundHandleEnded);
                this.removeListener(this._videoRef, 'timeupdate', this._boundHandleTimeUpdate);
            } catch (e) {}
        } else if (this._videoRef) {
            try {
                this._videoRef.removeEventListener('ended', this._boundHandleEnded);
                this._videoRef.removeEventListener('timeupdate', this._boundHandleTimeUpdate);
            } catch (e) {}
        }

        this._videoRef = video;

        try {
            this.addListener(video, 'ended', this._boundHandleEnded);
            this.addListener(video, 'timeupdate', this._boundHandleTimeUpdate);
            this.utils.log?.('Attached auto-scroll listeners to new Short', 'ShortsTools');
        } catch (error) {
            this.utils.log?.(`Error attaching to video: ${error.message}`, 'ShortsTools', 'error');
        }
    }

    _onVideoEnded() {
        if (!this.isEnabled) return;
        this._scrollToNext();
    }

    _onTimeUpdate() {
        if (!this.isEnabled || !this._videoRef) return;

        const currentTime = this._videoRef.currentTime;
        const duration = this._videoRef.duration;

        if (!duration) return;

        const timeRemaining = duration - currentTime;
        if (timeRemaining <= 0.15 && !this._isScrolling) {
            this._scrollToNext();
        }
    }

    _scrollToNext() {
        if (this._isScrolling) return;

        this._isScrolling = true;
        this.utils.log?.('Auto-scrolling to next Short...', 'ShortsTools');
        
        if (this.utils.createToast) {
             this.utils.createToast('Auto-scrolling...', 'info');
        }

        try {
            const nextBtn = document.querySelector(ShortsTools.SELECTORS.NEXT_BTN) || document.querySelector(ShortsTools.SELECTORS.NEXT_BTN_FALLBACK);
            if (nextBtn) {
                nextBtn.click();
            } else {
                const event = new KeyboardEvent('keydown', {
                    key: 'ArrowDown',
                    code: 'ArrowDown',
                    keyCode: 40,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                document.body.dispatchEvent(event);
            }
        } catch (error) {
            this.utils.log?.(`Scroll error: ${error.message}`, 'ShortsTools', 'error');
        }

        this._finishScroll();
    }

    _finishScroll() {
        setTimeout(() => {
            this._isScrolling = false;
        }, 1500);
    }
};
