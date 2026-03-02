/**
 * Feature: Watch History Tracker
 * Behavioral intelligence layer that extracts, aggregates, and visualizes
 * real watch data from Local Storage (Option A).
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
        this._boundMountUI = this.mountUI.bind(this);
    }
    
    getConfigKey() {
        return null; // Always active when on history page
    }

    async enable() {
        if (location.pathname !== '/feed/history') return;
        await super.enable();

        // Initial Load
        this.mountUI();
        this.loadStats();

        // Update periodically (in case user watches video in another tab or background)
        this.updateInterval = setInterval(this._boundLoadStats, 5000);

        // Re-check on Focus
        this.addListener(window, 'focus', this._boundLoadStats);
        
        // Handle Navigation via BaseFeature's DOMObserver instead of raw MutationObserver
        this.observer.start();
        // Just re-mount if the app node updates while we're on the history page
        this.observer.register('history-tracker-mount', 'ytd-app', () => {
             if (location.pathname === '/feed/history') {
                 this.mountUI();
             }
        }, false);
    }
    
    async disable() {
        await super.disable();
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.observer) {
            this.observer.unregister('history-tracker-mount');
            this.observer.stop();
        }
        
        const widget = document.getElementById('ypp-history-tracker-widget');
        if (widget) widget.remove();
        
        this.isExpanded = false;
    }

    mountUI() {
        const header = document.querySelector('ytd-browse[page-subtype="history"] #primary');
        if (!header) return;

        if (!document.getElementById('ypp-history-tracker-widget')) {
            const widget = this.createWidget();
            header.insertBefore(widget, header.firstChild);
            this.injectComponentStyles();
            // Load stats immediately after mount
            this.updateWidgetValues(); 
        }
    }

    async loadStats() {
        // Generate keys for Today, Last 7 Days, Last 30 Days
        const today = new Date();
        const keysToCheck = [];
        
        // Helper to formatting keys: ypp_analytics_YYYY-MM-DD
        const getKey = (d) => {
            return this.STORAGE_PREFIX + d.toISOString().split('T')[0];
        };

        // Generate last 30 days of keys + legacy check logic
        for (let i = 0; i < 31; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            keysToCheck.push(getKey(d));
        }

        const data = await chrome.storage.local.get(keysToCheck);
        
        // Reset Aggregators
        let tCount = 0, tSec = 0;
        let wCount = 0, wSec = 0;
        let mCount = 0, mSec = 0;

        const todayKey = getKey(today);

        keysToCheck.forEach((key, index) => {
            const dayData = data[key];
            if (!dayData) return;

            const seconds = dayData.totalSeconds || 0;
            const count = dayData.videos ? Object.keys(dayData.videos).length : 0;

            // Today (index 0)
            if (index === 0) {
                tCount = count;
                tSec = seconds;
            }

            // Week (0-6)
            if (index < 7) {
                wCount += count;
                wSec += seconds;
            }

            // Month (0-30)
            mCount += count;
            mSec += seconds;
        });

        // -------------------------------------------------------------
        // NEW: Calculate Streak
        // -------------------------------------------------------------
        let streak = 0;
        // Check today
        if (data[todayKey]?.totalSeconds > 0) {
            streak = 1;
            // Count backwards
            for (let i = 1; i < 30; i++) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                if (data[getKey(d)]?.totalSeconds > 0) {
                    streak++;
                } else {
                    break;
                }
            }
        } 
        else {
             // If today is 0, check yesterday
             const yesterday = new Date();
             yesterday.setDate(today.getDate() - 1);
             if (data[getKey(yesterday)]?.totalSeconds > 0) {
                 for (let i = 1; i < 30; i++) { 
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    if (data[getKey(d)]?.totalSeconds > 0) {
                        streak++;
                    } else {
                        break;
                    }
                 }
             }
        }

        // -------------------------------------------------------------
        // NEW: Top Channel (Today)
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
            
            // Find max
            Object.entries(channelStats).forEach(([name, time]) => {
                if (time > topChannelTime) {
                    topChannelTime = time;
                    topChannelName = name;
                }
            });
        }

        // Update State
        this.stats = {
            today: { count: tCount, seconds: tSec },
            week: { count: wCount, seconds: wSec },
            month: { count: mCount, seconds: mSec },
            streak: streak,
            topChannel: topChannelName
        };

        this.updateWidgetValues();
    }

    createWidget() {
        const div = document.createElement('div');
        div.id = 'ypp-history-tracker-widget';
        div.className = 'ypp-glass-panel';
        div.innerHTML = `
            <div class="ypp-tracker-header">
                <div class="ypp-tracker-title">
                    <h2>History Analytics</h2>
                    <span class="ypp-badge">Real-Time</span>
                </div>
                <!-- Streak Badge -->
                <div class="ypp-streak-badge" title="Daily Watch Streak">
                    <span class="fire-icon">🔥</span>
                    <span id="ypp-stats-streak">0</span>
                </div>
                <button id="ypp-tracker-toggle" class="ypp-icon-btn">▼</button>
            </div>
            
            <div class="ypp-tracker-grid collapsed" id="ypp-tracker-content">
                <!-- Today (Always Visible) -->
                <div class="ypp-stat-card primary">
                    <span class="label">Videos Today</span>
                    <span class="value" id="ypp-stats-today-count">-</span>
                </div>
                <div class="ypp-stat-card primary">
                    <span class="label">Watch Time Today</span>
                    <span class="value" id="ypp-stats-today-time">-</span>
                </div>

                <!-- Expanded Stats -->
                <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 7 Days</span>
                    <span class="value" id="ypp-stats-week-time">-</span>
                </div>
                 <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 30 Days</span>
                    <span class="value" id="ypp-stats-month-time">-</span>
                </div>

                <!-- New Top Channel Card -->
                <div class="ypp-stat-card secondary hidden full-width">
                     <span class="label">Top Channel (Today)</span>
                     <span class="value text-value" id="ypp-stats-top-channel">-</span>
                </div>
            </div>
            
            <div class="ypp-tracker-footer hidden" id="ypp-tracker-footer">
               <small>* Analytics stored locally. History starts from install.</small>
            </div>
        `;
        
        // Bind Toggle
        const toggle = div.querySelector('#ypp-tracker-toggle');
        toggle.addEventListener('click', () => {
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
                background: var(--ypp-bg-surface);
                backdrop-filter: var(--ypp-blur-lg);
                border: 1px solid var(--ypp-glass-border);
                border-radius: var(--ypp-radius-lg);
                margin-bottom: 32px;
                overflow: hidden;
                box-shadow: var(--ypp-shadow-card);
                max-width: var(--ypp-layout-max-width, 1200px);
                margin-left: auto;
                margin-right: auto;
                transition: var(--ypp-transition);
            }
            .ypp-tracker-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: var(--ypp-glass-shine);
                border-bottom: 1px solid var(--ypp-glass-border);
            }
            .ypp-tracker-title {
                display: flex;
                align-items: center;
            }
            .ypp-tracker-title h2 {
                margin: 0;
                font-size: 18px;
                font-family: 'Inter', sans-serif;
                font-weight: 700;
                color: var(--ypp-text-primary);
                margin-right: 12px;
                letter-spacing: -0.5px;
            }
            .ypp-badge {
                background: rgba(62,166,255,0.15);
                color: var(--ypp-accent-blue);
                padding: 4px 10px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 1px solid rgba(62,166,255,0.3);
            }
            .ypp-streak-badge {
                display: flex;
                align-items: center;
                background: rgba(255,107,107,0.1);
                border: 1px solid rgba(255,107,107,0.3);
                padding: 6px 14px;
                border-radius: 20px;
                margin-left: auto;
                margin-right: 16px;
                backdrop-filter: var(--ypp-blur-sm);
            }
            .ypp-streak-badge .fire-icon {
                margin-right: 6px;
                font-size: 16px;
                filter: drop-shadow(0 2px 4px rgba(255,107,107,0.4));
            }
            .ypp-streak-badge span:last-child {
                color: #FF6B6B;
                font-weight: 800;
                font-size: 14px;
                font-family: 'Inter', sans-serif;
            }
            .ypp-tracker-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                padding: 24px;
            }
            .ypp-tracker-grid.expanded {
                grid-template-columns: repeat(4, 1fr);
            }
            .ypp-stat-card.full-width {
                grid-column: 1 / -1; 
            }
            .ypp-stat-card {
                background: rgba(255,255,255,0.02);
                padding: 20px 16px;
                border-radius: var(--ypp-radius-md);
                text-align: center;
                border: 1px solid var(--ypp-glass-border);
                transition: var(--ypp-transition);
            }
            .ypp-stat-card:hover {
                background: rgba(255,255,255,0.05);
                transform: translateY(-2px);
                box-shadow: var(--ypp-shadow-float);
                border-color: rgba(255,255,255,0.1);
            }
            .ypp-stat-card .label {
                display: block;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--ypp-text-secondary);
                margin-bottom: 8px;
                font-weight: 600;
            }
            .ypp-stat-card .value {
                font-size: 28px;
                font-weight: 800;
                color: var(--ypp-text-primary);
                font-family: 'Inter', sans-serif;
                letter-spacing: -1px;
            }
            .ypp-stat-card .value.text-value {
                font-size: 18px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
                color: var(--ypp-text-secondary);
            }
            .ypp-tracker-footer {
                padding: 12px 24px;
                background: rgba(0,0,0,0.1);
                color: var(--ypp-text-muted);
                font-size: 12px;
                text-align: center;
                border-top: 1px solid var(--ypp-glass-border);
            }
            .hidden { display: none; }
            
            #ypp-tracker-toggle {
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--ypp-glass-border);
                color: var(--ypp-text-secondary);
                cursor: pointer;
                font-size: 10px;
                transition: var(--ypp-transition);
                width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                border-radius: 50%;
            }
            #ypp-tracker-toggle:hover {
                background: rgba(255,255,255,0.1);
                color: var(--ypp-text-primary);
            }
            #ypp-tracker-toggle.rotated {
                transform: rotate(180deg);
            }
        `;
        document.head.appendChild(style);
    }

    toggleExpand() {
        const content = document.getElementById('ypp-tracker-content');
        const footer = document.getElementById('ypp-tracker-footer');
        const toggle = document.getElementById('ypp-tracker-toggle');
        const secondary = document.querySelectorAll('.ypp-stat-card.secondary');
        
        if (this.isExpanded) {
            content.classList.add('expanded');
            secondary.forEach(el => el.classList.remove('hidden'));
            footer.classList.remove('hidden');
            toggle.classList.add('rotated');
        } else {
            content.classList.remove('expanded');
            secondary.forEach(el => el.classList.add('hidden'));
            footer.classList.add('hidden');
            toggle.classList.remove('rotated');
        }
    }

    updateWidgetValues() {
        const fmtTime = (s) => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
    }
};
