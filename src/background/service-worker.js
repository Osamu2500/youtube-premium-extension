/**
 * Service Worker for YouTube Premium Plus
 * Handles background tasks including timer logic and initial setup
 */
import { initContextMenu } from './context-menu.js';
import { syncUp, syncDown } from './drive-sync.js';


const ALARM_NAME = 'ypp-focus-timer';


import { DEFAULT_SETTINGS } from '../shared/default-settings.js';

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let broadcastTimeout = null;

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
        await chrome.alarms.clear(ALARM_NAME);
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
    const action = request.action || request.type;

    switch (action) {
        case 'GET_SETTINGS':
            (async () => {
                try {
                    let data = await chrome.storage.sync.get('settings');
                    if (!data || Object.keys(data).length === 0 || !data.settings) {
                        data = await chrome.storage.local.get('settings');
                    }
                    sendResponse(data.settings || DEFAULT_SETTINGS);
                } catch (error) {
                    console.error('[YPP] Error getting settings:', error);
                    sendResponse(DEFAULT_SETTINGS);
                }
            })();
            return true; // Indicate async response

        case 'UPDATE_SETTINGS_DELTA':
            (async () => {
                try {
                    // 1. Get current settings
                    let localData = await chrome.storage.local.get('settings');
                    let syncData = await chrome.storage.sync.get('settings');
                    const currentSettings = { ...(localData.settings || {}), ...(syncData.settings || {}) };
                    
                    // 2. Merge delta
                    const newSettings = { ...currentSettings, ...request.delta, lastUpdated: Date.now() };

                    // 3. Save
                    try {
                        await chrome.storage.sync.set({ settings: newSettings });
                    } catch (e) {
                        console.warn('[YPP] Sync storage full, falling back to local only', e);
                    }
                    await chrome.storage.local.set({ settings: newSettings });

                    // 4. Backup check
                    const backupData = await chrome.storage.local.get('ypp_backup_time');
                    const now = Date.now();
                    if (!backupData.ypp_backup_time || (now - backupData.ypp_backup_time > BACKUP_INTERVAL_MS)) {
                        if (Object.keys(currentSettings).length > 0) {
                            await chrome.storage.local.set({ 
                                ypp_settings_backup: currentSettings, // backup the pre-update state
                                ypp_backup_time: now
                            });
                            console.log('[YPP] Automated daily backup created.');
                        }
                    }

                    // 5. Broadcast update to all tabs
                    clearTimeout(broadcastTimeout);
                    broadcastTimeout = setTimeout(async () => {
                        const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: 'UPDATE_SETTINGS',
                                    settings: request.delta // Broadcast the delta or full state
                                }).catch(() => {}); // Ignore errors for inactive tabs
                            }
                        });
                    }, 250);

                    sendResponse({ success: true, settings: newSettings });
                } catch (error) {
                    console.error('[YPP] Error in UPDATE_SETTINGS_DELTA:', error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;

        case 'RESTORE_BACKUP':
            (async () => {
                try {
                    const backupData = await chrome.storage.local.get('ypp_settings_backup');
                    if (backupData.ypp_settings_backup) {
                        const restoredSettings = { ...backupData.ypp_settings_backup, lastUpdated: Date.now() };
                        try {
                            await chrome.storage.sync.set({ settings: restoredSettings });
                        } catch (e) {}
                        await chrome.storage.local.set({ settings: restoredSettings });
                        
                        // Broadcast update
                        const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" });
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: 'UPDATE_SETTINGS',
                                    settings: restoredSettings
                                }).catch(() => {});
                            }
                        });

                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: 'No backup found' });
                    }
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;

        case 'getTimer':
            chrome.storage.local.get('timerState').then((data) => {
                const state = data.timerState || { isRunning: false, endTime: null };
                let timeLeft = 0;
                
                if (state.isRunning && state.endTime) {
                    timeLeft = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
                    // If time is up but alarm hasn't fired/cleared yet (rare race condition), consider it done
                    if (timeLeft === 0) {
                        stopTimer(); // Fire-and-forget
                        state.isRunning = false;
                    }
                }
                sendResponse({ isRunning: state.isRunning, timeLeft });
            }).catch((error) => {
                console.error('[YPP] Error getting timer state:', error);
                sendResponse({ isRunning: false, timeLeft: 0 });
            });
            return true; // Indicate async response

        case 'startTimer':
        case 'stopTimer':
        case 'resetTimer': {
            let timerAction;
            if (action === 'startTimer') {
                timerAction = startTimer(request.duration);
            } else if (action === 'resetTimer') {
                // Reset: stop current timer, then restart with the requested duration
                timerAction = stopTimer().then(() => startTimer(request.duration || 25));
            } else {
                timerAction = stopTimer();
            }
            
            timerAction
                .then(() => sendResponse({ success: true }))
                .catch((error) => {
                    console.error(`[YPP] Error in ${action} message handler:`, error);
                    sendResponse({ success: false });
                });
            return true; // Indicate async response
        }

        case 'FETCH_API': {
            // Security: only allow HTTP and HTTPS requests to prevent
            // the content script from using this as a proxy to chrome-extension://,
            // file://, or other privileged schemes.
            let fetchUrl;
            try {
                fetchUrl = new URL(request.url);
            } catch (_) {
                sendResponse({ error: 'Invalid URL' });
                return true; // Keep channel open so sendResponse can fire
            }
            if (fetchUrl.protocol !== 'https:') {
                sendResponse({ error: `Disallowed URL scheme: ${fetchUrl.protocol}. Only HTTPS is permitted.` });
                return true; // Keep channel open so sendResponse can fire
            }
            
            const ALLOWED_DOMAINS = ['sponsor.ajay.app', 'returnyoutubedislikeapi.com'];
            if (!ALLOWED_DOMAINS.includes(fetchUrl.hostname)) {
                sendResponse({ error: `Disallowed domain: ${fetchUrl.hostname}.` });
                return true;
            }
            
            // Apply a 15-second timeout to prevent hanging promises
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            
            const fetchOptions = { ...request.options, signal: controller.signal };
            
            fetch(request.url, fetchOptions)
                .then((response) => response.json().then(data => ({ status: response.status, data })))
                .then((result) => sendResponse(result))
                .catch((error) => {
                    if (error.name === 'AbortError') {
                        sendResponse({ error: 'Request timed out after 15 seconds' });
                    } else {
                        sendResponse({ error: error.message });
                    }
                })
                .finally(() => clearTimeout(timeoutId));
                
            return true; // Indicate async response
        }

        case 'SYNC_BACKUP_UP': {
            syncUp().then(sendResponse);
            return true;
        }

        case 'SYNC_BACKUP_DOWN': {
            syncDown().then(sendResponse);
            return true;
        }

        case 'EXTRACT_COLOR': {
            (async () => {
                try {
                    if (typeof OffscreenCanvas === 'undefined') {
                        return sendResponse({ success: false, error: 'OffscreenCanvas not supported' });
                    }
                    const response = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
                    if (!response.ok) throw new Error('Fetch failed');
                    
                    const blob = await response.blob();
                    const bitmap = await createImageBitmap(blob);
                    
                    const size = 16;
                    let canvas;
                    try {
                        canvas = new OffscreenCanvas(size, size);
                    } catch (e) {
                        return sendResponse({ success: false, error: 'Failed to create OffscreenCanvas' });
                    }
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(bitmap, 0, 0, size, size);
                    
                    const imageData = ctx.getImageData(0, 0, size, size).data;
                    let r = 0, g = 0, b = 0, count = 0;
                    const skip = 4 * 3; // Sample every 3rd pixel
                    
                    for (let i = 0; i < imageData.length; i += skip) {
                        // Ignore pixels that are too dark (letterboxing)
                        if (imageData[i] > 15 || imageData[i + 1] > 15 || imageData[i + 2] > 15) {
                            r += imageData[i];
                            g += imageData[i + 1];
                            b += imageData[i + 2];
                            count++;
                        }
                    }
                    
                    bitmap.close();
                    
                    if (count > 0) {
                        r = Math.floor(r / count);
                        g = Math.floor(g / count);
                        b = Math.floor(b / count);
                        sendResponse({ success: true, r, g, b });
                    } else {
                        sendResponse({ success: false, error: 'No valid pixels' });
                    }
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true; // Keep message channel open for async response
        }

        default:
            // Unhandled actions can be ignored or logged
            return false;
    }
});

// =========================================================================
// INITIALIZATION
// =========================================================================

/**
 * Handle extension updates
 */
chrome.runtime.onUpdateAvailable.addListener(() => {
    chrome.runtime.reload();
});

/**
 * Initialize default settings on extension install
 * Safely merges new defaults without overwriting user data if a read failure occurs.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[YPP] Service Worker Installed:', details.reason);
    try {
        // Retrieve existing settings
        const localData = await chrome.storage.local.get('settings');
        const syncData = await chrome.storage.sync.get('settings');
        
        const existingSettings = { ...(localData.settings || {}), ...(syncData.settings || {}) };

        // Shallow merge defaults underneath existing user preferences
        const newSettings = { ...DEFAULT_SETTINGS, ...existingSettings };
        
        // Persist the consolidated settings
        try {
            await chrome.storage.sync.set({ settings: newSettings });
        } catch (e) {
            console.warn('[YPP] Sync storage full, falling back to local only', e);
        }
        await chrome.storage.local.set({ settings: newSettings });
        console.log('[YPP] Settings initialized and merged successfully (Sync + Local)');
        
        // Initialize Context Menu
        initContextMenu();
    } catch (error) {
        // IMPORTANT FIX: Never overwrite with defaults blindly if 'get' fails. 
        // A transient I/O error here would permanently delete the user's custom layout config.
        console.error('[YPP] Critical: Error initializing settings (aborted to prevent data loss):', error);
    }
});
