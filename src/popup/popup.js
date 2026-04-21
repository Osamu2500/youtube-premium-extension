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
        'home': 'Home & Feed',
        'player': 'Player & Tools',
        'search': 'Search Results',
        'subscriptions': 'Subscriptions',
        'history': 'History & Library',
        'themes': 'Themes & Appearance',
        'customization': 'Customization',
        'global': 'Global Settings'
    };

    function switchTab(tabId) {
        // Batch DOM updates for better performance
        requestAnimationFrame(() => {
            // Update Nav
            navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.tab === tabId);
            });

            // Update Content
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.id === `tab-${tabId}`);
            });

            // Update Title
            if (pageTitle) {
                pageTitle.textContent = titles[tabId] || 'Settings';
            }
            
            // Save last active tab for persistence
            localStorage.setItem('ypp-last-tab', tabId);
        });
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
        'logoRedirectSub',

        // Feed & Home
        'hookFreeHome',
        'hideMixes',
        'hideWatched', // Also in Search
        'grid4x4',
        'homeColumns', // New
        'displayFullTitle', // New
        'contextMenu', // Subscription Groups Context Menu
        
        // Shorts
        'hideShorts', // Global/Home
        'hideSearchShorts',
        'redirectShorts',
        'shortsAutoScroll',

        // Search
        'searchGrid',
        'searchColumns', // New
        'cleanSearch',
        'hideSearchShelves',
        'hideChannelCards',
        
        // Player
        'autoQuality',
        'enableVolumeBoost',
        'wheelControls', // wheel-controls.js
        'audioCompressor', // audio-compressor.js
        'videoResumer', // video-resumer.js
        'enableCustomSpeed',
        'enablePiP', // Button / Scroll PiP
        'enableLoop',
        'enableSnapshot',
        'enableRemainingTime',
        'enableStatsForNerds',

        // Visuals
        'enableCinemaFilters', // Unified: presets + sliders

        'blueLight',
        'dim',
        'zenMode',
        'autoCinema',
        'autoPiP',
        'hoverSidebar',
        'studyMode',
        'ambientMode',
        'audioModeEnabled',
        'videoControlsEnabled',

        // Distractions
        'enableFocusMode',
        'hideComments',
        'commentFilter', // comment-filter.js
        'hideLiveChat',
        'hideFundraiser',
        'hideEndScreens',
        'hideCards',
        'hideMerch',
        
        // Playlist
        'reversePlaylist',
        'playlistDuration',

        // Subscription Manager
        'enableSubsManager',
        'channelColumns',
        'subscriptionsColumns',
        'subscriptionFolders',

        // Watch Time Alert
        'watchTimeAlert',
        'watchTimeAlertHours',

        // Keyboard Shortcuts
        'keyboardShortcuts',
        'shortcut_zenMode',
        'shortcut_focusMode',
        'shortcut_cinemaMode',
        'shortcut_snapshot',
        'shortcut_loop',
        'shortcut_pip',
        'shortcut_speedDown',
        'shortcut_speedUp',
        'shortcut_speedReset',
        'shortcut_ambientMode',

        // Customization
        'fontFamily',
        'fontScale',
        'densityMode',
        'accentColor',
        'enableAnimations',
        'reducedMotion',
        'cardStyle',
        'thumbRadius',
        'sidebarOpacity'
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
                        } else if (el.type === 'range') {
                            el.value = settings[key] || 0;
                            // Update display text if exists
                            const display = document.getElementById(key + 'Value');
                            if (display) display.textContent = el.value + '%';
                        } else if (el.type === 'color' || el.type === 'text') {
                            el.value = settings[key] || (key === 'progressBarColor' ? '#ff4e45' : '');
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

    // Gather current state from UI
    const gatherSettings = () => {
        const settings = {};
        settingKeys.forEach(key => {
            const el = elements[key];
            if (el) {
                if (el.type === 'checkbox') {
                    settings[key] = el.checked;
                } else if (el.type === 'range') {
                    settings[key] = Number(el.value);
                } else {
                    settings[key] = el.value;
                }
            }
        });
        return settings;
    };

    // Send instant update to content script (Low/No Debounce)
    const sendPreviewUpdate = Utils.debounce(() => {
        const settings = gatherSettings();
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'UPDATE_SETTINGS', 
                    settings: settings 
                });
            }
        });
    }, 10); // 10ms for practically instant but prevents thread lock

    // Save to valid storage using atomic queue (Higher Debounce)
    const persistSettings = Utils.debounce(() => {
        const uiSettings = gatherSettings();
        try {
            if (typeof queueSettingsWrite !== 'undefined') {
                queueSettingsWrite({ fullState: uiSettings });
            } else {
                // Fallback if accessed early
                chrome.storage.local.get('settings', (data) => {
                    const existing = data.settings || {};
                    const mergedSettings = { ...existing, ...uiSettings };
                    chrome.storage.local.set({ settings: mergedSettings }, () => {
                        if (chrome.runtime.lastError) {
                            Utils.log('Save Error: ' + chrome.runtime.lastError.message, 'POPUP', 'error');
                        }
                    });
                });
            }
        } catch (e) {
             Utils.log('Critical Save Error: ' + e.message, 'POPUP', 'error');
        }
    }, 500);

    // Combined Action with Visual Feedback
    const saveSettings = () => {
        sendPreviewUpdate();
        persistSettings();
        showSaveIndicator();
    };

    // Visual feedback for save action
    const showSaveIndicator = () => {
        const badge = document.querySelector('.status-badge');
        if (badge) {
            const originalText = badge.textContent;
            badge.textContent = 'Saved ✓';
            badge.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            
            setTimeout(() => {
                badge.textContent = originalText;
                badge.style.background = '';
            }, 1200);
        }
    };

    // --- ELEMENT CACHE ---
    const elements = {};
    settingKeys.forEach(key => {
        elements[key] = document.getElementById(key);
    });

    // --- THEME SELECTOR GRID ---
    const initThemeSelector = (currentTheme) => {
        const themeGrid = document.getElementById('themeGrid');
        if (!themeGrid) return;
        themeGrid.innerHTML = '';

        const themes = [
            { key: 'system', label: 'System Auto', meta: 'Follows OS', color: 'split' },
            { key: 'default', label: 'YouTube Dark', meta: 'Default', color: '#0f0f0f' }, // Generic dark
            { key: 'ocean', label: 'Ocean Blue', meta: 'Deep Blue', color: '#051421' },
            { key: 'sunset', label: 'Sunset Glow', meta: 'Warm', color: '#1a0b1a' },
            { key: 'dracula', label: 'Dracula', meta: 'High Contrast', color: '#282a36' },
            { key: 'midnight', label: 'Midnight', meta: 'OLED Black', color: '#000000' },
            { key: 'forest', label: 'Forest', meta: 'Green', color: '#0f1c15' },
            { key: 'cherry', label: 'Cherry', meta: 'Pink', color: '#26181b' }
        ];

        themes.forEach(theme => {
            const btn = document.createElement('div');
            btn.className = `theme-btn ${theme.key === currentTheme ? 'active' : ''}`;
            btn.dataset.theme = theme.key;
            
            // Create Preview Circle
            const preview = document.createElement('div');
            preview.className = `theme-preview ${theme.key === 'system' ? 'split' : ''}`;
            if (theme.key !== 'system') preview.style.backgroundColor = theme.color;
            
            // Info
            const info = document.createElement('div');
            info.className = 'theme-info';
            info.innerHTML = `
                <span class="theme-name">${theme.label}</span>
                <span class="theme-meta">${theme.meta}</span>
            `;

            btn.appendChild(preview);
            btn.appendChild(info);

            // Click Handler
            btn.addEventListener('click', () => {
                // Visual Update
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Logic Update
                const newTheme = theme.key;
                
                // 1. Update Storage
                updateSetting('activeTheme', newTheme);
                
                // 2. Apply to Popup
                applyThemeToPopup(newTheme);
                
                // 3. Notify Content Script
                notifyThemeChange(newTheme);
            });

            themeGrid.appendChild(btn);
        });
        
        // Initial Popup Theme Apply
        applyThemeToPopup(currentTheme);
    };

    // --- RANGE SLIDER LISTENERS (Live Preview) ---
    ['blueLight', 'dim', 'homeColumns', 'searchColumns', 'channelColumns', 'subscriptionsColumns', 'watchTimeAlertHours'].forEach(key => {
        const slider = elements[key];
        const display = document.getElementById(key + 'Value');
        if (slider) {
            slider.addEventListener('input', () => {
                if (display) {
                     // Special handling for column counts (value is just number)
                     if (key.includes('Columns')) {
                         display.textContent = slider.value;
                     } else {
                         display.textContent = slider.value + '%';
                     }
                }
                // Trigger save for live preview
                saveSettings();
            });
        }
    });

    // --- SEARCH VIEW MODE PILL TOGGLE ---
    const initSearchViewMode = () => {
        const container = document.getElementById('searchViewModeToggle');
        if (!container) return;

        const btns = container.querySelectorAll('.view-mode-btn');

        const applyActiveState = (mode) => {
            btns.forEach(b => {
                const isActive = b.dataset.mode === mode;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                b.style.color = isActive ? '#ff4e45' : 'rgba(255,255,255,0.5)';
            });
        };

        // Load saved mode
        chrome.storage.local.get(['searchViewMode'], (result) => {
            const savedMode = result.searchViewMode || localStorage.getItem('ypp_searchViewMode') || 'grid';
            applyActiveState(savedMode);
        });

        // Handle clicks
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                applyActiveState(mode);

                // Persist
                chrome.storage.local.set({ searchViewMode: mode });
                localStorage.setItem('ypp_searchViewMode', mode);

                // Live-push to active YouTube search tab
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const tab = tabs[0];
                    if (tab && tab.url && tab.url.includes('youtube.com/results')) {
                        chrome.tabs.sendMessage(tab.id, {
                            type: 'YPP_SET_SEARCH_VIEW_MODE',
                            mode: mode
                        }).catch(() => {}); // Ignore if content script not ready
                    }
                });
            });
        });
    };

    initSearchViewMode();

    // --- CONCURRENT STORAGE MANAGER ---
    let _settingsWriteQueue = [];
    let _isWritingSettings = false;

    const _processWriteQueue = () => {
        if (_isWritingSettings || _settingsWriteQueue.length === 0) return;
        _isWritingSettings = true;
        
        // Lock and drain current pending updates
        const updates = [..._settingsWriteQueue];
        _settingsWriteQueue = [];
        
        chrome.storage.local.get(['settings'], (result) => {
            const currentSettings = result.settings || {};
            
            // Atomically apply all batched mutations
            updates.forEach(update => {
                if (update.fullState) {
                    Object.assign(currentSettings, update.fullState);
                } else if (update.key) {
                    currentSettings[update.key] = update.value;
                }
            });
            
            // Failsafe validation against accidental wipe
            if (Object.keys(currentSettings).length < 2) {
                 const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                    ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                    : {};
                 Object.assign(currentSettings, defaultSettings, currentSettings);
            }

            chrome.storage.local.set({ settings: currentSettings }, () => {
                _isWritingSettings = false;
                if (chrome.runtime.lastError) {
                    Utils.log('Save Error: ' + chrome.runtime.lastError.message, 'POPUP', 'error');
                }
                // Process any updates appended during async gap
                if (_settingsWriteQueue.length > 0) {
                    _processWriteQueue();
                }
            });
        });
    };

    const queueSettingsWrite = (payload) => {
        _settingsWriteQueue.push(payload);
        _processWriteQueue();
    };

    const updateSetting = (key, value) => {
        queueSettingsWrite({ key, value });
    };

    const notifyThemeChange = (newTheme) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'UPDATE_SETTINGS', 
                    settings: { activeTheme: newTheme } // Partial update might be enough if main.js handles it
                });
            }
        });
    };



    const applyThemeToPopup = (themeKey) => {
        // Handle System Theme for Popup Preview
        if (themeKey === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeKey = isDark ? 'midnight' : 'default';
        }

        document.documentElement.setAttribute('data-ypp-theme', themeKey);
        document.documentElement.classList.add('yt-premium-plus-theme');
        
        // Remove legacy link if exists
        const link = document.getElementById('ypp-active-theme-css');
        if (link) link.remove();
    };

    // --- DASHBOARD PRESETS ---
    const applyPreset = (presetName) => {
        const presets = {
            focus: {
                enableFocusMode: true,
                hideComments: true,
                forceHideSidebar: true,
                hideLiveChat: true,
                hideEndScreens: true
            },
            research: {
                enableFocusMode: false,
                hideComments: false,
                searchGrid: true,
                searchColumns: 4
            },
            minimal: {
                hookFreeHome: true,
                forceHideSidebar: true,
                hideShorts: true
            }
        };

        const presetValues = presets[presetName];
        if (!presetValues) return;

        Object.keys(presetValues).forEach(key => {
            const el = elements[key];
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = presetValues[key];
                } else if (el.type === 'range') {
                    el.value = presetValues[key];
                    const display = document.getElementById(key + 'Value');
                    if (display) display.textContent = el.value + (key.includes('Columns') ? '' : '%');
                }
            }
        });

        // Ensure we switch to a tab where changes are obvious or just show saved
        updateDependencyUI();
        saveSettings();
        showSaveIndicator();
    };

    const presetFocusBtn = document.getElementById('presetFocus');
    const presetResearchBtn = document.getElementById('presetResearch');
    const presetMinimalBtn = document.getElementById('presetMinimal');

    if (presetFocusBtn) presetFocusBtn.addEventListener('click', () => applyPreset('focus'));
    if (presetResearchBtn) presetResearchBtn.addEventListener('click', () => applyPreset('research'));
    if (presetMinimalBtn) presetMinimalBtn.addEventListener('click', () => applyPreset('minimal'));

    // --- FEATURE SEARCH ---
    const featureSearchInput = document.getElementById('featureSearch');
    if (featureSearchInput) {
        featureSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const allCards = document.querySelectorAll('.toggle-card, .setting-item');
            const allSections = document.querySelectorAll('.settings-section');
            
            if (!query) {
                allCards.forEach(card => card.style.display = '');
                allSections.forEach(sec => sec.style.display = '');
                
                // If query is cleared, ensure we are only showing the active tab's content
                // because all tabs might have their cards restored.
                // Wait, display='' just inherited styles. We don't change .tab-content
                return;
            }

            // Force show all tabs temporarily so we can see search results from everywhere?
            // Optional: The user might want global search.
            // For now, let's keep search restricted to the active tab otherwise layout breaks.
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                const activeCards = activeTab.querySelectorAll('.toggle-card, .setting-item');
                activeCards.forEach(card => {
                    const text = card.textContent.toLowerCase();
                    if (text.includes(query)) {
                        card.style.display = ''; 
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    }

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

    // --- BACKUP & RESTORE TOOLS ---
    function initBackupTools() {
        const exportBtn = document.getElementById('exportFoldersBtn');
        const importBtn = document.getElementById('importFoldersBtn');
        const fileInput = document.getElementById('importFoldersFile');

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                chrome.storage.local.get(['ypp_subscription_folders', 'ypp_folder_config'], (result) => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "ypp_folders_backup_" + new Date().toISOString().split('T')[0] + ".json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                });
            });
        }

        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (event) => {
                const fileReader = new FileReader();
                fileReader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (importedData.ypp_subscription_folders) {
                            chrome.storage.local.set({
                                'ypp_subscription_folders': importedData.ypp_subscription_folders,
                                'ypp_folder_config': importedData.ypp_folder_config || {}
                            }, () => {
                                alert("Folders imported successfully! Please refresh YouTube.");
                            });
                        } else {
                            alert("Invalid backup file format.");
                        }
                    } catch (err) {
                        alert("Error reading file.");
                    }
                };
                if (event.target.files[0]) {
                    fileReader.readAsText(event.target.files[0]);
                }
            });
        }
    }

    // --- CUSTOMIZATION CONTROLS ---

    /** Generic pill selector init */
    function initPillSelector(containerId, storageKey, onChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const options = container.querySelectorAll('.pill-option');

        // Load saved value
        chrome.storage.local.get(['settings'], (result) => {
            const saved = result.settings ? result.settings[storageKey] : null;
            if (saved) {
                options.forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.value === saved);
                });
            }
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                const value = opt.dataset.value;
                
                // Save to main settings object using atomic queue
                if (typeof queueSettingsWrite !== 'undefined') {
                    queueSettingsWrite({ key: storageKey, value: value });
                } else {
                    chrome.storage.local.get(['settings'], (result) => {
                        const settings = result.settings || {};
                        settings[storageKey] = value;
                        chrome.storage.local.set({ settings });
                    });
                }
                sendPreviewUpdate();
                
                if (onChange) onChange(value);
                showSaveIndicator();
            });
        });
    }

    /** Apply font family to popup */
    function applyFontFamily(family) {
        const fontMap = {
            inter: '"Inter", system-ui, sans-serif',
            system: 'system-ui, -apple-system, sans-serif',
            mono: '"Courier New", monospace'
        };
        document.body.style.fontFamily = fontMap[family] || fontMap.inter;
    }

    /** Apply density to popup (injects CSS variable) */
    function applyDensity(density) {
        const densityMap = {
            compact: { pad: '5px', gap: '4px' },
            comfortable: { pad: '8px', gap: '6px' },
            spacious: { pad: '14px', gap: '12px' }
        };
        const d = densityMap[density] || densityMap.comfortable;
        document.documentElement.style.setProperty('--density-pad', d.pad);
        document.documentElement.style.setProperty('--density-gap', d.gap);
    }

    /** Apply accent color to popup */
    function applyAccentColor(hex) {
        if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        document.documentElement.style.setProperty('--accent-primary', hex);
        document.documentElement.style.setProperty('--accent-glow', hex + '66');
        document.documentElement.style.setProperty('--accent-gradient',
            `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)`
        );
    }

    // Init pill selectors
    initPillSelector('fontFamilySelector', 'fontFamily', applyFontFamily);
    initPillSelector('densitySelector', 'densityMode', applyDensity);
    initPillSelector('cardStyleSelector', 'cardStyle', (style) => {
        document.documentElement.setAttribute('data-card-style', style);
    });

    // Load & apply saved customization values on startup
    chrome.storage.local.get(['settings'], (result) => {
        const s = result.settings || {};
        if (s.fontFamily) applyFontFamily(s.fontFamily);
        if (s.densityMode) applyDensity(s.densityMode);
        if (s.cardStyle) document.documentElement.setAttribute('data-card-style', s.cardStyle);
        if (s.accentColor) {
            applyAccentColor(s.accentColor);
            document.querySelectorAll('.color-swatch[data-color]').forEach(sw => {
                sw.classList.toggle('active', sw.dataset.color === s.accentColor);
            });
            const customPicker = document.getElementById('accentColorCustom');
            if (customPicker) customPicker.value = s.accentColor;
        }
        
        // Disable animations class based on reducedMotion
        if (s.enableAnimations === false) {
            document.documentElement.classList.add('ypp-no-animations');
        }
        if (s.reducedMotion) {
            document.documentElement.classList.add('ypp-reduced-motion');
        }
    });

    // Accent color swatches
    const accentSwatches = document.getElementById('accentSwatches');
    if (accentSwatches) {
        accentSwatches.querySelectorAll('.color-swatch[data-color]').forEach(sw => {
            sw.addEventListener('click', () => {
                accentSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                const color = sw.dataset.color;
                
                if (typeof queueSettingsWrite !== 'undefined') {
                    queueSettingsWrite({ key: 'accentColor', value: color });
                } else {
                    chrome.storage.local.get(['settings'], (result) => {
                        const settings = result.settings || {};
                        settings.accentColor = color;
                        chrome.storage.local.set({ settings });
                    });
                }
                sendPreviewUpdate();
                
                applyAccentColor(color);
                showSaveIndicator();
            });
        });

        // Custom color picker
        const customPicker = document.getElementById('accentColorCustom');
        if (customPicker) {
            customPicker.addEventListener('input', () => {
                accentSwatches.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                const wrap = customPicker.closest('.color-swatch-wrap');
                if (wrap) wrap.querySelector('.color-swatch').classList.add('active');
                applyAccentColor(customPicker.value);
            });
            customPicker.addEventListener('change', () => {
                chrome.storage.local.get(['settings'], (result) => {
                    const settings = result.settings || {};
                    settings.accentColor = customPicker.value;
                    chrome.storage.local.set({ settings });
                    sendPreviewUpdate();
                });
                showSaveIndicator();
            });
        }
    }

    // Live preview for range sliders handled by main logic now
    const custSliders = [
        { id: 'fontScale', dispId: 'fontScaleValue', suffix: '%' },
        { id: 'thumbRadius', dispId: 'thumbRadiusValue', suffix: 'px' },
        { id: 'sidebarOpacity', dispId: 'sidebarOpacityValue', suffix: '%' }
    ];
    custSliders.forEach(({ id, dispId, suffix }) => {
        const el = document.getElementById(id);
        const disp = document.getElementById(dispId);
        if (el) {
            el.addEventListener('input', () => {
                if (disp) disp.textContent = el.value + suffix;
                if (id === 'fontScale') {
                    document.documentElement.style.setProperty('--ui-font-scale', (el.value / 100).toFixed(2));
                }
                saveSettings(); // To preview changes live
            });
        }
    });

    // DOM Class toggle callbacks for animations
    const enableAnimationsEl = document.getElementById('enableAnimations');
    if (enableAnimationsEl) {
        enableAnimationsEl.addEventListener('change', () => {
            document.documentElement.classList.toggle('ypp-no-animations', !enableAnimationsEl.checked);
        });
    }
    const reducedMotionEl = document.getElementById('reducedMotion');
    if (reducedMotionEl) {
        reducedMotionEl.addEventListener('change', () => {
            document.documentElement.classList.toggle('ypp-reduced-motion', reducedMotionEl.checked);
        });
    }

    // Initialize
    loadSettings();
    initHistoryWidget(); // Initialize history widget on load
    initBackupTools();
});
