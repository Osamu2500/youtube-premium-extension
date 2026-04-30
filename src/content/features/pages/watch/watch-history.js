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
        
        this.flushTimer = null;
        this.videoElement = null;
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
        
        this.flushTimer = setInterval(this.saveData, this.FLUSH_INTERVAL);
        this.addListener(window, 'beforeunload', this.saveData);
        
        this._injectAlertStyles();

        if (this.utils.isWatchPage() || this._isOnShortsPage()) {
            this._handleStartTracking();
        }
    }

    async disable() {
        await super.disable();
        
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        
        this.stopTracking();
        document.querySelector('.ypp-watch-alert')?.remove();
    }

    onVideoChange(videoId) {
        if (!this.isEnabled) return;
        this._handleStartTracking(videoId);
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

        setTimeout(() => this.extractMetadata(), 1000);

        this.videoElement.addEventListener('timeupdate', this.handleTimeUpdate);
        this.videoElement.addEventListener('play', this.handlePlay);
        this.videoElement.addEventListener('pause', this.handlePause);
        
        this.utils.log?.(`Tracking started for ${this.activeVideoId}`, 'TRACKER');
    }

    stopTracking() {
        if (this.videoElement) {
            this.videoElement.removeEventListener('timeupdate', this.handleTimeUpdate);
            this.videoElement.removeEventListener('play', this.handlePlay);
            this.videoElement.removeEventListener('pause', this.handlePause);
        }
        
        this.saveData();

        this.isTracking = false;
        this.videoElement = null;
        this.activeVideoId = null;
        this.sessionSeconds = 0;
    }

    extractMetadata() {
        try {
             const SELECTORS = window.YPP.CONSTANTS?.SELECTORS?.METADATA_SELECTORS || { TITLE: [], CHANNEL: [] };
             
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
            const result = await chrome.storage.local.get(storageKey);
            let dayRecord = result[storageKey] || { videos: {}, totalSeconds: 0 };

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

            await chrome.storage.local.set({ [storageKey]: dayRecord });
            
            this.utils.log?.(`Saved +${secToSave}s for ${videoId}. Total Today: ${dayRecord.totalSeconds}s`, 'TRACKER', 'debug');

            this._checkWatchTimeAlert(dayRecord.totalSeconds);

        } catch (e) {
            if (e.message && e.message.includes('Extension context invalidated')) return;
            this.utils.log?.('Save failed: ' + e.message, 'TRACKER', 'error');
        }
    }

    _checkWatchTimeAlert(totalSecondsToday) {
        if (!this.settings?.watchTimeAlert) return;

        const limitHours = this.settings.watchTimeAlertHours ?? 2;
        const limitSeconds = limitHours * 3600;

        if (totalSecondsToday < limitSeconds) return;

        const now = Date.now();
        if (now - this.lastAlertTime < 60 * 60 * 1000) return; // Once per hour

        this.lastAlertTime = now;
        this._showWatchTimeAlert(totalSecondsToday, limitHours);
    }

    _showWatchTimeAlert(totalSeconds, limitHours) {
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
        // Trigger reflow for animation
        void overlay.offsetWidth;
        overlay.classList.add('show');

        setTimeout(() => {
            if (overlay.isConnected) {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 300);
            }
        }, 20000);
    }

    _injectAlertStyles() {
        if (document.getElementById('ypp-watch-alert-styles')) return;
        const style = document.createElement('style');
        style.id = 'ypp-watch-alert-styles';
        style.textContent = `
            .ypp-watch-alert {
                position: fixed;
                bottom: -100px;
                right: 24px;
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                z-index: 999999;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                color: white;
                font-family: 'Inter', Roboto, sans-serif;
                transition: bottom 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ypp-watch-alert.show {
                bottom: 24px;
            }
            .ypp-watch-alert-icon {
                font-size: 24px;
                animation: ypp-pulse 2s infinite;
            }
            .ypp-watch-alert-title {
                font-weight: 700;
                font-size: 14px;
                margin-bottom: 4px;
                color: #ff4e45;
            }
            .ypp-watch-alert-msg {
                font-size: 13px;
                color: #ccc;
                max-width: 250px;
                line-height: 1.4;
            }
            .ypp-watch-alert-close {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                margin-left: 8px;
                transition: color 0.2s;
            }
            .ypp-watch-alert-close:hover {
                color: white;
            }
            @keyframes ypp-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
};
