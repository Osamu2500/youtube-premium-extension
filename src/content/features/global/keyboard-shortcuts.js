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

window.YPP.features.KeyboardShortcuts = class KeyboardShortcuts {
    constructor() {
        this.settings = null;
        this.isActive = false;
        this._boundHandler = null;

        // Action definitions: label shown in UI → what happens when triggered
        this.actions = {
            zenMode:     { label: 'Toggle Zen Mode',            fn: () => this._toggleSetting('zenMode') },
            focusMode:   { label: 'Toggle Focus Mode',          fn: () => this._toggleSetting('enableFocusMode') },
            cinemaMode:  { label: 'Toggle Cinema / Theater',    fn: () => this._toggleCinema() },
            snapshot:    { label: 'Take Snapshot',              fn: () => this._triggerSnapshot() },
            loop:        { label: 'Toggle Loop',                fn: () => this._toggleLoop() },
            pip:         { label: 'Toggle Picture-in-Picture',  fn: () => this._togglePiP() },
            speedDown:   { label: 'Speed -0.25x',               fn: () => this._adjustSpeed(-0.25) },
            speedUp:     { label: 'Speed +0.25x',               fn: () => this._adjustSpeed(0.25) },
            speedReset:  { label: 'Reset Speed to 1x',          fn: () => this._adjustSpeed(0, true) },
            ambientMode: { label: 'Toggle Ambient Mode',        fn: () => this._toggleSetting('ambientMode') },
        };

        // Default key bindings: action key → "Modifier+Key" string
        // Stored as `shortcut_<action>` in settings
        this.defaults = {
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
    }

    run(settings) {
        this.settings = settings;
        if (settings.keyboardShortcuts !== false) {
            this.enable();
        } else {
            this.disable();
        }
    }

    update(settings) {
        this.settings = settings;
        // Re-attach with new bindings
        if (this.isActive) {
            this.disable();
            if (settings.keyboardShortcuts !== false) this.enable();
        } else if (settings.keyboardShortcuts !== false) {
            this.enable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;

        this._boundHandler = (e) => this._handleKey(e);
        document.addEventListener('keydown', this._boundHandler, { capture: false });

        window.YPP.Utils?.log('Keyboard Shortcuts enabled', 'SHORTCUTS', 'debug');
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this._boundHandler) {
            document.removeEventListener('keydown', this._boundHandler, { capture: false });
            this._boundHandler = null;
        }

        window.YPP.Utils?.log('Keyboard Shortcuts disabled', 'SHORTCUTS', 'debug');
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
                    window.YPP.Utils?.log(`Shortcut error for ${action}: ${err.message}`, 'SHORTCUTS', 'error');
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
            // Final key: uppercase if single char
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
        const Utils = window.YPP.Utils;
        const data = await chrome.storage.local.get('settings');
        const settings = data.settings || {};
        settings[key] = !settings[key];
        await chrome.storage.local.set({ settings });

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
        const defaults = {
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
        const labels = {
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
        return Object.keys(defaults).map(action => ({
            action,
            label: labels[action],
            binding: settings[`shortcut_${action}`] ?? defaults[action],
        }));
    }
};
