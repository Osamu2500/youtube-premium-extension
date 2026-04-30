/**
 * Shorts Tools (Auto-Scroll)
 * Automatically scrolls to the next Short when the current one ends.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ShortsTools = class ShortsTools extends window.YPP.features.BaseFeature {
    constructor() {
        super('ShortsTools');
        
        this._videoRef = null;
        this._isScrolling = false;

        // Bound event handlers for proper cleanup
        this._boundHandleEnded = this._onVideoEnded.bind(this);
        this._boundHandleTimeUpdate = this.utils.throttle(this._onTimeUpdate.bind(this), 200);
    }

    getConfigKey() {
        return 'shortsAutoScroll';
    }

    async enable() {
        await super.enable();
        this._checkAndAttach();
    }

    async disable() {
        await super.disable();
        this._removeVideoListeners();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (this._isOnShortsPage()) {
            this._checkAndAttach();
        } else {
            this._removeVideoListeners();
        }
    }

    // Called frequently in SPA navigations and DOM mutations if defined
    update() {
        if (!this.isEnabled || !this._isOnShortsPage()) return;
        this._checkAndAttach();
    }

    // =========================================================================
    // VIDEO DETECTION
    // =========================================================================

    _isOnShortsPage() {
        const path = window.location.pathname;
        return path.startsWith('/shorts/') || path === '/shorts';
    }

    _checkAndAttach() {
        // Poll for the active video element
        this.pollFor('active-short-video', 'ytd-reel-video-renderer[is-active] video', (video) => {
            if (this._videoRef !== video) {
                this._attachToVideo(video);
            }
        });
    }

    _attachToVideo(video) {
        this._removeVideoListeners();
        this._videoRef = video;

        try {
            // We use standard addEventListener here instead of BaseFeature's addListener
            // because we constantly attach/detach from different video elements as the user scrolls,
            // and we need precise low-level control of this specific cleanup.
            video.addEventListener('ended', this._boundHandleEnded);
            video.addEventListener('timeupdate', this._boundHandleTimeUpdate);
            this.utils.log?.('Attached auto-scroll listeners to new Short', 'ShortsTools');
        } catch (error) {
            this.utils.log?.(`Error attaching to video: ${error.message}`, 'ShortsTools', 'error');
        }
    }

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

    _onVideoEnded() {
        if (!this.isEnabled) return;
        this._scrollToNext();
    }

    _onTimeUpdate() {
        if (!this.isEnabled || !this._videoRef) return;

        const currentTime = this._videoRef.currentTime;
        const duration = this._videoRef.duration;

        if (!duration) return;

        // Handle looped videos: Shorts naturally loop.
        // If we are within the last ~150ms of the video, trigger scroll.
        const timeRemaining = duration - currentTime;
        if (timeRemaining <= 0.15 && !this._isScrolling) {
            this._scrollToNext();
        }
    }

    // =========================================================================
    // SCROLL LOGIC
    // =========================================================================

    _scrollToNext() {
        if (this._isScrolling) return;

        this._isScrolling = true;
        this.utils.log?.('Auto-scrolling to next Short...', 'ShortsTools');
        
        if (this.utils.createToast) {
             this.utils.createToast('Auto-scrolling...', 'info');
        }

        try {
            // Strategy 1: Click next button (Most reliable for SPA state)
            const nextBtn = document.querySelector('ytd-reel-video-renderer[is-active] #navigation-button-down button');
            if (nextBtn) {
                nextBtn.click();
            } else {
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
            }
        } catch (error) {
            this.utils.log?.(`Scroll error: ${error.message}`, 'ShortsTools', 'error');
        }

        this._finishScroll();
    }

    _finishScroll() {
        // Prevents triggering multiple scrolls for the same end-of-video event
        setTimeout(() => {
            this._isScrolling = false;
        }, 1500);
    }
};
