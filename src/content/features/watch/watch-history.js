// Attach to features namespace
window.YPP.features = window.YPP.features || {};

/**
 * Feature: Real-Time Playback Tracker
 * Tracks actual watch time on video pages via <video> events.
 * Source of truth for all "Personal Analytics".
 */
window.YPP.features.WatchHistoryTracker = class WatchHistoryTracker {
    constructor() {
        this.STORAGE_PREFIX = 'ypp_analytics_';
        this.FLUSH_INTERVAL = 10000; // Save every 10s
        
        // State
        this.activeVideoId = null;
        this.videoTitle = null;
        this.videoChannel = null;
        this.sessionSeconds = 0; // Seconds watched in current memory buffer
        this.lastTickTime = 0;
        this.isTracking = false;
        
        this.flushTimer = null;
        this.videoElement = null;

        // Watch Time Alert state
        this.lastAlertTime = 0; // Timestamp of last alert shown (prevents spam)

        // Binds
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handlePlay = this.handlePlay.bind(this);
        this.handlePause = this.handlePause.bind(this);
        this.saveData = this.saveData.bind(this);
        this._checkWatchTimeAlert = this._checkWatchTimeAlert.bind(this);
    }

    run(settings) {
        this.settings = settings;
        // Always run, but only active on /watch or /shorts
        // Init once, handling navigation internally
        if (!this.initialized) {
            this.init();
        }
    }

    init() {
        this.initialized = true;
        console.log('[YPP Tracker] Initialized');
        
        // Handle Navigation (SPA)
        window.addEventListener('yt-navigate-finish', () => this.handleNavigation());
        
        // Handle initial load if on watch page
        if (location.pathname.startsWith('/watch') || location.pathname.startsWith('/shorts')) {
            this.handleNavigation();
        }

        // Periodic Flush
        this.flushTimer = setInterval(this.saveData, this.FLUSH_INTERVAL);

        // Save on unload
        window.addEventListener('beforeunload', () => this.saveData());
    }

    handleNavigation() {
        // Stop previous
        this.stopTracking(); 

        // Check if we are on a valid watch/shorts page
        const isWatch = location.pathname.startsWith('/watch');
        const isShorts = location.pathname.startsWith('/shorts');
        
        if (!isWatch && !isShorts) return;

        console.log('[YPP Tracker] Navigation: detected watch/shorts page.');

        // Extract ID immediately
        const urlParams = new URLSearchParams(window.location.search);
        let videoId = urlParams.get('v');
        if (isShorts) videoId = location.pathname.split('/shorts/')[1];

        if (!videoId) {
            console.log('[YPP Tracker] No Video ID found yet.');
            return;
        }

        this.activeVideoId = videoId;
        this.sessionSeconds = 0;
        
        // Try to attach using pollFor
        this.attemptAttach();
    }

    async attemptAttach() {
        try {
            const Utils = window.YPP.Utils;
            if (!Utils) return;

            const video = await Utils.pollFor(() => {
                const v = document.querySelector('video');
                if (v && v.readyState >= 1) return v;
                return null;
            }, 10000, 500);

            if (video) {
                this.attachListeners(video);
            }
        } catch (error) {
            console.log('[YPP Tracker] Gave up finding video element.');
        }
    }

    attachListeners(video) {
        if (this.isTracking) return; // Already tracking

        this.videoElement = video;
        this.isTracking = true;
        this.lastTickTime = Date.now();

        // Extract metadata (Title/Channel) - might need a delay for DOM
        setTimeout(() => this.extractMetadata(), 1000);

        video.addEventListener('timeupdate', this.handleTimeUpdate);
        video.addEventListener('play', this.handlePlay);
        video.addEventListener('pause', this.handlePause);
        
        console.log(`[YPP Tracker] Tracking started for ${this.activeVideoId}`);
    }

    stopTracking() {
        if (this.videoElement) {
            this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.videoElement.removeEventListener('play', this.handlePlay);
            this.videoElement.removeEventListener('pause', this.handlePause);
        }
        
        // Save whatever we have
        this.saveData();

        this.isTracking = false;
        this.videoElement = null;
        this.activeVideoId = null;
        this.sessionSeconds = 0;
    }

    extractMetadata() {
        try {
             // Access centralized selectors
             const SELECTORS = window.YPP.CONSTANTS.SELECTORS.METADATA_SELECTORS || { TITLE: [], CHANNEL: [] };
             
             // Try multiple selectors from constants
             const titleEl = SELECTORS.TITLE.map(s => document.querySelector(s)).find(el => el) 
                             || document.querySelector('h1.ytd-watch-metadata'); // Fallback

             const channelEl = SELECTORS.CHANNEL.map(s => document.querySelector(s)).find(el => el)
                               || document.querySelector('ytd-video-owner-renderer #channel-name a'); // Fallback

            this.videoTitle = titleEl ? titleEl.textContent.trim() : 'Unknown Video';
            this.videoChannel = channelEl ? channelEl.textContent.trim() : 'Unknown Channel';

            // Fallback: Use DataAPI if available and metadata is missing
            if ((this.videoTitle === 'Unknown Video' || this.videoChannel === 'Unknown Channel') && 
                window.YPP.features.DataAPI && window.YPP.features.DataAPI.context) {
                // Potential future expansion: use DataAPI context if we can extract it reliably
                // For now, we just log valid attempts or rely on re-tries
            }
        } catch (e) {
            // ignore
        }
    }

    handlePlay() {
        this.lastTickTime = Date.now();
        // Extract metadata again in case it loaded late
        if (!this.videoTitle || this.videoTitle === 'Unknown Video') this.extractMetadata();
    }

    handlePause() {
        this.handleTimeUpdate(); // Flush last segment
    }

    handleTimeUpdate() {
        if (!this.isTracking || !this.videoElement || this.videoElement.paused) return;

        const now = Date.now();
        const delta = now - this.lastTickTime;
        
        // Valid tick: between 0ms and 5000ms (ignoring huge jumps/seeks/suspend)
        if (delta > 0 && delta < 5000) {
             this.sessionSeconds += (delta / 1000);
        }
        this.lastTickTime = now;
    }

    async saveData() {
        // Use 5s for production to avoid noise
        if (!this.activeVideoId || this.sessionSeconds < 5) return;

        // Capture snapshot of data to save
        const secToSave = Math.floor(this.sessionSeconds);
        const videoId = this.activeVideoId;
        const info = {
            title: this.videoTitle,
            channel: this.videoChannel,
            lastWatched: Date.now() 
        };

        // Reset buffer immediately (so we don't double count if async save takes time)
        this.sessionSeconds -= secToSave; // Keep remainder (fractional seconds)

        // Generate Date Key
        const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const storageKey = `${this.STORAGE_PREFIX}${dateKey}`;

        try {
            const result = await chrome.storage.local.get(storageKey);
            let dayRecord = result[storageKey];

            if (!dayRecord) {
                dayRecord = { videos: {}, totalSeconds: 0 };
            }
            if (!dayRecord.videos) dayRecord.videos = {}; // Migration safety
            if (!dayRecord.totalSeconds) dayRecord.totalSeconds = 0;

            // Update Total
            dayRecord.totalSeconds += secToSave;

            // Update Video Record
            if (!dayRecord.videos[videoId]) {
                dayRecord.videos[videoId] = {
                    title: info.title,
                    channel: info.channel,
                    seconds: 0,
                    lastWatched: info.lastWatched
                };
            }
            
            const vRec = dayRecord.videos[videoId];
            vRec.seconds += secToSave;
            vRec.lastWatched = info.lastWatched;
            // Update metadata if it was "Unknown" previously
            if ((!vRec.title || vRec.title === 'Unknown Video') && info.title !== 'Unknown Video') vRec.title = info.title;
            if ((!vRec.channel || vRec.channel === 'Unknown Channel') && info.channel !== 'Unknown Channel') vRec.channel = info.channel;

            await chrome.storage.local.set({ [storageKey]: dayRecord });
            
            console.log(`[YPP Tracker] Saved +${secToSave}s for ${videoId}. Total Today: ${dayRecord.totalSeconds}s`);

            // Check watch time alert
            this._checkWatchTimeAlert(dayRecord.totalSeconds);

        } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) {
                // Ignore silent context invalidation on extension reload
                return;
            }
            console.error('[YPP Tracker] Save failed:', e);
        }
    }

    /**
     * Check if today's total watch time has exceeded the user's alert threshold.
     * Fires at most once per hour to avoid repeated interruptions.
     * @param {number} totalSecondsToday - Today's total seconds watched
     */
    _checkWatchTimeAlert(totalSecondsToday) {
        const settings = this.settings;
        if (!settings?.watchTimeAlert) return;

        const limitHours = settings.watchTimeAlertHours ?? 2;
        const limitSeconds = limitHours * 3600;

        if (totalSecondsToday < limitSeconds) return;

        // Throttle: only alert once per hour
        const now = Date.now();
        if (now - this.lastAlertTime < 60 * 60 * 1000) return;

        this.lastAlertTime = now;
        this._showWatchTimeAlert(totalSecondsToday, limitHours);
    }

    /**
     * Show a dismissible watch time warning overlay.
     * @param {number} totalSeconds - Today's total seconds
     * @param {number} limitHours - The configured limit
     */
    _showWatchTimeAlert(totalSeconds, limitHours) {
        // Remove any existing alert
        document.querySelector('.ypp-watch-alert')?.remove();

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const overlay = document.createElement('div');
        overlay.className = 'ypp-watch-alert';
        overlay.innerHTML = `
            <div class="ypp-watch-alert-icon">⏱️</div>
            <div class="ypp-watch-alert-body">
                <div class="ypp-watch-alert-title">Watch Time Reminder</div>
                <div class="ypp-watch-alert-msg">You've watched <strong>${timeStr}</strong> today (limit: ${limitHours}h). Time for a break?</div>
            </div>
            <button class="ypp-watch-alert-close" aria-label="Dismiss">✕</button>
        `;

        overlay.querySelector('.ypp-watch-alert-close').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 300);
        });

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        // Auto-dismiss after 20 seconds
        setTimeout(() => {
            if (overlay.isConnected) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
            }
        }, 20000);
    }
};
