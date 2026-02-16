/**
 * Service Worker for YouTube Premium Plus
 * Handles background tasks including timer logic and initial setup
 */

const ALARM_NAME = 'ypp-focus-timer';

/**
 * Default settings for the extension
 * @constant
 * @type {Object}
 */
const DEFAULT_SETTINGS = {
    // Theme
    premiumTheme: true,
    activeTheme: 'default',
    trueBlack: false,
    hideScrollbar: false,
    customProgressBar: false,
    progressBarColor: '#ff0000',

    // Layout
    grid4x4: true,

    // Visibility
    hideShorts: false,
    hideSearchShorts: true,
    hideMixes: false,
    hideWatched: false,
    hideMerch: false,
    hideComments: false,
    hideEndScreens: false,
    hookFreeHome: false,

    // Player
    autoCinema: false,
    blueProgress: false,
    enablePiP: true,
    enableTranscript: true,
    enableSnapshot: true,
    enableLoop: true,

    // Search Redesign
    searchGrid: true,
    cleanSearch: true,

    // Navigation
    navTrending: true,
    navShorts: true,
    navSubscriptions: true,
    navWatchLater: true,
    navPlaylists: true,
    navHistory: true,
    forceHideSidebar: false,

    // Shorts Tools
    shortsAutoScroll: false,
    redirectShorts: false,

    // Player Tools
    enableCustomSpeed: true,
    enableCinemaFilters: true,
    filterBrightness: 100,
    filterContrast: 100,

    // Ad Skipper
    adSkipper: true,

    // Zen Mode
    zenMode: false,

    // Focus Mode
    dopamineDetox: false,
    enableFocusMode: false,
    cinemaMode: false,
    minimalMode: false,
    
    // New Features
    ambientMode: false,
    audioModeEnabled: false,
    videoControlsEnabled: true,
    miniPlayer: false,
    enableVideoFilters: false,
    reversePlaylist: false,
    playlistDuration: true,

    // Study Mode
    studyMode: false,

    // Other
    autoQuality: false,
    enableRemainingTime: false
};

// =========================================================================
// TIMER LOGIC (Robust End-Time Based)
// =========================================================================

/**
 * Start a focus timer
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Promise<void>}
 */
async function startTimer(durationMinutes = 25) {
    try {
        const endTime = Date.now() + (durationMinutes * 60 * 1000);

        await chrome.storage.local.set({
            timerState: { isRunning: true, endTime: endTime, duration: durationMinutes }
        });

        chrome.alarms.create(ALARM_NAME, { when: endTime });
    } catch (error) {
        console.error('[YPP] Error starting timer:', error);
    }
}

/**
 * Stop the focus timer
 * @returns {Promise<void>}
 */
async function stopTimer() {
    try {
        await chrome.storage.local.set({
            timerState: { isRunning: false, endTime: null, duration: 25 }
        });
        chrome.alarms.clear(ALARM_NAME);
    } catch (error) {
        console.error('[YPP] Error stopping timer:', error);
    }
}

/**
 * Handle alarm events
 */
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        stopTimer();
        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'src/assets/icon.svg',
                title: 'Focus Session Complete',
                message: 'Great job! Take a break.',
                priority: 2
            });
        } catch (error) {
            console.error('[YPP] Error creating notification:', error);
        }
    }
});

// =========================================================================
// MESSAGE HANDLERS
// =========================================================================

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_SETTINGS') {
        chrome.storage.local.get('settings', (data) => {
            try {
                sendResponse(data.settings || DEFAULT_SETTINGS);
            } catch (error) {
                console.error('[YPP] Error getting settings:', error);
                sendResponse(DEFAULT_SETTINGS);
              }
        });
        return true;
    }

    if (request.action === 'getTimer') {
        chrome.storage.local.get('timerState', (data) => {
            try {
                const state = data.timerState || { isRunning: false, endTime: null };
                let timeLeft = 0;
                if (state.isRunning && state.endTime) {
                    timeLeft = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
                    // If time is up but alarm hasn't fired/cleared yet (rare race condition), consider it done
                    if (timeLeft === 0) {
                        stopTimer();
                        state.isRunning = false;
                    }
                }
                sendResponse({ isRunning: state.isRunning, timeLeft });
            } catch (error) {
                console.error('[YPP] Error getting timer state:', error);
                sendResponse({ isRunning: false, timeLeft: 0 });
            }
        });
        return true;
    }

    if (request.action === 'startTimer') {
        startTimer().then(() => sendResponse({ success: true }))
            .catch((error) => {
                console.error('[YPP] Error in startTimer message handler:', error);
                sendResponse({ success: false });
            });
        return true;
    }

    if (request.action === 'stopTimer') {
        stopTimer().then(() => sendResponse({ success: true }))
            .catch((error) => {
                console.error('[YPP] Error in stopTimer message handler:', error);
                sendResponse({ success: false });
            });
        return true;
    }

    if (request.action === 'resetTimer') {
        stopTimer().then(() => sendResponse({ success: true }))
            .catch((error) => {
                console.error('[YPP] Error in resetTimer message handler:', error);
                sendResponse({ success: false });
            });
        return true;
    }
});

// =========================================================================
// INITIALIZATION
// =========================================================================

/**
 * Initialize default settings on extension install
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        console.log('[YPP] Service Worker Installed:', details.reason);
        const data = await chrome.storage.local.get('settings');
        const newSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        await chrome.storage.local.set({ settings: newSettings });
        console.log('[YPP] Settings initialized successfully');
    } catch (error) {
        console.error('[YPP] Error initializing settings:', error);
        // Fallback: Try to set defaults anyway
        try {
            await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
        } catch (fallbackError) {
            console.error('[YPP] Critical: Could not initialize settings:', fallbackError);
        }
    }
});
