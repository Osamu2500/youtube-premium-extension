/**
 * Player Tools
 * Adds custom playback speed to the YouTube player
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Player Tools
 * @class PlayerTools
 */
window.YPP.features.PlayerTools = class PlayerTools extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'enableCustomSpeed'; }
    /**
     * Initialize Player Tools
     * @constructor
     */
    constructor() {
        super('PlayerTools');
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
        this._PLAYER = this._CONSTANTS.PLAYER || {};
        this._CSS_CLASSES = this._CONSTANTS.CSS_CLASSES || {};
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this._isActive = false;
        this._settings = null;
        this._controlsInjected = false;
        this._speedInput = null;
        this._Utils = window.YPP.Utils || {};

        // Rate change listener binding
        this._boundHandleRateChange = this._onRateChange.bind(this);
    }

    enable() {
        this.utils.log('Enabled Player Tools', 'PLAYER_TOOLS');
        
        // Start monitoring
        this._startMonitoring();
    }

    disable() {
        this._removeControls();
        this._cleanupListeners();
        // BaseFeature automatically unbinds added listeners on disable
    }

    // =========================================================================
    // MONITORING
    // =========================================================================

    /**
     * Start monitoring for player initialization
     * @private
     */
    async _startMonitoring() {
        if (!this.utils.pollFor) return;

        try {
            const controls = await this.utils.pollFor(() => document.querySelector(this._SELECTORS.VIDEO_CONTROLS), 10000, 500);
            if (!this._isActive || !controls) return;
            
            this._injectControls(controls);
            
            // Re-check on navigation (Memory-managed)
            this.addListener(window, 'yt-navigate-finish', () => this._checkForPlayer());
        } catch (error) {
            this.utils.log?.('PlayerTools timeout waiting for controls', 'PLAYER_TOOLS', 'debug');
        }
    }

    /**
     * Check if player controls need injection (e.g. after nav)
     * @private
     */
    _checkForPlayer() {
        if (!this._isActive) return;

        // Re-inject if missing. UIManager handles duplicate prevention internally.
        const rightControls = window.YPP.DomAPI?.getVideoControls();
        if (rightControls) {
            this._injectControls();
        }
    }

    // =========================================================================
    // CONTROLS INJECTION
    // =========================================================================
    


    /**
     * Inject custom controls into the player via UIManager
     * @private
     */
    _injectControls() {
        // Feature disabled per user request: removed the custom speed input box from the player bar
        return;
    }



    // =========================================================================
    // PLAYBACK CONTROL
    // =========================================================================

    /**
     * Set video playback speed
     * @private
     * @param {number} speed - Playback speed
     */
    _setSpeed(speed) {
        const video = document.querySelector(this._SELECTORS.VIDEO || 'video');
        if (video) {
            const clamped = Math.max(this._PLAYER.SPEED_MIN || 0.1, Math.min(16, speed));
            video.playbackRate = clamped;
        }
    }

    /**
     * Handle rate change event
     * @private
     */
    _onRateChange() {
        const video = document.querySelector(this._SELECTORS.VIDEO || 'video');
        if (video && this._speedInput && document.activeElement !== this._speedInput) {
            this._speedInput.value = video.playbackRate.toFixed(1);
        }
    }

    // =========================================================================
    // CLEANUP
    // =========================================================================

    /**
     * Remove injected controls via UIManager
     * @private
     */
    _removeControls() {
        if (window.YPP.ui && window.YPP.ui.manager) {
            window.YPP.ui.manager.remove('btn-custom-speed-input');
            window.YPP.ui.manager.remove('custom-speed-input');
        }
        this._speedInput = null;
    }

    /**
     * Clean up event listeners
     * @private
     */
    _cleanupListeners() {
        const video = document.querySelector(this._SELECTORS.VIDEO || 'video');
        if (video) {
            video.removeEventListener('ratechange', this._boundHandleRateChange);
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Check if player tools are active
     * @returns {boolean}
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Get current speed setting
     * @returns {number}
     */
    getSpeed() {
        const video = document.querySelector(this._SELECTORS.VIDEO || 'video');
        return video?.playbackRate || 1;
    }

    /**
     * Set custom speed
     * @param {number} speed - Playback speed
     */
    setSpeed(speed) {
        this._setSpeed(speed);
        if (this._speedInput) {
            this._speedInput.value = speed.toFixed(1);
        }
    }
};
