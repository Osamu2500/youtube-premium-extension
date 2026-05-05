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

        // Don't attempt twice for same video
        if (this._attempted.has(videoId)) return;

        // Wait for player and like button to render
        this._waitAndLike(videoId);
    }

    _waitAndLike(videoId, attempts = 0) {
        if (attempts > 20) return; // Give up after 10 seconds

        const likeBtn = this._getLikeButton();
        if (!likeBtn) {
            setTimeout(() => this._waitAndLike(videoId, attempts + 1), 500);
            return;
        }

        // Check if already liked — do NOT interfere
        const isLiked = this._isAlreadyLiked(likeBtn);
        if (isLiked) {
            this._attempted.add(videoId);
            return;
        }

        // Mark as attempted before clicking to prevent double-click
        this._attempted.add(videoId);

        // Click the like button
        likeBtn.click();

        window.YPP.Utils?.log(
            `Auto-liked video: ${videoId}`, 'AUTO-LIKE', 'info'
        );
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

        return isPressed || isActive || !!parentActive;
    }
};
