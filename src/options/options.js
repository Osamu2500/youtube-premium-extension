document.addEventListener('DOMContentLoaded', async () => {
    // =========================================================================
    // 1. Navigation Logic
    // =========================================================================
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.settings-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // =========================================================================
    // 2. Load Settings — use the same storage key as the rest of the extension
    // =========================================================================
    const STORAGE_KEY = 'settings';

    // Load current settings from the service worker (authoritative source)
    let settings = {};
    try {
        settings = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Fallback: read directly from local storage
                    chrome.storage.local.get(STORAGE_KEY, (data) => {
                        resolve(data[STORAGE_KEY] || {});
                    });
                    return;
                }
                resolve(response || {});
            });
        });
    } catch (e) {
        console.warn('[YPP Options] Failed to load settings from service worker, using local fallback.', e);
        const data = await chrome.storage.local.get(STORAGE_KEY);
        settings = data[STORAGE_KEY] || {};
    }

    // =========================================================================
    // 3. Save a single setting via the service worker delta mechanism
    // =========================================================================
    let _saveTimeout = null;

    const saveSetting = (key, value) => {
        settings[key] = value;

        // Debounce: coalesce rapid toggles into a single write
        clearTimeout(_saveTimeout);
        _saveTimeout = setTimeout(() => {
            chrome.runtime.sendMessage(
                { action: 'UPDATE_SETTINGS_DELTA', delta: { [key]: value } },
                (response) => {
                    if (chrome.runtime.lastError) {
                        // Context invalidated — fall back to direct local write
                        chrome.storage.local.set({ [STORAGE_KEY]: settings });
                        return;
                    }
                    if (response && !response.success) {
                        console.warn('[YPP Options] Settings delta rejected:', response.error);
                    }
                }
            );
        }, 50);
    };

    // =========================================================================
    // 4. Bind inputs — read IDs from the DOM, resolve against loaded settings
    // =========================================================================
    const inputs = document.querySelectorAll('input[type="checkbox"], input[type="range"], select');

    inputs.forEach(input => {
        const key = input.id;
        if (!key) return; // Skip inputs with no ID

        const storedValue = settings[key];

        // Initialize UI state from settings
        if (input.type === 'checkbox') {
            // Only override the default if a stored value exists
            if (storedValue !== undefined) {
                input.checked = !!storedValue;
            }
        } else if (input.type === 'range') {
            if (storedValue !== undefined) {
                input.value = storedValue;
            }
        } else if (input.tagName === 'SELECT') {
            if (storedValue !== undefined) {
                input.value = storedValue;
            }
        }

        // Listen for changes and persist
        input.addEventListener('change', () => {
            let value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'range') {
                value = Number(input.value);
            } else {
                value = input.value;
            }
            saveSetting(key, value);
        });
    });
});
