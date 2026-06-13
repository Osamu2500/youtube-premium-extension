/**
 * Focus Mode Feature - Reduces visual distractions and enhances concentration
 * Uses centralized constants for configuration
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

// Helpers
const waitForElement = (selector, timeout = 5000) => {
    return window.YPP.Utils.waitForElement(selector, timeout);
};

/**
 * Focus Mode
 * @class FocusMode
 */
window.YPP.features.FocusMode = class FocusMode extends window.YPP.features.DistractionFreeBase {
    /**
     * Initialize Focus Mode
     * @constructor
     */
    constructor() {
        super('FocusMode');
        this._initConstants();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._CSS_CLASSES = this._CONSTANTS.CSS_CLASSES || {};
    }

    getConfigKey() {
        return 'enableFocusMode';
    }

    async enable() {
        this.observer.register(
            'focus-mode',
            '#contents, ytd-watch-flexy', 
            () => {
                if (this.isEnabled && this.settings) {
                    this._applyFocusState();
                }
            },
            false // Initial apply is done in onUpdate()
        );
        await super.enable();
        this._run();
    }

    async disable() {
        this.observer.unregister('focus-mode');
        // Disable all features
        this._toggleDetox(false);
        this._toggleFocus(false);
        await super.disable();
    }

    async onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (this.utils.isWatchPage()) {
            this._run();
        } else {
            this._toggleDetox(false);
            this._toggleFocus(false);
        }
    }

    async onUpdate() {
        this._run();
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    /**
     * Run focus mode with settings
     * @private
     */
    _run() {
        if (!this.settings) return;

        try {
            this._toggleDetox(this.settings.dopamineDetox);
            this._toggleFocus(this.settings.enableFocusMode);
            this._applyFocusState();
        } catch (error) {
            this.utils.log?.(`Error running focus mode: ${error.message}`, 'FOCUS', 'error');
        }
    }

    /**
     * Apply current focus state to DOM
     * @private
     */
    _applyFocusState() {
        const settings = this.settings;
        if (!settings) return;

        // The Focus layout is applied inside _toggleFocus using DistractionFreeBase
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

        this.utils.log?.(`Dopamine detox ${enable ? 'enabled' : 'disabled'}`, 'FOCUS');
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
            /* V2: Thumbnail Eraser - completely hide images and show gray box */
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-thumbnail img,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-grid-thumbnail img,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} #thumbnail img {
                opacity: 0 !important;
                visibility: hidden !important;
            }
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-grid-thumbnail {
                background-color: #222 !important;
                border: 1px solid #333 !important;
            }

            /* V2: Grayscale UI Enforcement - mute logos and buttons */
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-topbar-logo-renderer,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-subscribe-button-renderer,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} yt-icon,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} .yt-spec-button-shape-next,
            .${this._CSS_CLASSES.DOPAMINE_DETOX || 'ypp-dopamine-detox'} ytd-badge-supported-renderer {
                filter: grayscale(100%) !important;
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
     * Toggle Focus Mode layout
     * @private
     * @param {boolean} enable
     */
    _toggleFocus(enable) {
        if (enable) {
            this.enableDistractionFreeLayout(this._CSS_CLASSES.FOCUS_MODE || 'ypp-focus-mode', {
                hideSidebar: true,
                hideComments: this.settings?.hideComments,
                hideRelated: this.settings?.hideRecommendations,
                hideShorts: this.settings?.hideShorts,
                playerMaxWidth: '1000px'
            });
            
            // Focus Mode hides chat
            if (this.settings?.hideChat) document.body.classList.add('ypp-hide-chat');
            if (this.settings?.hideLiveChat) document.body.classList.add('ypp-hide-live-chat');
            
            this.utils.log?.('Focus mode enabled', 'FOCUS');
        } else {
            this.disableDistractionFreeLayout(this._CSS_CLASSES.FOCUS_MODE || 'ypp-focus-mode', {
                hideSidebar: true,
                hideComments: this.settings?.hideComments,
                hideRelated: this.settings?.hideRecommendations,
                hideShorts: this.settings?.hideShorts,
                playerMaxWidth: '1000px'
            });
            
            document.body.classList.remove('ypp-hide-chat');
            document.body.classList.remove('ypp-hide-live-chat');
            
            this.utils.log?.('Focus mode disabled', 'FOCUS');
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Toggle a specific feature
     * @param {string} feature - Feature name
     * @param {boolean} enable
     */
    toggleFeature(feature, enable) {
        if (!this.settings) return;

        this.settings[feature] = enable;

        switch (feature) {
            case 'dopamineDetox':
                this._toggleDetox(enable);
                break;
            case 'enableFocusMode':
                if (!enable && this._isStrictModeActive()) {
                    this.utils.createToast?.('Strict Mode Active! Solve math to disable.', 5000);
                    this._promptStrictMathUnlock();
                    // Revert UI toggle since we blocked it
                    // The toggle button will need its own sync, but for now we just block internal disable
                    return;
                }
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

    // =========================================================================
    // FOCUS MODE V2 - STRICT MODE TIMER
    // =========================================================================

    _isStrictModeActive() {
        if (!this.strictModeEndTime) return false;
        return Date.now() < this.strictModeEndTime;
    }

    activateStrictMode(minutes = 30) {
        this.strictModeEndTime = Date.now() + (minutes * 60 * 1000);
        this.utils.createToast?.(`Strict Mode Locked for ${minutes}m`);
        this.toggleFeature('enableFocusMode', true);
        this.toggleFeature('dopamineDetox', true);
    }

    _promptStrictMathUnlock() {
        const num1 = Math.floor(Math.random() * 50) + 15;
        const num2 = Math.floor(Math.random() * 50) + 15;
        const answer = num1 * num2;
        
        const response = prompt(`To break Strict Mode, solve this: What is ${num1} * ${num2}?`);
        if (response && parseInt(response.trim()) === answer) {
            this.strictModeEndTime = null;
            this.toggleFeature('enableFocusMode', false);
            this.toggleFeature('dopamineDetox', false);
            this.utils.createToast?.('Strict Mode Unlocked!');
        } else {
            alert('Incorrect. Focus Mode remains active.');
        }
    }
};
