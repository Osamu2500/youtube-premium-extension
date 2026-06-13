// Lazily resolve Utils so this module works even if utils.js is evaluated after popup-state.js.
const getUtils = () => window.YPP?.Utils || {
    log: (msg, tag = 'POPUP', level = 'log') => console[level]?.(`[YPP:${tag}] ${msg}`)
};

export const state = {
    elements: {},
    settingKeys: [],
    settings: {},
    _settingsWriteQueue: [],
    _isWritingSettings: false,
    isLoaded: false
};

export function initStorage(document) {
    const inputs = document.querySelectorAll('input[id]:not(#featureSearch), select[id]');
    inputs.forEach(el => {
        state.settingKeys.push(el.id);
        state.elements[el.id] = el;
    });
}

export function loadSettings(updateUICallbacks) {
    const Utils = getUtils();
    try {
        (async () => {
            let data;
            try {
                data = await chrome.storage.sync.get('settings');
            } catch (e) {
                Utils.log('Sync Storage Load Error: ' + e.message, 'POPUP', 'error');
            }
            if (!data || Object.keys(data).length === 0 || !data.settings) {
                data = await chrome.storage.local.get('settings');
            }

            const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                : {};
            
            state.settings = { ...defaultSettings, ...(data.settings || {}) };

            state.settingKeys.forEach(key => {
                const el = state.elements[key];
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = state.settings[key] !== undefined ? state.settings[key] : false;
                    } else if (el.type === 'range') {
                        el.value = state.settings[key] !== undefined ? state.settings[key] : el.value;
                        const display = document.getElementById(key + 'Value');
                        if (display) {
                            display.textContent = el.value;
                        }
                    } else if (el.type === 'color' || el.type === 'text' || el.type === 'select-one') {
                        el.value = state.settings[key] || '';
                    } else if (el.type === 'hidden') {
                        el.value = state.settings[key] || el.value;
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
                            document.querySelectorAll('.layout-card').forEach(c => {
                                const isActive = c.dataset.layout === layout;
                                c.style.borderColor = isActive ? 'var(--accent, rgba(62,166,255,0.5))' : 'rgba(255,255,255,0.08)';
                                c.style.background = isActive ? 'rgba(62,166,255,0.05)' : 'rgba(255,255,255,0.04)';
                            });
                        }
                    }
                }
            });

            state.isLoaded = true;

            if (updateUICallbacks) {
                updateUICallbacks.forEach(cb => cb(state.settings));
            }
        })();
    } catch (e) {
        Utils.log('Critical Load Error: ' + e.message, 'POPUP', 'error');
    }
}

export function gatherSettings() {
    const s = {};
    state.settingKeys.forEach(key => {
        const el = state.elements[key];
        if (el) {
            if (el.type === 'checkbox') {
                s[key] = el.checked;
            } else if (el.type === 'range') {
                s[key] = Number(el.value);
            } else {
                s[key] = el.value;
            }
        }
    });
    return s;
}

export function saveSettings(showIndicatorCb) {
    if (!state.isLoaded) return;
    const s = gatherSettings();
    state._settingsWriteQueue.push({ fullState: s });
    _processWriteQueue();
    if (showIndicatorCb) showIndicatorCb();
    sendPreviewUpdate();
}

const sendPreviewUpdate = (() => {
    let timer = null;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            const s = gatherSettings();
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'UPDATE_SETTINGS',
                        settings: s
                    });
                }
            });
        }, 10);
    };
})();

function _processWriteQueue() {
    const Utils = getUtils();
    if (state._isWritingSettings || state._settingsWriteQueue.length === 0) return;
    state._isWritingSettings = true;
    
    const updates = [...state._settingsWriteQueue];
    state._settingsWriteQueue = [];
    
    (async () => {
        let result = {};
        try {
            result = await chrome.storage.sync.get('settings');
            if (!result || !result.settings) {
                result = await chrome.storage.local.get('settings');
            }
        } catch (e) {
            result = await chrome.storage.local.get('settings');
        }

        const currentSettings = result.settings || {};
        
        updates.forEach(update => {
            if (update.fullState) {
                Object.assign(currentSettings, update.fullState);
            } else if (update.key) {
                currentSettings[update.key] = update.value;
            }
        });
        
        if (Object.keys(currentSettings).length < 2) {
             const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                : {};
             Object.assign(currentSettings, defaultSettings, currentSettings);
        }

        try {
            await chrome.storage.sync.set({ settings: currentSettings });
        } catch (e) {
            Utils.log('Sync Save Error: ' + e.message, 'POPUP', 'warn');
        }
        await chrome.storage.local.set({ settings: currentSettings });
        
        state._isWritingSettings = false;
        if (state._settingsWriteQueue.length > 0) {
            _processWriteQueue();
        }
    })();
}

export function queueSettingsWrite(payload) {
    state._settingsWriteQueue.push(payload);
    _processWriteQueue();
}

export function updateSetting(key, value) {
    queueSettingsWrite({ key, value });
}

export function notifyThemeChange(newTheme) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { 
                action: 'UPDATE_SETTINGS', 
                settings: { activeTheme: newTheme } 
            });
        }
    });
}
