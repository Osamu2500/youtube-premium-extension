/**
 * Feature: Watch History Tracker Dashboard
 * Behavioral intelligence layer that extracts, aggregates, and visualizes
 * real watch data from Local Storage directly on the YouTube History page.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HistoryTracker = class HistoryTracker extends window.YPP.features.BaseFeature {
    constructor() {
        super('HistoryTracker');
        this.STORAGE_PREFIX = 'ypp_analytics_';
        
        this.stats = {
            today: { count: 0, seconds: 0 },
            week: { count: 0, seconds: 0 },
            month: { count: 0, seconds: 0 },
            streak: 0,
            topChannel: '-'
        };
        
        this.isExpanded = false;
        this.updateInterval = null;
        
        this._boundLoadStats = this.loadStats.bind(this);
        this._boundHandleVisibility = this._handleVisibility.bind(this);
    }
    
    getConfigKey() {
        return null; // Always active when on history page
    }

    async enable() {
        await super.enable();
        
        try {
            // Listen to SPA navigation
            // Note: The actual check if we're on /feed/history happens inside onPageChange
            if (location.pathname === '/feed/history') {
                this._mountAndStart();
            }
        } catch (e) {
            this.utils?.log('Error enabling HistoryTracker', 'HISTORY', 'error', e);
        }
    }
    
    async disable() {
        await super.disable();
        this._stopAndUnmount();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (location.pathname === '/feed/history') {
            this._mountAndStart();
        } else {
            this._stopAndUnmount();
        }
    }

    _mountAndStart() {
        this.mountUI();
        this.loadStats();

        if (!this._boundStorageChangeUnsub) {
            this._boundStorageChangeUnsub = window.YPP.events.on('storage:changed', (payload) => {
                if (payload.key && payload.key.startsWith(this.STORAGE_PREFIX)) {
                    if (!document.hidden) this.loadStats();
                }
            });
        }

        this.addListener(window, 'focus', this._boundLoadStats);
        this.addListener(document, 'visibilitychange', this._boundHandleVisibility);
    }

    _stopAndUnmount() {
        if (this._boundStorageChangeUnsub) {
            this._boundStorageChangeUnsub();
            this._boundStorageChangeUnsub = null;
        }
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('history-tracker');
        }

        const widget = document.getElementById('ypp-history-tracker-widget');
        if (widget) widget.remove();
        
        this.isExpanded = false;
    }

    _handleVisibility() {
        if (!document.hidden) {
            this.loadStats();
        }
    }

    async mountUI() {
        const handleHeader = (elements) => {
            const header = elements[0];
            if (header && !document.getElementById('ypp-history-tracker-widget')) {
                const widget = this.createWidget();
                header.insertBefore(widget, header.firstChild);
                this.injectComponentStyles();
                this.updateWidgetValues(); 
            }
        };

        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('history-tracker', 'ytd-browse[page-subtype="history"] #secondary-inner, ytd-browse[page-subtype="history"] #secondary', handleHeader, true);
        } else {
            // Fallback
            const header = document.querySelector('ytd-browse[page-subtype="history"] #secondary-inner') || document.querySelector('ytd-browse[page-subtype="history"] #secondary');
            if (header) handleHeader([header]);
        }
    }

    async loadStats() {
        const today = new Date();
        
        const getKey = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return this.STORAGE_PREFIX + `${y}-${m}-${day}`;
        };

        const keysToCheck = [];
        // Last 31 days for main stats
        for (let i = 0; i < 31; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            keysToCheck.push(getKey(d));
        }

        const dataPromises = keysToCheck.map(key => window.YPP.StorageManager.get(key).then(val => ({ key, val })));
        const dataArray = await Promise.all(dataPromises);
        const data = {};
        dataArray.forEach(({ key, val }) => { data[key] = val; });
        
        let tCount = 0, tSec = 0;
        let wCount = 0, wSec = 0;
        let mCount = 0, mSec = 0;

        const todayKey = getKey(today);

        keysToCheck.forEach((key, index) => {
            const dayData = data[key];
            if (!dayData) return;

            const seconds = dayData.totalSeconds || 0;
            const count = dayData.videos ? Object.keys(dayData.videos).length : 0;

            if (index === 0) {
                tCount = count;
                tSec = seconds;
            }
            if (index < 7) {
                wCount += count;
                wSec += seconds;
            }
            // All 31 days
            mCount += count;
            mSec += seconds;
        });

        // -------------------------------------------------------------
        // Async Calculate Streak (Fetch up to 365 days separately to avoid UI lock)
        // -------------------------------------------------------------
        this._calculateStreak(today, getKey);

        // -------------------------------------------------------------
        // Top Channel (Today)
        // -------------------------------------------------------------
        let topChannelName = '-';
        let topChannelTime = 0;
        const todayData = data[todayKey];
        if (todayData?.videos) {
            const channelStats = {};
            Object.values(todayData.videos).forEach(v => {
                const name = v.channel || 'Unknown';
                if (!channelStats[name]) channelStats[name] = 0;
                channelStats[name] += v.seconds;
            });
            
            Object.entries(channelStats).forEach(([name, time]) => {
                if (time > topChannelTime && name !== 'Unknown Channel') {
                    topChannelTime = time;
                    topChannelName = name;
                }
            });
        }

        this.stats = {
            today: { count: tCount, seconds: tSec },
            week: { count: wCount, seconds: wSec },
            month: { count: mCount, seconds: mSec },
            streak: this.stats.streak,
            topChannel: topChannelName,
            dailyData: data
        };

        this.updateWidgetValues();
    }

    async _calculateStreak(today, getKey) {
        // We only fetch keys sequentially backwards until we hit a day with no data, 
        // to avoid fetching all 365 days if the streak is only 5 days long.
        let streak = 0;
        let isFirstDay = true;
        let daysAgo = 0;

        while (daysAgo < 365) {
            const d = new Date();
            d.setDate(today.getDate() - daysAgo);
            const key = getKey(d);

            const dayData = await window.YPP.StorageManager.get(key);
            const hasData = dayData?.totalSeconds > 0;

            if (isFirstDay) {
                if (hasData) {
                    streak = 1;
                    daysAgo++;
                } else {
                    // Check yesterday. If yesterday has data, streak is pending today
                    const yesterday = new Date();
                    yesterday.setDate(today.getDate() - 1);
                    const yData = await window.YPP.StorageManager.get(getKey(yesterday));
                    if (yData?.totalSeconds > 0) {
                        streak = 0;
                        daysAgo = 1; // start counting from yesterday
                    } else {
                        break; // No data today or yesterday, streak is 0
                    }
                }
                isFirstDay = false;
            } else {
                if (hasData) {
                    streak++;
                    daysAgo++;
                } else {
                    break;
                }
            }
        }

        this.stats.streak = streak;
        const streakEl = document.getElementById('ypp-stats-streak');
        if (streakEl) streakEl.textContent = streak;
    }

    createWidget() {
        const div = document.createElement('div');
        div.id = 'ypp-history-tracker-widget';
        div.className = 'ypp-glass-panel';
        div.innerHTML = `
            <div class="ypp-tracker-header">
                <div class="ypp-tracker-title">
                    <h2>Personal Analytics</h2>
                    <span class="ypp-badge pulse">Live</span>
                </div>
                <div class="ypp-streak-badge" title="Consecutive Days Watched">
                    <span class="fire-icon">🔥</span>
                    <span id="ypp-stats-streak">0</span> <span style="font-size: 10px; opacity: 0.8; margin-left: 2px;">Day Streak</span>
                </div>
                <button id="ypp-tracker-toggle" class="ypp-icon-btn" aria-label="Toggle Details">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
            
            <div class="ypp-tracker-grid" id="ypp-tracker-content">
                <div class="ypp-stat-card primary">
                    <span class="label">Videos Today</span>
                    <span class="value" id="ypp-stats-today-count">-</span>
                </div>
                <div class="ypp-stat-card primary">
                    <span class="label">Watch Time Today</span>
                    <span class="value" id="ypp-stats-today-time">-</span>
                </div>

                <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 7 Days</span>
                    <span class="value" id="ypp-stats-week-time">-</span>
                </div>
                <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 30 Days</span>
                    <span class="value" id="ypp-stats-month-time">-</span>
                </div>

                <div class="ypp-stat-card secondary hidden full-width premium-card">
                     <span class="label">Top Channel (Today)</span>
                     <span class="value text-value" id="ypp-stats-top-channel">-</span>
                </div>
            </div>
            
            <div class="ypp-calendar-container" id="ypp-calendar-view" style="display: none;">
                <div class="ypp-calendar-header">
                    <span class="label">Activity Calendar (Last 30 Days)</span>
                </div>
                <div class="ypp-calendar-grid" id="ypp-calendar-grid">
                    <!-- Calendar cells will be injected here -->
                </div>
            </div>
        `;
        
        const toggle = div.querySelector('#ypp-tracker-toggle');
        this.addListener(toggle, 'click', () => {
            this.isExpanded = !this.isExpanded;
            this.toggleExpand();
        });

        return div;
    }
    
    injectComponentStyles() {
        if(document.getElementById('ypp-tracker-styles')) return;
        const style = document.createElement('style');
        style.id = 'ypp-tracker-styles';
        style.textContent = `
            #ypp-history-tracker-widget {
                background: rgba(25, 25, 25, 0.6);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                margin: 0 0 24px 0;
                width: 100%;
                box-sizing: border-box;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                color: #fff;
                font-family: "YouTube Sans", "Inter", sans-serif;
            }
            .ypp-tracker-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .ypp-tracker-title {
                display: flex;
                align-items: center;
            }
            .ypp-tracker-title h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                margin-right: 12px;
                letter-spacing: -0.5px;
            }
            .ypp-badge {
                background: rgba(255, 78, 69, 0.15);
                color: #ff4e45;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 1px solid rgba(255, 78, 69, 0.3);
            }
            .ypp-badge.pulse {
                animation: pulse-badge 2s infinite;
            }
            @keyframes pulse-badge {
                0% { box-shadow: 0 0 0 0 rgba(255, 78, 69, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(255, 78, 69, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 78, 69, 0); }
            }
            .ypp-streak-badge {
                display: flex;
                align-items: center;
                background: linear-gradient(135deg, rgba(255,152,0,0.2) 0%, rgba(255,87,34,0.2) 100%);
                border: 1px solid rgba(255,152,0,0.3);
                padding: 6px 16px;
                border-radius: 20px;
                margin-left: auto;
                margin-right: 16px;
            }
            .ypp-streak-badge .fire-icon {
                margin-right: 6px;
                font-size: 16px;
            }
            .ypp-streak-badge span:nth-child(2) {
                color: #ff9800;
                font-weight: 800;
                font-size: 15px;
            }
            .ypp-tracker-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                padding: 16px;
                transition: all 0.4s ease;
            }
            .ypp-tracker-grid.expanded {
                grid-template-columns: 1fr 1fr;
            }
            .ypp-stat-card {
                background: rgba(255,255,255,0.03);
                padding: 16px 12px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.05);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .ypp-stat-card:hover {
                background: rgba(255,255,255,0.06);
                transform: translateY(-4px);
                border-color: rgba(255,255,255,0.15);
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            }
            .ypp-stat-card.full-width {
                grid-column: 1 / -1; 
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 16px;
            }
            .ypp-stat-card.premium-card {
                background: linear-gradient(135deg, rgba(62,166,255,0.05) 0%, rgba(156,39,176,0.05) 100%);
                border: 1px solid rgba(62,166,255,0.2);
            }
            .ypp-stat-card .label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #aaa;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .ypp-stat-card.full-width .label {
                margin-bottom: 0;
            }
            .ypp-stat-card .value {
                font-size: 24px;
                font-weight: 800;
                color: #fff;
                letter-spacing: -1px;
            }
            .ypp-stat-card .value.text-value {
                font-size: 18px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                color: #3ea6ff;
            }
            .hidden { display: none !important; }
            
            #ypp-tracker-toggle {
                background: rgba(255,255,255,0.1);
                border: none;
                color: #fff;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 36px; height: 36px;
                display: flex; align-items: center; justify-content: center;
                border-radius: 50%;
            }
            #ypp-tracker-toggle:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.05);
            }
            #ypp-tracker-toggle svg {
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            #ypp-tracker-toggle.rotated svg {
                transform: rotate(180deg);
            }

            /* Responsive Adjustments */
            @media (max-width: 800px) {
                .ypp-tracker-grid.expanded {
                    grid-template-columns: 1fr 1fr;
                }
            }

            /* Calendar Styles */
            .ypp-calendar-container {
                margin-top: 16px;
                padding: 0 16px 16px 16px;
            }
            .ypp-calendar-header {
                font-size: 14px;
                font-weight: 600;
                color: #aaa;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .ypp-calendar-grid {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
                justify-content: center;
            }
            .ypp-calendar-cell {
                width: 16px;
                height: 16px;
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
                transition: transform 0.2s;
            }
            .ypp-calendar-cell:hover {
                transform: scale(1.2);
                z-index: 2;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .ypp-calendar-cell.level-1 { background: rgba(62, 166, 255, 0.3); }
            .ypp-calendar-cell.level-2 { background: rgba(62, 166, 255, 0.6); }
            .ypp-calendar-cell.level-3 { background: rgba(62, 166, 255, 0.8); }
            .ypp-calendar-cell.level-4 { background: rgba(62, 166, 255, 1.0); box-shadow: 0 0 8px rgba(62, 166, 255, 0.6); }
        `;
        document.head.appendChild(style);
    }

    toggleExpand() {
        const content = document.getElementById('ypp-tracker-content');
        const toggle = document.getElementById('ypp-tracker-toggle');
        const secondary = document.querySelectorAll('.ypp-stat-card.secondary');
        const calendar = document.getElementById('ypp-calendar-view');
        
        if (this.isExpanded) {
            content.classList.add('expanded');
            secondary.forEach(el => el.classList.remove('hidden'));
            if (calendar) calendar.style.display = 'block';
            toggle.classList.add('rotated');
        } else {
            content.classList.remove('expanded');
            secondary.forEach(el => el.classList.add('hidden'));
            if (calendar) calendar.style.display = 'none';
            toggle.classList.remove('rotated');
        }
    }

    updateWidgetValues() {
        const fmtTime = (s) => {
            const days = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            
            if (days > 0) return `${days}d ${h}h`;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        };

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('ypp-stats-today-count', this.stats.today.count);
        setVal('ypp-stats-today-time', fmtTime(this.stats.today.seconds));
        setVal('ypp-stats-week-time', fmtTime(this.stats.week.seconds));
        setVal('ypp-stats-month-time', fmtTime(this.stats.month.seconds));
        setVal('ypp-stats-streak', this.stats.streak || 0);
        setVal('ypp-stats-top-channel', this.stats.topChannel || '-');

        if (this.stats.dailyData) {
            this._renderCalendar(this.stats.dailyData);
        }
    }

    _renderCalendar(dailyData) {
        const grid = document.getElementById('ypp-calendar-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        // Create 30 cells representing the last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = this.STORAGE_PREFIX + `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            const dayData = dailyData[key];
            const seconds = dayData ? (dayData.totalSeconds || 0) : 0;
            
            let intensityClass = 'level-0';
            if (seconds > 0) intensityClass = 'level-1';
            if (seconds > 3600) intensityClass = 'level-2'; // 1 hour
            if (seconds > 7200) intensityClass = 'level-3'; // 2 hours
            if (seconds > 14400) intensityClass = 'level-4'; // 4 hours
            
            const cell = document.createElement('div');
            cell.className = `ypp-calendar-cell ${intensityClass}`;
            
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            
            const h = Math.floor(seconds / 3600);
            const min = Math.floor((seconds % 3600) / 60);
            const timeStr = seconds > 0 ? (h > 0 ? `${h}h ${min}m` : `${min}m`) : 'No watch time';
            
            cell.title = `${date.getFullYear()}-${m}-${d}: ${timeStr}`;
            grid.appendChild(cell);
        }
    }
};
