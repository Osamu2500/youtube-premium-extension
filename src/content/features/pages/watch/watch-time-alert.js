window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.WatchTimeAlert = class WatchTimeAlert extends window.YPP.features.BaseFeature {
    constructor() {
        super('WatchTimeAlert');
        this.lastAlertTime = 0;
        this.handleWatchTimeSaved = this.handleWatchTimeSaved.bind(this);
    }

    getConfigKey() {
        return 'watchTimeAlert';
    }

    async enable() {
        await super.enable();
        this._injectAlertStyles();
        if (window.YPP.events) {
            window.YPP.events.on('watchTime:saved', this.handleWatchTimeSaved);
        }
    }

    async disable() {
        await super.disable();
        if (window.YPP.events) {
            window.YPP.events.off('watchTime:saved', this.handleWatchTimeSaved);
        }
        document.querySelector('.ypp-watch-alert')?.remove();
    }

    handleWatchTimeSaved(totalSecondsToday) {
        if (!this.isEnabled) return;

        const limitHours = this.settings?.watchTimeAlertHours ?? 2;
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

        this.addListener(overlay.querySelector('.ypp-watch-alert-close'), 'click', () => {
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
