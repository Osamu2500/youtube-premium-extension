/**
 * Feature: SponsorBlock Integration
 * Automatically skips sponsored segments using the SponsorBlock API.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SponsorBlock = class SponsorBlock extends window.YPP.features.BaseFeature {
    constructor() {
        super('SponsorBlock');
        this.isActive = false;
        this.videoId = null;
        this.segments = [];
        this.cache = new Map();
        
        // Colors for the progress bar markers
        this.categoryColors = {
            'sponsor': '#00d400',
            'intro': '#00ffff',
            'outro': '#0202ed',
            'interaction': '#cc00ff',
            'selfpromo': '#ffff00',
            'music_offtopic': '#ff9900',
            'preview': '#008fd6'
        };

        this.handleNavigation = this.handleNavigation.bind(this);
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
    }

    getConfigKey() { return 'sponsorBlock'; }

    run(settings) {
        if (settings.sponsorBlock) {
            this.enable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;

        this.addListener(window, 'yt-navigate-finish', this.handleNavigation);

        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('sponsor-block-video', 'video', (elements) => {
                const video = elements[0];
                if (video && !video.dataset.sbHooked) {
                    video.dataset.sbHooked = 'true';
                    this.addListener(video, 'timeupdate', this.handleTimeUpdate);
                }
            }, true);
        }

        if (this.isWatchPage()) {
            this.handleNavigation();
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('sponsor-block-video');
        }

        document.querySelectorAll('video').forEach(video => {
            delete video.dataset.sbHooked;
        });

        this.removeMarkers();
        this.segments = [];
        this.videoId = null;
        
        super.disable();
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        if (!this.isActive || !this.isWatchPage()) return;
        
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId && videoId !== this.videoId) {
            this.videoId = videoId;
            this.segments = [];
            this.removeMarkers();
            this.fetchSegments(videoId);
        }
    }

    async fetchSegments(videoId) {
        if (this.cache.has(videoId)) {
            this.segments = this.cache.get(videoId);
            this.drawMarkers();
            return;
        }

        const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}`;

        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'FETCH_API', url }, resolve);
            });

            if (response && response.status === 200 && response.data) {
                // Wait to make sure the user hasn't navigated away during fetch
                if (this.videoId === videoId) {
                    this.segments = response.data;
                    if (this.cache.size > 50) this.cache.delete(this.cache.keys().next().value);
                    this.cache.set(videoId, this.segments);
                    this.drawMarkers();
                }
            } else if (response && response.status === 404) {
                // No segments found
                this.cache.set(videoId, []);
            } else {
                throw new Error(response?.error || 'SponsorBlock API Error');
            }
        } catch (e) {
            this.utils?.log(`Fetch error: ${e.message}`, 'SponsorBlock', 'debug');
        }
    }

    handleTimeUpdate(e) {
        if (!this.isActive || this.segments.length === 0) return;
        const video = e.target;
        const currentTime = video.currentTime;

        for (const segment of this.segments) {
            // If the user's settings dictate we shouldn't skip this category, continue
            if (this.settings && this.settings[`sb_${segment.category}`] === false) {
                continue; 
            }

            // segment.segment is an array [startTime, endTime]
            const [start, end] = segment.segment;
            
            // If we are inside a segment and it's not the very end of it (give 0.1s buffer)
            if (currentTime >= start && currentTime < end - 0.1) {
                this.utils?.log(`Skipping segment: ${segment.category} (${start}s -> ${end}s)`, 'SponsorBlock');
                video.currentTime = end;
                
                // Show a quick toast notification
                if (this.utils && this.utils.showToast) {
                    this.utils.showToast(`Skipped ${segment.category}`);
                }
                break; // Only skip one at a time
            }
        }
    }

    async drawMarkers() {
        if (!this.isActive || this.segments.length === 0) return;

        try {
            const progressList = await this.waitForElement('.ytp-progress-list', 5000, 500);
            const video = await this.waitForElement('video', 5000, 500);
            
            if (!video.duration || video.duration === 0) {
                await this.pollFor(() => video.duration > 0, 5000, 500);
            }

            if (!this.isActive) return;

            this.removeMarkers();
            
            for (const segment of this.segments) {
                const [start, end] = segment.segment;
                const duration = video.duration;
                
                const leftPct = (start / duration) * 100;
                const widthPct = ((end - start) / duration) * 100;

                const marker = document.createElement('div');
                marker.className = 'ypp-sb-marker';
                marker.style.position = 'absolute';
                marker.style.left = `${leftPct}%`;
                marker.style.width = `${widthPct}%`;
                marker.style.height = '100%';
                marker.style.backgroundColor = this.categoryColors[segment.category] || '#ffffff';
                marker.style.opacity = '0.7';
                marker.style.pointerEvents = 'none'; // Don't interfere with clicks
                marker.style.zIndex = '34'; // Above progress bar bg, below playhead

                progressList.appendChild(marker);
            }
        } catch(e) {
            // Timeout occurred, elements not found
        }
    }

    removeMarkers() {
        document.querySelectorAll('.ypp-sb-marker').forEach(m => m.remove());
    }
};
