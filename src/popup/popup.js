document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITIES ---
    // Use shared utils from utils.js
    const Utils = window.YPP.Utils;

    // --- TAB NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    // Tab Title Mapping
    const titles = {
        'home': 'Home Feed',
        'player': 'Player & Watch',
        'shorts': 'Shorts',
        'subscriptions': 'Subscriptions',
        'playlists': 'Library & Playlists',
        'watchlater': 'Watch Later',
        'history': 'Watch History',
        'search': 'Search Options',
        'global': 'Global Settings',
        'settings': 'Admin Center'
    };

    function switchTab(tabId) {
        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Content
        tabs.forEach(tab => {
            if (tab.id === `tab-${tabId}`) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update Title
        if (pageTitle) pageTitle.textContent = titles[tabId] || 'Settings';
        
        // Save last active tab (optional polish)
        localStorage.setItem('ypp-last-tab', tabId);
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            if (tab) switchTab(tab);
        });
    });

    // Restore last tab
    const lastTab = localStorage.getItem('ypp-last-tab');
    if (lastTab && document.getElementById(`tab-${lastTab}`)) {
        switchTab(lastTab);
    }

    // --- SETTINGS CONFIGURATION ---
    // Must match IDs in popup.html exactly
    const settingKeys = [
        // Global
        'premiumTheme',
        'trueBlack',
        'hideScrollbar',
        'customProgressBar',
        'progressBarColor',
        'blueProgress',

        // Navigation
        'navShorts',
        'navSubscriptions',
        'navWatchLater',
        'navPlaylists',
        'navHistory',
        'forceHideSidebar',

        // Feed & Home
        'hookFreeHome',
        'hideMixes',
        'hideWatched', // Also in Search
        'grid4x4',
        'contextMenu', // Subscription Groups Context Menu
        
        // Shorts
        'hideShorts', // Global/Home
        'hideSearchShorts',
        'redirectShorts',

        // Search
        'searchGrid',
        'cleanSearch',
        
        // Player
        'sponsorBlock',
        'returnYouTubeDislike',
        'autoQuality',
        'volumeBoost',
        'enableCustomSpeed',
        'enablePiP', // Button
        'miniPlayer', // Scroll PiP
        'enableVideoFilters', // Slider UI
        'loopBtn',
        'snapshotBtn',
        'enableRemainingTime',
        'enableStatsForNerds',

        // Visuals
        'enableCinemaFilters', // Presets
        'zenMode',
        'autoCinema',
        'studyMode',
        'ambientMode',
        'audioModeEnabled',
        'videoControlsEnabled',

        // Distractions
        'enableFocusMode',
        'hideComments',
        'hideEndScreens',
        'hideCards',
        'hideMerch',
        
        // Playlist
        'reversePlaylist',
        'playlistDuration',

        // Subscription Manager
        'enableSubsManager'
    ];

    // --- STORAGE HANDLING ---
    
    // Load Settings
    const loadSettings = () => {
        try {
            chrome.storage.local.get('settings', (data) => {
                if (chrome.runtime.lastError) {
                    Utils.log('Load Error: ' + chrome.runtime.lastError.message, 'POPUP', 'error');
                    return;
                }

                const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                    ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                    : {}; // Fallback if constants not loaded
                
                const settings = { ...defaultSettings, ...(data.settings || {}) };

                settingKeys.forEach(key => {
                    const el = elements[key];
                    if (el) {
                        if (el.type === 'checkbox') {
                            el.checked = settings[key] !== undefined ? settings[key] : false;
                        } else if (el.type === 'color' || el.type === 'text') {
                            el.value = settings[key] || (key === 'progressBarColor' ? '#3ea6ff' : '');
                        }
                    }
                });

                // Initialize Theme Selector
                initThemeSelector(settings.activeTheme);

                updateDependencyUI();
            });
        } catch (e) {
            Utils.log('Critical Load Error: ' + e.message, 'POPUP', 'error');
        }
    };

    // Save Settings (Debounced)
    const saveSettings = Utils.debounce(() => {
        const settings = {};
        settingKeys.forEach(key => {
            const el = elements[key];
            if (el) {
                if (el.type === 'checkbox') {
                    settings[key] = el.checked;
                } else {
                    settings[key] = el.value;
                }
            }
        });

        try {
            chrome.storage.local.set({ settings }, () => {
                if (chrome.runtime.lastError) {
                    Utils.log('Save Error: ' + chrome.runtime.lastError.message, 'POPUP', 'error');
                } else {
                    // console.log('[YPP] Settings saved'); 
                }
            });
        } catch (e) {
             Utils.log('Critical Save Error: ' + e.message, 'POPUP', 'error');
        }
    }, 300); // 300ms debounce

    // --- ELEMENT CACHE ---
    const elements = {};
    settingKeys.forEach(key => {
        elements[key] = document.getElementById(key);
    });

    // --- THEME SELECTOR ---
    const initThemeSelector = (currentTheme) => {
        const themeSelect = document.getElementById('activeTheme');
        if (!themeSelect) return;

        // Clear existing options
        themeSelect.innerHTML = '';

        // Define themes (Should match constants.js, but duplicated here for popup speed/independence)
        const themes = [
            { key: 'default', label: 'Default (Premium)' },
            { key: 'ocean', label: 'Ocean Blue' },
            { key: 'sunset', label: 'Sunset Glow' },
            { key: 'dracula', label: 'Dracula' },
            { key: 'forest', label: 'Forest' },
            { key: 'midnight', label: 'Midnight (OLED)' },
            { key: 'cherry', label: 'Cherry Blossom' }
        ];

        // Populate dropdown
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.key;
            option.textContent = theme.label;
            if (theme.key === currentTheme) {
                option.selected = true;
            }
            themeSelect.appendChild(option);
        });

        // Apply initial theme to popup
        applyThemeToPopup(currentTheme, themes);

        // Handle Change
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            updateSetting('activeTheme', newTheme);
            applyThemeToPopup(newTheme, themes);
            
            // Legacy sync for trueBlack
            if (newTheme === 'midnight') {
                updateSetting('trueBlack', true);
            } else {
                updateSetting('trueBlack', false);
            }
        });
    };

    const applyThemeToPopup = (themeKey, themes) => {
        // Remove all theme classes
        themes.forEach(t => {
            const themeClass = `ypp-theme-${t.key}`;
            if (t.key !== 'default') {
                 document.body.classList.remove(themeClass);
            }
        });

        // Add new theme class
        if (themeKey !== 'default') {
            document.body.classList.add(`ypp-theme-${themeKey}`);
        }
    };

    // --- EVENT LISTENERS ---
    
    settingKeys.forEach(key => {
        const el = elements[key];
        if (el) {
            el.addEventListener('change', () => {
                saveSettings(); // Triggers debounced save
                updateDependencyUI();
            });
            // For color picker, also listen to input for real-time responsiveness if needed
            if (el.type === 'color') {
                el.addEventListener('input', () => {
                    // We might not want to save on every pixel drag, but updating UI dependency is fine
                    updateDependencyUI();
                    saveSettings(); // Debounce handles the spam
                });
            }
        }
    });

    // Manage Subs Button
    const manageSubsBtn = document.getElementById('manageSubsBtn');
    if (manageSubsBtn) {
        manageSubsBtn.addEventListener('click', () => {
             chrome.tabs.create({ url: 'https://www.youtube.com/feed/subscriptions' });
        });
    }

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
             const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                    ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                    : {};

            if (confirm('Are you sure you want to reset all settings to default?')) {
                chrome.storage.local.set({ settings: defaultSettings }, () => {
                    loadSettings(); // Reload UI
                });
            }
        });
    }

    // --- UI DEPENDENCIES ---
    function updateDependencyUI() {
        // Custom Progress Bar -> Color Picker
        const customProgress = document.getElementById('customProgressBar');
        const colorPicker = document.getElementById('progressBarColor');
        
        if (customProgress && colorPicker) {
            const isDisabled = !customProgress.checked;
            colorPicker.disabled = isDisabled;
            colorPicker.parentElement.style.opacity = isDisabled ? '0.5' : '1';
            colorPicker.parentElement.style.pointerEvents = isDisabled ? 'none' : 'auto';
        }

        // Focus Mode -> Sub-toggles (Optional visual hierarchy)
        const focusMode = document.getElementById('enableFocusMode');
        const distractionGroups = ['hideComments', 'hideEndScreens', 'hideCards', 'hideMerch'];
        
        if (focusMode) {
             const isFocusOn = focusMode.checked;
             // Any additional logic for focus mode dependencies
        }
    }

    // --- WATCH HISTORY VISUALIZER ---
    // =========================================================================
    // HISTORY WIDGET
    // =========================================================================
    
    let currentCalDate = new Date();
    let selectedCalDateString = null;

    function initHistoryWidget() {
        renderHeatmap();
        setupCalendarListeners();
    }

    function setupCalendarListeners() {
        const btn = document.getElementById('history-calendar-btn');
        const panel = document.getElementById('history-details-panel');
        
        if (btn && panel) {
            btn.addEventListener('click', () => {
                panel.classList.toggle('active');
                if (panel.classList.contains('active')) {
                    renderCalendar(currentCalDate);
                }
            });
        }

        document.getElementById('cal-prev')?.addEventListener('click', () => {
            currentCalDate.setMonth(currentCalDate.getMonth() - 1);
            renderCalendar(currentCalDate);
        });

        document.getElementById('cal-next')?.addEventListener('click', () => {
            currentCalDate.setMonth(currentCalDate.getMonth() + 1);
            renderCalendar(currentCalDate);
        });
    }

    function renderHeatmap() {
        const heatmapContainer = document.getElementById('history-heatmap');
        const todayDisplay = document.getElementById('history-today-time');
        if (!heatmapContainer) return;

        // Generate last 52 days for mini-heatmap (approx 2 months visually similar to GH)
        // Or 52 weeks? CSS says 52 columns. Let's do 52 days for now to keep it simple, or 52 weeks if vertical.
        // CSS grid-template-columns: repeat(52, 1fr) implies 52 items horizontally.
        // Let's show the last 52 days.
        const daysToShow = 52;
        
        const dates = [];
        const today = new Date();
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }

        const keys = dates.map(date => `ypp_history_${date}`);
        const todayKey = `ypp_history_${today.toISOString().split('T')[0]}`;

        chrome.storage.local.get([...keys, todayKey], (result) => {
             // Upd Today
             const todayData = result[todayKey];
             let todaySeconds = 0;
             if (typeof todayData === 'number') todaySeconds = todayData;
             else if (todayData && todayData.totalSeconds) todaySeconds = todayData.totalSeconds;
             
             if (todayDisplay) {
                 const h = Math.floor(todaySeconds / 3600);
                 const m = Math.floor((todaySeconds % 3600) / 60);
                 todayDisplay.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
             }

             // Render Heatmap
             heatmapContainer.innerHTML = '';
             dates.forEach(date => {
                 const dayData = result[`ypp_history_${date}`];
                 let seconds = 0;
                 if (typeof dayData === 'number') seconds = dayData;
                 else if (dayData && dayData.totalSeconds) seconds = dayData.totalSeconds;

                 const cell = document.createElement('div');
                 cell.className = 'heatmap-cell';
                 const minutes = Math.floor(seconds / 60);
                 cell.title = `${date}: ${minutes}m`;

                 if (seconds > 0) {
                     if (seconds < 15 * 60) cell.classList.add('level-1');
                     else if (seconds < 60 * 60) cell.classList.add('level-2');
                     else if (seconds < 180 * 60) cell.classList.add('level-3');
                     else cell.classList.add('level-4');
                 }
                 heatmapContainer.appendChild(cell);
             });
        });
    }

    function renderCalendar(date) {
        const grid = document.getElementById('calendar-grid');
        const label = document.getElementById('cal-month-year');
        if (!grid || !label) return;

        grid.innerHTML = '';
        label.textContent = date.toLocaleDateString('default', { month: 'long', year: 'numeric' });

        const year = date.getFullYear();
        const month = date.getMonth();

        // Days in month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // 0 = Sun

        // Empty slots for start
        for (let i = 0; i < startingDay; i++) {
             const empty = document.createElement('div');
             grid.appendChild(empty);
        }

        // Fetch data for the whole month
        const dateKeys = [];
        for (let i = 1; i <= daysInMonth; i++) {
             const d = new Date(year, month, i);
             // handle timezone offset issue by manually formatting
             const dayString = `${year}-${String(month + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
             dateKeys.push(`ypp_history_${dayString}`);
        }

        chrome.storage.local.get(dateKeys, (result) => {
             for (let i = 1; i <= daysInMonth; i++) {
                 const dayString = `${year}-${String(month + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                 const data = result[`ypp_history_${dayString}`];
                 
                 const cell = document.createElement('div');
                 cell.className = 'calendar-day';
                 cell.textContent = i;
                 
                 let hasData = false;
                 if (data) {
                     // Check if valid data
                     if ((typeof data === 'number' && data > 60) || (data.totalSeconds && data.totalSeconds > 60)) {
                         hasData = true;
                         cell.classList.add('has-data');
                     }
                 }

                 if (selectedCalDateString === dayString) {
                     cell.classList.add('selected');
                 }

                 cell.addEventListener('click', () => {
                     // Deselect prev
                     document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
                     cell.classList.add('selected');
                     selectedCalDateString = dayString;
                     renderVideoList(data);
                 });

                 grid.appendChild(cell);
             }
        });
    }

    function renderVideoList(data) {
        const list = document.getElementById('video-log-list');
        if (!list) return;
        list.innerHTML = '';

        if (!data) {
            list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No history for this date</div>';
            return;
        }

        let videos = [];
        if (typeof data === 'number') {
            // Legacy data
             list.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa;">Legacy data: ${Math.floor(data/60)} mins recorded. (Details unavailable)</div>`;
             return;
        } else if (data.videos) {
            videos = Object.values(data.videos);
        }

        if (videos.length === 0) {
             list.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No videos recorded</div>';
             return;
        }

        // Sort by last watched
        videos.sort((a, b) => b.lastWatched - a.lastWatched);

        videos.forEach(v => {
            const el = document.createElement('div');
            el.className = 'log-item';
            
            const m = Math.floor(v.seconds / 60);
            const s = v.seconds % 60;
            const timeStr = m > 0 ? `${m}m` : `${s}s`;

            el.innerHTML = `
                <div class="log-time">${timeStr}</div>
                <div class="log-info">
                   <a href="${v.url}" target="_blank" class="log-title" title="${v.title}">${v.title}</a>
                   <div class="log-channel">${v.channel}</div>
                </div>
            `;
            list.appendChild(el);
        });
    }

    // Initialize
    loadSettings();
    renderWatchHistory(); // Call once on load
});
