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

        this._boundSchedule = this._scheduleProcess.bind(this);
        
        this._boundProcessCards = this._processCards.bind(this);
        this._boundProcessProgress = this._processProgressBatch.bind(this);
    }

    getConfigKey() { return 'hideWatched'; }

    // =========================================================================
    // Lifecycle
    // =========================================================================

    async enable() {
        await super.enable();
        
        this._updateBodyClass();
        
        // Initial full page scan
        this._processCards();

        // React to SPA navigation (clear cache + re-process whole page)
        this.onBusEvent('page:changed', () => {
            this._processCards();
        });
        
        // React to user manually marking/unmarking from MarkWatched
        this.onBusEvent('watched:updated', () => {
            this._processCards();
        });
        
        if (window.YPP && window.YPP.sharedObserver) {
            // dom:mutated fires with MutationRecord[] — extract added card nodes
            // directly so we avoid a full querySelectorAll sweep on every mutation.
            this.onBusEvent('dom:mutated', (mutations) => this._processMutatedNodes(mutations));
            window.YPP.sharedObserver.register('hide-watched-progress', 'ytd-thumbnail-overlay-resume-playback-renderer, .thumbnail-overlay-resume-playback-progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment', this._boundProcessProgress, false);
        }
    }

    async disable() {
        await super.disable(); // cleanupEvents + cleanupBusListeners via BaseFeature

        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
        
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('hide-watched-cards');
            window.YPP.sharedObserver.unregister('hide-watched-progress');
        }

        document.body.classList.remove('ypp-watched-mode-hide', 'ypp-watched-mode-dim');

        // Restore all hidden/dimmed cards by removing the data attribute
        document.querySelectorAll('[data-ypp-watched]').forEach(card => {
            card.removeAttribute('data-ypp-watched');
        });

        // Clear processing stamps so re-enabling works instantly
        document.querySelectorAll('[data-ypp-watched-processed]').forEach(card => {
            delete card.dataset.yppWatchedProcessed;
        });
    }

    async onUpdate() {
        this._updateBodyClass();
        // Re-evaluate every card (mode may have switched dim ↔ hide)
        document.querySelectorAll('[data-ypp-watched]').forEach(card => {
            card.removeAttribute('data-ypp-watched');
        });
        document.querySelectorAll('[data-ypp-watched-processed]').forEach(card => {
            delete card.dataset.yppWatchedProcessed;
        });
        this._processCards();
    }

    // =========================================================================
    // Mode toggling
    // =========================================================================

    _updateBodyClass() {
        const mode = this.settings?.hideWatchedMode || 'dim';
        if (mode === 'hide') {
            document.body.classList.add('ypp-watched-mode-hide');
            document.body.classList.remove('ypp-watched-mode-dim');
        } else {
            document.body.classList.add('ypp-watched-mode-dim');
            document.body.classList.remove('ypp-watched-mode-hide');
        }
    }

    // =========================================================================
    // Scheduling (debounce)
    // =========================================================================

    _scheduleProcess() {
        if (!this.isEnabled) return;
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._debounceTimer = null;
            this._processCards();
        }, 150);
    }

    /**
     * Process only the nodes that arrived in a mutation batch — avoids
     * a full document.querySelectorAll sweep on every DOM change.
     * @param {MutationRecord[]} mutations
     */
    _processMutatedNodes(mutations) {
        if (!this.isEnabled || !Array.isArray(mutations)) return;
        const watchedIds = this._getWatchedIds();
        const threshold  = this.settings?.hideWatchedThreshold ?? 80;

        for (const mutation of mutations) {
            const added = mutation.addedNodes;
            for (let i = 0; i < added.length; i++) {
                const node = added[i];
                if (node.nodeType !== Node.ELEMENT_NODE || !node.isConnected) continue;

                // Check if the node itself is a card
                if (node.matches?.(HideWatched.CARD_SELECTORS)) {
                    this._evaluateCard(node, watchedIds, threshold);
                }

                // Also check card descendants (e.g. when a shelf is inserted)
                if (node.querySelectorAll) {
                    node.querySelectorAll(HideWatched.CARD_SELECTORS).forEach(card => {
                        this._evaluateCard(card, watchedIds, threshold);
                    });
                }
            }
        }
    }

    // =========================================================================
    // Detection helpers
    // =========================================================================

    /** Get watched IDs from the shared WatchedStore singleton. */
    _getWatchedIds() {
        return window.YPP.WatchedStore?.getAll() ?? new Set();
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
        // Query the main overlay element first (supports legacy and modern view-models)
        const activeRenderer = card.querySelector('ytd-thumbnail-overlay-resume-playback-renderer, .thumbnail-overlay-resume-playback-progress, .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment');
        // If it's explicitly hidden by YouTube using inline display:none, skip it.
        if (!activeRenderer || window.getComputedStyle(activeRenderer).display === 'none') return null;

        const progressBar = activeRenderer.querySelector('#progress') || 
                            activeRenderer.querySelector('div[style*="width"]') ||
                            activeRenderer;

        const widthStyle = progressBar.style.width;
        if (!widthStyle) return 100; // If it exists but we can't parse width, assume 100% watched
        
        const pct = parseFloat(widthStyle);
        return isNaN(pct) ? 100 : pct;
    }

    _hasWatchedBadge(card) {
        // Find any badge that could represent "WATCHED"
        const badges = card.querySelectorAll('ytd-badge-supported-renderer, ytd-thumbnail-overlay-bottom-panel-renderer, ytd-thumbnail-overlay-playback-status-renderer');
        for (const badge of badges) {
            if (window.getComputedStyle(badge).display === 'none') continue;
            
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

    _processProgressBatch(progressBars) {
        if (!this.isEnabled) return;
        
        const watchedIds = this._getWatchedIds();
        const threshold = this.settings?.hideWatchedThreshold ?? 80;
        
        progressBars.forEach(bar => {
            const card = bar.closest(HideWatched.CARD_SELECTORS);
            if (card) {
                this._evaluateCard(card, watchedIds, threshold);
            }
        });
    }

    _processCards(elements = null) {
        if (!this.isEnabled) return;

        const watchedIds = this._getWatchedIds();
        const threshold = this.settings?.hideWatchedThreshold ?? 80;

        const cardsToProcess = elements || document.querySelectorAll(HideWatched.CARD_SELECTORS);

        cardsToProcess.forEach(card => {
            this._evaluateCard(card, watchedIds, threshold);
        });
    }
    
    _evaluateCard(card, watchedIds, threshold) {
        try {
            // Ignore fully hidden cards to skip wasteful processing
            if (card.hasAttribute('hidden') || card.style.display === 'none') return;

            const videoId = this._getVideoId(card);
            const progress = this._getWatchProgress(card);
            
            // PERFORMANCE: DOM Stamping to prevent re-evaluating the exact same state
            // YouTube recycles DOM nodes, so we must include the videoId and progress in the stamp
            const stampKey = `${videoId || 'unknown'}-${threshold}-${progress || 0}`;
            if (card.dataset.yppWatchedProcessed === stampKey) return;
            card.dataset.yppWatchedProcessed = stampKey;

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
            this.utils.log(err.message, 'HIDE_WATCHED', 'debug');
        }
    }
};
