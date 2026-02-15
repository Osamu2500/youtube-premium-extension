/**
 * Feature: SponsorBlock Integration
 * Automatically skips non-content segments (Sponsors, Intros, Outros, etc.) using the SponsorBlock API.
 * API: https://sponsor.ajay.app/
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SponsorBlock = class SponsorBlock {
    constructor() {
        this.isActive = false;
        this.videoId = null;
        this.segments = [];
        this.videoElement = null;
        this.abortController = null;
        
        // Categories to skip
        this.categories = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'];
        
        // Binds
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;

        if (this.isWatchPage()) {
            this.init();
        }

        // Listen for internal navigation if Manager doesn't re-init
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        
        this.stop();
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
    }

    update(settings) {
        // Could update categories from settings here
    }

    run(settings) {
        this.enable(settings);
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        if (!this.isActive) return;
        this.stop(); // Clean up previous video
        if (this.isWatchPage()) {
            this.init();
        }
    }

    init() {
        this.videoId = this.getVideoId();
        if (!this.videoId) return;

        this.videoElement = document.querySelector('video');
        if (this.videoElement) {
            this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate);
            this.fetchSegments();
        } else {
            // Poll for video if not ready (rare on nav finish, but possible)
            this.pollForVideo();
        }
    }

    stop() {
        if (this.videoElement) {
            this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.videoElement = null;
        }
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.segments = [];
        this.removeToast();
    }

    removeToast() {
        // Implementation depends on global toast availability, generic placeholder
    }

    pollForVideo() {
        let attempts = 0;
        const interval = setInterval(() => {
            if (!this.isActive) { clearInterval(interval); return; }
            const video = document.querySelector('video');
            if (video) {
                clearInterval(interval);
                this.videoElement = video;
                this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate);
                this.fetchSegments();
            }
            if (++attempts > 10) clearInterval(interval);
        }, 500);
    }

    getVideoId() {
        return new URLSearchParams(window.location.search).get('v');
    }

    async fetchSegments() {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            // SHA-256 Hash the video ID
            const buffer = new TextEncoder().encode(this.videoId);
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            // Use first 4 chracters (prefix) for privacy
            const prefix = hashHex.substring(0, 4);

            const categoriesParam = JSON.stringify(this.categories);
            const url = `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${categoriesParam}`;

            const response = await fetch(url, { signal: this.abortController.signal });
            if (response.ok) {
                const data = await response.json();
                
                // Filter for our exact video ID from the privacy-bucket results
                const videoData = data.find(item => item.videoID === this.videoId);
                
                if (videoData && videoData.segments) {
                    this.segments = videoData.segments;
                    // window.YPP.Utils.log(`SponsorBlock: Loaded ${this.segments.length} segments`, 'SPONSOR');
                } else {
                     this.segments = [];
                }
            } else if (response.status === 404) {
                // No segments found
                this.segments = [];
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.error('SponsorBlock fetch error:', e);
        }
    }

    handleTimeUpdate() {
        if (!this.isActive || !this.videoElement || this.segments.length === 0) return;
        if (this.videoElement.seeking) return; // Don't skip while user is seeking

        const currentTime = this.videoElement.currentTime;

        for (const segment of this.segments) {
            if (currentTime >= segment.segment[0] && currentTime < segment.segment[1]) {
                // Precision check: verify we are actually in the segment and not just jumping out
                // Seek to end
                this.videoElement.currentTime = segment.segment[1];
                if (window.YPP.Utils && window.YPP.Utils.createToast) {
                    window.YPP.Utils.createToast(`Skipped ${segment.category}`, 'info');
                } else {
                    console.log(`[SponsorBlock] Skipped ${segment.category}`);
                }
                return; // Only skip one at a time
            }
        }
    }
};
