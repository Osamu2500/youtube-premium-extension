document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITIES ---
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const handleError = (context, error) => {
        console.error(`[YPP:${context}]`, error);
        // Optional: Show a toast or UI indication of error
    };

    // --- TAB NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    const titles = {
        'global': 'Global Theme',
        'navigation': 'Navigation',
        'feed': 'Feed & Search', // Combined tab title
        'player': 'Player Tools',
        'focus': 'Focus Mode',
        'settings': 'Extension Settings'
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
        'navTrending',
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
        'hideShorts', // Global/Home

        // Search
        'searchGrid',
        'cleanSearch',
        'hideSearchShorts',
        // 'shortsAutoScroll' removed from HTML for simplicity, or re-add if needed

        // Player
        'autoQuality',
        'enableRemainingTime',
        'volumeBoost',
        'enableCustomSpeed',
        'enableCinemaFilters',
        'snapshotBtn',
        'loopBtn',
        'enablePiP',
        
        // Modes
        'zenMode',
        'studyMode',
        'autoCinema',
        
        // Focus / Distractions
        'enableFocusMode',
        'hideComments',
        'hideEndScreens',
        'hideCards',
        'hideMerch',
        'redirectShorts'
    ];

    // --- STORAGE HANDLING ---
    
    // Load Settings
    const loadSettings = () => {
        try {
            chrome.storage.local.get('settings', (data) => {
                if (chrome.runtime.lastError) {
                    handleError('LOAD', chrome.runtime.lastError);
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

                updateDependencyUI();
            });
        } catch (e) {
            handleError('LOAD_CRITICAL', e);
        }
    };

    // Save Settings (Debounced)
    const saveSettings = debounce(() => {
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
                    handleError('SAVE', chrome.runtime.lastError);
                } else {
                    // console.log('[YPP] Settings saved'); 
                }
            });
        } catch (e) {
            handleError('SAVE_CRITICAL', e);
        }
    }, 300); // 300ms debounce

    // --- ELEMENT CACHE ---
    const elements = {};
    settingKeys.forEach(key => {
        elements[key] = document.getElementById(key);
    });

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

    // Initialize
    loadSettings();
});
