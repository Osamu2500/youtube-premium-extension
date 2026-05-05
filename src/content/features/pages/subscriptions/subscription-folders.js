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
        this._durationFilter = 'all';
        this._dateFilter = 'all';
        this._sortFilter = 'latest';

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

        window.YPP.events?.on('subscriptions:filter-changed', (filters) => {
            this._durationFilter = filters.duration || 'all';
            this._dateFilter = filters.date || 'all';
            this._sortFilter = filters.sort || 'latest';
            this.applyFeedFilters();
        });
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
            if (this.activeFolder || this.hideShortsActive || this.hideWatchedActive || this._durationFilter !== 'all' || this._dateFilter !== 'all' || this._sortFilter !== 'latest') {
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
            this.activeChannelSet = new Set();
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

    _parseDurationSeconds(card) {
        const badge = card.querySelector(
            'ytd-thumbnail-overlay-time-status-renderer span, ' +
            '.badge-shape-wiz__text'
        );
        if (!badge) return null;

        const text = badge.textContent.trim().replace(/\s+/g, '');
        const parts = text.split(':').map(Number);

        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return null;
    }

    _parseDateScore(card) {
        // Returns a score — higher = more recent
        const meta = card.querySelector('#metadata-line span:last-child, ' +
            '.inline-metadata-item:last-child');
        if (!meta) return 0;

        const text = meta.textContent.toLowerCase().trim();

        if (text.includes('hour') || text.includes('minute') || 
            text.includes('just now')) return 4; // today
        if (text.includes('day') && !text.includes('week')) {
            const days = parseInt(text) || 1;
            return days <= 7 ? 3 : days <= 30 ? 2 : 1;
        }
        if (text.includes('week')) {
            const weeks = parseInt(text) || 1;
            return weeks <= 4 ? 2 : 1;
        }
        if (text.includes('month')) return 1;
        return 0; // year or unknown
    }

    _parseDaysAgo(card) {
        const meta = card.querySelector('#metadata-line span:last-child, .inline-metadata-item:last-child');
        if (!meta) return 9999;
        const text = meta.textContent.toLowerCase().trim();
        if (text.includes('hour') || text.includes('minute') || text.includes('just now')) return 0;
        if (text.includes('day') && !text.includes('week')) return parseInt(text) || 1;
        if (text.includes('week')) return (parseInt(text) || 1) * 7;
        if (text.includes('month')) return (parseInt(text) || 1) * 30;
        if (text.includes('year')) return (parseInt(text) || 1) * 365;
        return 9999;
    }

    _matchesDurationFilter(card) {
        if (this._durationFilter === 'all') return true;
        const secs = this._parseDurationSeconds(card);
        if (secs === null) return true; // unknown — show it

        if (this._durationFilter.startsWith('custom:')) {
            const maxMins = parseInt(this._durationFilter.split(':')[1], 10);
            return secs <= maxMins * 60;
        }

        switch (this._durationFilter) {
            case 'short':  return secs < 300;         // under 5 min
            case 'medium': return secs >= 300 && secs <= 1200; // 5-20 min
            case 'long':   return secs > 1200;        // over 20 min
            default: return true;
        }
    }

    _matchesDateFilter(card) {
        if (this._dateFilter === 'all') return true;
        
        if (this._dateFilter.startsWith('custom:')) {
            const maxDays = parseInt(this._dateFilter.split(':')[1], 10);
            return this._parseDaysAgo(card) <= maxDays;
        }

        const score = this._parseDateScore(card);

        switch (this._dateFilter) {
            case 'today': return score >= 4;
            case 'week':  return score >= 3;
            case 'month': return score >= 2;
            default: return true;
        }
    }

    _applySortOrder(container) {
        if (this._sortFilter === 'latest') return; // Default YouTube order

        const cards = [...container.querySelectorAll(
            'ytd-rich-item-renderer:not([style*="display: none"])'
        )];

        cards.sort((a, b) => {
            if (this._sortFilter === 'oldest') {
                return this._parseDateScore(a) - this._parseDateScore(b);
            }
            if (this._sortFilter === 'longest') {
                return (this._parseDurationSeconds(b) || 0) - 
                       (this._parseDurationSeconds(a) || 0);
            }
            if (this._sortFilter === 'shortest') {
                return (this._parseDurationSeconds(a) || 0) - 
                       (this._parseDurationSeconds(b) || 0);
            }
            return 0;
        });

        cards.forEach(card => container.appendChild(card));
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

            if (isVisible && !this._matchesDurationFilter(card)) isVisible = false;
            if (isVisible && !this._matchesDateFilter(card)) isVisible = false;

            if (isVisible) {
                card.style.display = '';
                card.classList.add('ypp-filtered-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('ypp-filtered-in');
            }
        });

        const container = document.querySelector('ytd-rich-grid-renderer #contents');
        if (container) {
            this._applySortOrder(container);
        }

        const spinner = document.querySelector('ytd-continuation-item-renderer');
        if (spinner && spinner.getBoundingClientRect().top < window.innerHeight * 2) {
            window.scrollBy(0, 1);
            window.scrollBy(0, -1);
        }
    }

    resetFeedVisibility() {
        if (this.hideShortsActive || this.hideWatchedActive || this._durationFilter !== 'all' || this._dateFilter !== 'all' || this._sortFilter !== 'latest') {
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
