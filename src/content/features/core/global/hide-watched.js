/**
 * Hide Watched Feature
 * Standalone feature that detects and hides watched videos across all YouTube pages.
 *
 * Detection signals (any one is sufficient):
 *   1. ytd-thumbnail-overlay-resume-playback-renderer #progress width ≥ WATCHED_THRESHOLD
 *   2. ytd-thumbnail-overlay-resume-playback-renderer presence (any progress = watched)
 *   3. .ypp-manually-watched class on thumbnail (set by MarkWatched)
 *   4. Video ID present in ypp_manual_watched storage Set (loaded on init/nav)
 *
 * Architecture:
 *   - Uses sharedObserver to continuously watch for new cards added during scrolling
 *   - Retries detection once per card (150ms) when progress bar isn't rendered yet
 *   - Covers: home, subscriptions, search, channel, watch sidebar
 *   - CSS hides via [data-ypp-watched="true"] attribute — never touches style.display directly
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideWatched = class HideWatched extends window.YPP.features.BaseFeature {

    constructor() {
        super('HideWatched');

        // --- Config ---
        // Any progress at or above this % counts as "watched enough to hide"
        this.WATCHED_THRESHOLD = 10;
        this.STORAGE_KEY = 'ypp_manual_watched';

        // Attribute stamped on the parent container when we detect it as watched
        this.ATTR_WATCHED = 'data-ypp-watched';
        // Attribute stamped when we've already processed a container (avoids double-work)
        this.ATTR_PROCESSED = 'data-ypp-hw';
        // Attribute stamped when we've already scheduled a retry for this container
        this.ATTR_RETRY = 'data-ypp-hw-retry';

        // Union selector for all video card types across every page
        this.CONTAINER_SELECTOR = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-compact-video-renderer',
        ].join(', ');

        // In-memory set of manually-watched video IDs (loaded from storage)
        this.manuallyWatchedIds = new Set();

        // Debounce timer for the scan pass
        this._scanTimer = null;

        // Bound handlers (for correct removal)
        this._onNavigation = this._onNavigation.bind(this);
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    getConfigKey() {
        return 'hideWatched';
    }

    async enable() {
        await super.enable();

        // Load manually-watched IDs from storage once upfront
        await this._loadManualIds();

        // Listen for SPA navigation to reload IDs and re-scan
        this.addListener(window, 'yt-navigate-finish', this._onNavigation);
        this.addListener(window, 'yt-page-data-updated', this._onNavigation);

        // Listen for MarkWatched toggling a video's status
        this.onBusEvent('manual_watched_updated', (updatedIds) => {
            this.manuallyWatchedIds = new Set(updatedIds);
            this._scheduleScan();
        });

        // Register with sharedObserver for continuous monitoring of new cards
        this._registerObserver();

        // Initial scan of current page
        this._scheduleScan();

        this.utils?.log('HideWatched enabled', 'HIDE_WATCHED');
    }

    async disable() {
        await super.disable(); // cleanupEvents() handles DOM listeners + busListeners

        // Unregister from shared observer
        if (this.observer) {
            this.observer.unregister('hide-watched');
        }

        // Cancel any pending scan
        if (this._scanTimer) {
            clearTimeout(this._scanTimer);
            this._scanTimer = null;
        }

        // Remove our attribute from all cards so they become visible again
        this._clearAll();

        this.utils?.log('HideWatched disabled', 'HIDE_WATCHED');
    }

    async onUpdate() {
        // Settings changed while feature is enabled — re-scan with latest state
        await this._loadManualIds();
        this._clearAll();
        this._scheduleScan();
    }

    // =========================================================================
    // OBSERVER
    // =========================================================================

    _registerObserver() {
        if (!this.observer) return;

        this.observer.register(
            'hide-watched',
            this.CONTAINER_SELECTOR,
            (elements) => {
                if (!this.settings?.hideWatched) return;

                if (Array.isArray(elements) && elements.length > 0) {
                    elements.forEach(el => this._processContainer(el));
                } else {
                    // Fallback: full scan
                    this._scheduleScan();
                }
            },
            false // don't run immediately — enable() already calls scan
        );
    }

    // =========================================================================
    // NAVIGATION & STORAGE
    // =========================================================================

    async _onNavigation() {
        // Reload manual IDs in case user marked/unmarked something between nav events
        await this._loadManualIds();
        // Give YouTube's SPA ~300ms to render the new page's containers
        setTimeout(() => this._scan(), 300);
    }

    async _loadManualIds() {
        try {
            const data = await chrome.storage.local.get(this.STORAGE_KEY);
            const raw = data[this.STORAGE_KEY];
            this.manuallyWatchedIds = new Set(Array.isArray(raw) ? raw : []);
        } catch (e) {
            this.utils?.log(`Failed to load manual IDs: ${e.message}`, 'HIDE_WATCHED', 'warn');
            this.manuallyWatchedIds = new Set();
        }
    }

    // =========================================================================
    // SCANNING
    // =========================================================================

    /** Debounced entry point — batches rapid DOM mutations into a single scan */
    _scheduleScan(delay = 250) {
        if (this._scanTimer) clearTimeout(this._scanTimer);
        this._scanTimer = setTimeout(() => this._scan(), delay);
    }

    /** The main scan pass — finds all unprocessed containers on the page */
    _scan() {
        if (!this.settings?.hideWatched) return;

        const containers = document.querySelectorAll(this.CONTAINER_SELECTOR);
        containers.forEach(el => this._processContainer(el));

        this.utils?.log(`Scanned ${containers.length} containers`, 'HIDE_WATCHED', 'debug');
    }

    // =========================================================================
    // DETECTION
    // =========================================================================

    /**
     * Process a single video card container.
     * Detects all signals, marks container with data-ypp-watched if watched.
     * @param {HTMLElement} container
     */
    _processContainer(container) {
        if (!container || !container.isConnected) return;

        // Skip already-processed containers
        if (container.hasAttribute(this.ATTR_PROCESSED)) return;

        // --- Signal 1 & 2: YouTube progress bar ---
        const overlay = container.querySelector('ytd-thumbnail-overlay-resume-playback-renderer');
        if (overlay) {
            const bar = overlay.querySelector('#progress');
            if (bar) {
                const pct = parseFloat(bar.style.width);
                if (!isNaN(pct) && pct >= this.WATCHED_THRESHOLD) {
                    this._markWatched(container);
                    return;
                }
            }
            // Overlay present but #progress not found yet (Polymer lazy-renders it).
            // Schedule one retry unless we already did.
            if (!container.hasAttribute(this.ATTR_RETRY)) {
                container.setAttribute(this.ATTR_RETRY, '1');
                setTimeout(() => this._retryContainer(container), 150);
            }
            return; // Don't stamp ATTR_PROCESSED yet — retry will
        }

        // --- Signal 3: .ypp-manually-watched class on a thumbnail inside ---
        if (container.querySelector('.ypp-manually-watched')) {
            this._markWatched(container);
            return;
        }

        // --- Signal 4: Video ID in manual-watched storage ---
        const videoId = this._extractVideoId(container);
        if (videoId && this.manuallyWatchedIds.has(videoId)) {
            this._markWatched(container);
            return;
        }

        // No signal found — stamp as processed (not watched)
        container.setAttribute(this.ATTR_PROCESSED, 'clean');
    }

    /**
     * One-time retry after a brief delay, for containers where the progress
     * bar element hadn't rendered yet on the first pass.
     * @param {HTMLElement} container
     */
    _retryContainer(container) {
        if (!container || !container.isConnected) return;
        if (container.hasAttribute(this.ATTR_PROCESSED)) return;

        const overlay = container.querySelector('ytd-thumbnail-overlay-resume-playback-renderer');
        if (overlay) {
            const bar = overlay.querySelector('#progress');
            if (bar) {
                const pct = parseFloat(bar.style.width);
                if (!isNaN(pct) && pct >= this.WATCHED_THRESHOLD) {
                    this._markWatched(container);
                    return;
                }
            }
            // Overlay present but bar still has no width — treat overlay presence as watched
            // (YouTube shows the overlay only when there IS progress, so presence = watched)
            this._markWatched(container);
            return;
        }

        // Fall through to signals 3 & 4 in case they appeared since first pass
        if (container.querySelector('.ypp-manually-watched')) {
            this._markWatched(container);
            return;
        }
        const videoId = this._extractVideoId(container);
        if (videoId && this.manuallyWatchedIds.has(videoId)) {
            this._markWatched(container);
            return;
        }

        // Still nothing — mark as clean
        container.setAttribute(this.ATTR_PROCESSED, 'clean');
    }

    // =========================================================================
    // MARKING
    // =========================================================================

    /**
     * Stamp a container as watched and let CSS handle hiding.
     * @param {HTMLElement} container
     */
    _markWatched(container) {
        container.setAttribute(this.ATTR_WATCHED, 'true');
        container.setAttribute(this.ATTR_PROCESSED, 'watched');
        this.utils?.log('Marked watched', 'HIDE_WATCHED', 'debug');
    }

    /**
     * Remove all watched markers from every card on the page.
     * Called when feature is disabled so videos re-appear.
     */
    _clearAll() {
        document.querySelectorAll(`[${this.ATTR_WATCHED}],[${this.ATTR_PROCESSED}],[${this.ATTR_RETRY}]`).forEach(el => {
            el.removeAttribute(this.ATTR_WATCHED);
            el.removeAttribute(this.ATTR_PROCESSED);
            el.removeAttribute(this.ATTR_RETRY);
        });
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Extract a YouTube video ID from a container's inner anchor tag.
     * @param {HTMLElement} container
     * @returns {string|null}
     */
    _extractVideoId(container) {
        try {
            const a = container.querySelector('a[href*="/watch?v="]');
            if (!a) return null;
            const url = new URL(a.href, location.origin);
            return url.searchParams.get('v') || null;
        } catch {
            return null;
        }
    }
};
