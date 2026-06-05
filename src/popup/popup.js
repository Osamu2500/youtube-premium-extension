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
        'dashboard': 'Dashboard',
        'home': 'Home & Feed',
        'shorts': 'Shorts Tools',
        'player': 'Player Features',
        'search': 'Search Settings',
        'subscriptions': 'Subscriptions',
        'history': 'History & Watch Time',
        'wellness': 'Focus & Wellness',
        'customization': 'Appearance & UI',
        'advanced': 'Advanced & System',
        'global': 'Global Configuration'
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
                const isActive = tab.id === `tab-${tabId}`;
                tab.classList.toggle('active', isActive);
                
                // Animate elements inside the active tab
                if (isActive && window.anime) {
                    const animatableItems = tab.querySelectorAll('.toggle-card, .setting-item, .mode-card');
                    if (animatableItems.length > 0) {
                        try {
                            // Reset properties natively (anime.set missing in v2)
                            animatableItems.forEach(el => {
                                el.style.transform = 'translateX(-12px)';
                                el.style.opacity = '0';
                            });
                            
                            window.anime({
                                targets: animatableItems,
                                translateX: [ -12, 0 ],
                                opacity: [ 0, 1 ],
                                delay: function(el, i) { return 50 + (i * 30); },
                                easing: 'easeOutElastic(1, .6)',
                                duration: 500,
                            });
                        } catch (e) {
                            console.error('Animation error:', e);
                            animatableItems.forEach(el => {
                                el.style.transform = '';
                                el.style.opacity = '1';
                            });
                        }
                    }
                }
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

    // --- COLLAPSIBLE SECTIONS ---
    const sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.settings-section');
            if (section) {
                section.classList.toggle('collapsed');
                // Optional: Save state to localStorage to persist user preferences per section
            }
        });
    });

    // --- SETTINGS CONFIGURATION ---
    // Must match IDs in popup.html exactly
    const settingKeys = [
        // Global
        'premiumTheme',
        'enableAccountMenu',
        'trueBlack',
        'hideScrollbar',

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
        'cinematicMode',
        'hideMixes',
        'hideExploreTopics',
        'hideWatched', // Also in Search
        'hideWatchedMode',
        'hideWatchedThreshold',
        'grid4x4',
        'autoScaleLayout', // Added to fix slider override
        'homeColumns', // New
        'displayFullTitle', // New
        'hidePlaylists',
        'hidePodcasts',
        'hidePosts',
        'hideThumbnails',
        'redirectHome',
        'contextMenu', // Subscription Groups Context Menu
        
        // Shorts
        'hideShorts', // Global/Home
        'hideSearchShorts',
        'redirectShorts',
        'shortsAutoScroll',

        // Search
        'searchGrid',
        'searchColumns', // New
        'channelColumns', // New
        'subscriptionsColumns', // New
        'cleanSearch',
        'hideSearchShelves',
        'hideChannelCards',
        'autoVideoFilter', // Missing
        
        // Player
        'autoQuality',
        'enableVolumeBoost',
        'wheelControls', // wheel-controls.js
        'audioCompressor', // audio-compressor.js
        'videoResumer', // video-resumer.js
        'autoPause', // auto-pause.js
        'enableCustomSpeed',
        'enableGlobalPlayerBar',
        'globalPlayerBarPosition',
        'autoLike',
        'enablePiP', // Button / Scroll PiP
        'miniPlayer', // Missing
        'enableLoop',
        'enableSnapshot',
        'enableRemainingTime',
        'enableStatsForNerds',
        'enableTranscript', // Missing

        // Top Bar Nav Buttons
        'navShorts',
        'navSubscriptions',
        'navPlaylists',
        'navHistory',
        'navWatchLater',

        // Visuals
        'enableCinemaFilters', // Unified: presets + sliders

        'blueLight',
        'dim',
        'zenMode',
        'autoCinema',
        'autoPiP',
        'floatingGuide',
        'studyMode',
        'cinemaMode', // Missing
        'minimalMode', // Missing
        'ambientMode',
        'ambientIntensity',
        'ambientBlur',
        'audioModeEnabled',
        'videoControlsEnabled',

        // Distractions
        'enableFocusMode',
        'dopamineDetox', // Missing
        'hideComments',
        'commentFilter', // comment-filter.js
        'hideLiveChat',
        'hideFundraiser',
        'hideEndScreens',
        'hideMetrics',
        'hideCards',
        'hideMerch',
        'intentionalDelay',
        
        // Integrations & Filters
        'sponsorBlock',
        'returnYouTubeDislike',
        'adSkipper',
        'enableMarkWatched',
        'multiSelect',

        // Playlist & History Extras
        'reversePlaylist',
        'playlistDuration',
        'continueWatching',
        'historyRedesign',

        // Subscription Manager
        'enableSubsManager',
        'channelColumns',
        'subscriptionsColumns',
        'subscriptionFolders',
        'enableFilterBar',
        'enableChannelHealth',

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
        'sidebarOpacity',
        'customScrollbar',
        'grayscaleThumbnails',

        // Sidebar Layout
        'sidebarLayout',
        
        // Scrolling
        'splitScrolling',

        // Missing Keys added during audit
        'enableBookmarks',
        'playlistRedesign',
        'glassPlayerUI',
        'sidebarComments'
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
                            el.value = settings[key] !== undefined ? settings[key] : el.value;
                            // Update display text if exists
                            const display = document.getElementById(key + 'Value');
                            if (display) {
                                const isCount = key.toLowerCase().includes('columns');
                                const isHour  = key === 'watchTimeAlertHours';
                                display.textContent = isCount ? el.value
                                                   : isHour  ? el.value + 'h'
                                                   : el.value + '%';
                            }
                        } else if (el.type === 'color' || el.type === 'text' || el.type === 'select-one') {
                            el.value = settings[key] || '';
                        } else if (el.type === 'hidden') {
                            // e.g. hideWatchedMode — update the hidden input AND sync any pill UI
                            el.value = settings[key] || el.value;
                            if (key === 'hideWatchedMode') {
                                const mode = el.value;
                                document.querySelectorAll('.hw-mode-btn').forEach(b => {
                                    const isActive = b.dataset.mode === mode;
                                    b.classList.toggle('active', isActive);
                                    b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                                    b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
                                });
                            }
                            if (key === 'sidebarLayout') {
                                const layout = el.value || 'compact';
                                document.querySelectorAll('.sidebar-layout-btn').forEach(b => {
                                    const isActive = b.dataset.layout === layout;
                                    b.classList.toggle('active', isActive);
                                    b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                                    b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
                                });
                            }
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
                    // text, color, select, hidden — all string values
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
            { key: 'cherry', label: 'Cherry', meta: 'Pink', color: '#26181b' },
            { key: 'coffee', label: 'Coffee', meta: 'Latte', color: '#2a201c' },
            { key: 'cyberpunk', label: 'Cyberpunk', meta: 'Neon', color: '#0a0a0f' },
            { key: 'nord', label: 'Nord', meta: 'Frost', color: '#2e3440' }
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

    // --- PREMIUM ACCENT COLOR DROPDOWN ---
    const initPremiumAccentDropdown = () => {
        const select = document.getElementById('premiumAccentSelect');
        const colorPicker = document.getElementById('accentColor');
        if (!select || !colorPicker) return;

        // Load 56 options from CONSTANTS
        if (window.YPP && window.YPP.CONSTANTS && window.YPP.CONSTANTS.PREMIUM_COLORS) {
            const colors = window.YPP.CONSTANTS.PREMIUM_COLORS;
            for (const [key, hex] of Object.entries(colors)) {
                // Format label: 'dark-aqua' -> 'Dark Aqua'
                const label = key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const opt = document.createElement('option');
                opt.value = hex;
                opt.textContent = label;
                select.appendChild(opt);
            }
        }

        // When dropdown changes, update the color picker and save
        select.addEventListener('change', () => {
            if (select.value) {
                colorPicker.value = select.value;
                // Dispatch event so the regular listener handles saveSettings
                colorPicker.dispatchEvent(new Event('input'));
            }
        });

        // When color picker changes manually, reset dropdown to 'Custom...' unless it matches perfectly
        colorPicker.addEventListener('input', () => {
            select.value = colorPicker.value || '';
            // If the user's custom color doesn't match an option, select.value becomes '' (Custom)
        });

        // Initial sync from colorPicker value to dropdown
        setTimeout(() => {
            select.value = colorPicker.value || '';
        }, 100);
    };

    // --- RANGE SLIDER LISTENERS (Live Preview) ---
    ['ambientIntensity', 'ambientBlur', 'blueLight', 'dim', 'homeColumns', 'searchColumns', 'channelColumns', 'subscriptionsColumns', 'watchTimeAlertHours', 'hideWatchedThreshold'].forEach(key => {
        const slider = elements[key];
        const display = document.getElementById(key + 'Value');
        if (slider) {
            slider.addEventListener('input', () => {
                if (display) {
                     // Special handling for column counts (value is just number)
                     if (key.includes('Columns')) {
                         display.textContent = slider.value;
                     } else if (key === 'watchTimeAlertHours') {
                         display.textContent = slider.value + 'h';
                     } else {
                         display.textContent = slider.value + '%';
                     }
                }
                
                // UX FIX: If user manually adjusts any column slider, turn OFF autoScaleLayout
                if (key.includes('Columns') && elements['autoScaleLayout'] && elements['autoScaleLayout'].checked) {
                    elements['autoScaleLayout'].checked = false;
                    // We don't need to dispatchEvent here since saveSettings() will capture the new checked state
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

    // --- SIDEBAR LAYOUT PILL TOGGLE ---
    const initSidebarLayoutToggle = () => {
        const container = document.getElementById('sidebarLayoutToggle');
        if (!container) return;

        const btns = container.querySelectorAll('.sidebar-layout-btn');
        const hiddenInput = document.getElementById('sidebarLayout');
        if (!hiddenInput) return;

        const applyActiveState = (layout) => {
            hiddenInput.value = layout;
            btns.forEach(b => {
                const isActive = b.dataset.layout === layout;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
            });
        };

        // Handle clicks — saveSettings() gathers ALL settings including the hidden
        // input we just updated and calls sendPreviewUpdate() for a near-instant
        // (10ms debounce) message to the content script, plus persistSettings()
        // for durable storage. No manual sendMessage needed.
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                applyActiveState(btn.dataset.layout);
                saveSettings();
            });
        });
    };

    initSearchViewMode();
    initSidebarLayoutToggle();
    initPremiumAccentDropdown();

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

    // --- FEATURE SEARCH (GLOBAL) ---
    const featureSearchInput = document.getElementById('featureSearch');
    if (featureSearchInput) {
        featureSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const allCards = document.querySelectorAll('.toggle-card, .setting-item');
            const allSections = document.querySelectorAll('.settings-section');
            const allTabs = document.querySelectorAll('.tab-content');
            
            if (!query) {
                // Reset to default view
                allCards.forEach(card => card.style.display = '');
                allSections.forEach(sec => sec.style.display = '');
                allTabs.forEach(tab => tab.style.display = ''); 
                return;
            }

            // Global search logic
            allTabs.forEach(tab => {
                const cards = tab.querySelectorAll('.toggle-card, .setting-item, .mode-card');
                let tabHasMatches = false;

                cards.forEach(card => {
                    // Collect text content of the card to search
                    const text = card.textContent.toLowerCase();
                    if (text.includes(query)) {
                        card.style.display = '';
                        tabHasMatches = true;
                    } else {
                        card.style.display = 'none';
                    }
                });

                // Hide sections within the tab if they have no visible cards
                const sections = tab.querySelectorAll('.settings-section');
                sections.forEach(sec => {
                    // Check if any card inside this section is visible
                    const visibleCards = Array.from(sec.querySelectorAll('.toggle-card, .setting-item, .mode-card')).filter(c => c.style.display !== 'none');
                    if (visibleCards.length === 0) {
                        sec.style.display = 'none';
                    } else {
                        sec.style.display = '';
                    }
                });

                // Temporarily override tab display to show search results from any tab
                if (tabHasMatches) {
                    tab.style.display = 'block'; 
                } else {
                    tab.style.display = 'none';  
                }
            });
        });
    }

    // --- EVENT LISTENERS ---
    
    settingKeys.forEach(key => {
        const el = elements[key];
        if (el) {
            el.addEventListener('change', () => {
                saveSettings(); // Triggers debounced save
                updateDependencyUI();
                updateCustomizationPreview();
                if (typeof syncModeCards === 'function') syncModeCards();
            });
            // For color picker, also listen to input for real-time responsiveness if needed
            if (el.type === 'color') {
                el.addEventListener('input', () => {
                    // We might not want to save on every pixel drag, but updating UI dependency is fine
                    updateDependencyUI();
                    updateCustomizationPreview();
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
        // Ambient Mode -> Show Sliders
        const ambientModeToggle = document.getElementById('ambientMode');
        const ambientCard = document.getElementById('modeCard-ambientMode');
        if (ambientModeToggle && ambientCard) {
            const settingsTray = ambientCard.querySelector('.mode-settings');
            if (settingsTray) {
                settingsTray.style.display = ambientModeToggle.checked ? 'block' : 'none';
            }
        }

        // Focus Mode -> Sub-toggles (Optional visual hierarchy)
        const focusMode = document.getElementById('enableFocusMode');
        if (focusMode) {
             // Any additional logic for focus mode dependencies
        }

        // Hide Watched sub-panel visibility
        const hwToggle = document.getElementById('hideWatched');
        const hwOptions = document.getElementById('hideWatchedOptions');
        if (hwToggle && hwOptions) {
            hwOptions.style.display = hwToggle.checked ? 'block' : 'none';
        }
    }

    function updateCustomizationPreview() {
        if (elements['fontFamily']) applyFontFamily(elements['fontFamily'].value);
        if (elements['densityMode']) applyDensity(elements['densityMode'].value);
        if (elements['cardStyle']) document.documentElement.setAttribute('data-card-style', elements['cardStyle'].value);
        if (elements['accentColor']) applyAccentColor(elements['accentColor'].value);
    }

    // --- HIDE WATCHED MODE PILL ---
    function initHideWatchedModePill() {
        const btns = document.querySelectorAll('.hw-mode-btn');
        const hiddenInput = document.getElementById('hideWatchedMode');
        if (!btns.length || !hiddenInput) return;

        const applyMode = (mode) => {
            hiddenInput.value = mode;
            btns.forEach(b => {
                const isActive = b.dataset.mode === mode;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? 'rgba(62,166,255,0.22)' : 'transparent';
                b.style.color = isActive ? 'var(--accent, #3ea6ff)' : 'rgba(255,255,255,0.5)';
            });
        };

        // Load saved mode into pill
        chrome.storage.local.get('settings', (data) => {
            const mode = data.settings?.hideWatchedMode || 'dim';
            applyMode(mode);
        });

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                applyMode(btn.dataset.mode);
                saveSettings();
            });
        });
    }

    initHideWatchedModePill();

    // --- ACCENT COLOR SWATCHES ---
    function initAccentColorSwatches() {
        const swatches = document.querySelectorAll('.color-swatch[data-color]');
        const customInput = document.getElementById('accentColor');
        if (!customInput) return;

        const applySwatchActive = (color) => {
            let foundMatch = false;
            swatches.forEach(swatch => {
                const isActive = swatch.dataset.color.toLowerCase() === color.toLowerCase();
                swatch.classList.toggle('active', isActive);
                if (isActive) foundMatch = true;
            });
            // If it's a custom color, ensure the custom wrapper feels active and input matches
            if (!foundMatch) {
                customInput.value = color;
                customInput.previousElementSibling.classList.add('active');
            } else {
                customInput.previousElementSibling.classList.remove('active');
            }
        };

        // Load initial state
        chrome.storage.local.get('settings', (data) => {
            const color = data.settings?.accentColor || '#ff4e45';
            applySwatchActive(color);
        });

        // Predefined swatch clicks
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                customInput.value = color;
                applySwatchActive(color);
                
                // Trigger change event to save
                const event = new Event('change', { bubbles: true });
                customInput.dispatchEvent(event);
            });
        });

        // Custom picker clicks
        customInput.addEventListener('input', () => {
            applySwatchActive(customInput.value);
        });
    }

    initAccentColorSwatches();

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
        // Let's show the last 30 days.
        const daysToShow = 30;
        
        const dates = [];
        const today = new Date();
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }

        const keys = dates.map(date => `ypp_analytics_${date}`);
        const todayKey = `ypp_analytics_${today.toISOString().split('T')[0]}`;

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
                 const dayData = result[`ypp_analytics_${date}`];
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

        // Render Day Names Header
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        dayNames.forEach(d => {
             const headerCell = document.createElement('div');
             headerCell.className = 'calendar-day-name';
             headerCell.textContent = d;
             grid.appendChild(headerCell);
        });

        // Empty slots for start
        for (let i = 0; i < startingDay; i++) {
             const empty = document.createElement('div');
             empty.className = 'calendar-empty';
             grid.appendChild(empty);
        }

        // Fetch data for the whole month
        const dateKeys = [];
        for (let i = 1; i <= daysInMonth; i++) {
             const d = new Date(year, month, i);
             // handle timezone offset issue by manually formatting
             const dayString = `${year}-${String(month + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
             dateKeys.push(`ypp_analytics_${dayString}`);
        }

        chrome.storage.local.get(dateKeys, (result) => {
             for (let i = 1; i <= daysInMonth; i++) {
                 const dayString = `${year}-${String(month + 1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                 const data = result[`ypp_analytics_${dayString}`];
                 
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
                     
                     // Update Top Display
                     const topTime = document.getElementById('history-today-time');
                     const topLabel = document.querySelector('.daily-stat .label');
                     
                     let seconds = 0;
                     if (data) {
                         if (typeof data === 'number') seconds = data;
                         else if (data.totalSeconds) seconds = data.totalSeconds;
                     }
                     
                     const h = Math.floor(seconds / 3600);
                     const m = Math.floor((seconds % 3600) / 60);
                     if (topTime) {
                         topTime.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
                     }
                     
                     if (topLabel) {
                         const todayStr = new Date().toISOString().split('T')[0];
                         if (dayString === todayStr) {
                             topLabel.textContent = "TODAY'S WATCH TIME";
                         } else {
                             const d = new Date(year, month, i);
                             const formatted = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
                             topLabel.textContent = `${formatted.toUpperCase()} WATCH TIME`;
                         }
                     }
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

        // --- Cloud Backup UI ---
        const btnBackupUp = document.getElementById('btnBackupUp');
        const btnBackupDown = document.getElementById('btnBackupDown');
        const lastSyncTimeLabel = document.getElementById('lastSyncTimeLabel');

        const updateLastSyncLabel = (timeStr) => {
            if (!lastSyncTimeLabel) return;
            if (!timeStr) {
                lastSyncTimeLabel.textContent = "Last sync: Never";
                return;
            }
            const date = new Date(timeStr);
            const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            lastSyncTimeLabel.textContent = `Last sync: ${formatted}`;
        };

        chrome.storage.local.get('ypp_last_sync_time', (data) => {
            if (data.ypp_last_sync_time) updateLastSyncLabel(data.ypp_last_sync_time);
        });

        if (btnBackupUp) {
            btnBackupUp.addEventListener('click', () => {
                const originalText = btnBackupUp.innerHTML;
                btnBackupUp.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg> Backing up...';
                btnBackupUp.style.pointerEvents = 'none';
                
                chrome.runtime.sendMessage({ action: 'SYNC_BACKUP_UP' }, (response) => {
                    btnBackupUp.style.pointerEvents = 'auto';
                    if (response && response.success) {
                        btnBackupUp.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Success!';
                        updateLastSyncLabel(response.timestamp);
                        setTimeout(() => btnBackupUp.innerHTML = originalText, 2000);
                    } else {
                        btnBackupUp.innerHTML = 'Error!';
                        setTimeout(() => btnBackupUp.innerHTML = originalText, 2000);
                        alert("Backup failed. Please ensure you are signed into Chrome.");
                    }
                });
            });
        }

        if (btnBackupDown) {
            btnBackupDown.addEventListener('click', () => {
                const originalText = btnBackupDown.innerHTML;
                btnBackupDown.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-6.219-8.56"></path></svg> Restoring...';
                btnBackupDown.style.pointerEvents = 'none';

                chrome.runtime.sendMessage({ action: 'SYNC_BACKUP_DOWN' }, (response) => {
                    btnBackupDown.style.pointerEvents = 'auto';
                    if (response && response.success) {
                        btnBackupDown.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Restored!';
                        if (response.timestamp) updateLastSyncLabel(response.timestamp);
                        setTimeout(() => btnBackupDown.innerHTML = originalText, 2000);
                        // Optional: trigger settings reload so popup updates
                        setTimeout(() => loadSettings(), 500);
                    } else {
                        btnBackupDown.innerHTML = 'Error!';
                        setTimeout(() => btnBackupDown.innerHTML = originalText, 2000);
                        alert("Restore failed. No backup found or authentication error.");
                    }
                });
            });
        }
    }

    // --- CUSTOMIZATION POPUP PREVIEW ---

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
        const root = document.documentElement.style;
        const sec = `color-mix(in srgb, ${hex} 55%, #a855f7)`;
        root.setProperty('--accent-primary', hex);
        root.setProperty('--accent-secondary', sec);
        root.setProperty('--red', hex);
        root.setProperty('--accent-glow', hex + '66');
        root.setProperty('--accent-glow-sm', hex + '38');
        root.setProperty('--red-dim', hex + '24');
        root.setProperty('--red-glow', hex + '66');
        const grad = `linear-gradient(135deg, ${hex} 0%, ${sec} 100%)`;
        root.setProperty('--accent-gradient', grad);
        root.setProperty('--accent-grad', grad);
    }

    // Load & apply saved customization values on startup
    chrome.storage.local.get(['settings'], (result) => {
        const s = result.settings || {};
        if (s.fontFamily) applyFontFamily(s.fontFamily);
        if (s.densityMode) applyDensity(s.densityMode);
        if (s.cardStyle) document.documentElement.setAttribute('data-card-style', s.cardStyle);
        if (s.accentColor) applyAccentColor(s.accentColor);
        
        // Disable animations class based on reducedMotion
        if (s.enableAnimations === false) {
            document.documentElement.classList.add('ypp-no-animations');
        }
        if (s.reducedMotion) {
            document.documentElement.classList.add('ypp-reduced-motion');
        }
    });

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

    // --- MODE CARD ACTIVE STATE SYNC ---
    const modeCardIds = [
        'zenMode', 'cinemaMode', 'studyMode', 'enableFocusMode',
        'minimalMode', 'ambientMode', 'audioModeEnabled'
    ];

    const syncModeCards = () => {
        modeCardIds.forEach(id => {
            const checkbox = document.getElementById(id);
            const card = document.getElementById('modeCard-' + id);
            if (checkbox && card) {
                card.classList.toggle('mode-active', checkbox.checked);
            }
        });
    };

    // Wire change listeners on each mode checkbox to also update card styling
    modeCardIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', syncModeCards);
        }
    });


    // --- PRESET ACTIONS ---
    const applyPresetFromUI = (updates) => {
        Object.keys(updates).forEach(key => {
            const el = document.getElementById(key);
            if (el && el.type === 'checkbox') {
                el.checked = updates[key];
                el.dispatchEvent(new Event('change'));
            }
        });
        saveSettings();
    };

    document.getElementById('presetFocus')?.addEventListener('click', (e) => {
        e.stopPropagation();
        applyPresetFromUI({ enableFocusMode: true, hideComments: true, minimalMode: false, cinemaMode: false, zenMode: false });
    });
    
    document.getElementById('presetResearch')?.addEventListener('click', (e) => {
        e.stopPropagation();
        applyPresetFromUI({ enableFocusMode: false, searchGrid: true, hideComments: false, minimalMode: false, cinemaMode: false, zenMode: false });
    });
    
    document.getElementById('presetMinimal')?.addEventListener('click', (e) => {
        e.stopPropagation();
        applyPresetFromUI({ minimalMode: true, enableFocusMode: false, cinemaMode: false, zenMode: false });
    });

    // --- BACKUP TOOLS ---
    function initBackupTools() {
        const btnUp = document.getElementById('btnBackupUp');
        const btnDown = document.getElementById('btnBackupDown');
        const label = document.getElementById('lastSyncTimeLabel');
        
        if (!btnUp || !btnDown || !label) return;

        const updateLabel = () => {
            chrome.storage.local.get(['ypp_last_sync'], (result) => {
                if (result.ypp_last_sync) {
                    const d = new Date(result.ypp_last_sync);
                    label.textContent = 'Last sync: ' + d.toLocaleString();
                } else {
                    label.textContent = 'Last sync: Never';
                }
            });
        };
        updateLabel();

        btnUp.addEventListener('click', () => {
            btnUp.disabled = true;
            btnUp.textContent = 'Backing up...';
            chrome.runtime.sendMessage({ action: 'SYNC_BACKUP_UP' }, (response) => {
                btnUp.disabled = false;
                btnUp.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Backup';
                if (response && response.success) {
                    chrome.storage.local.set({ ypp_last_sync: Date.now() }, updateLabel);
                    alert('Backup successful!');
                } else {
                    alert('Backup failed: ' + (response?.error || 'Unknown error. Check Google Drive setup.'));
                }
            });
        });

        btnDown.addEventListener('click', () => {
            if (!confirm('This will OVERWRITE your current local data with the Google Drive backup. Proceed?')) return;
            
            btnDown.disabled = true;
            btnDown.textContent = 'Restoring...';
            chrome.runtime.sendMessage({ action: 'SYNC_BACKUP_DOWN' }, (response) => {
                btnDown.disabled = false;
                btnDown.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Restore';
                if (response && response.success) {
                    chrome.storage.local.set({ ypp_last_sync: Date.now() }, updateLabel);
                    alert('Restore successful! Please refresh YouTube tabs.');
                } else {
                    alert('Restore failed: ' + (response?.error || 'Unknown error. Check Google Drive setup.'));
                }
            });
        });
    }

    // --- BOOKMARKS MANAGER ---
    function initBookmarksManager() {
        const listEl = document.getElementById('bookmarksList');
        const searchInput = document.getElementById('bookmarkSearchInput');
        if (!listEl) return;

        let allBookmarks = [];

        const renderBookmarks = (filter = '') => {
            const filtered = allBookmarks.filter(b => 
                (b.videoTitle || '').toLowerCase().includes(filter) ||
                (b.text || '').toLowerCase().includes(filter)
            );

            if (filtered.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state" style="text-align:center; padding: 40px 20px; color:rgba(255,255,255,0.5);">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px; height:48px; margin-bottom:10px; opacity:0.5; display: block; margin: 0 auto 10px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                       <div style="font-size:14px; font-weight:500;">No bookmarks found</div>
                    </div>`;
                return;
            }

            listEl.innerHTML = '';
            filtered.forEach(bm => {
                const date = new Date(bm.createdAt).toLocaleDateString();
                const card = document.createElement('div');
                card.className = 'bookmark-card';
                card.innerHTML = `
                    <div class="bookmark-header">
                        <div style="flex:1;">
                            <div class="bookmark-title">${bm.videoTitle}</div>
                            <span class="bookmark-time">${Utils.formatTime(bm.timestamp)}</span>
                        </div>
                        <button class="bookmark-delete" data-id="${bm.id}" title="Delete Bookmark">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                        </button>
                    </div>
                    <div class="bookmark-text">"${bm.text}"</div>
                    <div class="bookmark-date">${date}</div>
                `;

                // Click card to open video at timestamp
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.bookmark-delete')) return;
                    const url = `https://www.youtube.com/watch?v=${bm.videoId}&t=${Math.floor(bm.timestamp)}s`;
                    chrome.tabs.create({ url });
                });

                // Delete button
                const delBtn = card.querySelector('.bookmark-delete');
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this bookmark?')) {
                        allBookmarks = allBookmarks.filter(b => b.id !== bm.id);
                        chrome.storage.local.set({ ypp_bookmarks: allBookmarks }, () => {
                            renderBookmarks(searchInput ? searchInput.value.toLowerCase().trim() : '');
                        });
                    }
                });

                listEl.appendChild(card);
            });
        };

        // Load bookmarks
        const loadBookmarks = () => {
            chrome.storage.local.get(['ypp_bookmarks'], (result) => {
                allBookmarks = result.ypp_bookmarks || [];
                renderBookmarks();
            });
        };

        // Listen for tab switch to bookmarks
        const tabs = document.querySelectorAll('.nav-item[data-tab]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.tab === 'bookmarks') {
                    loadBookmarks();
                }
            });
        });

        // Search listener
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderBookmarks(e.target.value.toLowerCase().trim());
            });
        }

        // Initial load if we start on bookmarks tab
        if (document.getElementById('tab-bookmarks').classList.contains('active')) {
            loadBookmarks();
        }
    }

    // Initialize
    loadSettings();
    // Sync cards after a short microtask delay to allow storage callback to fill values
    setTimeout(syncModeCards, 120);
    initHistoryWidget(); // Initialize history widget on load
    initBackupTools();
    initBookmarksManager();
});
