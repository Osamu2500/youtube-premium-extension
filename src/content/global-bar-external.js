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
            const GAP = 10, MARGIN = 8;
            const W = window.innerWidth, H = window.innerHeight;
            const btnRect = triggerBtn.getBoundingClientRect();
            const estH = Math.min(panel.scrollHeight > 40 ? panel.scrollHeight : 400, H - MARGIN * 2);

            const clampTop  = t => Math.max(MARGIN, Math.min(t, H - estH - MARGIN));
            const clampLeft = l => Math.max(MARGIN, Math.min(l, W - panelW - MARGIN));
            const centredTop  = clampTop(btnRect.top + btnRect.height / 2 - estH / 2);
            const alignedLeft = clampLeft(btnRect.left);

            const vRect    = video?.getBoundingClientRect?.() || null;
            const hasVideo = vRect && vRect.width > 20 && vRect.height > 20;

            let left, top, placed = false;
            if (hasVideo) {
                if (W - vRect.right - GAP >= panelW + MARGIN) {
                    left = vRect.right + GAP; top = centredTop; placed = true;
                } else if (vRect.left - GAP >= panelW + MARGIN) {
                    left = vRect.left - GAP - panelW; top = centredTop; placed = true;
                } else if (H - vRect.bottom - GAP >= Math.min(estH, 200)) {
                    left = alignedLeft; top = vRect.bottom + GAP; placed = true;
                } else if (vRect.top - GAP >= Math.min(estH, 200)) {
                    left = alignedLeft; top = vRect.top - GAP - estH; placed = true;
                }
                if (!placed) { left = btnRect.right + GAP; top = centredTop; }
            } else {
                left = btnRect.right + GAP; top = centredTop;
            }
            panel.style.left = clampLeft(left) + 'px';
            panel.style.top  = clampTop(top)  + 'px';
        },
        getPopupPortal: () => {
            let dlg = document.getElementById('ypp-popup-portal');
            if (dlg) return dlg;
            dlg = document.createElement('dialog');
            dlg.id = 'ypp-popup-portal';
            dlg.style.cssText =
                'position:fixed;inset:0;width:100%;height:100%;' +
                'max-width:100%;max-height:100%;' +
                'border:0;outline:0;padding:0;margin:0;' +
                'background:transparent;overflow:visible;' +
                'pointer-events:none;z-index:2147483647;';
            document.documentElement.appendChild(dlg);
            if (!document.getElementById('ypp-portal-backdrop')) {
                const bs = document.createElement('style');
                bs.id = 'ypp-portal-backdrop';
                bs.textContent = '#ypp-popup-portal::backdrop{display:none!important;pointer-events:none!important;}';
                (document.head || document.documentElement).appendChild(bs);
            }
            dlg.addEventListener('cancel', e => e.preventDefault());
            try { dlg.showModal(); } catch(e) { try { dlg.show(); } catch(e2) {} }
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
