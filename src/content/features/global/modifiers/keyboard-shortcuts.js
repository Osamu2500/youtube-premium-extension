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
        this._boundHandler = this._handleKey.bind(this);

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
        this.addListener(document, 'keydown', this._boundHandler, { capture: false });
        this.utils?.log('Keyboard Shortcuts enabled', 'SHORTCUTS', 'debug');
    }

    async disable() {
        await super.disable();
        // Listener removed automatically by BaseFeature.cleanupEvents()
        this.utils?.log('Keyboard Shortcuts disabled', 'SHORTCUTS', 'debug');
    }

    // =========================================================================
    // KEY HANDLER
    // =========================================================================

    _handleKey(e) {
        // Only fire on watch/shorts pages
        const path = window.location.pathname;
        if (!path.startsWith('/watch') && !path.startsWith('/shorts')) return;

        // Never fire inside text inputs (search, comment boxes, etc.)
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

        const combo = this._comboFromEvent(e);
        if (!combo) return;

        for (const [action, definition] of Object.entries(this.actions)) {
            const boundKey = this.settings?.[`shortcut_${action}`] ?? this.defaults[action];
            if (boundKey && combo === this._normalizeCombo(boundKey)) {
                e.preventDefault();
                e.stopPropagation();
                try {
                    definition.fn();
                    this._showToast(definition.label);
                } catch (err) {
                    this.utils?.log(`Shortcut error for ${action}: ${err.message}`, 'SHORTCUTS', 'error');
                }
                return;
            }
        }
    }

    /**
     * Build a normalized combo string from a KeyboardEvent e.g. "Shift+Z"
     * @param {KeyboardEvent} e
     * @returns {string}
     */
    _comboFromEvent(e) {
        const parts = [];
        if (e.ctrlKey)  parts.push('Ctrl');
        if (e.altKey)   parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey)  parts.push('Meta');

        // Use e.key for the actual key, uppercase single letters
        const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        // Skip pure modifier keys
        if (['Control','Alt','Shift','Meta'].includes(key)) return '';
        parts.push(key);
        return parts.join('+');
    }

    /**
     * Normalize a stored combo string to match event format
     * @param {string} combo - e.g. "Shift+z" or "shift+z"
     * @returns {string} - e.g. "Shift+Z"
     */
    _normalizeCombo(combo) {
        return combo.split('+').map((part, i, arr) => {
            if (i < arr.length - 1) {
                // Modifier: capitalize first letter
                return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            }
            return part.length === 1 ? part.toUpperCase() : part;
        }).join('+');
    }

    // =========================================================================
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

        // Re-run the feature manager
        window.YPP.featureManager?.init(settings);
    }

    _toggleCinema() {
        const btn = document.querySelector('.ytp-size-button');
        if (btn) btn.click();
    }

    _triggerSnapshot() {
        const player = window.YPP.featureManager?.features?.player;
        const video = document.querySelector('video');
        if (player && video) {
            player.takeSnapshot(video);
        }
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
