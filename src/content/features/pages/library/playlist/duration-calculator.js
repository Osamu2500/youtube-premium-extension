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
        const timeElements = document.querySelectorAll('ytd-playlist-video-renderer ytd-thumbnail-overlay-time-status-renderer, ytd-playlist-video-renderer badge-shape[class*="time-status"]');
        const allItems = document.querySelectorAll('ytd-playlist-video-renderer');
        
        let totalSeconds = 0;
        let validCount = 0;

        timeElements.forEach(el => {
            // Traverse down to get accurate text, sometimes badge-shape has inner divs
            const timeText = el.textContent.trim();
            if (timeText && timeText.includes(':')) {
                // Remove any non-time characters (like "LIVE", hidden spans, etc.)
                const cleanTime = timeText.replace(/[^0-9:]/g, '');
                const s = this.parseTime(cleanTime);
                if (s > 0) {
                    totalSeconds += s;
                    validCount++;
                }
            }
        });

        // Extract total videos from playlist stats if possible
        let totalPlaylistVideos = allItems.length;
        const statsEl = document.querySelector('.metadata-stats, ytd-playlist-byline-renderer');
        if (statsEl) {
            const match = statsEl.textContent.match(/([\d,]+)\s+videos/i);
            if (match) {
                totalPlaylistVideos = parseInt(match[1].replace(/,/g, ''), 10);
            }
        }

        const notCounted = allItems.length - validCount;

        if (allItems.length > 0) {
            this.renderCard(totalSeconds, validCount, notCounted, totalPlaylistVideos);
        }
    }

    parseTime(timeStr) {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 4) { // D:HH:MM:SS
            return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
        }
        return 0;
    }

    formatTimeText(seconds) {
        if (seconds === 0) return '0s';
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        let result = [];
        if (d > 0) result.push(`<span class="ypp-time-val">${d}</span><span class="ypp-time-lbl">d</span>`);
        if (h > 0) result.push(`<span class="ypp-time-val">${h}</span><span class="ypp-time-lbl">h</span>`);
        if (m > 0 || h > 0) result.push(`<span class="ypp-time-val">${m}</span><span class="ypp-time-lbl">m</span>`);
        result.push(`<span class="ypp-time-val">${s}</span><span class="ypp-time-lbl">s</span>`);
        
        return result.join(' ');
    }

    renderCard(totalSeconds, videoCount, notCounted, totalPlaylistVideos) {
        const container = document.querySelector('ytd-playlist-header-renderer');
        if (!container) return;

        if (!this.card) {
            this.card = document.createElement('div');
            this.card.id = 'ypp-playlist-card';
            
            // Premium Glassmorphic UI Styling
            this.card.style.cssText = `
                margin-top: 24px;
                background: linear-gradient(145deg, rgba(20, 20, 24, 0.8), rgba(15, 15, 18, 0.9));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 24px;
                font-family: var(--ypp-font-family, 'Inter', 'Roboto', sans-serif);
                color: #fff;
                width: 100%;
                box-sizing: border-box;
                backdrop-filter: blur(24px) saturate(1.2);
                -webkit-backdrop-filter: blur(24px) saturate(1.2);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;
            `;
            
            // Add a subtle glow behind the card
            const glow = document.createElement('div');
            glow.style.cssText = `
                position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle at top right, rgba(62, 166, 255, 0.15), transparent 60%);
                pointer-events: none; z-index: 0;
            `;
            this.card.appendChild(glow);

            // Container for inner HTML to sit above glow
            this.contentDiv = document.createElement('div');
            this.contentDiv.style.cssText = 'position: relative; z-index: 1;';
            this.card.appendChild(this.contentDiv);

            // Insert styling for the time labels
            const style = document.createElement('style');
            style.textContent = `
                .ypp-time-val { font-weight: 700; color: #fff; }
                .ypp-time-lbl { font-weight: 500; color: #aaa; margin-left: 2px; margin-right: 6px; font-size: 0.85em; }
                .ypp-speed-box { background: rgba(255,255,255,0.06); padding: 10px 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
                .ypp-speed-box:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.1); }
                .ypp-speed-lbl { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .ypp-speed-val { font-size: 14px; }
            `;
            this.card.appendChild(style);

            const stats = container.querySelector('ytd-playlist-byline-renderer') || container.querySelector('.metadata-action-bar');
            if (stats) {
                 stats.parentNode.insertBefore(this.card, stats.nextSibling);
            } else {
                 container.appendChild(this.card);
            }
        }

        const time1x = this.formatTimeText(totalSeconds);
        const time125x = this.formatTimeText(Math.floor(totalSeconds / 1.25));
        const time15x = this.formatTimeText(Math.floor(totalSeconds / 1.5));
        const time2x = this.formatTimeText(Math.floor(totalSeconds / 2.0));

        let loadWarning = '';
        if (videoCount < totalPlaylistVideos) {
            loadWarning = `
                <div style="margin-top: 16px; padding: 10px 14px; background: rgba(255, 171, 0, 0.1); border: 1px solid rgba(255, 171, 0, 0.3); border-radius: 10px; font-size: 12px; color: #ffab00; display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span><strong>Partial calculation:</strong> Scroll down to load all videos. Calculated ${videoCount} of ${totalPlaylistVideos} videos.</span>
                </div>
            `;
        }

        this.contentDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--ypp-accent-color, #3ea6ff); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Total Duration
                    </div>
                    <div style="font-size: 26px; line-height: 1.2;">${time1x}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; font-weight: 600; color: #fff; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        ${videoCount} videos
                    </div>
                    ${notCounted > 0 ? `<div style="font-size: 11px; color: #ff4e45; margin-top: 6px; font-weight: 500;">${notCounted} unplayable</div>` : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.25x Speed</span>
                    <span class="ypp-speed-val">${time125x}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.50x Speed</span>
                    <span class="ypp-speed-val">${time15x}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 2.00x Speed</span>
                    <span class="ypp-speed-val">${time2x}</span>
                </div>
            </div>
            
            ${loadWarning}
        `;
    }
};
