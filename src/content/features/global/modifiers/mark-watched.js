window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MarkWatched = class MarkWatched extends window.YPP.features.BaseFeature {
    static SELECTORS = {
        CARDS: [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer'
        ],
        THUMBNAIL_ANCHOR: 'a#thumbnail, a.ytd-thumbnail',
        THUMBNAIL_CONTAINER: 'ytd-thumbnail',
        PROGRESS: window.YPP.CONSTANTS?.SELECTORS?.WATCHED_OVERLAY || 'ytd-thumbnail-overlay-resume-playback-renderer #progress',
        VIDEO: window.YPP.CONSTANTS?.SELECTORS?.VIDEO?.[0] || 'video.html5-main-video, video'
    };

    constructor() {
        super('MarkWatched');
        this._watchedIds = new Set();
        this._storageKey = 'ypp_watched_ids';
        this._boundProcess = this._processCards.bind(this);
        this._boundNavigate = this._onNavigate.bind(this);
        this._activeVideoEl = null;
        this._onTimeUpdateBinded = null;
        this._clickCloseListeners = [];
    }

    getConfigKey() { return 'enableMarkWatched'; }

    async enable() {
        await super.enable();
        try {
            await this._loadWatchedIds();
            this._processCards();
            window.YPP.events?.on('dom:nodes-added', this._boundProcess);
            window.YPP.events?.on('page:changed', this._boundProcess);
            this.addListener(window, 'yt-navigate-finish', this._boundNavigate);
        } catch (e) {
            this.utils.log?.(`Enable error: ${e.message}`, 'MarkWatched', 'error');
        }
    }

    async disable() {
        await super.disable();
        try {
            window.YPP.events?.off('dom:nodes-added', this._boundProcess);
            window.YPP.events?.off('page:changed', this._boundProcess);
            
            document.querySelectorAll('.ypp-watched-badge').forEach(e => e.remove());
            document.querySelectorAll('.ypp-watch-context-menu').forEach(e => e.remove());
            document.querySelectorAll('.ypp-watched-icon-permanent').forEach(e => e.remove());
            
            document.querySelectorAll('[data-ypp-context-menu]').forEach(card => {
                delete card.dataset.yppContextMenu;
            });

            this._activeVideoEl = null;
            this._onTimeUpdateBinded = null;
        } catch (e) {
            this.utils.log?.(`Disable error: ${e.message}`, 'MarkWatched', 'error');
        }
    }

    /**
     * Loads watched IDs using StorageManager.
     */
    async _loadWatchedIds() {
        try {
            if (window.YPP.StorageManager) {
                const ids = await window.YPP.StorageManager.get(this._storageKey);
                if (Array.isArray(ids)) {
                    this._watchedIds = new Set(ids);
                }
            } else {
                // Fallback if StorageManager isn't fully ready
                return new Promise(resolve => {
                    chrome.storage.local.get([this._storageKey], (result) => {
                        const ids = result[this._storageKey];
                        if (Array.isArray(ids)) this._watchedIds = new Set(ids);
                        resolve();
                    });
                });
            }
        } catch (e) {
            this.utils.log?.(`Storage load error: ${e.message}`, 'MarkWatched', 'error');
        }
    }

    /**
     * Saves watched IDs using StorageManager.
     */
    async _saveWatchedIds() {
        try {
            if (window.YPP.StorageManager) {
                await window.YPP.StorageManager.set(this._storageKey, [...this._watchedIds], 365 * 24 * 60 * 60); // 1 year TTL
            } else {
                chrome.storage.local.set({ [this._storageKey]: [...this._watchedIds] });
            }
        } catch (e) {
            this.utils.log?.(`Storage save error: ${e.message}`, 'MarkWatched', 'error');
        }
    }

    /**
     * Marks a video as watched and updates the UI.
     * @param {string} videoId 
     */
    markAsWatched(videoId) {
        if (!videoId) return;
        this._watchedIds.add(videoId);
        this._saveWatchedIds();
        
        // Update any already-processed cards without a full re-scan
        document.querySelectorAll(`[data-ypp-video-id="${videoId}"]`).forEach(card => {
            this._addWatchedBadge(card, videoId);
            const icon = card.querySelector('.ypp-watched-icon-permanent');
            if (icon) icon.title = 'Unmark as watched';
        });

        window.YPP.events?.emit('watched:updated', { videoId });
    }

    /**
     * Unmarks a video as watched and updates the UI.
     * @param {string} videoId 
     */
    unmarkAsWatched(videoId) {
        if (!videoId) return;
        this._watchedIds.delete(videoId);
        this._saveWatchedIds();
        
        document.querySelectorAll(`[data-ypp-video-id="${videoId}"]`).forEach(card => {
            this._removeWatchedBadge(card);
            const icon = card.querySelector('.ypp-watched-icon-permanent');
            if (icon) icon.title = 'Mark as watched';
        });

        window.YPP.events?.emit('watched:updated', { videoId });
    }

    /**
     * @param {string} videoId 
     * @returns {boolean}
     */
    isWatched(videoId) {
        return this._watchedIds.has(videoId);
    }

    /**
     * @param {HTMLElement} card 
     * @returns {string|null}
     */
    _getVideoId(card) {
        const anchor = card.querySelector(MarkWatched.SELECTORS.THUMBNAIL_ANCHOR);
        if (anchor) {
            const href = anchor.href || anchor.getAttribute('href') || '';
            const match = href.match(/[?&]v=([^&]+)/);
            if (match) return match[1];
        }
        const videoId = card.dataset.videoId || card.dataset.ytVideoId;
        if (videoId) return videoId;
        return null;
    }

    /**
     * Process all video cards on the page.
     */
    _processCards() {
        MarkWatched.SELECTORS.CARDS.forEach(selector => {
            document.querySelectorAll(selector).forEach(card => {
                if (card.dataset.yppMarkProcessed) return; // Stamping guard
                this._processCard(card);
            });
        });
    }

    /**
     * @param {HTMLElement} card 
     */
    _processCard(card) {
        try {
            const videoId = this._getVideoId(card);
            if (!videoId) return;

            card.dataset.yppMarkProcessed = 'true';
            card.dataset.yppVideoId = videoId; // Store for quick lookups

            const progress = card.querySelector(MarkWatched.SELECTORS.PROGRESS);
            if (progress) {
                const width = parseFloat(progress.style.width) || 0;
                const threshold = this.settings?.hideWatchedThreshold || 80;
                if (width >= threshold && !this._watchedIds.has(videoId)) {
                    this.markAsWatched(videoId);
                }
            }

            if (this._watchedIds.has(videoId)) {
                this._addWatchedBadge(card, videoId);
            }

            this._addHoverEyeIcon(card, videoId);
            this._addContextMenu(card, videoId);
        } catch (e) {
            this.utils.log?.(`Process card error: ${e.message}`, 'MarkWatched', 'error');
        }
    }

    _addWatchedBadge(card, videoId) {
        const thumbnail = card.querySelector(MarkWatched.SELECTORS.THUMBNAIL_CONTAINER);
        if (!thumbnail || thumbnail.querySelector('.ypp-watched-badge')) return;

        const badge = document.createElement('div');
        badge.className = 'ypp-watched-badge';
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

    _removeWatchedBadge(card) {
        card.querySelector('.ypp-watched-badge')?.remove();
    }

    _addHoverEyeIcon(card, videoId) {
        const thumbnail = card.querySelector(MarkWatched.SELECTORS.THUMBNAIL_CONTAINER);
        if (!thumbnail) return;
        
        let icon = thumbnail.querySelector('.ypp-watched-icon-permanent');
        if (!icon) {
            icon = document.createElement('div');
            icon.className = 'ypp-watched-icon-permanent';
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
            thumbnail.appendChild(icon);

            this.addListener(icon, 'mouseenter', () => {
                icon.style.background = 'var(--ypp-accent, #3ea6ff)';
                icon.style.transform = 'scale(1.1)';
            });
            this.addListener(icon, 'mouseleave', () => {
                icon.style.background = '';
                icon.style.transform = '';
            });
        }
        
        this.addListener(icon, 'click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (this._watchedIds.has(videoId)) {
                this.unmarkAsWatched(videoId);
            } else {
                this.markAsWatched(videoId);
            }
        });
        
        icon.title = this._watchedIds.has(videoId) ? 'Unmark as watched' : 'Mark as watched';
    }

    _addContextMenu(card, videoId) {
        if (card.dataset.yppContextMenu) return;
        card.dataset.yppContextMenu = '1';

        this.addListener(card, 'contextmenu', (e) => {
            document.querySelectorAll('.ypp-watch-context-menu').forEach(el => el.remove());

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

            this.addListener(item, 'mouseenter', () => item.style.background = 'rgba(255,255,255,0.08)');
            this.addListener(item, 'mouseleave', () => item.style.background = 'transparent');
            this.addListener(item, 'click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (isWatched) {
                    this.unmarkAsWatched(videoId);
                } else {
                    this.markAsWatched(videoId);
                }
                menu.remove();
            });

            menu.appendChild(item);
            document.body.appendChild(menu);

            // Scoped close listener
            const closeHandler = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.remove();
                }
            };
            setTimeout(() => {
                this.addListener(document, 'click', closeHandler);
            }, 0);
        });
    }

    _onNavigate() {
        const url = window.location.href;
        const match = url.match(/[?&]v=([^&]+)/);
        if (!match) return;

        const videoId = match[1];

        // Ensure cleanup of previous listener across SPA navigations
        if (this._activeVideoEl && this._onTimeUpdateBinded) {
            try { this._activeVideoEl.removeEventListener('timeupdate', this._onTimeUpdateBinded); } catch (e) {}
        }
        
        this._activeVideoEl = null;

        window.YPP.Utils.pollFor(() => {
            return document.querySelector(MarkWatched.SELECTORS.VIDEO);
        }, 10000, 500).then(video => {
            if (!video || !this.isEnabled) return;

            this._activeVideoEl = video;

            const checkProgress = () => {
                if (!video.duration) return;
                const percent = (video.currentTime / video.duration) * 100;
                const threshold = this.settings?.hideWatchedThreshold ?? 80;
                if (percent >= threshold) {
                    this.markAsWatched(videoId);
                }
            };

            this._onTimeUpdateBinded = checkProgress;
            // Use native addEventListener here specifically because we track its removal precisely above for SPA navs
            this._activeVideoEl.addEventListener('timeupdate', this._onTimeUpdateBinded);
        }).catch(() => {
            this.utils.log?.('Video element not found for tracking watch progress', 'MarkWatched', 'warn');
        });
    }
};
