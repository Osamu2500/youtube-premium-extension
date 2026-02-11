document.addEventListener('DOMContentLoaded', () => {
    // --- TAB NAVIGATION ---
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabs = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

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
                // Remove inline display style if present to let CSS handle it
                tab.style.display = '';
            } else {
                tab.classList.remove('active');
                tab.style.display = ''; // Clean up
            }
        });

        // Update Title
        const titles = {
            'global': 'Global Settings',
            'navigation': 'Navigation & Sidebar',
            'home': 'Home Layout',
            'search': 'Search & Filter',
            'player': 'Player & Watch',
            'settings': 'Extension Settings'
        };
        if (pageTitle) pageTitle.textContent = titles[tabId] || 'Settings';
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            if (tab) switchTab(tab);
        });
    });

    // --- SETTINGS LOGIC ---
    // All supported keys in the system - MATCHING HTML IDs
    const settingKeys = [
        // Global
        'premiumTheme',
        'trueBlack',
        'customProgressBar',
        'progressBarColor',
        'hideScrollbar',
        'blueProgress',

        // Content Control (Global)
        'hideShorts',
        'redirectShorts',

        // Navigation (NEW)
        'navTrending',
        'navShorts',
        'navSubscriptions',
        'navWatchLater',
        'navPlaylists',
        'navHistory',
        'forceHideSidebar',

        // Home
        'hookFreeHome',
        'hideMixes',
        'hideWatched',
        'grid4x4',

        // Watch / Player
        'autoQuality',
        'enableRemainingTime',
        'snapshotBtn',
        'loopBtn',
        'volumeBoost',
        'enablePiP', // Added back
        'enableTranscript', // Added back
        'zenMode',
        'studyMode',
        'autoCinema',

        // Distractions
        'enableFocusMode',
        'hideComments',
        'hideEndScreens',
        'hideSidebar',
        'hideMerch',
        'hideCards',

        // Search
        'searchGrid',
        'hideSearchShorts',
        'cleanSearch',
        'shortsAutoScroll', // New

        // New Player Features
        'enableCustomSpeed',
        'enableCinemaFilters'
    ];

    // Defaults from Shared Constants
    const defaultSettings = window.YPP.CONSTANTS.DEFAULT_SETTINGS;

    // Load Settings
    chrome.storage.local.get('settings', (data) => {
        if (chrome.runtime.lastError) {
            console.error('[YPP:POPUP] Storage Error:', chrome.runtime.lastError);
            return;
        }
        // Merge with defaults to ensure new keys exist
        const settings = { ...defaultSettings, ...(data.settings || {}) };

        settingKeys.forEach(key => {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = settings.hasOwnProperty(key) ? settings[key] : defaultSettings[key];
                } else if (el.type === 'color' || el.type === 'text') {
                    el.value = settings.hasOwnProperty(key) ? settings[key] : defaultSettings[key];
                }
            }
        });

        // Handle special dependencies if any (e.g. progressBarColor only if customProgressBar is checked)
        updateDependencyUI();
    });

    // Save on Change
    settingKeys.forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            el.addEventListener('change', () => {
                saveSettings(settingKeys);
                updateDependencyUI();
            });
        }
    });

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Reset all settings to default?')) {
                chrome.storage.local.set({ settings: defaultSettings }, () => {
                    settingKeys.forEach(key => {
                        const el = document.getElementById(key);
                        if (el) {
                            if (el.type === 'checkbox') el.checked = defaultSettings[key];
                            else el.value = defaultSettings[key];
                        }
                    });
                    updateDependencyUI();
                });
            }
        });
    }

    function updateDependencyUI() {
        // Example: Disable color picker if custom progress bar is off
        const customProgress = document.getElementById('customProgressBar');
        const colorPicker = document.getElementById('progressBarColor');
        if (customProgress && colorPicker) {
            colorPicker.disabled = !customProgress.checked;
            colorPicker.style.opacity = customProgress.checked ? '1' : '0.5';
        }
    }
});

function saveSettings(keys) {
    const settings = {};
    keys.forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            if (el.type === 'checkbox') {
                settings[key] = el.checked;
            } else {
                settings[key] = el.value;
            }
        }
    });
    console.log('[YPP:POPUP] Settings saved:', settings);
    chrome.storage.local.set({ settings });
}
