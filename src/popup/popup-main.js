import '../content/config/constants.js';
import '../content/config/settings-schema.js';
import '../content/config/utils.js';

import { initStorage, loadSettings, state, saveSettings, updateSetting, notifyThemeChange } from './popup-state.js';
import * as UI from './popup-ui.js';
import { initComponents } from './popup-components.js';
import { initHistoryWidget, initBackupTools, initBookmarksManager } from './popup-extras.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        // 1. Initialize State (cache DOM elements)
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
    components.initSidebarLayoutToggle();
    components.initHideWatchedModePill();
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

    ['ambientIntensity', 'ambientBlur', 'blueLight', 'dim', 'homeColumns', 'searchColumns', 'channelColumns', 'subscriptionsColumns', 'watchTimeAlertHours', 'hideWatchedThreshold'].forEach(key => {
        const slider = state.elements[key];
        const display = document.getElementById(key + 'Value');
        if (slider) {
            slider.addEventListener('input', () => {
                if (display) {
                     if (key.includes('Columns')) {
                         display.textContent = slider.value;
                     } else if (key === 'watchTimeAlertHours') {
                         display.textContent = slider.value + 'h';
                     } else {
                         display.textContent = slider.value + '%';
                     }
                }
                
                if (key.includes('Columns') && state.elements['autoScaleLayout'] && state.elements['autoScaleLayout'].checked) {
                    state.elements['autoScaleLayout'].checked = false;
                }
                saveSettings(() => UI.showSaveIndicator(document));
            });
        }
    });

    ['fontScale', 'thumbRadius', 'sidebarOpacity'].forEach(id => {
        const el = document.getElementById(id);
        const suffix = id === 'fontScale' || id === 'sidebarOpacity' ? '%' : 'px';
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
    } catch (e) {
        document.body.innerHTML = `<div style="color:red; padding:20px; font-size:16px;">Error initializing popup: ${e.message}<br><pre>${e.stack}</pre></div>`;
    }
});
