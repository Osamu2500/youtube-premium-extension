import '../content/config/constants.js';
import '../content/config/settings-schema.js';
import '../content/config/utils.js';

import { initStorage, loadSettings, state, saveSettings, updateSetting, notifyThemeChange } from './popup-state.js';
import * as UI from './popup-ui.js';
import { initComponents } from './popup-components.js';
import { initHistoryWidget, initBackupTools, initBookmarksManager } from './popup-extras.js';
import { renderSchema, registerSlot } from './popup-renderer.js';

// --- Register Custom Slots ---
registerSlot('vsc_shortcuts_manager', (container, state) => {
    container.innerHTML = `
        <div class="vsc-shortcuts-header" style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:12px; opacity:0.7;">
            <span style="flex:2">Action</span>
            <span style="flex:1">Key</span>
            <span style="flex:1">Value</span>
            <span style="width:24px"></span>
        </div>
        <div id="vsc-shortcuts-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;"></div>
        <button id="vsc-add-shortcut" class="ypp-btn" style="width:100%; padding:8px; border-radius:8px; background:var(--bg-card); color:var(--text-primary); border:1px solid rgba(255,255,255,0.1); cursor:pointer;">+ Add Shortcut</button>
    `;

    const listContainer = container.querySelector('#vsc-shortcuts-list');
    const addBtn = container.querySelector('#vsc-add-shortcut');

    const ACTIONS = {
        showHide: 'Show/hide controller',
        decrease: 'Decrease speed',
        increase: 'Increase speed',
        rewind: 'Rewind',
        advance: 'Advance',
        reset: 'Reset speed',
        preferred: 'Preferred speed',
        mute: 'Mute',
        decreaseVolume: 'Decrease volume',
        increaseVolume: 'Increase volume',
        pause: 'Pause',
        setMarker: 'Set marker',
        jumpMarker: 'Jump to marker'
    };

    const renderList = (shortcuts) => {
        listContainer.innerHTML = '';
        shortcuts.forEach((sc, index) => {
            const row = document.createElement('div');
            row.className = 'vsc-shortcut-row';
            row.style.cssText = 'display:flex; gap:8px; align-items:center; background:rgba(0,0,0,0.2); padding:6px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);';

            const select = document.createElement('select');
            select.className = 'theme-select'; // inherit option dark background from CSS
            select.style.cssText = 'flex:2; background:var(--bg-dark); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px; font-size:12px; outline:none;';
            for (const [val, label] of Object.entries(ACTIONS)) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = label;
                opt.style.background = '#1a1a1a'; // Force dark background as fallback
                opt.style.color = '#ffffff';
                if (sc.action === val) opt.selected = true;
                select.appendChild(opt);
            }
            
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.value = sc.key || '';
            keyInput.placeholder = 'None';
            keyInput.style.cssText = 'flex:1; width:10px; background:var(--bg-dark); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px; font-size:12px; text-align:center; text-transform:uppercase; outline:none;';
            
            keyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') return; // Let tab navigate naturally
                e.preventDefault();
                
                const keys = [];
                if (e.ctrlKey) keys.push('Ctrl');
                if (e.altKey) keys.push('Alt');
                if (e.shiftKey) keys.push('Shift');
                if (e.metaKey) keys.push('Meta');
                
                let keyName = e.key;
                if (e.shiftKey) {
                    const shiftMap = { '<': ',', '>': '.', ':': ';', '"': "'", '{': '[', '}': ']', '|': '\\', '?': '/', '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=' };
                    if (shiftMap[keyName]) keyName = shiftMap[keyName];
                }
                if (keyName === ' ') keyName = 'Space';
                
                if (['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) {
                    keyInput.value = keys.join('+') + '+...';
                    return; // Wait for the actual key
                }
                
                keyName = keyName.length === 1 ? keyName.toUpperCase() : keyName;
                keys.push(keyName);
                const finalKey = keys.join('+');
                
                sc.key = finalKey;
                keyInput.value = finalKey;
                save();
            });

            const valInput = document.createElement('input');
            valInput.type = 'number';
            valInput.step = 'any';
            valInput.value = sc.value === null ? '' : sc.value;
            valInput.placeholder = 'N/A';
            valInput.style.cssText = 'flex:1; width:10px; background:var(--bg-dark); color:white; border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:4px; font-size:12px; outline:none;';
            
            const updateValDisabled = () => {
                const needsValue = ['decrease', 'increase', 'rewind', 'advance', 'reset', 'preferred'].includes(sc.action);
                valInput.disabled = !needsValue;
                valInput.style.opacity = needsValue ? '1' : '0.3';
                if (!needsValue) valInput.value = '';
            };
            updateValDisabled();

            select.addEventListener('change', (e) => {
                sc.action = e.target.value;
                updateValDisabled();
                save();
            });

            valInput.addEventListener('input', (e) => {
                sc.value = parseFloat(e.target.value) || null;
                save();
            });

            const rmBtn = document.createElement('button');
            rmBtn.innerHTML = '✕';
            rmBtn.style.cssText = 'width:24px; height:24px; background:transparent; color:#ff4e45; border:none; border-radius:4px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;';
            rmBtn.addEventListener('click', () => {
                shortcuts.splice(index, 1);
                save();
                renderList(shortcuts);
            });

            row.appendChild(select);
            row.appendChild(keyInput);
            row.appendChild(valInput);
            row.appendChild(rmBtn);
            listContainer.appendChild(row);
        });
    };

    const save = () => {
        chrome.storage.local.get('settings', (data) => {
            const settings = data.settings || {};
            settings.vscShortcuts = currentShortcuts;
            chrome.storage.local.set({ settings });
            // Immediately notify the active tab so hotkeys update without reload
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'UPDATE_SETTINGS',
                        settings: { vscShortcuts: currentShortcuts }
                    });
                }
            });
        });
    };

    let currentShortcuts = [];
    chrome.storage.local.get('settings', (data) => {
        currentShortcuts = data.settings?.vscShortcuts || [
            { action: 'showHide', key: 'V', value: null },
            { action: 'decrease', key: 'Z', value: 0.25 },
            { action: 'increase', key: 'X', value: 0.25 },
            { action: 'rewind', key: 'W', value: 10 },
            { action: 'advance', key: 'E', value: 10 },
            { action: 'reset', key: 'A', value: 1.0 },
            { action: 'preferred', key: 'Q', value: 2.0 }
        ];
        renderList(currentShortcuts);
    });

    addBtn.addEventListener('click', () => {
        currentShortcuts.push({ action: 'showHide', key: '', value: null });
        save();
        renderList(currentShortcuts);
    });
});

registerSlot('shortcutsPanel', (container, state) => {
    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
            <div style="font-size:12px; color:rgba(255,255,255,0.5);">Click an input to map a new shortcut:</div>
            <div id="shortcutsList" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;"></div>
        </div>
    `;
    const list = container.querySelector('#shortcutsList');
    
    const svgIcon = (path) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

    const shortcuts = [
        { id: 'shortcut_zenMode', label: 'Toggle Zen Mode', icon: svgIcon('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6') },
        { id: 'shortcut_focusMode', label: 'Toggle Focus Mode', icon: svgIcon('M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7') },
        { id: 'shortcut_cinemaMode', label: 'Toggle Cinema Mode', icon: svgIcon('M2 3h20v14H2zM8 21h8M12 17v4') },
        { id: 'shortcut_ambientMode', label: 'Toggle Ambient Mode', icon: svgIcon('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41') },
        { id: 'shortcut_snapshot', label: 'Take Snapshot', icon: svgIcon('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') },
        { id: 'shortcut_loop', label: 'Toggle Loop', icon: svgIcon('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z') },
        { id: 'shortcut_pip', label: 'Picture-in-Picture', icon: svgIcon('M3 3h18v14H3zM12 14h7v5h-7z') }
    ];

    shortcuts.forEach(sc => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex; flex-direction:column; align-items:flex-start; gap:6px; background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);';
        const labelWrap = document.createElement('div');
        labelWrap.style.cssText = 'display:flex; align-items:center; gap:6px; margin-bottom: 2px;';
        
        const iconWrap = document.createElement('div');
        iconWrap.style.cssText = 'display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.6);';
        iconWrap.innerHTML = sc.icon || '';
        
        const label = document.createElement('span');
        label.textContent = sc.label;
        label.style.cssText = 'font-size:11px; font-weight:500; color:rgba(255,255,255,0.8);';
        
        labelWrap.appendChild(iconWrap);
        labelWrap.appendChild(label);
        const input = document.createElement('input');
        input.type = 'text';
        input.id = sc.id;
        input.readOnly = true;
        input.style.cssText = 'background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.12); border-radius:6px; color:var(--text-1, #fff); font-family:monospace; font-size:11px; padding:4px 8px; width:100%; box-sizing:border-box; text-align:left; cursor:pointer; outline:none; transition:all 0.2s;';
        
        // Add to state so it saves automatically
        state.elements[sc.id] = input;
        if (!state.settingKeys.includes(sc.id)) state.settingKeys.push(sc.id);

        input.addEventListener('focus', () => {
            input.style.borderColor = 'var(--accent-primary, #3ea6ff)';
            input.value = 'Press key...';
        });

        input.addEventListener('blur', () => {
            input.style.borderColor = 'rgba(255,255,255,0.1)';
            // Reload value if canceled
            chrome.storage.local.get('settings', (res) => {
                input.value = res.settings?.[sc.id] || input.dataset.default || '';
            });
        });

        input.addEventListener('keydown', (e) => {
            e.preventDefault();
            if (e.key === 'Escape') {
                input.blur();
                return;
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
                input.value = '';
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.blur();
                return;
            }

            let keys = [];
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            if (e.metaKey) keys.push('Meta');
            
            let keyName = e.key;
            if (e.shiftKey) {
                const shiftMap = { '<': ',', '>': '.', ':': ';', '"': "'", '{': '[', '}': ']', '|': '\\', '?': '/', '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=' };
                if (shiftMap[keyName]) keyName = shiftMap[keyName];
            }
            if (keyName === ' ') keyName = 'Space';
            
            // Ignore if ONLY a modifier is pressed
            if (['Control','Shift','Alt','Meta'].includes(keyName)) return;
            
            keyName = keyName.length === 1 ? keyName.toUpperCase() : keyName;
            keys.push(keyName);
            
            const combo = keys.join('+');
            input.value = combo;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
        });

        row.appendChild(labelWrap);
        row.appendChild(input);
        list.appendChild(row);
    });
});

const initApp = () => {
    try {
        // 0. i18n Initialization
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
            if (msg) el.textContent = msg;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const msg = chrome.i18n.getMessage(el.getAttribute('data-i18n-placeholder'));
            if (msg) el.setAttribute('placeholder', msg);
        });

        // 1. v3.1: Render schema-driven tabs before settings hydration
    renderSchema(document, state);

    // 1.5 Initialize State (cache DOM elements)
    initStorage(document);

    // 2. Initialize Core UI (Tabs, Modals, Global Search)
    UI.initUI(document);

    // 3. Setup Components
    const components = initComponents(document, state, UI, updateSetting, notifyThemeChange, () => saveSettings(() => UI.showSaveIndicator(document)));

    // 4. Load Settings & Update UI
    loadSettings([
        (settings) => components.initThemeSelector(settings.activeTheme),
        (settings) => UI.updateDependencyUI(document),
        (settings) => UI.updateCustomizationPreview(document, state),
        (settings) => UI.syncModeCards(document)
    ]);

    components.initPremiumAccentDropdown();
    components.initSearchViewMode();
    components.initHideWatchedModePill();
    components.initCardStyleGrid();
    components.initAccentColorSwatches();

    // 5. Wire Universal Event Listeners
    state.settingKeys.forEach(key => {
        const el = state.elements[key];
        if (el) {
            el.addEventListener('change', () => {
                saveSettings(() => UI.showSaveIndicator(document));
                UI.updateDependencyUI(document);
                UI.updateCustomizationPreview(document, state);
                UI.syncModeCards(document);
                
                if (el.type === 'checkbox' && window.anime) {
                    const toggleCard = el.closest('.toggle-card') || el.closest('.mode-card');
                    if (toggleCard) {
                        window.anime.animate({
                            targets: toggleCard,
                            scale: [0.97, 1],
                            duration: 400,
                            easing: 'easeOutElastic(1, .6)'
                        });
                    }
                    const slider = el.nextElementSibling;
                    if (slider && slider.classList.contains('slider')) {
                        window.anime.animate({
                            targets: slider,
                            scale: [0.85, 1],
                            duration: 400,
                            easing: 'easeOutElastic(1, .6)'
                        });
                    }
                }
            });
            if (el.type === 'color') {
                el.addEventListener('input', () => {
                    UI.updateDependencyUI(document);
                    UI.updateCustomizationPreview(document, state);
                    saveSettings(() => UI.showSaveIndicator(document));
                });
            }
        }
    });

    ['ambientIntensity', 'ambientBlur', 'blueLight', 'dim', 'homeColumns', 'searchColumns', 'channelColumns', 'subscriptionsColumns', 'watchTimeAlertHours', 'hideWatchedThreshold', 'autoLikeThreshold', 'intentionalDelayTime'].forEach(key => {
        const slider = state.elements[key];
        const display = document.getElementById(key + 'Value');
        if (slider) {
            slider.addEventListener('input', () => {
                if (display) {
                     display.textContent = slider.value;
                }
                
                if (key.includes('Columns') && state.elements['autoScaleLayout'] && state.elements['autoScaleLayout'].checked) {
                    state.elements['autoScaleLayout'].checked = false;
                }
                saveSettings(() => UI.showSaveIndicator(document));
            });
        }
    });

    ['fontScale'].forEach(id => {
        const el = document.getElementById(id);
        const suffix = '%';
        const disp = document.getElementById(id + 'Value');
        if (el) {
            el.addEventListener('input', () => {
                if (disp) disp.textContent = el.value + suffix;
                if (id === 'fontScale') {
                    document.documentElement.style.setProperty('--ui-font-scale', (el.value / 100).toFixed(2));
                }
                saveSettings(() => UI.showSaveIndicator(document));
            });
        }
    });

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

    const manageSubsBtn = document.getElementById('manageSubsBtn');
    if (manageSubsBtn) {
        manageSubsBtn.addEventListener('click', () => {
             chrome.tabs.create({ url: 'https://www.youtube.com/feed/subscriptions' });
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
             const defaultSettings = (window.YPP && window.YPP.CONSTANTS) 
                    ? window.YPP.CONSTANTS.DEFAULT_SETTINGS 
                    : {};
            if (confirm('Are you sure you want to reset all settings to default?')) {
                chrome.storage.local.set({ settings: defaultSettings }, () => {
                    loadSettings();
                });
            }
        });
    }

    const applyPresetFromUI = (updates) => {
        Object.keys(updates).forEach(key => {
            const el = document.getElementById(key);
            if (el && el.type === 'checkbox') {
                el.checked = updates[key];
                el.dispatchEvent(new Event('change'));
            }
        });
        saveSettings(() => UI.showSaveIndicator(document));
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

    // 6. Remaining Sub-systems
    initHistoryWidget();
    initBackupTools();
    initBookmarksManager();

    // ── 4.2: SponsorBlock per-category panel wiring ──────────────────────
    const sbToggle  = document.getElementById('sponsorBlock');
    const sbPanel   = document.getElementById('sponsorBlockCategories');
    const sbCatIds  = ['sb_sponsor','sb_intro','sb_selfpromo','sb_interaction','sb_music_offtopic','sb_preview'];
    if (sbToggle && sbPanel) {
        const _syncPanel = () => {
            sbPanel.style.display = sbToggle.checked ? 'block' : 'none';
        };
        sbToggle.addEventListener('change', () => {
            _syncPanel();
            saveSettings(() => UI.showSaveIndicator(document));
        });
        _syncPanel(); // run once after initial load
        sbCatIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => saveSettings(() => UI.showSaveIndicator(document)));
        });
    }

    // ── 5.2: Skeleton — remove popup-loading once settings are hydrated ──
    document.body.classList.add('popup-loading');
    const _removeSkeleton = () => {
        document.body.classList.remove('popup-loading');
        
        // Spring stagger intro animations
        if (window.anime) {
            window.anime.animate({
                targets: '.nav-item',
                translateX: [-20, 0],
                opacity: [0, 1],
                delay: window.anime.stagger(40),
                duration: 800,
                easing: 'easeOutElastic(1, .6)'
            });
            
            window.anime.animate({
                targets: '.tab-content.active .card-group, .tab-content.active .feature-grid > div',
                translateY: [20, 0],
                opacity: [0, 1],
                delay: window.anime.stagger(60, {start: 100}),
                duration: 800,
                easing: 'easeOutElastic(1, .7)'
            });
        }
    };
    // Remove after settings load (loadSettings triggers callbacks synchronously via chrome.storage)
    // We hook into it by appending our callback after the first loadSettings call above
    loadSettings([_removeSkeleton]);


    } catch (e) {
        document.body.innerHTML = `<div style="color:red; padding:20px; font-size:16px;">Error initializing popup: ${e.message}<br><pre>${e.stack}</pre></div>`;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
