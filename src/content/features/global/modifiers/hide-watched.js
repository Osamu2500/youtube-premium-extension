window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * HideWatched
 * -----------
 * Hides or dims video cards that have been watched using a layered
 * detection strategy:
 *
 *   1. Manual list  — IDs marked by the MarkWatched feature (persisted in storage)
 *   2. YouTube's native progress bar (ytd-thumbnail-overlay-resume-playback-renderer)
 *   3. YouTube's "WATCHED" / "VIEWED" badge (ytd-badge-supported-renderer)
 *
 * Hiding is done via a CSS class (`ypp-is-watched`) so YouTube's virtual-DOM
 * recycling cannot strip inline styles. A <style> tag injected into the page
 * does the actual visual work — making toggling near-instant.
 *
 * Processing is debounced (100 ms) to batch rapid-fire dom:nodes-added events.
 */
window.YPP.features.HideWatched = class HideWatched extends window.YPP.features.BaseFeature {
    // Compiled Regular Expressions for performance
    static WATCH_URL_REGEX = /[?&]v=([^&]+)/;
    static SHORTS_URL_REGEX = /\/shorts\/([A-Za-z0-9_-]{11})/;

    // Centralized CSS Selectors for maintainability
    static CARD_SELECTORS = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-reel-item-renderer',           // Shorts shelf cards
        'ytd-playlist-video-renderer',      // Playlist items
        'ytd-playlist-panel-video-renderer' // Playlist sidebar items
    ].join(',');

    constructor() {
        super('HideWatched');

        // Debounce timer handle
        this._debounceTimer = null;
        this._pollingInterval = null;

        // Bound references for bus cleanup
        this._boundSchedule = this._scheduleProcess.bind(this);

        // The injected <style> element (created once on enable, destroyed on disable)
        this._styleEl = null;
    }

    getConfigKey() { return 'hideWatched'; }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    async enable() {
        await super.enable();
        
        // Safeguard against duplicate interval timers


        this._injectStyle();
        this._processCards();

        // React to new cards appearing (infinite scroll, page load)
        this.onBusEvent('dom:nodes-added', this._boundSchedule);
        // React to SPA navigation (clear cache + re-process)
        this.onBusEvent('page:changed', () => {
            this._scheduleProcess();
        });
        // React to user manually marking/unmarking from MarkWatched
        this.onBusEvent('watched:updated', this._boundSchedule);
        
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('hide-watched-progress', 'ytd-thumbnail-overlay-resume-playback-renderer', () => {
                if (this.isEnabled && document.visibilityState === 'visible') {
                    this._scheduleProcess();
                }
            }, false);
        }
    }

    async disable() {
        await super.disable(); // cleanupEvents + cleanupBusListeners via BaseFeature

        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('hide-watched-progress');
        }

        // Remove injected style so CSS rules disappear instantly
        if (this._styleEl) {
            this._styleEl.remove();
            this._styleEl = null;
        }

        // Restore all hidden/dimmed cards by removing the data attribute
        document.querySelectorAll('[data-ypp-watched]').forEach(card => {
            card.removeAttribute('data-ypp-watched');
        });
    }

    /**
     * Called by BaseFeature when settings change while already enabled.
     * Re-injects the style (mode/threshold may have changed) and re-processes.
     */
    async onUpdate() {
        this._injectStyle();
        // Re-evaluate every card (mode may have switched dim ↔ hide)
        document.querySelectorAll('[data-ypp-watched]').forEach(card => {
            card.removeAttribute('data-ypp-watched');
        });
        this._scheduleProcess();
    }

    // =========================================================================
    // Style injection
    // =========================================================================

    _injectStyle() {
        const mode = this.settings?.hideWatchedMode || 'dim';
        const styleText = mode === 'hide' 
            ? `\n                [data-ypp-watched="1"] {\n                    display: none !important;\n                }\n            `
            : `\n                [data-ypp-watched="1"] {\n                    opacity: 0.25 !important;\n                    filter: grayscale(80%) !important;\n                    transition: opacity 0.25s ease, filter 0.25s ease !important;\n                }\n                [data-ypp-watched="1"]:hover {\n                    opacity: 0.8 !important;\n                    filter: grayscale(0%) !important;\n                }\n            `;

        if (!this._styleEl) {
            this._styleEl = document.createElement('style');
            this._styleEl.id = 'ypp-hide-watched-style';
            (document.head || document.documentElement).appendChild(this._styleEl);
        }

        // Only update DOM if the generated CSS rules actually changed to avoid layout thrashing
        if (this._styleEl.textContent !== styleText) {
            this._styleEl.textContent = styleText;
        }
    }

    // =========================================================================
    // Scheduling (debounce)
    // =========================================================================

    _scheduleProcess() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => this._processCards(), 100);
    }

    // =========================================================================
    // Detection helpers
    // =========================================================================

    /** Get the MarkWatched feature's in-memory Set of watched IDs. */
    _getWatchedIds() {
        try {
            const markWatched = window.YPP?.MainApp?.featureManager?.getFeature('markWatched');
            if (markWatched?._watchedIds instanceof Set) {
                return markWatched._watchedIds;
            }
        } catch (e) {
            // Silently fallback if featureManager isn't fully initialized
        }
        return new Set();
    }

    _getVideoId(card) {
        // Strategy 1: Fast O(1) data attribute lookup (most reliable for recycled DOM)
        const attrId = card.dataset.videoId || card.dataset.ytVideoId || card.getAttribute('video-id');
        if (attrId) return attrId;

        const thumb = card.querySelector('ytd-thumbnail[video-id]');
        if (thumb) {
            const thumbId = thumb.getAttribute('video-id');
            if (thumbId) return thumbId;
        }

        // Strategy 2: Anchor parsing (fallback for custom or modified layouts)
        const anchor = card.querySelector('a#thumbnail') || card.querySelector('a[href]');
        if (anchor) {
            const href = anchor.getAttribute('href') || '';
            const watchMatch = href.match(HideWatched.WATCH_URL_REGEX);
            if (watchMatch) return watchMatch[1];
            
            const shortsMatch = href.match(HideWatched.SHORTS_URL_REGEX);
            if (shortsMatch) return shortsMatch[1];
        }

        return null;
    }

    _getWatchProgress(card) {
        // Optimization: Use querySelector directly with CSS pseudo-class to skip hidden elements
        const activeRenderer = card.querySelector('ytd-thumbnail-overlay-resume-playback-renderer:not([hidden])');
        if (!activeRenderer || activeRenderer.style.display === 'none') return null;

        const progressBar = activeRenderer.querySelector('#progress') || activeRenderer.querySelector('div[style*="width"]');
        if (!progressBar) return null;

        const widthStyle = progressBar.style.width;
        if (!widthStyle) return null;
        
        const pct = parseFloat(widthStyle);
        return isNaN(pct) ? null : pct;
    }

    _hasWatchedBadge(card) {
        // Use CSS pseudo-class to pre-filter hidden nodes natively
        // Note: A card can have multiple badges (e.g., 'CC', '4K', 'WATCHED'). We must iterate.
        const badges = card.querySelectorAll('ytd-badge-supported-renderer:not([hidden]), ytd-thumbnail-overlay-bottom-panel-renderer:not([hidden]), ytd-thumbnail-overlay-playback-status-renderer:not([hidden])');
        for (const badge of badges) {
            if (badge.style.display === 'none') continue;
            
            // Text comparison is localization-fragile but preserves original intended behavior
            const text = badge.textContent.trim().toUpperCase();
            if (text === 'WATCHED' || text === 'VIEWED' || text === 'PLAYED') return true;
        }
        return false;
    }

    /**
     * Determine whether a card counts as "watched" using all detection strategies.
     */
    _isWatched(card, videoId, watchedIds, threshold) {
        // Priority 1: manual mark list (instant, most accurate)
        if (videoId && watchedIds.has(videoId)) return true;

        // Priority 2: YouTube native progress bar
        const progress = this._getWatchProgress(card);
        // Important: check if progress is not null to avoid 0 >= 0 causing everything to hide
        if (progress !== null && progress >= threshold) return true;

        // Priority 3: WATCHED badge
        if (this._hasWatchedBadge(card)) return true;

        return false;
    }

    // =========================================================================
    // Main processing loop
    // =========================================================================

    _processCards() {
        if (!this.isEnabled) return;

        const watchedIds = this._getWatchedIds();
        const threshold = this.settings?.hideWatchedThreshold ?? 80;

        document.querySelectorAll(HideWatched.CARD_SELECTORS).forEach(card => {
            try {
                // Ignore fully hidden cards to skip wasteful processing
                if (card.hasAttribute('hidden') || card.style.display === 'none') return;

                const videoId = this._getVideoId(card);
                const watched = this._isWatched(card, videoId, watchedIds, threshold);

                const currentlyMarked = card.getAttribute('data-ypp-watched') === '1';

                if (watched && !currentlyMarked) {
                    card.setAttribute('data-ypp-watched', '1');
                } else if (!watched && currentlyMarked) {
                    card.removeAttribute('data-ypp-watched');
                }
            } catch (err) {
                // Silently trap and ignore individual card processing errors
                // This ensures a single malformed DOM node doesn't break the entire sweep
            }
        });
    }
};
