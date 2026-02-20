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
window.YPP.features.PlayerTools = class PlayerTools {
    /**
     * Initialize Player Tools
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

    /**
     * Run the feature with settings
     * @param {Object} settings - User settings
     */
    run(settings) {
        this._update(settings);
    }

    /**
     * Update settings
     * @private
     * @param {Object} settings - Updated settings
     */
    _update(settings) {
        this._settings = settings || {};

        if (this._settings.enableCustomSpeed) {
            this._enable();
        } else {
            this._disable();
        }
    }
    
    // Alias common name
    update(settings) {
        this._update(settings);
    }

    /**
     * Enable player tools
     * @private
     */
    _enable() {
        if (this._isActive) return;

        this._isActive = true;
        this._Utils.log('Enabled Player Tools', 'PLAYER_TOOLS');
        
        // Inject styles
        this._injectStyles();
        
        // Start monitoring
        this._startMonitoring();
    }

    /**
     * Disable player tools
     * @private
     */
    _disable() {
        this._isActive = false;
        this._removeControls();
        this._cleanupListeners();
        this._Utils.removeStyle('ypp-player-tools-style');
    }

    // =========================================================================
    // MONITORING
    // =========================================================================

    /**
     * Start monitoring for player initialization
     * @private
     */
    async _startMonitoring() {
        if (!this._Utils.pollFor) return;

        try {
            const controls = await this._Utils.pollFor(() => document.querySelector(this._SELECTORS.VIDEO_CONTROLS), 10000, 500);
            if (!this._isActive || !controls) return;
            
            this._injectControls(controls);
            
            // Re-check on navigation
            window.addEventListener('yt-navigate-finish', () => this._checkForPlayer());
        } catch (error) {
            this._Utils.log?.('PlayerTools timeout waiting for controls', 'PLAYER_TOOLS', 'warn');
        }
    }

    /**
     * Check if player controls need injection (e.g. after nav)
     * @private
     */
    _checkForPlayer() {
        if (!this._isActive) return;

        // Re-inject if missing
        const rightControls = document.querySelector(this._SELECTORS.VIDEO_CONTROLS);
        const existingTools = document.querySelector(`#${this._CSS_CLASSES.PLAYER_TOOLS}`);
        
        if (rightControls && !existingTools) {
            this._controlsInjected = false;
            this._injectControls(rightControls);
        }
    }

    // =========================================================================
    // CONTROLS INJECTION
    // =========================================================================
    
    _injectStyles() {
        const css = `
            #${this._CSS_CLASSES.PLAYER_TOOLS} {
                display: flex;
                align-items: center;
                margin-right: 10px;
                vertical-align: top;
            }
            .ypp-speed-input {
                width: 40px;
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                border-radius: 4px;
                padding: 2px 4px;
                margin-right: 8px;
                font-size: 12px;
                text-align: center;
                pointer-events: auto;
            }
            .ypp-toast-mini {
                position: absolute;
                top: 10%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                animation: fadeInOut 2s forwards;
            }
            @keyframes fadeInOut {
                0% { opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        this._Utils.addStyle(css, 'ypp-player-tools-style');
    }

    /**
     * Inject custom controls into the player
     * @private
     * @param {Element} container - Container element to inject into
     */
    _injectControls(container) {
        if (this._controlsInjected) return;

        const toolsDiv = document.createElement('div');
        toolsDiv.id = this._CSS_CLASSES.PLAYER_TOOLS;

        // Custom Speed Input
        if (this._settings?.enableCustomSpeed) {
            this._createSpeedInput(toolsDiv);
        }

        // Insert before settings gear
        if (container.firstChild) {
            container.insertBefore(toolsDiv, container.firstChild);
        } else {
            container.appendChild(toolsDiv);
        }
        this._controlsInjected = true;
    }

    /**
     * Create speed input control
     * @private
     * @param {Element} parent - Parent element
     */
    _createSpeedInput(parent) {
        const input = document.createElement('input');
        input.className = 'ypp-speed-input';
        input.type = 'number';
        input.step = this._PLAYER.SPEED_STEP || 0.1;
        input.min = this._PLAYER.SPEED_MIN || 0.1;
        input.max = this._PLAYER.SPEED_MAX || 5.0;
        input.value = this._Utils.getVideo()?.playbackRate?.toFixed(1) || '1.0';
        input.title = 'Custom Speed (e.g. 2.5)';

        input.addEventListener('change', (e) => {
            let speed = parseFloat(e.target.value);
            const { SPEED_MIN = 0.1, SPEED_MAX = 5.0 } = this._PLAYER;

            // Validate and clamp
            if (isNaN(speed) || speed < SPEED_MIN) {
                speed = SPEED_MIN;
            } else if (speed > SPEED_MAX) {
                speed = SPEED_MAX;
            }

            e.target.value = speed.toFixed(1);
            this._setSpeed(speed);
        });
        
        // Prevent key propagation (so typing 2 doesn't skip video)
        input.addEventListener('keydown', (e) => e.stopPropagation());

        // Listen for rate changes from other sources
        const video = document.querySelector(this._SELECTORS.VIDEO || 'video');
        if (video) {
            video.addEventListener('ratechange', this._boundHandleRateChange);
        }

        this._speedInput = input;
        parent.appendChild(input);
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
     * Remove injected controls
     * @private
     */
    _removeControls() {
        const tools = document.querySelector(`#${this._CSS_CLASSES.PLAYER_TOOLS}`);
        if (tools) tools.remove();

        this._controlsInjected = false;
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
