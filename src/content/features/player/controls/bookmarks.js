/**
 * Bookmarks Manager
 * Captures video timestamps and highlights
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.BookmarksManager = class BookmarksManager extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'enableBookmarks'; }

    constructor() {
        super('BookmarksManager');
        this._initConstants();
        this._isActive = false;
        this._captureBtn = null;
    }

    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
    }

    async enable() {
        if (this._isActive) return;
        this._isActive = true;
        this.utils.log('Enabled BookmarksManager', 'BOOKMARKS');

        this._startMonitoring();
    }

    async disable() {
        this._isActive = false;
        this._removeControls();
        super.disable(); // Cleanup events via BaseFeature
    }

    async _startMonitoring() {
        if (!this.utils.pollFor) return;

        try {
            // Wait for player controls
            const controls = await this.utils.pollFor(() => document.querySelector(this._SELECTORS.VIDEO_CONTROLS), 10000, 500);
            if (!this._isActive || !controls) return;
            
            this._injectControls();
            
            // Re-check on navigation
            this.addListener(window, 'yt-navigate-finish', () => this._checkForPlayer());

            // Use sharedObserver to ensure it stays in DOM after SPA updates
            if (this.observer && this.observer.register) {
                this.observer.register('bookmarks-controls-watch', '.ytp-right-controls, .ypp-player-controls', () => {
                    if (!this._isActive) return;
                    
                    const btn = document.querySelector('.ypp-capture-btn');
                    const hasCustomControls = !!document.querySelector('.ypp-player-controls');
                    const isUnderCustomControls = btn && btn.closest('.ypp-player-controls');
                    
                    if (!btn) {
                        if (window.YPP.DomAPI?.getVideoControls() || document.querySelector(this._SELECTORS.VIDEO_CONTROLS)) {
                            this._injectControls();
                        }
                    } else if (hasCustomControls && !isUnderCustomControls) {
                        // The button was injected into the fallback location because player.js was too slow.
                        // Now that custom controls exist, move the button inside them.
                        if (window.YPP.ui && window.YPP.ui.manager) {
                            window.YPP.ui.manager.remove('bookmark-capture-btn');
                        }
                        if (btn.parentNode) btn.parentNode.removeChild(btn);
                        
                        this._captureBtn = null;
                        this._injectControls();
                    }
                });
            }
        } catch (error) {
            this.utils.log('BookmarksManager timeout waiting for controls', 'BOOKMARKS', 'debug');
        }
    }

    _checkForPlayer() {
        if (!this._isActive) return;
        if (window.YPP.DomAPI?.getVideoControls() || document.querySelector(this._SELECTORS.VIDEO_CONTROLS)) {
            this._injectControls();
        }
    }

    _injectControls() {
        const placement = this.settings?.pb_bookmark || 'front';
        if (placement !== 'front') return;
        
        if (document.querySelector('.ypp-capture-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'ypp-action-btn ypp-capture-btn';
        btn.title = 'Capture Highlight (Bookmark)';
        btn.setAttribute('aria-label', 'Capture Highlight');
        
        // Standard Material Bookmark SVG (24x24)
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            this._captureHighlight();
        });

        this._captureBtn = btn;

        const component = {
            id: 'bookmark-capture-btn',
            el: btn
        };

        // Try to use UIManager for robust mounting
        if (window.YPP.ui && window.YPP.ui.manager) {
            const hasCustomControls = !!document.querySelector('.ypp-player-controls');
            if (hasCustomControls) {
                window.YPP.ui.manager.mount('customPlayerControls', component, 'append');
            } else {
                window.YPP.ui.manager.mount('playerControls', component, 'prepend');
            }
        } else {
            // Try to place it with the other custom buttons first
            const customControls = document.querySelector('.ypp-player-controls');
            if (customControls) {
                customControls.appendChild(btn);
            } else {
                // Fallback to native placement
                btn.className = 'ytp-button ypp-capture-btn';
                btn.innerHTML = `<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><path class="ytp-svg-fill" d="M 12,8 L 12,28 L 18,24 L 24,28 L 24,8 Z" /></svg>`;
                const rightControls = document.querySelector('.ytp-right-controls');
                if (rightControls) {
                    rightControls.prepend(btn);
                } else {
                    const controls = document.querySelector(this._SELECTORS.VIDEO_CONTROLS);
                    if (controls) {
                        controls.prepend(btn);
                    }
                }
            }
        }
    }

    _removeControls() {
        if (this.observer && this.observer.unregister) {
            this.observer.unregister('bookmarks-controls-watch');
        }

        if (window.YPP.ui && window.YPP.ui.manager) {
            window.YPP.ui.manager.remove('bookmark-capture-btn');
        } else if (this._captureBtn && this._captureBtn.parentNode) {
            this._captureBtn.parentNode.removeChild(this._captureBtn);
        }
        this._captureBtn = null;
    }

    async _captureHighlight() {
        const video = window.YPP.DomAPI?.getVideoElement() || document.querySelector(this._SELECTORS.VIDEO);
        if (!video) return;

        const currentTime = video.currentTime;
        const videoId = new URLSearchParams(window.location.search).get('v') || '';
        const title = this._getVideoTitle();
        
        // Extract caption text
        let transcriptText = this._extractCaptionText();
        if (!transcriptText) {
            transcriptText = "No transcript captured (CC was off or unavailable).";
        }

        const newBookmark = {
            id: 'bm_' + Date.now(),
            videoId: videoId,
            videoTitle: title,
            timestamp: currentTime,
            text: transcriptText,
            createdAt: Date.now()
        };

        await this._saveBookmark(newBookmark);
        this._showToast('Highlight captured!');
    }

    _getVideoTitle() {
        let titleEl = null;
        const selectors = this._SELECTORS.METADATA_SELECTORS?.TITLE || ['h1.ytd-watch-metadata', '#title h1'];
        for (const selector of selectors) {
            titleEl = document.querySelector(selector);
            if (titleEl && titleEl.textContent) break;
        }
        return titleEl ? titleEl.textContent.trim() : 'Unknown Video';
    }

    _extractCaptionText() {
        // Look for the currently active caption segments
        const captionSelectors = this._SELECTORS.CAPTIONS_WINDOW || ['.ytp-caption-window-bottom', '.ytp-caption-window-top'];
        let fullText = [];
        
        for (const selector of captionSelectors) {
            const container = document.querySelector(selector);
            if (container && container.style.display !== 'none') {
                const segments = container.querySelectorAll('.ytp-caption-segment');
                segments.forEach(seg => {
                    const text = seg.textContent.trim();
                    if (text) fullText.push(text);
                });
            }
        }
        
        return fullText.join(' ');
    }

    async _saveBookmark(bookmark) {
        const bookmarksData = await window.YPP.StorageManager.get('ypp_bookmarks');
        const bookmarks = bookmarksData || [];
        bookmarks.unshift(bookmark);
        await window.YPP.StorageManager.set('ypp_bookmarks', bookmarks);
    }

    _showToast(message) {
        if (this.utils.createToast) {
            this.utils.createToast(message);
        }
    }
};
