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
        
        // Cache for segments (avoid re-fetching same video)
        this.segmentCache = new Map();
        this.CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
        
        // Categories to skip
        this.categories = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'];
        
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

            const categoriesParam = encodeURIComponent(JSON.stringify(this.categories));
            const url = `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${categoriesParam}`;

            const response = await fetch(url, { 
                signal: this.abortController.signal,
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                
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
            } else if (response.status === 404) {
                this.segments = [];
                this.segmentCache.set(this.videoId, {
                    segments: [],
                    timestamp: Date.now()
                });
                this.clearSegments();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (e) {
            if (e.name === 'AbortError') return;
            this.utils.log?.(`SponsorBlock API error: ${e.message}`, 'SPONSOR', 'error');
            
            if (!this.retryAttempted) {
                this.retryAttempted = true;
                setTimeout(() => this.fetchSegments(), 2000);
            }
        }
    }

    renderSegments() {
        this.clearSegments();
        
        if (!this.videoElement || !this.videoElement.duration || this.segments.length === 0) return;
        
        const progressList = document.querySelector('.ytp-progress-list');
        if (!progressList) return;
        
        const duration = this.videoElement.duration;
        
        this.segments.forEach(seg => {
            const startPercent = (seg.segment[0] / duration) * 100;
            const endPercent = (seg.segment[1] / duration) * 100;
            const widthPercent = endPercent - startPercent;
            
            const el = document.createElement('div');
            el.className = 'ypp-sponsor-segment ytp-play-progress';
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
                if (this.utils.createToast) {
                    this.utils.createToast(`Skipped ${segment.category}`, 'info');
                } else {
                    console.log(`[SponsorBlock] Skipped ${segment.category}`);
                }
                return; // Only skip one at a time
            }
        }
    }
};
