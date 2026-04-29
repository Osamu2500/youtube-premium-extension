/**
 * Modes Manager — YouTube Premium Plus
 * Handles: Cinema Mode, Minimal Mode, Auto Cinema, Auto PiP
 * These modes modify the YouTube player/page layout and are toggled from the
 * popup's "Modes" section or the presets in the Dashboard.
 *
 * Pattern: each mode has a dedicated _enable/disable method that:
 *  1. Adds/removes a body CSS class (for the styles.css rules to react)
 *  2. Injects/removes a scoped <style> tag for any mode-specific rules
 *  3. Calls the YouTube native API when needed (theater mode, PiP)
 *  4. Shows a toast notification via Utils.createToast
 *  5. Cleans up completely on disable — no zombie DOM nodes
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ModesManager = class ModesManager extends window.YPP.features.BaseFeature {
    getConfigKey() { return null; } // Responds to multiple keys — always runs

    constructor() {
        super('ModesManager');

        // Track active mode states to avoid redundant DOM work
        this._active = {
            cinemaMode:  false,
            minimalMode: false,
            autoCinema:  false,
            autoPiP:     false,
        };

        // Bound handlers for cleanup
        this._boundAutoPiP = null;
        this._boundAutoCinema = null;
        this._navHandler = this._onNavigation.bind(this);
    }

    // =========================================================================
    // LIFECYCLE — called by FeatureManager on every settings change/page nav
    // =========================================================================

    run(settings) {
        this._applyAll(settings);
    }

    update(settings) {
        this._applyAll(settings);
    }

    disable() {
        this._disableCinemaMode();
        this._disableMinimalMode();
        this._disableAutoCinema();
        this._disableAutoPiP();
        window.removeEventListener('yt-navigate-finish', this._navHandler);
    }

    // =========================================================================
    // ORCHESTRATION
    // =========================================================================

    _applyAll(settings) {
        if (!settings) return;
        this._settings = settings;

        // --- Cinema Mode ---
        if (settings.cinemaMode && !this._active.cinemaMode) {
            this._enableCinemaMode();
        } else if (!settings.cinemaMode && this._active.cinemaMode) {
            this._disableCinemaMode();
        }

        // --- Minimal Mode ---
        if (settings.minimalMode && !this._active.minimalMode) {
            this._enableMinimalMode();
        } else if (!settings.minimalMode && this._active.minimalMode) {
            this._disableMinimalMode();
        }

        // --- Auto Cinema (expand to theater on video load) ---
        if (settings.autoCinema && !this._active.autoCinema) {
            this._enableAutoCinema();
        } else if (!settings.autoCinema && this._active.autoCinema) {
            this._disableAutoCinema();
        }

        // --- Auto PiP (Picture-in-Picture when tab hidden) ---
        if (settings.autoPiP && !this._active.autoPiP) {
            this._enableAutoPiP();
        } else if (!settings.autoPiP && this._active.autoPiP) {
            this._disableAutoPiP();
        }
    }

    // =========================================================================
    // CINEMA MODE
    // Dims sidebar & recommendations, focuses on the player.
    // Clicks YouTube's native theater button to expand the player.
    // =========================================================================

    _enableCinemaMode() {
        this._active.cinemaMode = true;
        document.body.classList.add('ypp-cinema-mode');
        this._injectStyle('ypp-cinema-style', `
            /* Cinema Mode — focus on the player */
            .ypp-cinema-mode ytd-watch-flexy:not([theater]) #columns {
                --ytd-watch-flexy-sidebar-width: 0px !important;
            }

            /* Dim sidebar on watch page */
            .ypp-cinema-mode #secondary {
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.35s ease;
                width: 0 !important;
                overflow: hidden !important;
                flex: 0 !important;
                min-width: 0 !important;
            }
            .ypp-cinema-mode #secondary:hover {
                opacity: 1;
                pointer-events: auto;
            }

            /* Expand primary column */
            .ypp-cinema-mode #primary {
                max-width: 100% !important;
            }

            /* Darken the page background for immersion */
            .ypp-cinema-mode ytd-page-manager {
                background: #050505 !important;
            }

            /* Dim masthead */
            .ypp-cinema-mode ytd-masthead {
                opacity: 0.4;
                transition: opacity 0.3s;
            }
            .ypp-cinema-mode ytd-masthead:hover {
                opacity: 1;
            }
        `);

        // Try to enable YouTube's native theater mode
        this._clickTheaterButton();
        this.utils?.createToast?.('Cinema Mode On 🎬');
        this.utils?.log?.('Cinema mode enabled', 'MODES');
    }

    _disableCinemaMode() {
        if (!this._active.cinemaMode) return;
        this._active.cinemaMode = false;
        document.body.classList.remove('ypp-cinema-mode');
        this._removeStyle('ypp-cinema-style');

        // Exit theater mode if we entered it
        this._exitTheaterModeIfNeeded();
        this.utils?.createToast?.('Cinema Mode Off');
        this.utils?.log?.('Cinema mode disabled', 'MODES');
    }

    async _clickTheaterButton() {
        try {
            const btn = await this.utils?.pollFor?.(
                () => document.querySelector('.ytp-size-button'),
                6000, 400
            );
            if (!btn) return;
            const isTheater = !!document.querySelector('ytd-watch-flexy[theater]');
            if (!isTheater) btn.click();
        } catch (_) { /* silent fail */ }
    }

    async _exitTheaterModeIfNeeded() {
        try {
            const btn = document.querySelector('.ytp-size-button');
            const isTheater = !!document.querySelector('ytd-watch-flexy[theater]');
            if (btn && isTheater) btn.click();
        } catch (_) { /* silent fail */ }
    }

    // =========================================================================
    // MINIMAL MODE
    // Hides non-essential UI: owner row, comments header, top-row actions,
    // and fades the masthead. Everything is still accessible on hover.
    // =========================================================================

    _enableMinimalMode() {
        this._active.minimalMode = true;
        document.body.classList.add('ypp-minimal-mode');
        this._injectStyle('ypp-minimal-style', `
            /* Minimal Mode — strip non-essentials */
            .ypp-minimal-mode #masthead-container {
                opacity: 0.15;
                transition: opacity 0.3s;
            }
            .ypp-minimal-mode #masthead-container:hover {
                opacity: 1;
            }

            /* Hide action buttons row (Like/Share/Save/…) */
            .ypp-minimal-mode ytd-watch-metadata #top-level-buttons-computed,
            .ypp-minimal-mode ytd-watch-metadata #flexible-item-buttons {
                opacity: 0.2;
                transition: opacity 0.3s;
                pointer-events: none;
            }
            .ypp-minimal-mode ytd-watch-metadata #top-level-buttons-computed:hover,
            .ypp-minimal-mode ytd-watch-metadata #flexible-item-buttons:hover {
                opacity: 1;
                pointer-events: auto;
            }

            /* Fade subscriptions/channel row */
            .ypp-minimal-mode #owner {
                opacity: 0.3;
                transition: opacity 0.3s;
            }
            .ypp-minimal-mode #owner:hover { opacity: 1; }

            /* Collapse comments section */
            .ypp-minimal-mode #comments {
                opacity: 0.08;
                pointer-events: none;
                transition: opacity 0.3s;
                max-height: 60px;
                overflow: hidden;
            }
            .ypp-minimal-mode #comments:hover {
                opacity: 1;
                pointer-events: auto;
                max-height: none;
            }

            /* Dim sidebar recommendations */
            .ypp-minimal-mode #secondary {
                opacity: 0.15;
                transition: opacity 0.3s;
            }
            .ypp-minimal-mode #secondary:hover { opacity: 1; }
        `);
        this.utils?.createToast?.('Minimal Mode On ◻');
        this.utils?.log?.('Minimal mode enabled', 'MODES');
    }

    _disableMinimalMode() {
        if (!this._active.minimalMode) return;
        this._active.minimalMode = false;
        document.body.classList.remove('ypp-minimal-mode');
        this._removeStyle('ypp-minimal-style');
        this.utils?.createToast?.('Minimal Mode Off');
        this.utils?.log?.('Minimal mode disabled', 'MODES');
    }

    // =========================================================================
    // AUTO CINEMA
    // Automatically clicks the theater button whenever a watch page loads.
    // =========================================================================

    _enableAutoCinema() {
        this._active.autoCinema = true;
        // Run immediately if we're on a watch page
        if (location.pathname === '/watch') {
            this._clickTheaterButton();
        }
        // And on every subsequent navigation
        window.addEventListener('yt-navigate-finish', this._navHandler);
        this.utils?.log?.('Auto Cinema enabled', 'MODES');
    }

    _disableAutoCinema() {
        if (!this._active.autoCinema) return;
        this._active.autoCinema = false;
        window.removeEventListener('yt-navigate-finish', this._navHandler);
        this.utils?.log?.('Auto Cinema disabled', 'MODES');
    }

    _onNavigation() {
        if (this._settings?.autoCinema && location.pathname === '/watch') {
            // Small delay to let YouTube render its player
            setTimeout(() => this._clickTheaterButton(), 600);
        }
    }

    // =========================================================================
    // AUTO PIP
    // Enters Picture-in-Picture when the tab is hidden (user switches tabs).
    // Exits PiP when the user comes back.
    // =========================================================================

    _enableAutoPiP() {
        this._active.autoPiP = true;
        this._boundAutoPiP = async () => {
            const video = document.querySelector('video');
            if (!video) return;
            if (document.hidden && !video.paused) {
                // Tab hidden → enter PiP
                if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
                    try { await video.requestPictureInPicture(); } catch (_) {}
                }
            } else if (!document.hidden && document.pictureInPictureElement) {
                // Tab visible again → exit PiP
                try { await document.exitPictureInPicture(); } catch (_) {}
            }
        };
        document.addEventListener('visibilitychange', this._boundAutoPiP);
        this.utils?.log?.('Auto PiP enabled', 'MODES');
    }

    _disableAutoPiP() {
        if (!this._active.autoPiP) return;
        this._active.autoPiP = false;
        if (this._boundAutoPiP) {
            document.removeEventListener('visibilitychange', this._boundAutoPiP);
            this._boundAutoPiP = null;
        }
        // Exit PiP if currently active
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }
        this.utils?.log?.('Auto PiP disabled', 'MODES');
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Inject a <style> tag if it doesn't exist yet.
     * @param {string} id  - Unique element ID
     * @param {string} css - CSS text
     */
    _injectStyle(id, css) {
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }

    /** Remove a <style> tag by ID. */
    _removeStyle(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
};
