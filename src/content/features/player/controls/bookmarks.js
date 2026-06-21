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

    async disable() {
        this._removeControls();
        super.disable();
    }



    _removeControls() {
        document.querySelectorAll('.ypp-capture-btn').forEach(btn => btn.remove());
    }



    createButton(video) {
        const placement = this.settings?.pb_bookmark || 'front';
        if (placement !== 'front') {
            return null;
        }

        const btn = document.createElement('button');
        btn.className = 'ypp-action-btn ypp-capture-btn';
        btn.title = 'Capture Highlight (Bookmark)';
        btn.setAttribute('aria-label', 'Capture Highlight');
        
        // Standard Material Bookmark SVG (24x24)
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
        
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            this._captureHighlight(video);
        });

        this._captureBtn = btn;
        return btn;
    }

    async _captureHighlight(video) {
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
