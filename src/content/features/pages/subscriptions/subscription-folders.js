/**
 * Subscription Folders — Orchestrator
 * Replaces the heavy "PocketTube" extension with a blazing-fast, strictly styled native implementation.
 * Owns: Navigation routing, feed filtering engine, Play All implementation, and settings lifecycle.
 * Delegates storage to FolderStorage and UI to FolderUI.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubscriptionFolders = class SubscriptionFolders extends window.YPP.features.BaseFeature {
    constructor() {
        // CRITICAL: Must call super() before accessing `this` — sets up name, isEnabled,
        // utils, events, observer, eventListeners, busListeners from BaseFeature.
        super('SubscriptionFolders');

        this.enabled = false;
        this.initialized = false;
        this.activeFolder = null;
        this._isFeedPage = false;

        this.hideShortsActive = false;
        this.hideWatchedActive = false;

        // Fast Set for constant-time lookups during grid rendering
        this.activeChannelSet = new Set();
        // Use shared observer from BaseFeature (set by super()); do NOT override with new instance
        // to avoid unintentionally stopping other features that share the same observer.

        // ── Sub-modules ────────────────────────────────────────────────────
        this.storage = new window.YPP.features.FolderStorage();
        this.ui = new window.YPP.features.FolderUI(this.storage, this);

        // Bound nav handler stored for later removal in disable()
        this._boundHandleNav = () => this.handleNavigation();
        this._boundHandlePopstate = () => setTimeout(() => this.handleNavigation(), 100);

        // Debounced filter — coalesces rapid observer callbacks (e.g. 30 cards loading at once)
        // into a single applyFeedFilters pass per 50ms window.
        this._debouncedApplyFilters = window.YPP.Utils.debounce(
            () => this._applyFeedFiltersNow(),
            50
        );
    }

    getConfigKey() { return 'subscriptionFolders'; }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    async update(settings) {
        this.enabled = !!settings?.subscriptionFolders;
        
        if (!this.enabled) {
            this.disable();
            return;
        }

        if (this.initialized) {
            this.handleNavigation();
            return;
        }
        
        await this.storage.load();
        this.setupNavigationListener();
        this.handleNavigation();
        
        this.initialized = true;
    }

    disable() {
        this.enabled = false;
        // Unregister only OUR observer slots — do NOT call observer.stop() as it
        // is the shared observer used by all features.
        this.observer.unregister('fallback-navigation');
        this.observer.unregister('feed-filter-loop');
        // Remove navigation listeners added in setupNavigationListener()
        document.removeEventListener('yt-navigate-finish', this._boundHandleNav);
        window.removeEventListener('popstate', this._boundHandlePopstate);
        document.body.classList.remove('ypp-sub-folders-active');
        this.ui.removeFilterChips();
        this.ui.removeGuideFolders();
    }

    // =========================================================================
    // NAVIGATION & ROUTING
    // =========================================================================

    setupNavigationListener() {
        this.handleNavigation();
        // Use stored bound references so they can be removed in disable()
        document.addEventListener('yt-navigate-finish', this._boundHandleNav);
        window.addEventListener('popstate', this._boundHandlePopstate);

        this.observer.register('fallback-navigation', 'ytd-app', () => {
            if (!document.getElementById('ypp-sub-folders-container')) {
                this.ui.injectGuideFolders();
            }
            if (this._isFeedPage && !document.getElementById('ypp-folder-chips')) {
                this.setupFeedFilters();
            }
        });
    }

    handleNavigation() {
        if (!this.enabled) return;
        
        const url = window.location.href;
        this.ui.injectGuideFolders();
        this.ui.injectCardBadges();
        
        if (url.includes('/feed/subscriptions')) {
            this._isFeedPage = true;
            this.setupFeedFilters();
        } else {
            this._isFeedPage = false;
            this.clearFeedFilters();
        }

        if (url.includes('/channel/') || url.includes('/@')) {
            this.ui.injectChannelBadge();
        }
    }

    // =========================================================================
    // GETTERS & SETTERS (Called by UI)
    // =========================================================================

    isFeedPage() { return this._isFeedPage; }
    getActiveFolder() { return this.activeFolder; }
    getHideShorts() { return this.hideShortsActive; }
    getHideWatched() { return this.hideWatchedActive; }
    
    setHideShorts(val) { this.hideShortsActive = val; }
    setHideWatched(val) { this.hideWatchedActive = val; }

    setActiveFolder(folderName) {
        if (this.activeFolder === folderName) {
            this.activeFolder = null; // Toggle off
        } else {
            this.activeFolder = folderName;
        }
        this.updateFilterState();
        this.ui.updateChipStylesForFolder(this.activeFolder);
    }

    forceRefreshFeed() {
        if (this.activeFolder) {
            this.activeChannelSet = new Set(this.storage.folders[this.activeFolder] || []);
            this.applyFeedFilters();
        }
    }

    // =========================================================================
    // ENGINE: FEED FILTERING
    // =========================================================================

    setupFeedFilters() {
        const pendingPlayAll = sessionStorage.getItem('ypp_pending_play_all');
        const pendingFolder = sessionStorage.getItem('ypp_pending_folder');
        
        if (pendingPlayAll) {
            this.activeFolder = pendingPlayAll;
            sessionStorage.removeItem('ypp_pending_play_all');
            setTimeout(() => this.playAll(pendingPlayAll), 1000);
        } else if (pendingFolder) {
            this.activeFolder = pendingFolder;
            sessionStorage.removeItem('ypp_pending_folder');
        }
        
        this.ui.renderFilterChips();
        this.updateFilterState();
        
        this.observer.register('feed-filter-loop', 'ytd-rich-grid-renderer #contents ytd-rich-item-renderer', () => {
            if (this.activeFolder || this.hideShortsActive || this.hideWatchedActive) {
                // Debounced: rapid card additions (lazy-load batches) coalesce into one pass
                this._debouncedApplyFilters();
            }
        });
    }

    clearFeedFilters() {
        this.activeFolder = null;
        document.body.classList.remove('ypp-sub-folders-active');
        this.ui.removeFilterChips();
    }

    updateFilterState() {
        if (!this._isFeedPage) return;
        
        if (this.activeFolder) {
            document.body.classList.add('ypp-sub-folders-active');
            this.activeChannelSet = new Set(this.storage.folders[this.activeFolder] || []);
            this.applyFeedFilters();
        } else {
            document.body.classList.remove('ypp-sub-folders-active');
            this.resetFeedVisibility();
        }
    }

    /**
     * Public entry point — always goes through the debounce path so rapid
     * calls (e.g. from setActiveFolder) are still coalesced.
     */
    applyFeedFilters() {
        this._debouncedApplyFilters();
    }

    /**
     * The real filter implementation — called at most once per 50ms window.
     * Caches channel names on card elements (dataset.yppChannel) to avoid
     * repeated textContent lookups across filter passes.
     * @private
     */
    _applyFeedFiltersNow() {
        if (!this._isFeedPage) return;

        const videoCards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer');

        videoCards.forEach(card => {
            let isVisible = true;

            if (this.activeFolder) {
                // Cache channel name on the element — avoids repeated DOM reads
                if (!card.dataset.yppChannel) {
                    const channelLink = card.querySelector('#channel-name a');
                    if (channelLink) {
                        card.dataset.yppChannel = channelLink.textContent.trim();
                    }
                }
                const channelName = card.dataset.yppChannel;
                if (!channelName || !this.activeChannelSet.has(channelName)) isVisible = false;
            }

            if (isVisible && this.hideShortsActive) {
                const isShortsRenderer = card.querySelector('ytd-reel-item-renderer') !== null;
                const hasShortsAttr = card.hasAttribute('is-shorts');
                const hasShortsLink = card.querySelector('a[href^="/shorts/"]') !== null;
                if (isShortsRenderer || hasShortsAttr || hasShortsLink) isVisible = false;
            }

            if (isVisible && this.hideWatchedActive) {
                const progressEl = card.querySelector('#progress');
                if (progressEl) {
                    const progressValue = parseInt(progressEl.style.width, 10);
                    if (!isNaN(progressValue) && progressValue >= 80) isVisible = false;
                }
            }

            if (isVisible) {
                card.style.display = '';
                card.classList.add('ypp-filtered-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('ypp-filtered-in');
            }
        });

        const spinner = document.querySelector('ytd-continuation-item-renderer');
        if (spinner && spinner.getBoundingClientRect().top < window.innerHeight * 2) {
            window.scrollBy(0, 1);
            window.scrollBy(0, -1);
        }
    }

    resetFeedVisibility() {
        if (this.hideShortsActive || this.hideWatchedActive) {
            this.applyFeedFilters();
            return;
        }

        const videoCards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer');
        videoCards.forEach(card => {
            card.style.display = '';
            card.classList.remove('ypp-filtered-in');
            // Clear cached channel name so stale data doesn't persist across navigations
            delete card.dataset.yppChannel;
        });
    }

    // =========================================================================
    // ENGINE: PLAYLIST GENERATOR (PLAY ALL)
    // =========================================================================

    async playAll(folderName) {
        if (!this._isFeedPage || this.activeFolder !== folderName) {
            sessionStorage.setItem('ypp_pending_play_all', folderName);
            const tempLink = document.createElement('a');
            tempLink.href = '/feed/subscriptions';
            document.body.appendChild(tempLink);
            tempLink.click();
            tempLink.remove();
            return;
        }

        window.YPP.Utils.log(`Generating playlist for: ${folderName}`, 'SubFolders');
        if (window.YPP.Utils.createToast) window.YPP.Utils.createToast(`Generating Playlist for ${folderName}...`);
        
        const maxScrolls = 3;
        let scrolls = 0;
        
        const extractAndPlay = () => {
            const videoCards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer.ypp-filtered-in');
            // Use a Set for O(1) deduplication instead of Array.includes() which is O(n)
            const seenIds = new Set();
            const videoIds = [];

            for (const card of videoCards) {
                if (videoIds.length >= 50) break;
                const link = card.querySelector('a#video-title-link, a#video-title, #thumbnail.ytd-thumbnail');
                if (!link?.href) continue;
                try {
                    const vid = new URL(link.href, window.location.origin).searchParams.get('v');
                    if (vid && !seenIds.has(vid)) {
                        seenIds.add(vid);
                        videoIds.push(vid);
                    }
                } catch {
                    // Malformed URL — skip silently
                }
            }

            if (videoIds.length > 0) {
                window.location.href = `/watch_videos?video_ids=${videoIds.join(',')}`;
            } else if (scrolls < maxScrolls) {
                scrolls++;
                window.scrollBy(0, window.innerHeight * 2);
                setTimeout(extractAndPlay, 800);
            } else {
                window.YPP.Utils.createToast?.('No videos found in this folder.', 'error');
            }
        };
        
        setTimeout(extractAndPlay, 500);
    }
};
