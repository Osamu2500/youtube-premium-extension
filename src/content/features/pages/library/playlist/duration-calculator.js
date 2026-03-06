// Attach to features namespace
window.YPP.features = window.YPP.features || {};

window.YPP.features.PlaylistDuration = class PlaylistDuration extends window.YPP.features.BaseFeature {
    constructor() {
        super('PlaylistDuration');
        this.debounceTimer = null;
        this.card = null;
        this._boundCalculate = this.calculateDuration.bind(this);
    }
    
    getConfigKey() {
        return 'playlistDuration';
    }

    async enable() {
        if (!location.pathname.includes('/playlist')) return;
        await super.enable();

        this.calculateDuration();

        this.observer.start();
        this.observer.register('playlist-duration', 'ytd-app', () => {
             if (location.pathname.includes('/playlist')) {
                 clearTimeout(this.debounceTimer);
                 this.debounceTimer = setTimeout(this._boundCalculate, 1000);
             }
        }, false);
    }

    async disable() {
        await super.disable();
        if (this.observer) {
            this.observer.unregister('playlist-duration');
            this.observer.stop();
        }
        clearTimeout(this.debounceTimer);
        if (this.card) {
            this.card.remove();
            this.card = null;
        }
    }

    calculateDuration() {
        const timeSpans = document.querySelectorAll('ytd-playlist-video-renderer ytd-thumbnail-overlay-time-status-renderer span#text');
        
        // Count specific "not counted" videos? (e.g. [Private], [Deleted])
        // We can just count total DOM items vs valid times.
        const allItems = document.querySelectorAll('ytd-playlist-video-renderer');
        
        let totalSeconds = 0;
        let validCount = 0;

        timeSpans.forEach(span => {
            const timeText = span.textContent.trim();
            const s = this.parseTime(timeText);
            if (s > 0) {
                totalSeconds += s;
                validCount++;
            }
        });

        const notCounted = allItems.length - validCount;

        if (allItems.length > 0) {
            this.renderCard(totalSeconds, validCount, notCounted);
        }
    }

    parseTime(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    formatTime(seconds) {
        if (seconds === 0) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    renderCard(totalSeconds, videoCount, notCounted) {
        // We want a floating card style, but injected in the header area? 
        // Or fixed position? User screenshot showed it seemingly floating or part of the metadata.
        // Let's inject it into the playlist sidebar/header area.
        
        // Target: .metadata-wrapper or ytd-playlist-header-renderer
        const container = document.querySelector('ytd-playlist-header-renderer');
        if (!container) return;

        if (!this.card) {
            this.card = document.createElement('div');
            this.card.id = 'ypp-playlist-card';
            this.card.style.cssText = `
                margin-top: 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                font-family: 'Roboto', sans-serif;
                color: #fff;
                width: 100%;
                box-sizing: border-box;
                backdrop-filter: blur(5px);
            `;
            // Insert after the stats (privacy, views)
            const stats = container.querySelector('ytd-playlist-byline-renderer') || container.querySelector('.metadata-action-bar');
            if (stats) {
                 stats.parentNode.insertBefore(this.card, stats.nextSibling);
            } else {
                 container.appendChild(this.card);
            }
        }

        const time1x = this.formatTime(totalSeconds);
        const time125x = this.formatTime(Math.floor(totalSeconds / 1.25));
        const time15x = this.formatTime(Math.floor(totalSeconds / 1.5));
        const time2x = this.formatTime(Math.floor(totalSeconds / 2.0));

        this.card.innerHTML = `
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 8px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Playlist Duration</div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 20px; font-weight: 700; color: #3ea6ff;">${time1x}</span>
                <span style="font-size: 12px; color: #aaa; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">${videoCount} videos</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #ddd;">
                <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; display:flex; justify-content:space-between;">
                    <span style="color:#aaa;">@ 1.25x</span>
                    <span>${time125x}</span>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; display:flex; justify-content:space-between;">
                    <span style="color:#aaa;">@ 1.50x</span>
                    <span>${time15x}</span>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; display:flex; justify-content:space-between;">
                    <span style="color:#aaa;">@ 2.00x</span>
                    <span>${time2x}</span>
                </div>
                 <div style="background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; display:flex; justify-content:space-between;">
                    <span style="color:#aaa;">N/A</span>
                    <span style="color: ${notCounted > 0 ? '#ff4e45' : '#aaa'}">${notCounted}</span>
                </div>
            </div>
        `;
    }
};
