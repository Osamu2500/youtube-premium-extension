window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SmartThumbnails = class SmartThumbnails extends window.YPP.features.BaseFeature {
    constructor() {
        super('SmartThumbnails');
        this.observer = this.observer || window.YPP.sharedObserver;
        this.cache = new Map();
        
        // Settings defaults
        this.enableSmartTitles = true;
        this.enableSmartThumbnails = true;
    }

    getConfigKey() { return 'enableSmartThumbnails'; }

    async enable() {
        await super.enable();
        if (!this.settings.enableSmartThumbnails && !this.settings.enableSmartTitles) return;
        
        this.enableSmartTitles = this.settings.enableSmartTitles ?? true;
        this.enableSmartThumbnails = this.settings.enableSmartThumbnails ?? true;
        
        if (this.observer) {
            this.observer.start();
            this.observer.register(
                'smart-thumbnails',
                'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer',
                (elements) => this.processVideos(elements),
                true
            );
        }
    }

    disable() {
        super.disable();
        if (this.observer) {
            this.observer.unregister('smart-thumbnails');
        }
        this._restoreOriginals();
    }

    onUpdate() {
        this.enableSmartTitles = this.settings.enableSmartTitles ?? true;
        this.enableSmartThumbnails = this.settings.enableSmartThumbnails ?? true;
    }

    async processVideos(elements) {
        if (!this.enableSmartTitles && !this.enableSmartThumbnails) return;

        const videoIds = [];
        const videoMap = new Map();

        elements.forEach(el => {
            if (el.hasAttribute('data-ypp-dearrow')) return;
            
            const anchor = el.querySelector('a#thumbnail');
            if (!anchor) return;
            
            const href = anchor.getAttribute('href');
            if (!href || !href.includes('/watch?v=')) return;
            
            const videoId = new URL(href, 'https://youtube.com').searchParams.get('v');
            if (!videoId) return;

            el.setAttribute('data-ypp-dearrow', 'processing');
            videoIds.push(videoId);
            videoMap.set(videoId, el);
        });

        if (videoIds.length === 0) return;

        // Fetch data for all extracted IDs (DeArrow API supports batching or single, we'll do single for now or batch if supported)
        // Wait, DeArrow API supports batch via ?videoIDs=a,b,c
        await this._fetchDeArrowData(videoIds, videoMap);
    }

    async _fetchDeArrowData(videoIds, videoMap) {
        // DeArrow API: https://sponsor.ajay.app/api/branding?videoIDs=id1,id2
        // It returns an array of objects.
        const uncachedIds = videoIds.filter(id => !this.cache.has(id));
        
        if (uncachedIds.length > 0) {
            try {
                // Batch fetch (limit to 50 at a time)
                const batches = [];
                for (let i = 0; i < uncachedIds.length; i += 50) {
                    batches.push(uncachedIds.slice(i, i + 50));
                }

                for (const batch of batches) {
                    const response = await fetch(`https://sponsor.ajay.app/api/branding?videoIDs=${batch.join(',')}`);
                    if (!response.ok) throw new Error('API Error');
                    
                    const data = await response.json();
                    data.forEach(item => {
                        this.cache.set(item.videoID, item);
                    });
                }
            } catch (err) {
                this.utils?.log?.('DeArrow API error: ' + err.message, 'SmartThumbnails', 'warn');
                // Mark failed ones so we don't retry endlessly
                uncachedIds.forEach(id => this.cache.set(id, null));
            }
        }

        // Apply
        videoIds.forEach(id => {
            const data = this.cache.get(id);
            const el = videoMap.get(id);
            if (data && el) {
                this._applyDeArrowData(el, data);
            }
            if (el) {
                el.setAttribute('data-ypp-dearrow', 'done');
            }
        });
    }

    _applyDeArrowData(el, data) {
        if (this.enableSmartTitles && data.titles && data.titles.length > 0) {
            const newTitle = data.titles[0].title;
            const titleEl = el.querySelector('#video-title, #video-title-link');
            if (titleEl) {
                if (!titleEl.hasAttribute('data-original-title')) {
                    titleEl.setAttribute('data-original-title', titleEl.textContent.trim());
                }
                titleEl.textContent = newTitle;
                titleEl.title = newTitle + ' (Original: ' + titleEl.getAttribute('data-original-title') + ')';
            }
        }

        if (this.enableSmartThumbnails && data.thumbnails && data.thumbnails.length > 0) {
            const newThumbUrl = `https://img.youtube.com/vi/${data.videoID}/maxresdefault.jpg`; // Wait, DeArrow API returns timestamp or custom URL?
            // Actually, DeArrow returns timestamp for thumbnails. 
            // The API response is like: { videoID: '...', thumbnails: [{ timestamp: 123.45 }, ... ] }
            // The thumbnail image can be fetched via https://sponsor.ajay.app/api/thumbnail?videoID=...
            const imgEl = el.querySelector('yt-image img');
            if (imgEl) {
                if (!imgEl.hasAttribute('data-original-src')) {
                    imgEl.setAttribute('data-original-src', imgEl.src);
                }
                imgEl.src = `https://sponsor.ajay.app/api/thumbnail?videoID=${data.videoID}`;
            }
        }
    }

    _restoreOriginals() {
        document.querySelectorAll('[data-ypp-dearrow]').forEach(el => {
            el.removeAttribute('data-ypp-dearrow');
            const titleEl = el.querySelector('[data-original-title]');
            if (titleEl) {
                titleEl.textContent = titleEl.getAttribute('data-original-title');
                titleEl.title = titleEl.getAttribute('data-original-title');
                titleEl.removeAttribute('data-original-title');
            }
            const imgEl = el.querySelector('[data-original-src]');
            if (imgEl) {
                imgEl.src = imgEl.getAttribute('data-original-src');
                imgEl.removeAttribute('data-original-src');
            }
        });
    }
};
