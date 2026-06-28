/**
 * Subscription Folders — Orchestrator
 * Replaces the heavy "PocketTube" extension with a blazing-fast, strictly styled native implementation.
 * Owns: Navigation routing, feed filtering engine, Play All implementation, and settings lifecycle.
 * Delegates storage to FolderStorage and UI to FolderUI.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SubscriptionFolders = class SubscriptionFolders extends window.YPP.features.BaseFeature {
    static SELECTORS = {
        FEED_CARDS: 'ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer, ytd-browse[page-subtype="subscriptions"] ytd-video-renderer',
        FEED_CONTAINER: 'ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer #contents, ytd-browse[page-subtype="subscriptions"] ytd-item-section-renderer #contents',
        CONTINUATION: 'ytd-continuation-item-renderer'
    };

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
        this._boundHandlePopstate = () => window.YPP.events?.on('app:pageChange', this._boundHandleNav);

        // Debounced filter — coalesces rapid observer callbacks (e.g. 30 cards loading at once)
        // into a single applyFeedFilters pass per 50ms window.
        this._debouncedApplyFilters = window.YPP.Utils.debounce(
            () => this._applyFeedFiltersNow(),
            50
        );

        // Store the unsub handle so _teardown() can remove it cleanly
        this._filterChangedUnsub = window.YPP.events?.on('subscriptions:filter-changed', (filters) => {
            this._durationFilter = filters.duration || 'all';
            this._dateFilter = filters.date || 'all';
            this._sortFilter = filters.sort || 'latest';
            this.updateFilterState();
        });

        this._storageChangedUnsub = window.YPP.events?.on('storage:changed:ypp_subscription_folders', async (newFolders) => {
            if (newFolders) {
                this.storage.folders = newFolders;
                if (this.activeFolder) {
                    this.forceRefreshFeed();
                }
            }
        });
    }

    getConfigKey() { return null; }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================



    async enable() {
        this.enabled = this.settings.subscriptionFolders !== false || 
                       this.settings.enableFilterBar !== false || 
                       this.settings.enableChannelHealth !== false;
        
        if (!this.enabled) {
            this.disable();
            return;
        }

        if (this.initialized) {
            this.handleNavigation();
            return;
        }
        
        await this.storage.load();
        this._injectGridCSS();
        this.setupNavigationListener();
        this.handleNavigation();
        
        this.initialized = true;
    }

    async onUpdate() {
        await this.enable();
    }

    _injectGridCSS() {
        if (document.getElementById('ypp-sub-grid-override')) return;
        const style = document.createElement('style');
        style.id = 'ypp-sub-grid-override';
        style.textContent = `
            /* Completely flatten YouTube's rigid row structure */
            ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer #contents > ytd-rich-grid-row {
                display: contents !important;
            }

            /* Take over the main contents container and make it a fluid CSS Grid */
            ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer > #contents {
                display: grid !important;
                grid-template-columns: repeat(var(--ypp-subscriptions-columns, 4), minmax(0, 1fr)) !important;
                grid-gap: 16px !important;
                width: 100% !important;
            }

            /* Ensure items stretch to fill the grid cells */
            ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer {
                margin: 0 !important;
                width: 100% !important;
                max-width: none !important;
            }
        `;
        document.head.appendChild(style);
    }



    // =========================================================================
    // LIFECYCLE MANAGER CONTRACT
    // =========================================================================

    /**
     * Returns true when this feature should be active on the current page.
     * Called by LifecycleManager on every yt-navigate-finish event.
     */
    shouldRunOnCurrentPage() {
        const path = window.location.pathname;
        return (
            path.startsWith('/feed/subscriptions') ||
            path.startsWith('/feed/channels') ||
            path.startsWith('/@') ||
            /^\/channel\//.test(path)
        );
    }

    /**
     * Abort-aware initializer called by LifecycleManager.
     * Wraps the existing update() call.
     * @param {AbortSignal} [signal]
     */
    async init(signal) {
        if (signal?.aborted) return;
        this._injectNetworkInterceptor();
        await this.update(this.settings);
        if (signal?.aborted) {
            this._teardown();
        }
    }

    _injectNetworkInterceptor() {
        if (document.getElementById('ypp-network-interceptor')) return;
        const script = document.createElement('script');
        script.id = 'ypp-network-interceptor';
        script.src = chrome.runtime.getURL('src/inject/networkInterceptor.js');
        (document.head || document.documentElement).appendChild(script);
    }

    /**
     * Full cleanup — called by LifecycleManager instead of disable().
     * Adds: debounce cancel, EventBus unsub, popover listener removal.
     * Delegates to disable() for DOM and observer cleanup.
     */
    _teardown() {
        // Cancel the debounced filter to stop any pending post-teardown DOM mutations
        if (this._debouncedApplyFilters?.cancel) {
            this._debouncedApplyFilters.cancel();
        }

        // Remove EventBus subscription registered in constructor
        if (this._filterChangedUnsub) {
            this._filterChangedUnsub();
            this._filterChangedUnsub = null;
        }

        if (this._storageChangedUnsub) {
            this._storageChangedUnsub();
            this._storageChangedUnsub = null;
        }

        // Delegate to disable() for full cleanup
        this.disable();
    }

    // =========================================================================
    // NAVIGATION & ROUTING
    // =========================================================================

    async disable() {
        await super.disable();

        // Cancel debounced filters
        if (this._debouncedApplyFilters?.cancel) {
            this._debouncedApplyFilters.cancel();
        }

        // Remove EventBus subscription
        if (this._filterChangedUnsub) {
            this._filterChangedUnsub();
            this._filterChangedUnsub = null;
        }
        
        if (this._storageChangedUnsub) {
            this._storageChangedUnsub();
            this._storageChangedUnsub = null;
        }

        // Remove popover click-outside handler
        if (this.ui?._popoverClickOutsideHandler) {
            document.removeEventListener('click', this.ui._popoverClickOutsideHandler);
            this.ui._popoverClickOutsideHandler = null;
            this.ui._popoverListenerAttached = false;
        }

        // Remove DOM nodes
        this.ui?.removeGuideFolders?.();
        this.ui?.removeFilterChips?.();

        const gridOverride = document.getElementById('ypp-sub-grid-override');
        if (gridOverride) gridOverride.remove();

        const popover = document.getElementById('ypp-folder-popover');
        if (popover) popover.remove();

        const modal = document.getElementById('ypp-health-modal');
        if (modal) modal.remove();

        document.querySelectorAll('.ypp-card-folder-btn, .ypp-feed-folder-indicator').forEach(e => e.remove());
        document.getElementById('ypp-channel-folder-btn')?.remove();

        // Clear observer registrations specific to this feature
        this.observer?.unregister?.('feed-card-badges');
        this.observer?.unregister?.('channel-badge');
        this.observer?.unregister?.('fallback-navigation');
        this.observer?.unregister?.('feed-filter-loop');

        // Reset feed cards to visible
        document.querySelectorAll('ytd-rich-item-renderer.ypp-filtered-out').forEach(card => {
            card.classList.remove('ypp-filtered-out');
            card.style.display = '';
        });

        this.initialized = false;
    }

    setupNavigationListener() {
        this.handleNavigation();
        this.addListener(window, 'yt-navigate-finish', this._boundHandleNav);
        this.addListener(window, 'popstate', this._boundHandlePopstate);

        this.observer.register('fallback-navigation', 'ytd-app', () => {
            if (this.settings?.enableSubsManager !== false && !document.getElementById('ypp-sub-folders-container')) {
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
        
        if (this.settings?.enableSubsManager !== false) {
            this.ui.injectGuideFolders();
        } else {
            this.ui.removeGuideFolders();
        }
        
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

    /**
     * Toggle-style setter — used by sidebar folder items.
     * Clicking the active folder deactivates it; clicking another activates it.
     */
    setActiveFolder(folderName, multiSelect = false) {
        if (!folderName) {
            this.activeFolder = null;
        } else if (multiSelect && this.activeFolder && this.activeFolder !== '__no_folder__') {
            let folders = this.activeFolder.split(',').map(f => f.trim());
            if (folders.includes(folderName)) {
                folders = folders.filter(f => f !== folderName);
            } else {
                folders.push(folderName);
            }
            this.activeFolder = folders.length > 0 ? folders.join(',') : null;
        } else {
            if (this.activeFolder === folderName) {
                this.activeFolder = null; // Toggle off
            } else {
                this.activeFolder = folderName;
            }
        }
        this._onFolderChanged();
    }

    /**
     * Direct setter — used by the dropdown <select>.
     * Always sets the folder to exactly what was chosen (no toggle behaviour).
     * Pass null / '' to clear the filter.
     */
    setActiveFolderDirect(folderName) {
        this.activeFolder = folderName || null;
        this._onFolderChanged();
    }

    /** Shared post-change logic for both setters. */
    _onFolderChanged() {
        // Sync the dropdown to match the current state
        const selectEl = document.getElementById('ypp-folder-select');
        if (selectEl) {
            selectEl.value = this.activeFolder || '';
        }
        // Re-render the chips so the Play All button appears / disappears
        this.ui.rebuildChipsContent();
        this.updateFilterState();
    }

    forceRefreshFeed() {
        if (this.activeFolder) {
            let channels = [];
            if (this.activeFolder !== '__no_folder__') {
                const folders = this.activeFolder.split(',').map(f => f.trim());
                for (const f of folders) {
                    if (this.storage.folders[f]) {
                        channels.push(...this.storage.folders[f]);
                    }
                }
            }
            this.activeChannelSet = new Set(channels);
            this.applyFeedFilters();
        }
    }

    // =========================================================================
    // ENGINE: FEED FILTERING
    // =========================================================================

    _isAnyFilterActive() {
        const hasActiveChip = Object.values(this.ffActiveChips || {}).some(s => s !== 'neutral' && s !== 'all');
        const hasExplicitAll = this.ffActiveChips?.['all'] === 'show';
        const hasSearch = !!(this.ffActiveSearch && this.ffActiveSearch.trim() !== '');
        const hasWatch = this.ffActiveWatch && this.ffActiveWatch !== 'all';
        
        return (this.activeFolder || this._durationFilter !== 'all' || this._dateFilter !== 'all' || this._sortFilter !== 'latest' || hasActiveChip || hasSearch || hasWatch || (!hasExplicitAll && Object.keys(this.ffActiveChips || {}).length > 0) || (this.storage.keywordBlacklist && this.storage.keywordBlacklist.length > 0));
    }

    setupFeedFilters() {
        if (!document.getElementById('ypp-filter-styles')) {
            const style = document.createElement('style');
            style.id = 'ypp-filter-styles';
            style.textContent = `
                ytd-rich-item-renderer[data-ypp-hidden="true"],
                ytd-video-renderer[data-ypp-hidden="true"],
                ytd-grid-video-renderer[data-ypp-hidden="true"] {
                    display: none !important;
                }

                /* CSS trick to make filtering "instant" without breaking thumbnail lazy-loading.
                   opacity: 0 keeps the bounding box intact so YouTube's IntersectionObserver can load images,
                   but prevents the user from seeing a flash of videos before JS evaluates them. */
                body.ypp-feed-filters-active ytd-rich-item-renderer:not([data-ypp-filter-checked="true"]) {
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        const pendingPlayAll = sessionStorage.getItem('ypp_pending_play_all');
        const pendingFolder = sessionStorage.getItem('ypp_pending_folder');
        
        if (pendingPlayAll) {
            this.activeFolder = pendingPlayAll;
            sessionStorage.removeItem('ypp_pending_play_all');
            window.YPP.Utils.pollFor(() => document.querySelector('ytd-rich-grid-renderer'), 10000, 200)
                .then(() => this.playAll(pendingPlayAll))
                .catch(() => this.playAll(pendingPlayAll));
        } else if (pendingFolder) {
            this.activeFolder = pendingFolder;
            sessionStorage.removeItem('ypp_pending_folder');
        }
        
        this.ui.renderFilterChips();
        this.updateFilterState();
        
        this.observer.register('feed-filter-loop', SubscriptionFolders.SELECTORS.FEED_CARDS, () => {
            if (this._isAnyFilterActive()) {
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

        // Sync state to localStorage for the network interceptor
        localStorage.setItem('ypp_active_folder', this.activeFolder || '');
        localStorage.setItem('ypp_folder_data', JSON.stringify(this.storage.folders || {}));

        if (this._isAnyFilterActive()) {
            document.body.classList.add('ypp-feed-filters-active');
            
            // Remove the checked tag so they get hidden instantly until evaluated
            document.querySelectorAll('ytd-rich-item-renderer[data-ypp-filter-checked="true"]').forEach(el => {
                el.removeAttribute('data-ypp-filter-checked');
            });
        } else {
            document.body.classList.remove('ypp-feed-filters-active');
        }

        if (this.activeFolder) {
            document.body.classList.add('ypp-sub-folders-active');
            let channels = [];
            if (this.activeFolder !== '__no_folder__') {
                const folders = this.activeFolder.split(',').map(f => f.trim());
                for (const f of folders) {
                    if (this.storage.folders[f]) {
                        channels.push(...this.storage.folders[f]);
                    }
                }
            }
            this.activeChannelSet = new Set(channels);
        } else {
            document.body.classList.remove('ypp-sub-folders-active');
            this.activeChannelSet = new Set();
        }

        if (this._isAnyFilterActive()) {
            this.applyFeedFilters();
        } else {
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
        const overlay = card.querySelector('ytd-thumbnail-overlay-time-status-renderer');
        if (!overlay) return null;

        const text = overlay.textContent.trim().replace(/\s+/g, '');
        const parts = text.split(':').map(Number);

        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return null;
    }

    _parseDateScore(card) {
        // Returns a score — higher = more recent
        const metaLine = card.querySelector('#metadata-line, .inline-metadata-item, #metadata');
        if (!metaLine) return 0;

        const text = metaLine.textContent.toLowerCase().trim();

        if (text.includes('hour') || text.includes('minute') || 
            text.includes('second') || text.includes('just now')) return 4; // today
        if (text.includes('day') && !text.includes('week')) {
            const match = text.match(/(\d+)\s*day/);
            const days = match ? parseInt(match[1]) : 1;
            return days <= 7 ? 3 : days <= 30 ? 2 : 1;
        }
        if (text.includes('week')) {
            const match = text.match(/(\d+)\s*week/);
            const weeks = match ? parseInt(match[1]) : 1;
            return weeks <= 4 ? 2 : 1;
        }
        if (text.includes('month')) return 1;
        return 0; // year or unknown
    }

    _parseDaysAgo(card) {
        const metaLine = card.querySelector('#metadata-line, .inline-metadata-item, #metadata');
        if (!metaLine) return 9999;
        
        const text = metaLine.textContent.toLowerCase().trim();
        const match = text.match(/(\d+)\s*(minute|hour|day|week|month|year)/);
        
        if (text.includes('just now') || text.includes('second')) return 0;
        
        if (match) {
            const val = parseInt(match[1]) || 1;
            const unit = match[2];
            if (unit === 'minute' || unit === 'hour') return 0;
            if (unit === 'day') return val;
            if (unit === 'week') return val * 7;
            if (unit === 'month') return val * 30;
            if (unit === 'year') return val * 365;
        }
        
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
     * Applies all active UI filters (chips, duration, date, search, folder).
     * @public
     */
    applyFeedFilters() {
        if (this._filterTimeout) {
            cancelAnimationFrame(this._filterTimeout);
        }
        this._filterTimeout = requestAnimationFrame(() => {
            this._applyFeedFiltersNow();
        });
    }

    /**
     * The real filter implementation.
     * @private
     */
    _applyFeedFiltersNow() {
        const container = document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer #contents');
        if (!container) return;

        const cards = container.querySelectorAll('ytd-rich-item-renderer');
        if (!cards || cards.length === 0) return;

        // Folder constraints
        const normSet = this.activeFolder && this.activeFolder !== '__no_folder__' 
            ? new Set([...this.activeChannelSet].map(n => this._normChannel(n)))
            : null;

        // Feed Filter Chips
        const chips = this.ffActiveChips || {};
        const activeWatch = this.ffActiveWatch || 'all';
        const searchStr = (this.ffActiveSearch || '').toLowerCase();
        
        let visibleCount = 0;
        let hiddenCount = 0;

        cards.forEach(card => {
            // 1. Core Video Details
            const channelLink = card.querySelector('#channel-name a, ytd-channel-name a');
            const titleLink = card.querySelector('#video-title, #video-title-link');
            const overlay = card.querySelector('ytd-thumbnail-overlay-time-status-renderer');
            const metaLine = card.querySelector('#metadata-line, .inline-metadata-item, #metadata');
            const badge = card.querySelector('ytd-badge-supported-renderer, .badge-shape-wiz__text');
            
            const title = (titleLink?.textContent || '').toLowerCase();
            const channelName = (channelLink?.textContent || '').trim();
            const metaText = (metaLine?.textContent || '').toLowerCase();
            const badgeText = (badge?.textContent || '').toLowerCase();
            const isShort = overlay?.getAttribute('overlay-style') === 'SHORTS' || card.querySelector('ytd-shorts-lockup-view-model') !== null;
            
            // Determine video type
            const isLive = badgeText.includes('live') && !metaText.includes('streamed');
            const isStreamed = metaText.includes('streamed');
            const isScheduled = badgeText.includes('premiere') || metaText.includes('premieres') || metaText.includes('scheduled');
            const isPost = card.querySelector('ytd-post-renderer, ytd-shared-post-renderer') !== null;
            const isPlaylist = card.querySelector('ytd-playlist-renderer') !== null;
            const isVideo = !isLive && !isStreamed && !isScheduled && !isShort && !isPost && !isPlaylist;
            
            // Notification Status
            const notifBtn = card.querySelector('ytd-subscription-notification-toggle-button-renderer button');
            const isNotifOn = notifBtn?.getAttribute('aria-label')?.toLowerCase().includes('all') || false; // Approximation, YT DOM is complex here
            
            // Watched Status
            const progress = card.querySelector('#progress, .ytd-thumbnail-overlay-resume-playback-renderer');
            const isWatched = progress !== null;
            
            // Default visibility
            let show = true;

            // 2. Folder Filtering
            if (normSet && show) {
                const norm = this._normChannel(channelName);
                if (norm && !normSet.has(norm)) {
                    show = false;
                }
            }
            
            // 3. Right-side Filters (Duration & Date)
            if (show && !this._matchesDurationFilter(card)) show = false;
            if (show && !this._matchesDateFilter(card)) show = false;
            
            // 4. Chip Bar State Logic (3-state)
            if (show) {
                // If 'all' is explicitly green, we don't hide by exclusion.
                // But if 'all' is neutral and other things are green, we use exclusion.
                
                let greenCount = 0;
                for (const state of Object.values(chips)) {
                    if (state === 'show') greenCount++;
                }
                
                // If anything except 'all' is explicitly SHOW (green), we implicitly hide things that aren't matching a SHOW chip.
                const hasExplicitShow = greenCount > 0 && chips['all'] !== 'show';
                
                if (hasExplicitShow) {
                    show = false;
                    // Check if this card matches ANY of the green chips
                    if (isLive && chips['live'] === 'show') show = true;
                    if (isStreamed && chips['streamed'] === 'show') show = true;
                    if (isVideo && chips['video'] === 'show') show = true;
                    if (isShort && chips['shorts'] === 'show') show = true;
                    if (isScheduled && chips['scheduled'] === 'show') show = true;
                    if (isPost && chips['posts'] === 'show') show = true;
                    if (isPlaylist && chips['playlist'] === 'show') show = true;
                    if (isNotifOn && chips['notifon'] === 'show') show = true;
                    if (!isNotifOn && chips['notifoff'] === 'show') show = true;
                }
                
                // Now evaluate explicitly HIDDEN (red) chips (these override SHOW if conflict somehow exists)
                if (isLive && chips['live'] === 'hide') show = false;
                if (isStreamed && chips['streamed'] === 'hide') show = false;
                if (isVideo && chips['video'] === 'hide') show = false;
                if (isShort && chips['shorts'] === 'hide') show = false;
                if (isScheduled && chips['scheduled'] === 'hide') show = false;
                if (isPost && chips['posts'] === 'hide') show = false;
                if (isPlaylist && chips['playlist'] === 'hide') show = false;
                if (isNotifOn && chips['notifon'] === 'hide') show = false;
                if (!isNotifOn && chips['notifoff'] === 'hide') show = false;
            }
            
            // 5. Watched Dropdown
            if (show) {
                if (activeWatch === 'unwatched' && isWatched) show = false;
                if (activeWatch === 'watched' && !isWatched) show = false;
            }
            
            // 6. Search String
            if (show && searchStr) {
                if (!title.includes(searchStr) && !channelName.toLowerCase().includes(searchStr)) {
                    show = false;
                }
            }

            // Apply Display
            if (show) {
                card.style.removeProperty('display');
                visibleCount++;
            } else {
                card.style.setProperty('display', 'none', 'important');
                hiddenCount++;
            }
        });

        // Apply Sorting to visible elements
        this._applySortOrder(container);
    }

    /**
     * Console diagnostic helper — call from DevTools:
     *   window.YPP.Main.featureManager.getFeature('subscriptionFolders').diagnose()
     *
     * Prints a full report: stored folders, active set, and every visible feed card
     * with its scraped name, normalised form, and whether it matches the active folder.
     */
    diagnose() {
        console.group('[YPP] Subscription Folder Diagnostic');
        this.utils.log(`Active folder: ${this.activeFolder}`, 'SubFolders', 'info');
        this.utils.log(`Stored folders: ${JSON.stringify(this.storage.folders, null, 2)}`, 'SubFolders', 'info');
        this.utils.log(`Active channel set (raw): ${[...this.activeChannelSet]}`, 'SubFolders', 'info');
        this.utils.log(`Active channel set (norm): ${[...this.activeChannelSet].map(n => this._normChannel(n))}`, 'SubFolders', 'info');

        const cards = document.querySelectorAll(
            'ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer'
        );
        const normSet = new Set([...this.activeChannelSet].map(n => this._normChannel(n)));
        const rows = Array.from(cards).map(card => {
            const avatarLink  = card.querySelector('a#avatar-link');
            const channelLink = card.querySelector('#channel-name a, ytd-channel-name a');
            const fmtStr      = card.querySelector('ytd-channel-name yt-formatted-string');
            const raw = avatarLink?.title?.trim()
                     || channelLink?.textContent?.trim()
                     || fmtStr?.textContent?.trim()
                     || '(empty)';
            const cleaned = raw.replace(/[\u2713\u2714\u2705\u2022\u200B-\u200D\uFEFF]/g, '').trim();
            const norm    = this._normChannel(cleaned);
            return {
                avatar_title:    avatarLink?.title?.trim()      || '(empty)',
                channellink_txt: channelLink?.textContent?.trim() || '(empty)',
                cached:          card.dataset.yppChannel          || '(not set)',
                norm_used:       norm,
                in_folder:       normSet.has(norm) ? '✅ yes' : '❌ no',
                display:         card.style.display === 'none'   ? '🙈 hidden' : '✅ shown'
            };
        });
        if (rows.length) console.table(rows);
        else console.warn('No ytd-rich-item-renderer cards found on page.');
        console.groupEnd();
    }

    /**
     * Normalize a channel name for consistent comparison.
     * Strips invisible characters, collapses whitespace, lowercases.
     * @param {string} name
     * @returns {string}
     */
    _normChannel(name) {
        if (!name) return '';
        if (!this._normCache) this._normCache = new Map();
        if (this._normCache.has(name)) return this._normCache.get(name);
        
        const result = name
            .replace(/[\u200B-\u200D\uFEFF]/g, '')  // zero-width chars
            .replace(/[\u2713\u2714\u2705\u2022]/g, '') // verified checkmarks
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
            
        this._normCache.set(name, result);
        return result;
    }

    _applyFeedFiltersNow() {
        if (!this._isFeedPage) return;

        const videoCards = document.querySelectorAll(SubscriptionFolders.SELECTORS.FEED_CARDS);

        // Build a normalised lookup set for the active folder for O(1) checks.
        // activeChannelSet stores names as-saved (from Channel Health scan or popover).
        // DOM-scraped names go through _normChannel on both sides to tolerate
        // em-dashes, trailing spaces, and verified checkmark chars.
        const normActiveSet = new Set(
            [...this.activeChannelSet].map(n => this._normChannel(n))
        );

        // ── Debug mode ────────────────────────────────────────────────────────
        // Enable with:  window.__YPP_FILTER_DEBUG = true
        // Disable with: window.__YPP_FILTER_DEBUG = false
        const DEBUG = !!window.__YPP_FILTER_DEBUG;
        if (DEBUG && this.activeFolder) {
            console.group(`[YPP Filter] folder="${this.activeFolder}"  stored=${this.activeChannelSet.size} channels`);
            this.utils.log(`Stored (raw): ${[...this.activeChannelSet]}`, 'SubFolders', 'info');
            this.utils.log(`Stored (norm): ${[...normActiveSet]}`, 'SubFolders', 'info');
        }

        // Track cards whose channel name hasn't rendered yet so we can retry.
        let anyUnresolved = false;
        // Debug accumulator
        const debugRows = [];

        videoCards.forEach(card => {
            let isVisible = true;

            // ── Keyword Blacklist Filter ──────────────
            if (this.storage.keywordBlacklist && this.storage.keywordBlacklist.length > 0) {
                let videoTitle = null;
                const pd = card.data;
                if (pd) {
                    const lockup = pd.content?.lockupViewModel?.metadata?.lockupMetadataViewModel?.title?.content;
                    const legacy = pd.videoRenderer?.title?.runs?.[0]?.text 
                        ?? pd.content?.videoRenderer?.title?.runs?.[0]?.text 
                        ?? pd.richItemRenderer?.content?.videoRenderer?.title?.runs?.[0]?.text;
                    videoTitle = lockup ?? legacy ?? null;
                }
                if (!videoTitle) {
                    const titleEl = card.querySelector('#video-title');
                    if (titleEl) videoTitle = titleEl.textContent;
                }
                if (videoTitle) {
                    const titleLower = videoTitle.toLowerCase();
                    if (this.storage.keywordBlacklist.some(kw => titleLower.includes(kw.toLowerCase()))) {
                        isVisible = false;
                    }
                }
            }

            // ── Channel identification via Polymer data binding ──────────────
            // card.data is YouTube's internal Polymer object — the same structured JSON
            // the Channel Health scan reads via r.title.simpleText. Reading it directly
            // eliminates ALL DOM scraping problems: badge chars, timing races, encoding
            // mismatches. No normalization gymnastics needed for the primary match path.
            // ⚠️ YouTube-Fragile: Polymer data paths may change if YouTube migrates layouts.
            let channelName = card.dataset.yppChannel || null;

            if (!channelName) {
                // Primary: Polymer data binding (matches storage exactly — zero normalization needed)
                const pd = card.data;
                if (pd) {
                    // Path A: 2024+ lockupViewModel (new card layout)
                    const lockup = pd.content?.lockupViewModel
                        ?.metadata?.lockupMetadataViewModel
                        ?.metadata?.contentMetadataViewModel
                        ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;

                    // Path B: legacy videoRenderer / richItemRenderer (older layout)
                    const legacy = pd.videoRenderer?.ownerText?.runs?.[0]?.text
                        ?? pd.videoRenderer?.shortBylineText?.runs?.[0]?.text
                        ?? pd.content?.videoRenderer?.ownerText?.runs?.[0]?.text
                        ?? pd.richItemRenderer?.content?.videoRenderer?.ownerText?.runs?.[0]?.text;

                    channelName = lockup ?? legacy ?? null;
                }

                // Fallback 1: Text content of the channel name link (resilient to structural changes).
                // Selecting the <a> avoids including the verified badge text.
                if (!channelName) {
                    const linkEl = card.querySelector('ytd-channel-name a, #channel-name a');
                    if (linkEl && linkEl.textContent) {
                        channelName = linkEl.textContent.trim();
                    }
                }

                // Fallback 2: DOM attribute — avatar link title.
                // ⚠️ YouTube-Fragile: a#avatar-link[title] attribute
                if (!channelName) {
                    channelName = card.querySelector('a#avatar-link')?.title?.trim() || null;
                }

                // Fallback 3: Text content of the channel name container (might contain checkmarks).
                if (!channelName) {
                    const textEl = card.querySelector('ytd-channel-name, #channel-name');
                    if (textEl && textEl.textContent) {
                        channelName = textEl.textContent.trim();
                    }
                }

                // Cache to avoid re-running on every filter pass
                if (channelName) {
                    card.dataset.yppChannel = channelName;
                }
            }

            if (this.activeFolder) {
                if (!channelName) {
                    // Polymer data not yet bound (card shell inserted before data arrives).
                    // Keep card visible and attach a MutationObserver to retry specifically when data arrives.
                    if (DEBUG) debugRows.push({ source: '(unresolved)', norm: '', match: '⏳ observing', visible: '✅ kept' });
                    
                    if (!card.dataset.yppObserving) {
                        card.dataset.yppObserving = 'true';
                        window.YPP.Utils.pollFor(() => {
                            const chEl = card.querySelector('ytd-channel-name, #channel-name');
                            return chEl && chEl.textContent.trim() ? true : false;
                        }, 5000, 200).then((success) => {
                            delete card.dataset.yppObserving;
                            if (success) this._debouncedApplyFilters();
                        }).catch(() => {
                            delete card.dataset.yppObserving;
                        });
                    }
                    return;
                }

                if (this.activeFolder === '__no_folder__') {
                    const norm = this._normChannel(channelName);
                    const inAnyFolder = Object.values(this.storage.folders)
                        .some(list => list.some(ch => this._normChannel(ch) === norm));
                    if (inAnyFolder) isVisible = false;
                } else {
                    const norm = this._normChannel(channelName);
                    const matched = norm ? normActiveSet.has(norm) : true;
                    if (norm && !matched) isVisible = false;
                    if (DEBUG) debugRows.push({
                        source: channelName,
                        norm,
                        match: matched ? '✅ yes' : '❌ no',
                        visible: isVisible ? '✅ show' : '🙈 hide'
                    });
                }
            }

            if (isVisible && this.hideShortsActive) {
                if (card.querySelector('ytd-reel-item-renderer') ||
                    card.hasAttribute('is-shorts') ||
                    card.querySelector('a[href^="/shorts/"]')) isVisible = false;
            }

            if (isVisible && this.hideWatchedActive) {
                const progressEl = card.querySelector('#progress');
                if (progressEl) {
                    const val = parseInt(progressEl.style.width, 10);
                    if (!isNaN(val) && val >= 80) isVisible = false;
                }
            }

            if (isVisible && !this._matchesDurationFilter(card)) isVisible = false;
            if (isVisible && !this._matchesDateFilter(card))     isVisible = false;

            // ── Subscription Feed Filter Extensions ──────────────
            if (isVisible && this.ffActiveSearch && this.ffActiveSearch.trim() !== '') {
                const searchLower = this.ffActiveSearch.toLowerCase();
                let videoTitle = null;
                const pd = card.data;
                if (pd) {
                    const lockup = pd.content?.lockupViewModel?.metadata?.lockupMetadataViewModel?.title?.content;
                    const legacy = pd.videoRenderer?.title?.runs?.[0]?.text 
                        ?? pd.content?.videoRenderer?.title?.runs?.[0]?.text 
                        ?? pd.richItemRenderer?.content?.videoRenderer?.title?.runs?.[0]?.text;
                    videoTitle = lockup ?? legacy ?? null;
                }
                if (!videoTitle) {
                    const titleEl = card.querySelector('#video-title');
                    if (titleEl) videoTitle = titleEl.textContent;
                }
                if (videoTitle) {
                    if (!videoTitle.toLowerCase().includes(searchLower)) {
                        isVisible = false;
                    }
                }
            }

            if (isVisible && this.ffActiveWatch && this.ffActiveWatch !== 'all') {
                const progressEl = card.querySelector('#progress');
                let watched = false;
                if (progressEl) {
                    const val = parseInt(progressEl.style.width, 10);
                    if (!isNaN(val) && val >= 80) watched = true;
                }
                if (this.ffActiveWatch === 'unwatched' && watched) isVisible = false;
                if (this.ffActiveWatch === 'watched' && !watched) isVisible = false;
            }

            if (isVisible && this.ffActiveChips) {
                const chips = this.ffActiveChips;
                let isLive = false;
                let isStreamed = false;
                let isScheduled = false;
                let isShorts = !!(card.querySelector('ytd-reel-item-renderer') || card.hasAttribute('is-shorts') || card.querySelector('a[href^="/shorts/"]'));
                let isVideo = false;
                
                if (!isShorts) {
                    // Check new layout metadata
                    let metaText = '';
                    const newMeta = card.querySelector('yt-content-metadata-view-model > div > span[role="text"]:last-child');
                    if (newMeta) {
                        metaText = newMeta.textContent.trim();
                    } else {
                        // Check legacy layout metadata
                        const oldMeta = card.querySelector('div#metadata-line');
                        if (oldMeta) metaText = oldMeta.textContent.trim();
                    }
                    
                    if (metaText) {
                        // YouTube translations fallback to English keywords for our basic matching.
                        // Ideally we'd use i18n, but string matching covers 90% of cases and matches original extension.
                        if (metaText.includes('LIVE')) {
                            isLive = true;
                        } else if (metaText.includes('Streamed')) {
                            isStreamed = true;
                        } else if (metaText.includes('Premieres') || metaText.includes('Scheduled')) {
                            isScheduled = true;
                        } else {
                            isVideo = true;
                        }
                    } else {
                        // Fallback if metadata is missing but it's clearly a video
                        isVideo = true; 
                    }
                }
                
                const matches = {
                    live: isLive,
                    streamed: isStreamed,
                    video: isVideo,
                    shorts: isShorts,
                    scheduled: isScheduled
                };
                
                // 1. Hide condition (AND NOT)
                let matchesHide = false;
                for (const [id, state] of Object.entries(chips)) {
                    if (state === 'hide' && matches[id]) {
                        matchesHide = true;
                        break;
                    }
                }
                
                if (matchesHide) {
                    isVisible = false;
                } else {
                    // 2. Show condition (OR)
                    const activeShows = Object.entries(chips).filter(([id, state]) => state === 'show' && id !== 'all');
                    if (activeShows.length > 0) {
                        let matchesAnyShow = false;
                        for (const [id] of activeShows) {
                            if (matches[id]) {
                                matchesAnyShow = true;
                                break;
                            }
                        }
                        if (!matchesAnyShow) {
                            isVisible = false;
                        }
                    }
                }
            }

            if (isVisible) {
                card.style.removeProperty('display');
                card.removeAttribute('data-ypp-hidden');
                card.classList.add('ypp-filtered-in');
                this._updateFolderIndicator(card, channelName);
            } else {
                card.style.setProperty('display', 'none', 'important');
                card.setAttribute('data-ypp-hidden', 'true');
                card.classList.remove('ypp-filtered-in');
            }
            card.setAttribute('data-ypp-filter-checked', 'true');
        });

        // Close debug group and print table
        if (DEBUG && this.activeFolder) {
            if (debugRows.length > 0) console.table(debugRows);
            console.groupEnd();
        }

        const container = document.querySelector(SubscriptionFolders.SELECTORS.FEED_CONTAINER);
        if (container) this._applySortOrder(container);

        // Nudge scroll to trigger YouTube's lazy-load continuation
        const spinner = document.querySelector(SubscriptionFolders.SELECTORS.CONTINUATION);
        if (spinner) {
            // Batch DOM read (getBoundingClientRect) inside rAF to prevent forced sync layout
            requestAnimationFrame(() => {
                if (spinner.getBoundingClientRect().top < window.innerHeight * 2) {
                    window.scrollBy(0, 1);
                    window.scrollBy(0, -1);
                }
            });
        }
    }

    resetFeedVisibility() {
        if (this._isAnyFilterActive()) {
            this.applyFeedFilters();
            return;
        }

        const videoCards = document.querySelectorAll(SubscriptionFolders.SELECTORS.FEED_CARDS);
        videoCards.forEach(card => {
            card.style.display = '';
            card.removeAttribute('data-ypp-hidden');
            card.removeAttribute('data-ypp-filter-checked');
            card.classList.remove('ypp-filtered-in');
            // Clear cached channel name — YouTube recycles DOM nodes across SPA navigations
            // so a stale cached name from a previous page visit could cause a false match.
            delete card.dataset.yppChannel;
        });
    }

    // =========================================================================
    // ENGINE: PLAYLIST GENERATOR (PLAY ALL)
    // =========================================================================

    /**
     * Renders (or removes) the M3 glassmorphic folder indicator badge on a feed card.
     * Called for every visible card after the filter decision is made.
     *
     * @param {HTMLElement} card        - ytd-rich-item-renderer element
     * @param {string|null} channelName - Resolved channel name (raw, not normalised)
     */
    _updateFolderIndicator(card, channelName) {
        if (!channelName) return;

        const normName = this._normChannel(channelName);
        const foldersForChannel = [];
        for (const [fName, channels] of Object.entries(this.storage.folders)) {
            if (channels.some(ch => this._normChannel(ch) === normName)) {
                foldersForChannel.push(fName);
            }
        }

        let indicator = card.querySelector('.ypp-feed-folder-indicator');
        if (foldersForChannel.length === 0) {
            indicator?.remove();
            card.style.boxShadow = '';
            card.style.border = '';
            return;
        }

        const primaryFolder = foldersForChannel[0];
        let hash = 0;
        for (let i = 0; i < primaryFolder.length; i++) {
            hash = primaryFolder.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'ypp-feed-folder-indicator';
            card.style.position = 'relative';
            card.appendChild(indicator);
        }
        
        indicator.style.cssText = [
            'position:absolute', 'top:8px', 'right:8px',
            `background:hsla(${hue}, 70%, 50%, 0.15)`,
            'backdrop-filter:blur(8px)',
            '-webkit-backdrop-filter:blur(8px)',
            `color:hsla(${hue}, 100%, 85%, 1)`,
            'font-size:11px', 'padding:4px 8px', 'border-radius:6px',
            'font-weight:600', 'letter-spacing: 0.5px',
            'font-family:"Roboto","Google Sans",sans-serif',
            'z-index:10', 'pointer-events:none',
            `border:1px solid hsla(${hue}, 70%, 50%, 0.4)`,
            `box-shadow:0 4px 12px hsla(${hue}, 70%, 50%, 0.2)`
        ].join(';');
        indicator.textContent = foldersForChannel.join(', ');

        // Apply glow to the card itself
        card.style.boxShadow = `0 4px 20px hsla(${hue}, 70%, 50%, 0.08)`;
        card.style.border = `1px solid hsla(${hue}, 70%, 50%, 0.15)`;
        card.style.borderRadius = '12px';
    }

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
                const oldCardCount = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer').length;
                window.scrollBy(0, window.innerHeight * 2);
                window.YPP.Utils.pollFor(() => {
                    const newCount = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer').length;
                    return newCount > oldCardCount ? true : null;
                }, 2000, 200).then(() => extractAndPlay()).catch(() => extractAndPlay());
            } else {
                window.YPP.Utils.createToast?.('No videos found in this folder.', 'error');
            }
        };
        
        window.YPP.Utils.pollFor(() => {
            const cards = document.querySelectorAll('ytd-rich-grid-renderer ytd-rich-item-renderer.ypp-filtered-in');
            return cards.length > 0 ? true : null;
        }, 5000, 500).then(() => extractAndPlay()).catch(() => extractAndPlay());
    }
};
