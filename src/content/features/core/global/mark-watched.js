window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MarkWatched = class MarkWatched extends window.YPP.features.BaseFeature {
    constructor() {
        super('MarkWatched');
        this._watchedIds = new Set();
        this._storageKey = 'ypp_watched_ids';
        this._boundProcess = this._processCards.bind(this);
        
        // Re-use legacy styling SVG option in case the checkmark requested doesn't fit
        this.ICON_SVG_LEGACY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
    }

    getConfigKey() { return 'enableMarkWatched'; }

    async enable() {
        await super.enable();
        // Load persisted watched IDs from storage
        await this._loadWatchedIds();
        // Process cards already on page
        this._processCards();
        // Subscribe to new cards appearing
        window.YPP.events?.on('dom:nodes-added', this._boundProcess);
        window.YPP.events?.on('page:changed', this._boundProcess);
        // Listen for current video being watched
        window.addEventListener('yt-navigate-finish', this._onNavigate.bind(this));
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('dom:nodes-added', this._boundProcess);
        window.YPP.events?.off('page:changed', this._boundProcess);
        // Clean up visual badges
        document.querySelectorAll('.ypp-watched-badge').forEach(e => e.remove());
    }

    // Load watched IDs from chrome.storage.local
    async _loadWatchedIds() {
        return new Promise(resolve => {
            chrome.storage.local.get([this._storageKey], (result) => {
                const ids = result[this._storageKey];
                if (Array.isArray(ids)) {
                    this._watchedIds = new Set(ids);
                }
                resolve();
            });
        });
    }

    // Save watched IDs to chrome.storage.local
    _saveWatchedIds() {
        chrome.storage.local.set({
            [this._storageKey]: [...this._watchedIds]
        });
    }

    // Mark a video ID as watched
    markAsWatched(videoId) {
        if (!videoId) return;
        this._watchedIds.add(videoId);
        this._saveWatchedIds();
        this._processCards();
        // Notify HideWatched to re-run
        window.YPP.events?.emit('watched:updated', { videoId });
    }

    // Unmark a video ID
    unmarkAsWatched(videoId) {
        if (!videoId) return;
        this._watchedIds.delete(videoId);
        this._saveWatchedIds();
        this._processCards();
        window.YPP.events?.emit('watched:updated', { videoId });
    }

    isWatched(videoId) {
        return this._watchedIds.has(videoId);
    }

    // Extract video ID from a card element
    _getVideoId(card) {
        // Method 1: href on anchor
        const anchor = card.querySelector('a#thumbnail, a.ytd-thumbnail');
        if (anchor) {
            const href = anchor.href || anchor.getAttribute('href') || '';
            const match = href.match(/[?&]v=([^&]+)/);
            if (match) return match[1];
        }
        // Method 2: data attribute
        const videoId = card.dataset.videoId || card.dataset.ytVideoId;
        if (videoId) return videoId;

        return null;
    }

    // Process all video cards on the page
    _processCards() {
        const selectors = [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(card => {
                this._processCard(card);
            });
        });
    }

    // Process a single card — add badge and detect watched state
    _processCard(card) {
        const videoId = this._getVideoId(card);
        if (!videoId) return;

        // Check YouTube's native progress bar
        const progress = card.querySelector(window.YPP.CONSTANTS.SELECTORS.WATCHED_OVERLAY || 'ytd-thumbnail-overlay-resume-playback-renderer #progress');
        if (progress) {
            const width = parseFloat(progress.style.width) || 0;
            const threshold = this.settings?.hideWatchedThreshold || 80;
            if (width >= threshold) {
                this.markAsWatched(videoId);
            }
        }

        // Add visual badge if watched
        if (this._watchedIds.has(videoId)) {
            this._addWatchedBadge(card, videoId);
        } else {
            this._removeWatchedBadge(card);
        }

        // Add right-click context menu
        this._addContextMenu(card, videoId);
    }

    // Add checkmark badge to thumbnail
    _addWatchedBadge(card, videoId) {
        const thumbnail = card.querySelector('ytd-thumbnail');
        if (!thumbnail) return;
        if (thumbnail.querySelector('.ypp-watched-badge')) return;

        const badge = document.createElement('div');
        badge.className = 'ypp-watched-badge';
        
        // Use either the new blueprint checkmark or the legacy eye icon based on preference
        badge.innerHTML = `<svg viewBox="0 0 24 24" fill="white" width="16" height="16"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
        
        badge.title = 'Watched — right-click to unmark';
        thumbnail.style.position = 'relative';
        
        const overlaysContainer = thumbnail.querySelector('#overlays');
        if (overlaysContainer) {
            overlaysContainer.appendChild(badge);
        } else {
            thumbnail.appendChild(badge);
        }
    }

    // Remove watched badge
    _removeWatchedBadge(card) {
        card.querySelector('.ypp-watched-badge')?.remove();
    }

    // Add right-click context menu
    _addContextMenu(card, videoId) {
        if (card.dataset.yppContextMenu) return;
        card.dataset.yppContextMenu = '1';

        card.addEventListener('contextmenu', (e) => {
            // Remove existing menu
            document.querySelector('.ypp-watch-context-menu')?.remove();

            const isWatched = this._watchedIds.has(videoId);
            const menu = document.createElement('div');
            menu.className = 'ypp-watch-context-menu';
            menu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                z-index: 99999;
                background: rgba(28,28,28,0.96);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 6px 0;
                min-width: 180px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                font-family: Roboto, sans-serif;
                font-size: 14px;
            `;

            const item = document.createElement('div');
            item.style.cssText = `
                padding: 10px 16px;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                border-radius: 4px;
                margin: 2px 4px;
            `;
            item.innerHTML = isWatched
                ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Mark as Unwatched`
                : `<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Mark as Watched`;

            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255,255,255,0.08)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            item.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (isWatched) {
                    this.unmarkAsWatched(videoId);
                    this._removeWatchedBadge(card);
                } else {
                    this.markAsWatched(videoId);
                    this._addWatchedBadge(card, videoId);
                }
                menu.remove();
            });

            menu.appendChild(item);
            document.body.appendChild(menu);

            // Close on click outside
            const close = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.remove();
                    document.removeEventListener('click', close);
                }
            };
            setTimeout(() => document.addEventListener('click', close), 0);
        });
    }

    // When navigating to a watch page, track the video
    _onNavigate() {
        const url = window.location.href;
        const match = url.match(/[?&]v=([^&]+)/);
        if (!match) return;

        const videoId = match[1];

        // Mark as watched when video reaches threshold
        const video = document.querySelector(window.YPP.CONSTANTS.SELECTORS.VIDEO || 'video');
        if (!video) return;

        // Ensure we only attach once per navigation
        if (this._onTimeUpdateBinded) {
             video.removeEventListener('timeupdate', this._onTimeUpdateBinded);
        }

        const checkProgress = () => {
            if (!video.duration) return;
            const percent = (video.currentTime / video.duration) * 100;
            const threshold = this.settings?.hideWatchedThreshold || 80;
            if (percent >= threshold) {
                this.markAsWatched(videoId);
                video.removeEventListener('timeupdate', checkProgress);
            }
        };

        this._onTimeUpdateBinded = checkProgress;
        video.addEventListener('timeupdate', this._onTimeUpdateBinded);
    }
};
