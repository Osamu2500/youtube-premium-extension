window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * StatsVisualizer
 *
 * Renders a watch-analytics panel on the /feed/history page,
 * reading data from chrome.storage.local (same schema as HistoryTracker).
 *
 * Charts:
 *  - Videos per day (last 7 days bar chart on <canvas>)
 *  - Top 5 channels by watch time (this week)
 *  - Speed-adjusted time saved (today)
 *  - Watch-streak and aggregate counts
 */
window.YPP.features.StatsVisualizer = class StatsVisualizer {
    constructor() {
        this.enabled = false;
        this.overlay = null;
        this.isInitialized = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // Storage helpers (mirrors HistoryTracker schema)
        this.STORAGE_PREFIX = 'ypp_analytics_';
    }

    getConfigKey() { return 'statsVisualizer'; }

    // ── Public API (called by player.js / feature-manager) ────────────────────

    run(settings) {
        if (!this.isInitialized) {
            this.isInitialized = true;
        }
        this.update(settings);
    }

    update(settings) {
        const shouldEnable = settings?.statsVisualizer;
        if (shouldEnable && !this.enabled) this._enable();
        else if (!shouldEnable && this.enabled) this._disable();
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    _enable() {
        this.enabled = true;
        this._createOverlay();
        this._loadAndRender();
    }

    _disable() {
        this.enabled = false;
        this.overlay?.remove();
        this.overlay = null;
    }

    // ── Data Loading ──────────────────────────────────────────────────────────

    async _loadAndRender() {
        const today = new Date();
        const keys = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            keys.push(this.STORAGE_PREFIX + d.toISOString().split('T')[0]);
        }

        let data = {};
        try {
            data = await chrome.storage.local.get(keys);
        } catch (e) {
            console.warn('[YPP:StatsVisualizer] Storage read failed:', e);
        }

        const analytics = this._aggregate(data, keys);
        this._renderStats(analytics);
    }

    _aggregate(data, keys) {
        const today = new Date().toISOString().split('T')[0];
        let todaySec = 0, todayCount = 0;
        let weekSec = 0, weekCount = 0;
        let monthSec = 0;
        let streak = 0;
        let streakActive = true;

        const dailyCounts = []; // last 7 days, index 0 = oldest
        const channelTime = {}; // channel → seconds (this week)

        keys.forEach((key, i) => {
            const day = data[key];
            if (!day) {
                if (i < 7) dailyCounts.unshift(0);
                if (streakActive && i > 0) streakActive = false;
                return;
            }

            const sec = day.totalSeconds || 0;
            const count = day.videos ? Object.keys(day.videos).length : 0;

            if (i === 0) { todaySec = sec; todayCount = count; }
            if (i < 7)  { weekSec += sec; weekCount += count; dailyCounts.unshift(count); }
            monthSec += sec;

            // Streak: consecutive days with watch time (from today backwards)
            if (streakActive && sec > 0) streak++;
            else streakActive = false;

            // Top channels (week)
            if (i < 7 && day.videos) {
                Object.values(day.videos).forEach(v => {
                    const ch = v.channel || 'Unknown';
                    channelTime[ch] = (channelTime[ch] || 0) + (v.seconds || 0);
                });
            }
        });

        // Fill dailyCounts to 7 if data was sparse
        while (dailyCounts.length < 7) dailyCounts.unshift(0);

        const topChannels = Object.entries(channelTime)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Speed-adjusted time saved today (assume average speed 1.25x if no setting stored)
        const avgSpeed = 1.25;
        const timeSavedSec = todaySec - Math.round(todaySec / avgSpeed);

        return {
            todaySec, todayCount,
            weekSec, weekCount,
            monthSec, streak,
            dailyCounts, topChannels,
            timeSavedSec
        };
    }

    // ── DOM Creation ──────────────────────────────────────────────────────────

    _createOverlay() {
        if (this.overlay) return;

        this._injectStyles();

        const el = document.createElement('div');
        el.id = 'ypp-stats-viz';
        el.innerHTML = `
            <div class="ypp-sv-header">
                <div class="ypp-sv-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span>Watch Analytics</span>
                    <span class="ypp-sv-badge">Live</span>
                </div>
                <button class="ypp-sv-close" id="ypp-sv-close">✕</button>
            </div>

            <div class="ypp-sv-kpi-row">
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-today-time">—</span>
                    <span class="ypp-sv-kpi-label">Today</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-week-time">—</span>
                    <span class="ypp-sv-kpi-label">This Week</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-streak">—</span>
                    <span class="ypp-sv-kpi-label">🔥 Streak</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-saved">—</span>
                    <span class="ypp-sv-kpi-label">Time Saved</span>
                </div>
            </div>

            <div class="ypp-sv-section">
                <div class="ypp-sv-section-label">Videos Per Day — Last 7 Days</div>
                <canvas id="ypp-sv-canvas" width="600" height="80"></canvas>
            </div>

            <div class="ypp-sv-section">
                <div class="ypp-sv-section-label">Top Channels This Week</div>
                <div id="ypp-sv-channels"></div>
            </div>
        `;

        el.querySelector('#ypp-sv-close').addEventListener('click', () => this._disable());

        // Drag
        const header = el.querySelector('.ypp-sv-header');
        header.addEventListener('mousedown', e => {
            this.isDragging = true;
            el.style.cursor = 'grabbing';
            this.dragOffset.x = e.clientX - el.getBoundingClientRect().left;
            this.dragOffset.y = e.clientY - el.getBoundingClientRect().top;
        });
        window.addEventListener('mousemove', e => {
            if (!this.isDragging || !this.overlay) return;
            this.overlay.style.left = `${e.clientX - this.dragOffset.x}px`;
            this.overlay.style.top  = `${e.clientY - this.dragOffset.y}px`;
        });
        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            if (this.overlay) this.overlay.style.cursor = '';
        });

        document.body.appendChild(el);
        this.overlay = el;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    _renderStats(a) {
        if (!this.overlay) return;

        const fmt = s => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        this._set('ypp-sv-today-time', fmt(a.todaySec));
        this._set('ypp-sv-week-time', fmt(a.weekSec));
        this._set('ypp-sv-streak', a.streak > 0 ? `${a.streak}d` : '—');
        this._set('ypp-sv-saved', a.timeSavedSec > 60 ? fmt(a.timeSavedSec) : '< 1m');

        this._drawBarChart(a.dailyCounts);
        this._renderChannels(a.topChannels, a.weekSec);
    }

    _set(id, val) {
        const el = this.overlay?.querySelector(`#${id}`);
        if (el) el.textContent = val;
    }

    _drawBarChart(counts) {
        const canvas = this.overlay?.querySelector('#ypp-sv-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const max = Math.max(...counts, 1);
        const barW = Math.floor(W / 7) - 6;
        const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const dayOffset = (new Date().getDay() + 6) % 7; // 0=Mon

        counts.forEach((val, i) => {
            const x = i * (barW + 6) + 3;
            const barH = Math.round((val / max) * (H - 24));
            const y = H - 20 - barH;

            // Bar
            const grad = ctx.createLinearGradient(0, y, 0, y + barH);
            grad.addColorStop(0, 'rgba(255,255,255,0.85)');
            grad.addColorStop(1, 'rgba(255,255,255,0.15)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
            ctx.fill();

            // Day label
            const labelIdx = (dayOffset - 6 + i + 7) % 7;
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(days[labelIdx] ?? '', x + barW / 2, H - 4);

            // Count label
            if (val > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '10px Inter, sans-serif';
                ctx.fillText(val, x + barW / 2, y - 3);
            }
        });
    }

    _renderChannels(topChannels, weekSec) {
        const container = this.overlay?.querySelector('#ypp-sv-channels');
        if (!container) return;
        container.innerHTML = '';

        if (!topChannels.length) {
            container.innerHTML = '<span class="ypp-sv-empty">No data yet — start watching!</span>';
            return;
        }

        const maxSec = topChannels[0]?.[1] || 1;

        topChannels.forEach(([name, sec], i) => {
            const pct = Math.round((sec / maxSec) * 100);
            const share = weekSec > 0 ? Math.round((sec / weekSec) * 100) : 0;
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            const row = document.createElement('div');
            row.className = 'ypp-sv-ch-row';
            row.innerHTML = `
                <span class="ypp-sv-ch-rank">${i + 1}</span>
                <div class="ypp-sv-ch-info">
                    <div class="ypp-sv-ch-name">${this._esc(name)}</div>
                    <div class="ypp-sv-ch-bar-wrap">
                        <div class="ypp-sv-ch-bar" style="width:${pct}%"></div>
                    </div>
                </div>
                <span class="ypp-sv-ch-time">${timeStr} <span class="ypp-sv-ch-pct">${share}%</span></span>
            `;
            container.appendChild(row);
        });
    }

    _esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Styles ────────────────────────────────────────────────────────────────

    _injectStyles() {
        if (document.getElementById('ypp-sv-styles')) return;
        const s = document.createElement('style');
        s.id = 'ypp-sv-styles';
        s.textContent = `
#ypp-stats-viz {
    position: fixed;
    top: 80px; right: 20px;
    width: 380px;
    background: rgba(10,10,18,0.96);
    border: 1px solid rgba(255,255,255,0.10);
    border-top: 1px solid rgba(255,255,255,0.18);
    border-radius: 18px;
    z-index: 99999;
    color: #fff;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    overflow: hidden;
    animation: ypp-sv-in 0.28s cubic-bezier(0.2,0,0,1) forwards;
    user-select: none;
}
@keyframes ypp-sv-in {
    from { opacity:0; transform:translateY(12px) scale(0.96); }
    to   { opacity:1; transform:none; }
}
.ypp-sv-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    cursor: grab;
}
.ypp-sv-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700;
}
.ypp-sv-badge {
    background: rgba(62,166,255,0.15); color: #3ea6ff;
    border: 1px solid rgba(62,166,255,0.3);
    border-radius: 6px; padding: 1px 7px;
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
}
.ypp-sv-close {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 50%;
    width: 26px; height: 26px; cursor: pointer; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
}
.ypp-sv-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
.ypp-sv-kpi-row {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-kpi {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 0 8px; border-right: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-kpi:last-child { border-right: none; }
.ypp-sv-kpi-val {
    font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
}
.ypp-sv-kpi-label {
    font-size: 9px; color: rgba(255,255,255,0.38);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
}
.ypp-sv-section {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-section:last-child { border-bottom: none; }
.ypp-sv-section-label {
    font-size: 9px; color: rgba(255,255,255,0.35);
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    margin-bottom: 10px;
}
#ypp-sv-canvas {
    width: 100%; height: 80px; display: block; border-radius: 8px;
    background: rgba(255,255,255,0.02);
}
.ypp-sv-ch-row {
    display: flex; align-items: center; gap: 10px;
    padding: 5px 0;
}
.ypp-sv-ch-rank {
    font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.3);
    min-width: 14px; text-align: center;
}
.ypp-sv-ch-info { flex: 1; min-width: 0; }
.ypp-sv-ch-name {
    font-size: 11px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 4px;
}
.ypp-sv-ch-bar-wrap {
    height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
}
.ypp-sv-ch-bar {
    height: 100%; background: rgba(255,255,255,0.7); border-radius: 2px;
    transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
}
.ypp-sv-ch-time {
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7);
    white-space: nowrap;
}
.ypp-sv-ch-pct {
    font-size: 9px; color: rgba(255,255,255,0.3);
    font-weight: 500; margin-left: 3px;
}
.ypp-sv-empty {
    font-size: 11px; color: rgba(255,255,255,0.3); padding: 8px 0; display: block;
}
        `;
        document.head.appendChild(s);
    }
};
