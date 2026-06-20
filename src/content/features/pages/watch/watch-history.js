/**
 * Feature: Real-Time Playback Tracker
 * Tracks actual watch time on video pages via <video> events.
 * Source of truth for all "Personal Analytics".
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.WatchHistoryTracker = class WatchHistoryTracker extends window.YPP.features.BaseFeature {
    constructor() {
        super('WatchHistoryTracker');
        this.STORAGE_PREFIX = 'ypp_analytics_';
        this.FLUSH_INTERVAL = 10000; // Save every 10s
        
        // State
        this.activeVideoId = null;
        this.videoTitle = 'Unknown Video';
        this.videoChannel = 'Unknown Channel';
        this.sessionSeconds = 0; // Seconds watched in current memory buffer
        this.lastTickTime = 0;
        this.isTracking = false;
        
        this.videoElement = null;
        this.lastFlushTime = 0;
        this.lastAlertTime = 0; // Timestamp of last alert shown (prevents spam)

        // Binds
        this.handleTimeUpdate = this.handleTimeUpdate.bind(this);
        this.handlePlay = this.handlePlay.bind(this);
        this.handlePause = this.handlePause.bind(this);
        this.saveData = this.saveData.bind(this);
    }

    getConfigKey() { return null; } // Always active

    async enable() {
        await super.enable();
        
        this.addListener(window, 'beforeunload', this.saveData);
        this.addListener(document, 'visibilitychange', () => {
            if (document.hidden) this.saveData();
        });
        
        this._injectAlertStyles();

        if (this.utils.isWatchPage() || this._isOnShortsPage()) {
            this._handleStartTracking();
        }
    }

    async disable() {
        await super.disable();
        
        this.saveData();
        
        this.stopTracking();
        document.querySelector('.ypp-watch-alert')?.remove();
    }

    onVideoChange(videoId) {
        if (!this.isEnabled) return;
        this._handleStartTracking(videoId);
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (this.utils.isWatchPage() || this._isOnShortsPage()) {
            this._handleStartTracking();
        } else {
            this.stopTracking();
        }
    }

    _isOnShortsPage() {
        return location.pathname.startsWith('/shorts/');
    }

    _handleStartTracking(videoId) {
        this.stopTracking(); 

        const isWatch = this.utils.isWatchPage();
        const isShorts = this._isOnShortsPage();
        if (!isWatch && !isShorts) return;

        let activeId = videoId;
        if (!activeId) {
            const urlParams = new URLSearchParams(window.location.search);
            activeId = urlParams.get('v');
            if (isShorts) activeId = location.pathname.split('/shorts/')[1];
        }

        if (!activeId) return;

        this.activeVideoId = activeId;
        this.sessionSeconds = 0;
        this.videoTitle = 'Unknown Video';
        this.videoChannel = 'Unknown Channel';

        this.pollFor('watch-history-video', 'video.html5-main-video', (video) => {
            this.attachListeners(video);
        });
    }

    attachListeners(video) {
        if (this.isTracking || !this.isEnabled) return;

        this.videoElement = video;
        this.isTracking = true;
        this.lastTickTime = Date.now();

        this.extractMetadata();

        this.addListener(this.videoElement, 'timeupdate', this.handleTimeUpdate);
        this.addListener(this.videoElement, 'play', this.handlePlay);
        this.addListener(this.videoElement, 'pause', this.handlePause);
        
        this.utils.log?.(`Tracking started for ${this.activeVideoId}`, 'TRACKER');
    }

    stopTracking() {
        if (this.videoElement) {
            this.removeListener(this.videoElement, 'timeupdate', this.handleTimeUpdate);
            this.removeListener(this.videoElement, 'play', this.handlePlay);
            this.removeListener(this.videoElement, 'pause', this.handlePause);
        }
        
        this.saveData();

        this.isTracking = false;
        this.videoElement = null;
        this.activeVideoId = null;
        this.sessionSeconds = 0;
    }

    async extractMetadata() {
        try {
             const SELECTORS = window.YPP.CONSTANTS?.SELECTORS?.METADATA_SELECTORS || { TITLE: ['h1.ytd-watch-metadata'], CHANNEL: ['ytd-video-owner-renderer #channel-name a'] };
             
             // Wait for primary title selector to ensure DOM is ready
             const primaryTitleSelector = SELECTORS.TITLE[0] || 'h1.ytd-watch-metadata';
             await this.waitForElement(primaryTitleSelector, 5000);

             const titleEl = SELECTORS.TITLE.map(s => document.querySelector(s)).find(el => el) 
                             || document.querySelector('h1.ytd-watch-metadata');

             const channelEl = SELECTORS.CHANNEL.map(s => document.querySelector(s)).find(el => el)
                               || document.querySelector('ytd-video-owner-renderer #channel-name a');

            this.videoTitle = titleEl ? titleEl.textContent.trim() : 'Unknown Video';
            this.videoChannel = channelEl ? channelEl.textContent.trim() : 'Unknown Channel';
        } catch (e) {}
    }

    handlePlay() {
        this.lastTickTime = Date.now();
        if (this.videoTitle === 'Unknown Video') this.extractMetadata();
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

        if (!this.lastFlushTime) this.lastFlushTime = now;
        if (now - this.lastFlushTime >= this.FLUSH_INTERVAL) {
            this.saveData();
            this.lastFlushTime = now;
        }
    }

    async saveData() {
        if (!this.activeVideoId || this.sessionSeconds < 5) return;

        const secToSave = Math.floor(this.sessionSeconds);
        const videoId = this.activeVideoId;
        const info = {
            title: this.videoTitle,
            channel: this.videoChannel,
            lastWatched: Date.now() 
        };

        this.sessionSeconds -= secToSave;

        const dateKey = new Date().toISOString().split('T')[0];
        const storageKey = `${this.STORAGE_PREFIX}${dateKey}`;

        try {
            const resultData = await window.YPP.StorageManager.get(storageKey);
            let dayRecord = resultData || { videos: {}, totalSeconds: 0 };

            if (!dayRecord.videos) dayRecord.videos = {};
            if (!dayRecord.totalSeconds) dayRecord.totalSeconds = 0;

            dayRecord.totalSeconds += secToSave;

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
            
            if (vRec.title === 'Unknown Video' && info.title !== 'Unknown Video') vRec.title = info.title;
            if (vRec.channel === 'Unknown Channel' && info.channel !== 'Unknown Channel') vRec.channel = info.channel;

            await window.YPP.StorageManager.set(storageKey, dayRecord);
            
            this._checkWatchTimeAlert(dayRecord.totalSeconds);

        } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) return;
            this.utils.log?.('Save failed: ' + e.message, 'TRACKER', 'error');
        }
    }

    _checkWatchTimeAlert(totalSecondsToday) {
        if (window.YPP.events) {
            window.YPP.events.emit('watchTime:saved', totalSecondsToday);
        }
    }
};
