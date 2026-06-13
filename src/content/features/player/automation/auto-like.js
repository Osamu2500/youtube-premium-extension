window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoLike = class AutoLike
    extends window.YPP.features.BaseFeature {

    constructor() {
        super('AutoLike');
        this._bound = this._tryLike.bind(this);
        this._attempted = new Set(); // Track per video ID
    }

    getConfigKey() { return 'autoLike'; }

    async enable() {
        await super.enable();
        this._tryLike();
        window.YPP.events?.on('page:changed', this._bound);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._bound);
        this._attempted.clear();
    }

    _tryLike() {
        // Only on watch pages
        if (!document.body.classList.contains('ypp-watch-page')) return;

        // Get current video ID
        const url = window.location.href;
        const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
        if (!videoId) return;

        // Don't attempt twice for same video (check memory and persistent storage)
        if (this._attempted.has(videoId) || localStorage.getItem(`ypp_liked_${videoId}`)) return;

        this._waitForPercentage(videoId);
    }

    async _waitForPercentage(videoId) {
        try {
            const video = await this.waitForElement('video.html5-main-video', 15000);
            if (!video) return;

            const checkProgress = () => {
                const currentUrl = window.location.href;
                const currentVideoId = currentUrl.match(/[?&]v=([^&]+)/)?.[1];
                
                // Abort if user navigated away
                if (currentVideoId !== videoId) {
                    video.removeEventListener('timeupdate', checkProgress);
                    return;
                }

                const targetPercentage = this.settings?.autoLikeThreshold ?? 50;
                
                const percentage = (video.currentTime / video.duration) * 100;
                if (percentage >= targetPercentage || video.ended) {
                    video.removeEventListener('timeupdate', checkProgress);
                    this._waitAndLike(videoId);
                }
            };

            video.addEventListener('timeupdate', checkProgress);
        } catch (e) {
            // Timeout or abort
        }
    }

    async _waitAndLike(videoId) {
        try {
            let likeBtn = this._getLikeButton();
            if (!likeBtn) {
                // Wait up to 10 seconds for the button to appear
                likeBtn = await this.waitForElement(
                    'ytd-watch-metadata ytd-toggle-button-renderer:first-child button, segmented-like-dislike-button-view-model button:first-child, like-button-view-model button, [aria-label*="like this video"], [aria-label*="I like this"]',
                    10000
                );
            }
            if (!likeBtn) likeBtn = this._getLikeButton();
            if (!likeBtn) return;

            // Check if already liked — do NOT interfere
            const isLiked = this._isAlreadyLiked(likeBtn);
            if (isLiked) {
                this._markAttempted(videoId);
                return;
            }

            // Dislike Protection: check if user explicitly disliked
            const isDisliked = this._isDisliked();
            if (isDisliked) {
                this.utils?.log?.(`User disliked video ${videoId}, skipping auto-like`, 'AUTO-LIKE', 'info');
                this._markAttempted(videoId);
                return;
            }

            // Click the like button
            likeBtn.click();
            this._markAttempted(videoId);

            window.YPP.Utils?.log(
                `Auto-liked video: ${videoId}`, 'AUTO-LIKE', 'info'
            );
        } catch (e) {
            // Timeout or abort
        }
    }

    _markAttempted(videoId) {
        this._attempted.add(videoId);
        try {
            localStorage.setItem(`ypp_liked_${videoId}`, 'true');
        } catch(e) {}
    }

    _getLikeButton() {
        // Try multiple selectors — YouTube changes these
        const selectors = [
            // Main like button
            'ytd-watch-metadata ytd-toggle-button-renderer:first-child button',
            // Segmented like button (newer YouTube UI)
            'segmented-like-dislike-button-view-model button:first-child',
            'like-button-view-model button',
            // Fallback
            '[aria-label*="like this video"]',
            '[aria-label*="I like this"]',
        ];

        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) return btn;
        }
        return null;
    }

    _isDisliked() {
        const selectors = [
            'dislike-button-view-model button',
            '[aria-label*="dislike this video"]',
            '[aria-label*="I dislike this"]'
        ];
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) {
                const isPressed = btn.getAttribute('aria-pressed') === 'true';
                const isActive = btn.classList.contains('active') || btn.classList.contains('style-default-active');
                if (isPressed || isActive) return true;
            }
        }
        return false;
    }

    _isAlreadyLiked(likeBtn) {
        // Check multiple signals that indicate already liked
        const isPressed = likeBtn.getAttribute('aria-pressed') === 'true';
        const isActive = likeBtn.classList.contains('active') ||
                         likeBtn.classList.contains('style-default-active');
        const parentActive = likeBtn.closest(
            '[class*="active"], [aria-pressed="true"]'
        );

        // Check the like count color — YouTube turns it blue when liked
        const svgPath = likeBtn.querySelector('path');
        const isFilled = svgPath?.getAttribute('fill-rule') === 'evenodd';

        return isPressed || isActive || !!parentActive || isFilled;
    }
};
