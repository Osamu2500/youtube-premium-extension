/**
 * Keyboard Shortcuts Feature
 *
 * Provides configurable keyboard shortcuts for toggling extension features
 * and controlling video playback. All shortcuts are active only on YouTube
 * watch and shorts pages to avoid interfering with other YouTube interactions.
 *
 * Default shortcuts:
 *   Shift+Z  → Toggle Zen Mode
 *   Shift+F  → Toggle Focus Mode
 *   Shift+C  → Toggle Cinema Mode / Theater
 *   Shift+S  → Take Snapshot
 *   Shift+L  → Toggle Loop
 *   Shift+P  → Toggle Picture-in-Picture
 *   Shift+,  → Speed -0.25x
 *   Shift+.  → Speed +0.25x
 *   Shift+R  → Reset speed to 1x
 *   Shift+M  → Toggle Ambient Mode
 *
 * Users can remap any shortcut via the popup Settings tab.
 * Shortcuts stored in settings as `shortcut_<action>` keys (e.g. `shortcut_zenMode`).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

class KeyboardShortcuts extends window.YPP.features.BaseFeature {
    constructor() {
        super('KeyboardShortcuts');

        // Default key bindings and labels pulled from static class properties
        // so getBindings() and the constructor always stay in sync
        this.defaults = KeyboardShortcuts.DEFAULT_BINDINGS;
        this.actions = {
            zenMode:     { label: KeyboardShortcuts.ACTION_LABELS.zenMode,     fn: () => this._toggleSetting('zenMode') },
            focusMode:   { label: KeyboardShortcuts.ACTION_LABELS.focusMode,   fn: () => this._toggleSetting('enableFocusMode') },
            cinemaMode:  { label: KeyboardShortcuts.ACTION_LABELS.cinemaMode,  fn: () => this._toggleCinema() },
            snapshot:    { label: KeyboardShortcuts.ACTION_LABELS.snapshot,    fn: () => this._triggerSnapshot() },
            loop:        { label: KeyboardShortcuts.ACTION_LABELS.loop,        fn: () => this._toggleLoop() },
            pip:         { label: KeyboardShortcuts.ACTION_LABELS.pip,         fn: () => this._togglePiP() },
            speedDown:   { label: KeyboardShortcuts.ACTION_LABELS.speedDown,   fn: () => this._adjustSpeed(-0.25) },
            speedUp:     { label: KeyboardShortcuts.ACTION_LABELS.speedUp,     fn: () => this._adjustSpeed(0.25) },
            speedReset:  { label: KeyboardShortcuts.ACTION_LABELS.speedReset,  fn: () => this._adjustSpeed(0, true) },
            ambientMode: { label: KeyboardShortcuts.ACTION_LABELS.ambientMode, fn: () => this._toggleSetting('ambientMode') },
        };
    }

    /**
     * Settings key this feature responds to
     */
    getConfigKey() {
        return 'keyboardShortcuts';
    }

    async enable() {
        await super.enable();
        
        // Build bindings for the hotkeys manager
        const bindings = [];
        for (const [action, definition] of Object.entries(this.actions)) {
            const boundKey = this.settings?.[`shortcut_${action}`] ?? this.defaults[action];
            if (boundKey) {
                bindings.push({
                    combo: boundKey,
                    callback: () => {
                        definition.fn();
                        this._showToast(definition.label);
                    }
                });
            }
        }
        
        window.YPP.hotkeysManager?.register('keyboard-shortcuts', bindings);
        this.utils?.log('Keyboard Shortcuts enabled', 'SHORTCUTS', 'debug');
    }

    async disable() {
        await super.disable();
        window.YPP.hotkeysManager?.unregister('keyboard-shortcuts');
        this.utils?.log('Keyboard Shortcuts disabled', 'SHORTCUTS', 'debug');
    }


    // ACTION IMPLEMENTATIONS
    // =========================================================================

    /**
     * Toggle a boolean setting and broadcast the change
     */
    async _toggleSetting(key) {
        const data = await window.YPP.StorageManager.get('settings');
        const settings = data || {};
        settings[key] = !settings[key];
        await window.YPP.StorageManager.set('settings', settings);

        // Notify the feature manager to re-apply
        window.YPP.events?.emit('settings:changed', settings);

        // Only update the specific feature, not all features
        const featureMap = {
            zenMode: 'zenMode',
            enableFocusMode: 'focusMode',
            ambientMode: 'ambientMode'
        };
        const featureKey = featureMap[key];
        if (featureKey && window.YPP.featureManager?.features?.[featureKey]) {
            window.YPP.featureManager.features[featureKey].update(settings);
        }
    }

    _toggleCinema() {
        const selectors = [
            '.ytp-size-button',
            'button[data-tooltip-target-id="ytp-size-button"]',
            '.ytp-button[data-tooltip-target-id="ytp-size-button"]',
        ];
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); return; }
        }
        // Final fallback: toggle theater attribute
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        if (watchFlexy) {
            watchFlexy.toggleAttribute('theater');
        }
    }

    _triggerSnapshot() {
        const video = document.querySelector('video');
        if (!video) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `snapshot-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    _toggleLoop() {
        const video = document.querySelector('video');
        if (!video) return;
        video.loop = !video.loop;
        // Sync the loop button active state
        document.querySelectorAll('.ypp-action-btn').forEach(btn => {
            if (btn.title === 'Loop Video') btn.classList.toggle('active', video.loop);
        });
    }

    async _togglePiP() {
        const video = document.querySelector('video');
        if (!video || !document.pictureInPictureEnabled) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (e) { /* ignore */ }
    }

    _adjustSpeed(delta, reset = false) {
        const video = document.querySelector('video');
        if (!video) return;

        const CONSTANTS = window.YPP.CONSTANTS;
        const min = CONSTANTS?.PLAYER?.SPEED_MIN ?? 0.1;
        const max = CONSTANTS?.PLAYER?.SPEED_MAX ?? 5.0;

        if (reset) {
            video.playbackRate = 1;
        } else {
            const next = Math.round((video.playbackRate + delta) * 100) / 100;
            video.playbackRate = Math.min(Math.max(next, min), max);
        }
    }

    // =========================================================================
    // TOAST FEEDBACK
    // =========================================================================

    _showToast(label) {
        // Remove existing shortcut toast
        document.querySelector('.ypp-shortcut-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = 'ypp-shortcut-toast';
        toast.textContent = label;
        document.body.appendChild(toast);

        // Animate in then out
        requestAnimationFrame(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 1800);
        });
    }

    // =========================================================================
    // PUBLIC API — used by popup to list all actions and their current bindings
    // =========================================================================

    /**
     * Get all actions with their current bindings from settings
     * @param {Object} settings - current settings object
     * @returns {Array<{action, label, binding}>}
     */
    static getBindings(settings = {}) {
        return Object.keys(KeyboardShortcuts.DEFAULT_BINDINGS).map(action => ({
            action,
            label: KeyboardShortcuts.ACTION_LABELS[action],
            binding: settings[`shortcut_${action}`] ?? KeyboardShortcuts.DEFAULT_BINDINGS[action],
        }));
    }
};

// ─── Static class properties (single source of truth) ────────────────────────
KeyboardShortcuts.DEFAULT_BINDINGS = {
    zenMode:     'Shift+Z',
    focusMode:   'Shift+F',
    cinemaMode:  'Shift+C',
    snapshot:    'Shift+S',
    loop:        'Shift+L',
    pip:         'Shift+P',
    speedDown:   'Shift+,',
    speedUp:     'Shift+.',
    speedReset:  'Shift+R',
    ambientMode: 'Shift+M',
};

KeyboardShortcuts.ACTION_LABELS = {
    zenMode:     'Toggle Zen Mode',
    focusMode:   'Toggle Focus Mode',
    cinemaMode:  'Toggle Cinema / Theater',
    snapshot:    'Take Snapshot',
    loop:        'Toggle Loop',
    pip:         'Toggle Picture-in-Picture',
    speedDown:   'Speed -0.25x',
    speedUp:     'Speed +0.25x',
    speedReset:  'Reset Speed to 1x',
    ambientMode: 'Toggle Ambient Mode',
};

window.YPP.features.KeyboardShortcuts = KeyboardShortcuts;
