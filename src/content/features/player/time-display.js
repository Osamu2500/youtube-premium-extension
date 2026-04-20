/**
 * Time Display Feature
 * Injects speed-aware remaining time into the native YouTube player controls.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.TimeDisplay = class TimeDisplay {
    constructor() {
        this.name = 'TimeDisplay';
        this.settings = null;
        this._boundTimeUpdate = null;
        this._videoElement = null;
        this._pollInterval = null;
    }

    getConfigKey() { return 'enableRemainingTime'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }

        if (this._videoElement && this._boundTimeUpdate) {
            this._videoElement.removeEventListener('timeupdate', this._boundTimeUpdate);
            this._videoElement.removeEventListener('ratechange', this._boundTimeUpdate);
            this._boundTimeUpdate = null;
        }

        const timeRemainingNode = document.querySelector('.ypp-time-remaining');
        const sepNode = document.querySelector('.ypp-time-separator-appended');
        if (timeRemainingNode) timeRemainingNode.remove();
        if (sepNode) sepNode.remove();

        this._videoElement = null;
    }

    update(settings) {
        this.settings = settings;
        if (this.settings.enableRemainingTime) {
            this.run();
        } else {
            this.disable();
        }
    }

    run() {
        if (!this.settings || !this.settings.enableRemainingTime) return;

        const Utils = window.YPP.Utils;
        if (!Utils) return;

        this._pollInterval = setInterval(() => {
            const video = document.querySelector('video');
            if (!video) return;

            const timeDisplay = document.querySelector('.ytp-time-display') ||
                                Array.from(document.querySelectorAll('.ytp-left-controls span')).find(el => el.textContent.includes('/'))?.parentElement;
            
            if (timeDisplay) {
                this.showRemainingTime(video, timeDisplay);
                clearInterval(this._pollInterval);
                this._pollInterval = null;
            } else {
                 // Try injection into left-controls as safe fallback
                 const leftControls = document.querySelector('.ytp-left-controls');
                 if (leftControls) {
                     this.showRemainingTime(video, leftControls);
                     clearInterval(this._pollInterval);
                     this._pollInterval = null;
                 }
            }
        }, 1000);
    }

    showRemainingTime(video, container) {
        if (!container) return;

        this._videoElement = video;

        // Cleanup old structures
        const oldDashboard = document.getElementById('ypp-time-dashboard');
        if (oldDashboard) oldDashboard.remove();
        const inlineMetrics = document.getElementById('ypp-native-time-metrics');
        if (inlineMetrics) inlineMetrics.remove();
        const oldDedicated = document.getElementById('ypp-dedicated-time-metrics');
        if (oldDedicated) oldDedicated.remove();

        const timeDisplay = container.classList.contains('ytp-time-display') 
            ? container 
            : container.querySelector('.ytp-time-display');

        const durationNode = timeDisplay ? timeDisplay.querySelector('.ytp-time-duration') : null;

        if (!timeDisplay || !durationNode) return;

        // Ensure single injection
        let timeRemainingNode = document.querySelector('.ypp-time-remaining');
        let sepNode = document.querySelector('.ypp-time-separator-appended');

        if (!timeRemainingNode) {
            sepNode = document.createElement('span');
            sepNode.className = 'ytp-time-separator ypp-time-separator-appended';
            sepNode.textContent = ' · ';
            
            timeRemainingNode = document.createElement('span');
            timeRemainingNode.className = 'ypp-time-remaining';
            timeRemainingNode.style.cssText = 'font-size:inherit;font-family:inherit;color:inherit;opacity:inherit;letter-spacing:inherit;';

            // Insert AFTER duration, before anything else
            durationNode.insertAdjacentElement('afterend', sepNode);
            sepNode.insertAdjacentElement('afterend', timeRemainingNode);
        }

        const format = (s) => {
            if (s === undefined || s === null || isNaN(s) || s < 0) return '0:00';
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = Math.floor(s % 60);
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        const update = () => {
            if (!video || !video.duration || !isFinite(video.duration) || isNaN(video.currentTime)) {
                return;
            }

            // Guard against the node being detached (e.g. on yt-navigate-finish)
            if (!document.contains(timeRemainingNode)) {
                if (document.contains(timeDisplay) && document.contains(durationNode)) {
                    durationNode.insertAdjacentElement('afterend', sepNode);
                    sepNode.insertAdjacentElement('afterend', timeRemainingNode);
                } else {
                    return; // Container is truly gone
                }
            }

            const speed = video.playbackRate || 1;
            const duration = video.duration;
            const currentTime = video.currentTime;
            
            const rawLeft = Math.max(0, duration - currentTime);
            const adjustedLeft = rawLeft / speed;
            
            // Hide if no time remaining
            if (rawLeft <= 0) {
                timeRemainingNode.style.display = 'none';
                sepNode.style.display = 'none';
                return;
            }

            timeRemainingNode.style.display = '';
            sepNode.style.display = '';

            if (Math.abs(speed - 1) <= 0.01) {
                // 1x speed - Native remaining time
                timeRemainingNode.textContent = `-${format(rawLeft)}`;
            } else {
                // Speed changed - Show adjusted time + saved/extra
                if (speed > 1) {
                    const totalSaved = duration - (duration / speed);
                    timeRemainingNode.textContent = `-${format(adjustedLeft)} · ${format(totalSaved)} saved`;
                } else {
                    const totalExtra = (duration / speed) - duration;
                    timeRemainingNode.textContent = `-${format(adjustedLeft)} · ${format(totalExtra)} extra`;
                }
            }
        };

        if (this._boundTimeUpdate) {
            video.removeEventListener('timeupdate', this._boundTimeUpdate);
            video.removeEventListener('ratechange', this._boundTimeUpdate);
        }
        
        this._boundTimeUpdate = update;
        video.addEventListener('timeupdate', update);
        video.addEventListener('ratechange', update);
        update(); 
    }
};
