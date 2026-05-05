window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MultiSelect = class MultiSelect
    extends window.YPP.features.BaseFeature {

    constructor() {
        super('MultiSelect');
        this._selected = new Map(); // videoId → { title, href, element }
        this._bound = this._init.bind(this);
        this._actionBar = null;
    }

    getConfigKey() { return 'multiSelect'; }

    async enable() {
        await super.enable();
        this._init();
        window.YPP.events?.on('page:changed', this._bound);
        window.YPP.events?.on('dom:nodes-added', this._bound);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._bound);
        window.YPP.events?.off('dom:nodes-added', this._bound);
        this._clearAll();
        this._actionBar?.remove();
        this._actionBar = null;
    }

    _init() {
        this._attachCheckboxes();
    }

    _getVideoCards() {
        return document.querySelectorAll(
            'ytd-rich-item-renderer, ' +
            'ytd-video-renderer, ' +
            'ytd-compact-video-renderer, ' +
            'ytd-playlist-video-renderer, ' +
            'ytd-grid-video-renderer'
        );
    }

    _getVideoData(card) {
        const anchor = card.querySelector(
            'a#thumbnail, a.ytd-thumbnail, ' +
            'a#wc-endpoint, a.ytd-playlist-video-renderer'
        );
        const href = anchor?.href || '';
        const videoId = href.match(/[?&]v=([^&]+)/)?.[1];
        const title = card.querySelector(
            '#video-title, h3 a, .title'
        )?.textContent?.trim() || '';
        return { videoId, href, title };
    }

    _attachCheckboxes() {
        this._getVideoCards().forEach(card => {
            if (card.dataset.yppMultiSelect) return;
            card.dataset.yppMultiSelect = '1';

            const { videoId, href, title } = this._getVideoData(card);
            if (!videoId) return;

            // Create checkbox
            const cb = document.createElement('div');
            cb.className = 'ypp-ms-checkbox';
            cb.dataset.videoId = videoId;
            cb.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" 
                    fill="none" stroke="currentColor" stroke-width="3"
                    class="ypp-ms-check-icon">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;

            // Position on thumbnail
            const thumb = card.querySelector('ytd-thumbnail, #thumbnail');
            if (thumb) {
                thumb.style.position = 'relative';
                thumb.appendChild(cb);
            }

            // Checkbox direct click
            cb.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._toggleSelect(card, videoId, href, title);
            });
        });
    }

    _toggleSelect(card, videoId, href, title) {
        if (this._selected.has(videoId)) {
            this._selected.delete(videoId);
            card.classList.remove('ypp-ms-selected');
            card.querySelector('.ypp-ms-checkbox')
                ?.classList.remove('ypp-ms-checked');
        } else {
            this._selected.set(videoId, { title, href, element: card });
            card.classList.add('ypp-ms-selected');
            card.querySelector('.ypp-ms-checkbox')
                ?.classList.add('ypp-ms-checked');
        }

        this._updateActionBar();
    }

    _clearAll() {
        this._selected.forEach(({ element }) => {
            element.classList.remove('ypp-ms-selected');
            element.querySelector('.ypp-ms-checkbox')
                ?.classList.remove('ypp-ms-checked');
        });
        this._selected.clear();
        this._updateActionBar();
    }

    _updateActionBar() {
        const count = this._selected.size;

        if (count === 0) {
            this._actionBar?.remove();
            this._actionBar = null;
            return;
        }

        if (!this._actionBar) {
            this._actionBar = document.createElement('div');
            this._actionBar.className = 'ypp-ms-bar';
            document.body.appendChild(this._actionBar);
        }

        this._actionBar.innerHTML = `
            <div class="ypp-ms-bar-info">
                <span class="ypp-ms-count">${count}</span>
                <span class="ypp-ms-label">
                    video${count !== 1 ? 's' : ''} selected
                </span>
            </div>
            <div class="ypp-ms-bar-actions">
                <button class="ypp-ms-btn" id="ypp-ms-queue">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    Add to Queue
                </button>
                <button class="ypp-ms-btn" id="ypp-ms-playlist">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 
                            2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                    </svg>
                    Save to Playlist
                </button>
                <button class="ypp-ms-btn" id="ypp-ms-wl">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Watch Later
                </button>
                <button class="ypp-ms-btn ypp-ms-btn-clear" 
                    id="ypp-ms-clear">
                    ✕ Clear
                </button>
            </div>
        `;

        // Wire buttons
        this._actionBar.querySelector('#ypp-ms-queue')
            ?.addEventListener('click', () => this._addToQueue());

        this._actionBar.querySelector('#ypp-ms-wl')
            ?.addEventListener('click', () => this._addToWatchLater());

        this._actionBar.querySelector('#ypp-ms-playlist')
            ?.addEventListener('click', () => this._showPlaylistPicker());

        this._actionBar.querySelector('#ypp-ms-clear')
            ?.addEventListener('click', () => this._clearAll());
    }

    _addToQueue() {
        const videos = [...this._selected.values()];
        // Open each video URL — YouTube adds to queue when navigating
        // with a video already playing
        videos.forEach(({ href }, i) => {
            setTimeout(() => {
                // Trigger YouTube's native "Add to queue" by navigating
                // with &list= parameter or using the internal API
                const url = new URL(href);
                window.open(href, '_blank');
            }, i * 200);
        });

        this._showToast(`${videos.length} videos added to queue`);
        this._clearAll();
    }

    _addToWatchLater() {
        const videos = [...this._selected.values()];

        videos.forEach(({ element }) => {
            // Find and click the native "Save to Watch Later" 
            // from the three-dot menu
            const menuBtn = element.querySelector(
                'ytd-menu-renderer button, ' +
                '#button[aria-label*="Action menu"]'
            );
            if (!menuBtn) return;

            menuBtn.click();

            setTimeout(() => {
                const watchLaterBtn = document.querySelector(
                    'ytd-menu-service-item-renderer:first-child, ' +
                    '[aria-label*="Watch later"], ' +
                    'yt-formatted-string:first-child'
                );
                watchLaterBtn?.click();
            }, 300);
        });

        this._showToast(`${videos.length} videos saved to Watch Later`);
        this._clearAll();
    }

    _showPlaylistPicker() {
        // Trigger YouTube's native playlist save dialog
        // on the first selected video's three-dot menu
        const first = [...this._selected.values()][0];
        if (!first) return;

        const menuBtn = first.element.querySelector(
            'ytd-menu-renderer button'
        );
        menuBtn?.click();

        setTimeout(() => {
            const saveBtn = document.querySelector(
                '[aria-label*="Save to playlist"], ' +
                'ytd-menu-service-item-renderer:nth-child(2)'
            );
            saveBtn?.click();
        }, 300);
    }

    _showToast(message) {
        window.YPP.Utils?.showToast?.(message) ||
        console.log(`[YPP] ${message}`);
    }
};
