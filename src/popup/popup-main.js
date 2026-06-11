import '../content/config/constants.js';
import '../content/config/settings-schema.js';
import '../content/config/utils.js';

import { initStorage, loadSettings, state, saveSettings, updateSetting, notifyThemeChange } from './popup-state.js';
import * as UI from './popup-ui.js';
import { initComponents } from './popup-components.js';
import { initHistoryWidget, initBackupTools, initBookmarksManager } from './popup-extras.js';
import { renderSchema } from './popup-renderer.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
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
    const _removeSkeleton = () => document.body.classList.remove('popup-loading');
    // Remove after settings load (loadSettings triggers callbacks synchronously via chrome.storage)
    // We hook into it by appending our callback after the first loadSettings call above
    loadSettings([_removeSkeleton]);

    // ── 5.4: First-run onboarding banner ─────────────────────────────────
    chrome.storage.local.get('settings', (data) => {
        const settings = data.settings || {};
        if (settings.hasSeenOnboarding) return;

        const banner = document.createElement('div');
        banner.className = 'ypp-onboarding-banner';
        banner.innerHTML = `
            <div class="ypp-onboarding-icon">🚀</div>
            <div class="ypp-onboarding-body">
                <p class="ypp-onboarding-title">Welcome to YouTube Premium+</p>
                <p class="ypp-onboarding-desc">
                    You have <strong>50+ features</strong> ready to use — SponsorBlock, Ambient Mode,
                    Bookmark Highlights, Subscription Folders, and much more. Open the popup to explore!
                </p>
                <div class="ypp-onboarding-actions">
                    <button class="ypp-onboarding-btn ypp-onboarding-btn-primary" id="yppOnboardingOpen">Open Settings</button>
                    <button class="ypp-onboarding-btn ypp-onboarding-btn-dismiss" id="yppOnboardingDismiss">Got it</button>
                </div>
            </div>
            <button class="ypp-onboarding-close" id="yppOnboardingClose" title="Dismiss">✕</button>`;
        document.body.appendChild(banner);

        // Animate in
        requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));

        const _dismiss = () => {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
            chrome.storage.local.get('settings', (d) => {
                const s = { ...(d.settings || {}), hasSeenOnboarding: true };
                chrome.storage.local.set({ settings: s });
            });
        };

        document.getElementById('yppOnboardingClose')?.addEventListener('click', _dismiss);
        document.getElementById('yppOnboardingDismiss')?.addEventListener('click', _dismiss);
        document.getElementById('yppOnboardingOpen')?.addEventListener('click', () => {
            chrome.runtime.openOptionsPage?.() ?? chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
            _dismiss();
        });

        // Auto-dismiss after 18 seconds
        setTimeout(_dismiss, 18000);
    });

    } catch (e) {
        document.body.innerHTML = `<div style="color:red; padding:20px; font-size:16px;">Error initializing popup: ${e.message}<br><pre>${e.stack}</pre></div>`;
    }
});
