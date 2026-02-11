/**
 * Focus Mode Feature - Reduces visual distractions and enhances concentration
 * Uses centralized constants for configuration
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Focus Mode
 * @class FocusMode
 */
window.YPP.features.FocusMode = class FocusMode {
    /**
     * Initialize Focus Mode
     * @constructor
     */
    constructor() {
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._CSS_CLASSES = this._CONSTANTS.CSS_CLASSES || {};
        this._Utils = window.YPP.Utils || {};
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this._settingsRef = null;
        this._observer = null;
        this._isActive = false;
        this._debounceTimer = null;

        // Bound methods
        this._boundRun = this._run.bind(this);
    }

    /**
     * Enable focus mode features
     * @param {Object} settings - User settings
     */
    enable(settings) {
        this._settingsRef = settings;
        this._run(settings);
        this._setupObserver();
    }

    /**
     * Disable focus mode features
     */
    disable() {
        try {
            this._cleanup();
            this._Utils.log?.('Focus mode disabled', 'FOCUS');
        } catch (error) {
            this._Utils.log?.(`Error disabling focus mode: ${error.message}`, 'FOCUS', 'error');
        }
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    /**
     * Complete cleanup
     * @private
     */
    _cleanup() {
        // Disconnect observer
        this._cleanupObserver();

        // Clear debounce timer
        this._clearDebounce();

        // Disable all features
        this._toggleDetox(false);
        this._toggleFocus(false);
        this._toggleCinemaMode(false);
        this._toggleMinimalMode(false);

        this._isActive = false;
        this._settingsRef = null;
    }

    /**
     * Run focus mode with settings
     * @private
     * @param {Object} settings
     */
    _run(settings) {
        if (!settings) return;

        this._isActive = true;

        try {
            this._toggleDetox(settings.dopamineDetox);
            this._toggleFocus(settings.enableFocusMode);
            this._toggleCinemaMode(settings.cinemaMode);
            this._toggleMinimalMode(settings.minimalMode);
            this._applyFocusState();
        } catch (error) {
            this._Utils.log?.(`Error running focus mode: ${error.message}`, 'FOCUS', 'error');
        }
    }

    /**
     * Apply current focus state to DOM
     * @private
     */
    _applyFocusState() {
        const settings = this._settingsRef;
        if (!settings) return;

        if (settings.enableFocusMode) {
            this._hideDistractions(true);
        }
    }

    // =========================================================================
    // OBSERVER
    // =========================================================================

    /**
     * Setup observer for dynamic content changes
     * @private
     */
    _setupObserver() {
        if (this._observer) return;

        this._observer = new MutationObserver(() => {
            this._clearDebounce();
            this._debounceTimer = setTimeout(() => {
                if (this._isActive && this._settingsRef) {
                    this._applyFocusState();
                }
            }, 300);
        });

        this._observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Cleanup observer
     * @private
     */
    _cleanupObserver() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    }

    /**
     * Clear debounce timer
     * @private
     */
    _clearDebounce() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }

    // =========================================================================
    // DOPAMINE DETOX
    // =========================================================================

    /**
     * Toggle grayscale dopamine detox mode
     * @private
     * @param {boolean} enable
     */
    _toggleDetox(enable) {
        document.body.classList.toggle(this._CSS_CLASSES.DOPAMINE_DETOX, enable);

        if (enable) {
            this._applyDetoxStyle();
        } else {
            this._removeDetoxStyle();
        }

        this._Utils.log?.(`Dopamine detox ${enable ? 'enabled' : 'disabled'}`, 'FOCUS');
    }

    /**
     * Apply detox grayscale style
     * @private
     */
    _applyDetoxStyle() {
        const styleId = this._CSS_CLASSES.DOPAMINE_DETOX_STYLE || 'ypp-detox-style';
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = `
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-grid-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} #thumbnail img,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} .ytp-thumbnail-overlay,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} .html5-main-video {
                filter: grayscale(100%) !important;
            }

            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-video-renderer:hover ytd-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-rich-item-renderer:hover ytd-thumbnail {
                filter: grayscale(60%) !important;
            }
        `;
    }

    /**
     * Remove detox style
     * @private
     */
    _removeDetoxStyle() {
        const styleId = this._CSS_CLASSES.DOPAMINE_DETOX_STYLE || 'ypp-detox-style';
        const style = document.getElementById(styleId);
        if (style) style.remove();
    }

    // =========================================================================
    // FOCUS MODE
    // =========================================================================

    /**
     * Toggle generic distraction hiding
     * @private
     * @param {boolean} enable
     */
    _toggleFocus(enable) {
        document.body.classList.toggle(this._CSS_CLASSES.FOCUS_MODE, enable);
        this._Utils.log?.(`Focus mode ${enable ? 'enabled' : 'disabled'}`, 'FOCUS');
    }

    /**
     * Hide distractions based on settings
     * @private
     * @param {boolean} enable
     */
    _hideDistractions(enable) {
        const settings = this._settingsRef;
        if (!settings) return;

        const toggle = (cls, state) => {
            if (cls) document.body.classList.toggle(cls, !!state);
        };

        toggle('ypp-hide-comments', settings.hideComments);
        toggle('ypp-hide-shorts', settings.hideShorts);
        toggle('ypp-hide-chat', settings.hideChat);
        toggle('ypp-hide-live-chat', settings.hideLiveChat);
        toggle('ypp-hide-recommendations', settings.hideRecommendations);
    }

    // =========================================================================
    // CINEMA MODE
    // =========================================================================

    /**
     * Toggle cinema mode
     * @private
     * @param {boolean} enable
     */
    _toggleCinemaMode(enable) {
        document.body.classList.toggle(this._CSS_CLASSES.CINEMA_MODE, enable);

        if (enable) {
            this._applyCinemaStyle();
        } else {
            this._removeCinemaStyle();
        }

        this._Utils.log?.(`Cinema mode ${enable ? 'enabled' : 'disabled'}`, 'FOCUS');
    }

    /**
     * Apply cinema mode styles
     * @private
     */
    _applyCinemaStyle() {
        const styleId = this._CSS_CLASSES.CINEMA_STYLE || 'ypp-cinema-style';
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = `
            .${this._CSS_CLASSES.CINEMA_MODE || 'ypp-cinema-mode'} #columns,
            .${this._CSS_CLASSES.CINEMA_MODE || 'ypp-cinema-mode'} #primary + #secondary {
                opacity: 0.3;
                transform: scale(0.95);
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
            }

            .${this._CSS_CLASSES.CINEMA_MODE || 'ypp-cinema-mode'} #primary {
                max-width: 1000px !important;
                margin: 0 auto;
            }

            .${this._CSS_CLASSES.CINEMA_MODE || 'ypp-cinema-mode'} #columns:hover #primary + #secondary,
            .${this._CSS_CLASSES.CINEMA_MODE || 'ypp-cinema-mode'} #columns:hover #secondary {
                opacity: 1;
                transform: scale(1);
                pointer-events: auto;
            }
        `;
    }

    /**
     * Remove cinema mode styles
     * @private
     */
    _removeCinemaStyle() {
        const styleId = this._CSS_CLASSES.CINEMA_STYLE || 'ypp-cinema-style';
        const style = document.getElementById(styleId);
        if (style) style.remove();
    }

    // =========================================================================
    // MINIMAL MODE
    // =========================================================================

    /**
     * Toggle minimal mode
     * @private
     * @param {boolean} enable
     */
    _toggleMinimalMode(enable) {
        document.body.classList.toggle(this._CSS_CLASSES.MINIMAL_MODE, enable);

        if (enable) {
            this._applyMinimalStyle();
        } else {
            this._removeMinimalStyle();
        }

        this._Utils.log?.(`Minimal mode ${enable ? 'enabled' : 'disabled'}`, 'FOCUS');
    }

    /**
     * Apply minimal mode styles
     * @private
     */
    _applyMinimalStyle() {
        const styleId = this._CSS_CLASSES.MINIMAL_STYLE || 'ypp-minimal-style';
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = `
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} ytd-masthead #buttons,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} ytd-masthead #end,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} ytd-video-primary-info-renderer #top-row,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #owner,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #comments,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #secondary {
                opacity: 0.2;
                transition: opacity 0.3s ease;
            }

            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} ytd-masthead:hover #buttons,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} ytd-masthead:hover #end,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #owner:hover,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #comments:hover,
            .${this._CSS_CLASSES.MINIMAL_MODE || 'ypp-minimal-mode'} #secondary:hover {
                opacity: 1;
            }
        `;
    }

    /**
     * Remove minimal mode styles
     * @private
     */
    _removeMinimalStyle() {
        const styleId = this._CSS_CLASSES.MINIMAL_STYLE || 'ypp-minimal-style';
        const style = document.getElementById(styleId);
        if (style) style.remove();
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Check if focus mode is active
     * @returns {boolean}
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Update focus mode settings
     * @param {Object} settings
     */
    update(settings) {
        this._settingsRef = settings;
        this._run(settings);
    }

    /**
     * Toggle a specific feature
     * @param {string} feature - Feature name
     * @param {boolean} enable
     */
    toggleFeature(feature, enable) {
        if (!this._settingsRef) return;

        this._settingsRef[feature] = enable;

        switch (feature) {
            case 'dopamineDetox':
                this._toggleDetox(enable);
                break;
            case 'enableFocusMode':
                this._toggleFocus(enable);
                break;
            case 'cinemaMode':
                this._toggleCinemaMode(enable);
                break;
            case 'minimalMode':
                this._toggleMinimalMode(enable);
                break;
        }
    }
};
