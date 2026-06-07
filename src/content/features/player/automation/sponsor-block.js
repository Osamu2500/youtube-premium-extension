/**
 * Feature: SponsorBlock Integration
 * Automatically skips non-content segments (Sponsors, Intros, Outros, etc.) using the SponsorBlock API.
 * API: https://sponsor.ajay.app/
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SponsorBlock = class SponsorBlock extends window.YPP.features.BaseFeature {
    constructor() {
        super('SponsorBlock');
        
        this.videoId = null;
        this.segments = [];
        this.segmentElements = [];
        this.videoElement = null;
        this.abortController = null;
        this._retryTimeout = null; // tracked so stop() can cancel it
        
        // Cache for segments (avoid re-fetching same video)
        this.segmentCache = new Map();
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        // Default categories — overridden at runtime by per-category settings
        this._defaultCategories = ['sponsor', 'selfpromo', 'intro', 'music_offtopic', 'preview'];
        
        this.COLORS = {
            'sponsor': '#00d400',
            'selfpromo': '#ffff00',
            'interaction': '#cc00ff',
            'intro': '#00ffff',
            'outro': '#0202ed',
            'preview': '#008fd6',
            'music_offtopic': '#ff9900',
            'filler': '#7300FF'
        };
        
        // Binds
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
        this.handleVideoLoaded = this.handleVideoLoaded.bind(this);
    }

    getConfigKey() {
        // Assume settings has a enableSponsorBlock or sponsorBlock key
        return 'sponsorBlock';
    }

    async enable() {
        if (!this.utils.isWatchPage()) return;
        await super.enable();

        this.init();
        this.addListener(window, 'yt-navigate-finish', this.handleNavigation);
    }

    async disable() {
        await super.disable();
        this.stop();
        this.clearSegments();
    }

    async onUpdate() {
        // Handle setting changes (e.g. toggling categories if we add that later)
        // For now, if settings change, we could theoretically clear and refetch.
        // We'll leave this empty for basic re-runs.
        if (this.utils.isWatchPage() && !this.videoElement) {
            this.init();
        }
    }

    handleNavigation() {
        if (!this.isEnabled) return;
        this.stop(); // Clean up previous video

        // Prune stale cache entries (older than CACHE_DURATION)
        const now = Date.now();
        for (const [id, entry] of this.segmentCache) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                this.segmentCache.delete(id);
            }
        }

        if (this.utils.isWatchPage()) {
            this.init();
        }
    }

    async init() {
        this.videoId = this.getVideoId();
        if (!this.videoId) return;

        try {
            // Wait for video element
            const video = await this.utils.pollFor(() => {
                const v = document.querySelector('video');
                if (v && v.readyState >= 1) return v;
                return null;
            }, 10000, 500);

            if (video) {
                this.videoElement = video;
                this.addListener(this.videoElement, 'timeupdate', this.handleTimeUpdate);
                this.addListener(this.videoElement, 'loadedmetadata', this.handleVideoLoaded);
                this.addListener(this.videoElement, 'durationchange', this.handleVideoLoaded);
                
                // If it already has duration, render directly
                if (this.videoElement.duration) {
                     this.handleVideoLoaded();
                }

                this.fetchSegments();
            }
        } catch (error) {
            this.utils.log?.('SponsorBlock initialization timed out waiting for video', 'SPONSOR', 'warn');
        }
        
        // Observe for player controls recreating, which wipes our segments
        this.observer.register('sponsor-progress', '.ytp-progress-list', (elements) => {
            if (!elements || elements.length === 0) return;
            const progressList = elements[0];
            
            if (this.segmentElements.length === 0 && this.segments.length > 0 && this.videoElement?.duration) {
                this.renderSegments();
            } else if (this.segmentElements.length > 0) {
                // Check if our segments are still attached to the DOM
                const stillAttached = this.segmentElements.some(el => progressList.contains(el));
                if (!stillAttached) {
                     this.renderSegments();
                }
            }
        }, false);
    }

    stop() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this._retryTimeout) {
            clearTimeout(this._retryTimeout);
            this._retryTimeout = null;
        }
        this.retryAttempted = false;
        this.segments = [];
        this.clearSegments();
        this.videoElement = null;
    }

    handleVideoLoaded() {
        if (this.segments.length > 0 && this.videoElement && this.videoElement.duration) {
            this.renderSegments();
        }
    }

    getVideoId() {
        return new URLSearchParams(window.location.search).get('v');
    }

    /**
     * Build the active category list from per-category settings.
     * Falls back to the default array if settings are unavailable.
     */
    _getActiveCategories() {
        const s = this.settings;
        if (!s) return this._defaultCategories.slice();
        const CAT_MAP = {
            sponsor:        'sb_sponsor',
            intro:          'sb_intro',
            selfpromo:      'sb_selfpromo',
            interaction:    'sb_interaction',
            music_offtopic: 'sb_music_offtopic',
            preview:        'sb_preview',
        };
        const active = Object.entries(CAT_MAP)
            .filter(([, key]) => s[key] !== false)
            .map(([cat]) => cat);
        return active.length > 0 ? active : this._defaultCategories.slice();
    }

    async fetchSegments() {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        // Check cache first
        const cached = this.segmentCache.get(this.videoId);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            this.segments = cached.segments;
            this.utils.log?.(`SponsorBlock: Loaded ${this.segments.length} segments from cache`, 'SPONSOR');
            this.renderSegments();
            return;
        }

        try {
            // SHA-256 Hash the video ID for privacy
            const buffer = new TextEncoder().encode(this.videoId);
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Use first 4 characters (prefix) for privacy
            const prefix = hashHex.substring(0, 4);

            const categoriesParam = encodeURIComponent(JSON.stringify(this._getActiveCategories()));
            const url = `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${categoriesParam}`;

            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ 
                    action: 'FETCH_API', 
                    url, 
                    options: { headers: { 'Accept': 'application/json' } } 
                }, resolve);
            });
            
            if (this.abortController.signal.aborted) return;
            
            if (response && response.status === 200 && response.data) {
                const data = response.data;
                
                // Filter for our exact video ID
                const videoData = data.find(item => item.videoID === this.videoId);
                
                if (videoData && videoData.segments) {
                    this.segments = videoData.segments;
                    this.segmentCache.set(this.videoId, {
                        segments: this.segments,
                        timestamp: Date.now()
                    });
                    this.utils.log?.(`SponsorBlock: Loaded ${this.segments.length} segments`, 'SPONSOR');
                    this.renderSegments();
                } else {
                    this.segments = [];
                    this.utils.log?.('SponsorBlock: No segments found for this video', 'SPONSOR');
                    this.clearSegments();
                }
            } else if (response && response.status === 404) {
                this.segments = [];
                this.segmentCache.set(this.videoId, {
                    segments: [],
                    timestamp: Date.now()
                });
                this.clearSegments();
            } else {
                throw new Error(`HTTP ${response?.status || 'Unknown'}`);
            }
        } catch (e) {
            if (e.name === 'AbortError' || e.message?.includes('Extension context invalidated')) {
                return;
            }
            this.utils.log?.(`SponsorBlock API error: ${e.message}`, 'SPONSOR', 'debug');
            
            if (!this.retryAttempted) {
                this.retryAttempted = true;
                this._retryTimeout = setTimeout(() => {
                    this._retryTimeout = null;
                    this.fetchSegments();
                }, 2000);
            }
        }
    }

    renderSegments() {
        this.clearSegments();
        
        if (!this.videoElement || !this.videoElement.duration || this.segments.length === 0) return;
        
        // Prevent rendering when an ad is playing, as video.duration will be the ad's duration, causing incorrect scaling
        const player = document.querySelector('.html5-video-player');
        if (player && player.classList.contains('ad-showing')) return;
        
        const progressList = document.querySelector('.ytp-progress-list');
        if (!progressList) return;
        
        const duration = this.videoElement.duration;
        
        this.segments.forEach(seg => {
            const startPercent = (seg.segment[0] / duration) * 100;
            const endPercent = (seg.segment[1] / duration) * 100;
            const widthPercent = endPercent - startPercent;
            
            const el = document.createElement('div');
            el.className = 'ypp-sponsor-segment';
            el.style.position = 'absolute';
            el.style.left = `${startPercent}%`;
            el.style.width = `${widthPercent}%`;
            el.style.height = '100%';
            el.style.backgroundColor = this.COLORS[seg.category] || this.COLORS['sponsor'];
            el.style.opacity = '0.7';
            el.style.zIndex = '35'; // Draw above regular progress (typically 34 or below)
            el.style.pointerEvents = 'none'; // Click passes through
            
            progressList.appendChild(el);
            this.segmentElements.push(el);
        });
    }

    clearSegments() {
        this.segmentElements.forEach(el => el.remove());
        this.segmentElements = [];
    }

    handleTimeUpdate() {
        if (!this.isEnabled || !this.videoElement || this.segments.length === 0) return;
        if (this.videoElement.seeking) return; // Don't skip while user is seeking

        const currentTime = this.videoElement.currentTime;

        for (const segment of this.segments) {
            if (currentTime >= segment.segment[0] && currentTime < segment.segment[1]) {
                // Seek to end
                this.videoElement.currentTime = segment.segment[1];
                this.utils?.createToast?.(`Skipped ${segment.category}`, 'info');
                return; // Only skip one at a time
            }
        }
    }
};
