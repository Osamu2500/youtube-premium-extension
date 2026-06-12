/**
 * global-bar-external.js
 * ──────────────────────
 * Standalone entry point injected into ALL non-YouTube sites.
 * Boots GlobalBarUI + GlobalPlayerBar only.
 *
 * KEY: Everything is inside the async IIFE so the YPP namespace and
 * BaseFeature are defined BEFORE the feature modules evaluate.
 * Dynamic import() calls are inlined by Rollup (inlineDynamicImports: true)
 * but their execution is deferred to after the awaits, preserving correct order.
 */
(async () => {
    // ── Guard ────────────────────────────────────────────────────────────────
    if (window.location.hostname.includes('youtube.com')) return;

    // ── 1. Bootstrap the YPP namespace ──────────────────────────────────────
    window.YPP = window.YPP || {};
    window.YPP.features = window.YPP.features || {};

    // Minimal Utils — only what GlobalPlayerBar / GlobalBarUI call
    window.YPP.Utils = window.YPP.Utils || {
        log: (msg, ctx = 'GPB', level = 'info') => {
            if (level === 'debug') return;
            const styles = {
                info:  'color:#3ea6ff;font-weight:bold;',
                warn:  'color:#ff9800;font-weight:bold;',
                error: 'color:#f44336;font-weight:bold;',
            };
            (console[level] || console.log)(
                `%c[YPP:${ctx}]`, styles[level] || styles.info, msg
            );
        },
        removeStyle: (id) => {
            if (!id) return;
            [document.getElementById(id), document.querySelector(`link#${id}`)]
                .forEach(el => el?.remove());
        },
        positionPopupBesideVideo: (panel, triggerBtn, video, panelW) => {
            const GAP = 12, MARGIN = 8;
            const W = window.innerWidth, H = window.innerHeight;
            const btnRect = triggerBtn.getBoundingClientRect();
            const estH = Math.min(panel.scrollHeight > 40 ? panel.scrollHeight : 400, H - MARGIN * 2);

            const clampTop  = t => Math.max(MARGIN, Math.min(t, H - estH - MARGIN));
            const clampLeft = l => Math.max(MARGIN, Math.min(l, W - panelW - MARGIN));
            
            // Align vertically with the button center
            const top = clampTop(btnRect.top + btnRect.height / 2 - estH / 2);
            // Position exactly to the left of the button
            const left = btnRect.left - GAP - panelW;

            panel.style.left = clampLeft(left) + 'px';
            panel.style.top  = clampTop(top)  + 'px';
        },
        getPopupPortal: () => {
            let dlg = document.getElementById('ypp-popup-portal');
            if (dlg) return dlg;
            dlg = document.createElement('div');
            dlg.id = 'ypp-popup-portal';
            dlg.style.cssText =
                'position:fixed;inset:0;width:100%;height:100%;' +
                'max-width:100%;max-height:100%;' +
                'border:0;outline:0;padding:0;margin:0;' +
                'background:transparent;overflow:visible;' +
                'pointer-events:none;z-index:2147483647;';
            
            if ('popover' in dlg) {
                dlg.popover = "manual";
            }
            
            document.documentElement.appendChild(dlg);
            
            if ('popover' in dlg) {
                try { dlg.showPopover(); } catch(e) {}
            }
            return dlg;
        },
    };


    // Minimal BaseFeature — GlobalPlayerBar extends this
    window.YPP.features.BaseFeature = class BaseFeature {
        constructor(name) {
            this.name      = name || this.constructor.name;
            this.isEnabled = false;
            this.settings  = {};
            this.utils     = window.YPP.Utils;
            this.eventListeners = [];
            this.abortController = new AbortController();
        }
        async enable()  {}
        async disable() {
            this.eventListeners.forEach(({target, type, listener, options}) => {
                target.removeEventListener(type, listener, options);
            });
            this.eventListeners = [];
        }
        update(settings) {
            this.settings = { ...this.settings, ...settings };
            if (this.onUpdate) this.onUpdate();
        }
        getConfigKey() {
            if (!this.name) return null;
            return this.name.charAt(0).toLowerCase() + this.name.slice(1);
        }
        addListener(target, type, listener, options) {
            target.addEventListener(type, listener, options);
            this.eventListeners.push({ target, type, listener, options });
        }
        pollFor(conditionFn, timeout = 10000, intervalMs = 250) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const check = () => {
                    if (this.abortController?.signal?.aborted) return reject(new Error('Aborted'));
                    try {
                        const result = conditionFn();
                        if (result) return resolve(result);
                    } catch (e) {}
                    if (Date.now() - startTime >= timeout) return reject(new Error('Timeout'));
                    setTimeout(check, intervalMs);
                };
                check();
            });
        }
    };

    // FilterPresets stub so GlobalBarUI constructor doesn't throw
    window.YPP.features.FilterPresets = window.YPP.features.FilterPresets || { PRESETS: [] };

    // ── 2. Load feature modules AFTER namespace is ready ─────────────────────
    // Dynamic imports are inlined by Rollup but execute after the awaits,
    // so BaseFeature above is guaranteed to exist when the modules run.
    await import('./features/player/global-bar-ui.js');
    await import('./features/player/global-bar.js');

    // Load rich features
    await import('./features/player/volume-booster/volume-booster.js');
    await import('./features/player/volume-booster/volume-booster-ui.js');
    await import('./features/player/video-filters/video-filters-presets.js');
    await import('./features/player/video-filters/video-filters-overlay.js');
    await import('./features/player/video-filters/video-filters-ui.js');
    await import('./features/player/video-filters/video-filters.js');
    await import('./features/player/enhancements/video-speed-controller.js');

    // ── 3. Read user settings ────────────────────────────────────────────────
    let settings = {};
    try {
        const { DEFAULT_SETTINGS } = await import('../shared/default-settings.js');
        settings = { ...DEFAULT_SETTINGS };
        const data = await chrome.storage.local.get('settings');
        Object.assign(settings, data.settings || {});
    } catch (_) {}

    // Mock FeatureManager so GlobalBarUI can fetch VolumeBoost / VideoFilters
    const instances = {};
    window.YPP.featureManager = {
        getFeature: (name) => instances[name]
    };

    if (window.YPP.features.VolumeBooster) {
        instances['volumeBoost'] = new window.YPP.features.VolumeBooster();
        instances['volumeBoost'].update(settings);
        if (settings.enableVolumeBoost) instances['volumeBoost'].enable();
    }
    if (window.YPP.features.VideoFilters) {
        instances['videoFilters'] = new window.YPP.features.VideoFilters();
        instances['videoFilters'].update(settings);
        if (settings.enableCinemaFilters) instances['videoFilters'].enable();
    }
    if (window.YPP.features.VideoSpeedController) {
        instances['videoSpeedController'] = new window.YPP.features.VideoSpeedController();
        instances['videoSpeedController'].update(settings);
        if (settings.enableCustomSpeed !== false) instances['videoSpeedController'].enable();
    }

    // Default ON — show bar unless user explicitly disabled it
    if (settings.enableGlobalPlayerBar === false) return;

    // ── 4. Boot the feature ──────────────────────────────────────────────────
    const bar = new window.YPP.features.GlobalPlayerBar();
    if (bar.update) bar.update(settings);
    bar.isEnabled = false;
    await bar.enable();
    bar.isEnabled = true;

    // ── 5. React to popup toggle changes in real-time ────────────────────────
    try {
        chrome.storage.onChanged.addListener((changes) => {
            if (!changes.settings) return;
            const newSettings = changes.settings.newValue || {};
            const nowEnabled  = newSettings.enableGlobalPlayerBar !== false;

            if (nowEnabled && !bar.isEnabled) {
                bar.enable();
                bar.isEnabled = true;
            } else if (!nowEnabled && bar.isEnabled) {
                bar.disable();
                bar.isEnabled = false;
            }
            if (bar.update) bar.update(newSettings);

            // Update sub-features
            if (instances['volumeBoost']) {
                instances['volumeBoost'].update(newSettings);
            }
            if (instances['videoFilters']) {
                instances['videoFilters'].update(newSettings);
            }
            if (instances['videoSpeedController']) {
                instances['videoSpeedController'].update(newSettings);
            }
        });
    } catch (_) {}
})();
