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
    };

    // Minimal BaseFeature — GlobalPlayerBar extends this
    window.YPP.features.BaseFeature = class BaseFeature {
        constructor(name) {
            this.name      = name || this.constructor.name;
            this.isEnabled = false;
            this.settings  = {};
            this.utils     = window.YPP.Utils;
        }
        async enable()  {}
        async disable() {}
        getConfigKey() {
            if (!this.name) return null;
            return this.name.charAt(0).toLowerCase() + this.name.slice(1);
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

    // ── 3. Read user settings ────────────────────────────────────────────────
    let settings = {};
    try {
        const data = await chrome.storage.local.get('settings');
        settings = data.settings || {};
    } catch (_) {}

    // Mock FeatureManager so GlobalBarUI can fetch VolumeBoost / VideoFilters
    const instances = {};
    window.YPP.featureManager = {
        getFeature: (name) => instances[name]
    };

    if (window.YPP.features.VolumeBooster) {
        instances['volumeBoost'] = new window.YPP.features.VolumeBooster();
        if (settings.enableVolumeBoost) instances['volumeBoost'].enable(settings);
    }
    if (window.YPP.features.VideoFilters) {
        instances['videoFilters'] = new window.YPP.features.VideoFilters();
        if (settings.enableCinemaFilters) instances['videoFilters'].enable(settings);
    }

    // Default ON — show bar unless user explicitly disabled it
    if (settings.enableGlobalPlayerBar === false) return;

    // ── 4. Boot the feature ──────────────────────────────────────────────────
    const bar = new window.YPP.features.GlobalPlayerBar();
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

            // Update sub-features
            if (instances['volumeBoost']) {
                instances['volumeBoost'].update(newSettings);
            }
            if (instances['videoFilters']) {
                instances['videoFilters'].update(newSettings);
            }
        });
    } catch (_) {}
})();
