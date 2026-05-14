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
        this.settings = settings || {};
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
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)) !important;
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
        
        const style = document.getElementById('ypp-sub-grid-override');
        if (style) style.remove();
        
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

    setActiveFolder(folderName) {
        if (this.activeFolder === folderName) {
            this.activeFolder = null; // Toggle off
        } else {
            this.activeFolder = folderName;
        }
        this.updateFilterState();
        
        // Update the dropdown UI to reflect the programmatic state change
        const selectEl = document.getElementById('ypp-folder-select');
        if (selectEl) {
            selectEl.value = this.activeFolder || '';
        }
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
        
        this.observer.register('feed-filter-loop', 'ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer, ytd-browse[page-subtype="subscriptions"] ytd-video-renderer', () => {
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

        const videoCards = document.querySelectorAll('ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer, ytd-browse[page-subtype="subscriptions"] ytd-video-renderer');

        videoCards.forEach(card => {
            let isVisible = true;
            let channelName = null;

            // Robust extraction: First try the exact same element used when saving to folder
            const channelLink = card.querySelector('#channel-name a');
            if (channelLink && channelLink.textContent) {
                channelName = channelLink.textContent.trim();
            }
            if (!channelName) {
                const avatarLink = card.querySelector('a#avatar-link');
                if (avatarLink && avatarLink.title) {
                    channelName = avatarLink.title.trim();
                }
            }
            if (!channelName) {
                const channelEl = card.querySelector('ytd-channel-name yt-formatted-string');
                if (channelEl) {
                    channelName = (channelEl.title || channelEl.textContent).trim();
                }
            }

            if (this.activeFolder) {
                if (this.activeFolder === '__no_folder__') {
                    if (channelName) {
                        // Check if it's in ANY folder
                        let inAnyFolder = false;
                        for (const list of Object.values(this.storage.folders)) {
                            if (list.includes(channelName)) {
                                inAnyFolder = true;
                                break;
                            }
                        }
                        if (inAnyFolder) isVisible = false;
                    }
                } else {
                    if (!channelName || !this.activeChannelSet.has(channelName)) isVisible = false;
                }
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
                
                // Add Folder Indicator (M3 Glassmorphic Tag)
                if (channelName) {
                    let foldersForChannel = [];
                    for (const [fName, channels] of Object.entries(this.storage.folders)) {
                        if (channels.includes(channelName)) foldersForChannel.push(fName);
                    }
                    
                    let indicator = card.querySelector('.ypp-feed-folder-indicator');
                    if (foldersForChannel.length === 0) {
                        if (indicator) indicator.remove();
                    } else {
                        if (!indicator) {
                            indicator = document.createElement('div');
                            indicator.className = 'ypp-feed-folder-indicator';
                            indicator.style.cssText = 'position: absolute; top: 8px; right: 8px; background: rgba(20, 19, 24, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: #D0BCFF; font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 500; font-family: "Roboto", "Google Sans", sans-serif; z-index: 10; pointer-events: none; border: 1px solid rgba(208, 188, 255, 0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
                            card.style.position = 'relative';
                            card.appendChild(indicator);
                        }
                        indicator.textContent = foldersForChannel.join(', ');
                    }
                }
            } else {
                card.style.display = 'none';
                card.classList.remove('ypp-filtered-in');
            }
        });

        const container = document.querySelector('ytd-browse[page-subtype="subscriptions"] ytd-rich-grid-renderer #contents, ytd-browse[page-subtype="subscriptions"] ytd-item-section-renderer #contents');
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

        const videoCards = document.querySelectorAll('ytd-browse[page-subtype="subscriptions"] ytd-rich-item-renderer, ytd-browse[page-subtype="subscriptions"] ytd-video-renderer');
        videoCards.forEach(card => {
            card.style.display = '';
            card.classList.remove('ypp-filtered-in');
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
