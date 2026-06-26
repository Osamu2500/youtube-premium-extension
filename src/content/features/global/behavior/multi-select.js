window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MultiSelect = class MultiSelect
    extends window.YPP.features.BaseFeature {

    constructor() {
        super('MultiSelect');
        this._selected = new Map(); // videoId → { title, href, element }
        this._bound = this._init.bind(this);
        this._debouncedBound = null;
        this._actionBar = null;
    }

    getConfigKey() { return 'multiSelect'; }

    async enable() {
        await super.enable();
        this._init();
        this._debouncedBound = window.YPP.Utils?.debounce
            ? window.YPP.Utils.debounce(this._bound, 200)
            : this._bound;
        window.YPP.events?.on('app:pageChange', this._bound);
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register(
                'multi-select',
                'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer, ytd-grid-video-renderer',
                () => this._debouncedBound()
            );
        }
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('app:pageChange', this._bound);
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('multi-select');
        }
        
        this._clearAll();
        this._actionBar?.remove();
        this._actionBar = null;
    }

    _init() {
        this._attachCheckboxes();
    }

    _simulateMouseClick(el) {
        if (!el) return;
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(name => {
            const ev = new MouseEvent(name, {bubbles:true, cancelable:true, view:window});
            el.dispatchEvent(ev);
        });
    }

    _findNearestDropdownTo(menuBtn) {
        const btnRect = menuBtn.getBoundingClientRect();
        if (!btnRect) return null;
        const dropdowns = Array.from(document.querySelectorAll('tp-yt-iron-dropdown, yt-sheet-view-model, ytd-popup-container'))
            .filter(d => {
                const r = d.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            });
        if (!dropdowns.length) return null;
        let best = null, bestDist = Infinity;
        const bx = btnRect.left + btnRect.width/2, by = btnRect.top + btnRect.height/2;
        for (const d of dropdowns) {
            const r = d.getBoundingClientRect();
            const dx = (r.left + r.width/2) - bx;
            const dy = (r.top + r.height/2) - by;
            const dist = Math.hypot(dx, dy);
            if (dist < bestDist) { bestDist = dist; best = d; }
        }
        return best;
    }

    _waitForNearestDropdown(menuBtn, timeout = 2500) {
        return new Promise(resolve => {
            const start = Date.now();
            const handle = setInterval(() => {
                const popup = this._findNearestDropdownTo(menuBtn);
                if (popup) {
                    clearInterval(handle);
                    resolve(popup);
                } else if (Date.now() - start > timeout) {
                    clearInterval(handle);
                    resolve(null);
                }
            }, 60);
        });
    }

    _getVideoCards() {
        return document.querySelectorAll(
            'ytd-rich-item-renderer, ' +
            'ytd-video-renderer, ' +
            'ytd-compact-video-renderer, ' +
            'ytd-playlist-video-renderer, ' +
            'ytd-grid-video-renderer, ' +
            'ytd-reel-item-renderer, ' +
            'ytd-playlist-panel-video-renderer, ' +
            'yt-lockup-view-model, ' +
            'ytd-lockup-view-model'
        );
    }

    /** @param {HTMLElement} card */
    _getVideoData(card) {
        const anchor = /** @type {HTMLAnchorElement} */ (card.querySelector(
            'a#thumbnail, a.ytd-thumbnail, ' +
            'a#wc-endpoint, a.ytd-playlist-video-renderer'
        ));
        const href = anchor?.href || '';
        const videoId = href.match(/[?&]v=([^&]+)/)?.[1];
        const title = card.querySelector(
            '#video-title, h3 a, .title'
        )?.textContent?.trim() || '';
        return { videoId, href, title };
    }

    _attachCheckboxes() {
        this._getVideoCards().forEach(el => {
            const card = /** @type {HTMLElement} */ (el);
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
                thumb.appendChild(cb);
            }

            // Checkbox direct click
            this.addListener(cb, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._toggleSelect(card, videoId, href, title);
            });
        });
    }

    /** 
     * @param {HTMLElement} card 
     * @param {string} videoId 
     * @param {string} href 
     * @param {string} title 
     */
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
            const el = /** @type {HTMLElement} */ (element);
            el.classList.remove('ypp-ms-selected');
            el.querySelector('.ypp-ms-checkbox')
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
            
            this._actionBar.innerHTML = `
                <div class="ypp-ms-bar-info">
                    <span class="ypp-ms-count" id="ypp-ms-count-val">${count}</span>
                    <span class="ypp-ms-label" id="ypp-ms-count-label">
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
                        Open First
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
                    <button class="ypp-ms-btn" id="ypp-ms-not-interested">
                        <svg viewBox="0 0 24 24" width="15" height="15" 
                            fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        Not Interested
                    </button>
                    <button class="ypp-ms-btn" id="ypp-ms-watched">
                        <svg viewBox="0 0 24 24" width="15" height="15"
                            fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        Mark Watched
                    </button>
                    <button class="ypp-ms-btn ypp-ms-btn-clear" 
                        id="ypp-ms-clear">
                        ✕ Clear
                    </button>
                </div>
            `;
            
            // Wire buttons ONLY once
            const queueBtn = this._actionBar.querySelector('#ypp-ms-queue');
            if (queueBtn) this.addListener(queueBtn, 'click', () => this._addToQueue());

            const wlBtn = this._actionBar.querySelector('#ypp-ms-wl');
            if (wlBtn) this.addListener(wlBtn, 'click', () => this._addToWatchLater());

            const plBtn = this._actionBar.querySelector('#ypp-ms-playlist');
            if (plBtn) this.addListener(plBtn, 'click', () => this._showPlaylistPicker());

            const niBtn = this._actionBar.querySelector('#ypp-ms-not-interested');
            if (niBtn) this.addListener(niBtn, 'click', () => this._markNotInterested());

            const watchedBtn = this._actionBar.querySelector('#ypp-ms-watched');
            if (watchedBtn) this.addListener(watchedBtn, 'click', () => this._markSelectedWatched());

            const clearBtn = this._actionBar.querySelector('#ypp-ms-clear');
            if (clearBtn) this.addListener(clearBtn, 'click', () => this._clearAll());
        }

        // Fast update instead of full innerHTML re-render
        const countSpan = this._actionBar.querySelector('#ypp-ms-count-val');
        const labelSpan = this._actionBar.querySelector('#ypp-ms-count-label');
        if (countSpan) countSpan.textContent = count.toString();
        if (labelSpan) labelSpan.textContent = `video${count !== 1 ? 's' : ''} selected`;
    }

    _addToQueue() {
        const videos = [...this._selected.values()];
        if (!videos.length) return;

        // YouTube has no public extension API for batch-queuing.
        // Best approach: navigate to the first video via SPA nav.
        // The user can then use YouTube's native queue for additional videos.
        const first = videos[0];
        const ytApp = document.querySelector('ytd-app');
        if (ytApp && typeof ytApp.fire === 'function') {
            ytApp.fire('yt-navigate', { url: first.href });
        } else {
            window.location.href = first.href;
        }

        if (videos.length > 1) {
            this._showToast(`Navigated to first video. Use YouTube's queue (⋮ menu) to add the other ${videos.length - 1}.`);
        } else {
            this._showToast('Navigated to video.');
        }
        this._clearAll();
    }

    async _addToWatchLater() {
        const videos = [...this._selected.values()];

        for (const { element } of videos) {
            const menuBtn = /** @type {HTMLElement} */ (element.querySelector(
                'ytd-menu-renderer button, ' +
                'button[aria-label*="More actions"], button[aria-label*="Action menu"]'
            ));
            if (!menuBtn) continue;

            this._simulateMouseClick(menuBtn);

            const popup = await this._waitForNearestDropdown(menuBtn, 3000);
            if (!popup) continue;

            const items = Array.from(popup.querySelectorAll('[role="menuitem"], yt-list-item-view-model-wiz, yt-list-item-view-model'));
            let wlItem = null;
            for (const it of items) {
                const txt = (it.innerText || it.textContent || '').trim().toLowerCase();
                if (txt.includes('watch later')) {
                    wlItem = it;
                    break;
                }
            }

            if (wlItem) {
                const clickable = wlItem.querySelector('.yt-list-item-view-model-wiz__label') || wlItem;
                this._simulateMouseClick(clickable);
            }
        }

        this._showToast(`${videos.length} videos saved to Watch Later`);
        this._clearAll();
    }

    async _showPlaylistPicker() {
        const first = [...this._selected.values()][0];
        if (!first) return;

        const menuBtn = /** @type {HTMLElement} */ (first.element.querySelector(
            'ytd-menu-renderer button, ' +
            'button[aria-label*="More actions"], button[aria-label*="Action menu"]'
        ));
        if (!menuBtn) return;

        this._simulateMouseClick(menuBtn);

        const popup = await this._waitForNearestDropdown(menuBtn, 3000);
        if (!popup) return;

        const items = Array.from(popup.querySelectorAll('[role="menuitem"], yt-list-item-view-model-wiz, yt-list-item-view-model'));
        let saveItem = null;
        for (const it of items) {
            const txt = (it.innerText || it.textContent || '').trim().toLowerCase();
            if (txt.includes('save to playlist') || txt === 'save') {
                saveItem = it;
                break;
            }
        }

        if (saveItem) {
            const clickable = saveItem.querySelector('.yt-list-item-view-model-wiz__label') || saveItem;
            this._simulateMouseClick(clickable);
        }
    }

    async _markNotInterested() {
        const videos = [...this._selected.values()];

        for (const { element } of videos) {
            const menuBtn = /** @type {HTMLElement} */ (element.querySelector(
                'ytd-menu-renderer button, ' +
                'button[aria-label*="More actions"], button[aria-label*="Action menu"]'
            ));
            if (!menuBtn) continue;

            this._simulateMouseClick(menuBtn);

            const popup = await this._waitForNearestDropdown(menuBtn, 3000);
            if (!popup) continue;

            const items = Array.from(popup.querySelectorAll('[role="menuitem"], yt-list-item-view-model-wiz, yt-list-item-view-model'));
            let notInterestedItem = null;
            for (const it of items) {
                const txt = (it.innerText || it.textContent || '').trim().toLowerCase();
                if (txt.includes('not interested')) {
                    notInterestedItem = it;
                    break;
                }
            }

            if (notInterestedItem) {
                const clickable = notInterestedItem.querySelector('.yt-list-item-view-model-wiz__label') || notInterestedItem;
                this._simulateMouseClick(clickable);
                try { element.style.opacity = '0.45'; } catch(e){}
            }
        }

        this._showToast(`${videos.length} videos marked as Not Interested`);
        this._clearAll();
    }

    /** @param {string} message */
    _showToast(message) {
        window.YPP.Utils?.showToast?.(message) ||
        this._log(message);
    }

    /** 
     * Marks all selected videos as watched via the MarkWatched feature.
     * Requires the MarkWatched feature to be enabled.
     */
    _markSelectedWatched() {
        const markWatched = window.YPP.featureManager?.getFeature?.('MarkWatched')
            || window.YPP.featureManager?.features?.['MarkWatched'];

        if (!markWatched) {
            this._showToast('Enable "Mark as Watched" feature first');
            return;
        }

        let count = 0;
        for (const { href } of this._selected.values()) {
            const match = href.match(/[?&]v=([^&]+)|\/shorts\/([^/?]+)/);
            const videoId = match?.[1] || match?.[2];
            if (videoId) {
                markWatched.markAsWatched(videoId);
                count++;
            }
        }

        this._showToast(`${count} video${count !== 1 ? 's' : ''} marked as watched`);
        this._clearAll();
    }

    /** @param {string} message */
    _log(message) {
        window.YPP.Utils?.log?.(message, 'MULTI-SELECT', 'debug');
    }
};
