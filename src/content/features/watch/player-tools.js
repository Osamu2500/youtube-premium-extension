/**
 * Player Tools
 * Adds custom playback speed and cinema filters to the YouTube player
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
        this._videoRef = null;
        this._filterPanel = null;
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

        if (this._settings?.enableCustomSpeed || this._settings?.enableCinemaFilters) {
            this._enable();
        } else {
            this._disable();
        }
    }

    /**
     * Enable player tools
     * @private
     */
    _enable() {
        if (this._isActive) return;

        this._isActive = true;
        this._Utils.log?.('Enabled Player Tools', 'PLAYER_TOOLS');
        this._startMonitoring();
    }

    /**
     * Disable player tools
     * @private
     */
    _disable() {
        if (!this._isActive) return;

        this._isActive = false;
        this._removeControls();
        this._cleanupListeners();
    }

    // =========================================================================
    // MONITORING
    // =========================================================================

    /**
     * Start monitoring for player initialization
     * @private
     */
    _startMonitoring() {
        this._checkForPlayer();

        // Use requestAnimationFrame for periodic checks instead of setInterval
        const checkPlayer = () => {
            if (this._isActive) {
                this._checkForPlayer();
                requestAnimationFrame(checkPlayer);
            }
        };
        requestAnimationFrame(checkPlayer);
    }

    /**
     * Check if player controls need injection
     * @private
     */
    _checkForPlayer() {
        if (!this._isActive) return;

        // Cache video element lookup
        if (!this._videoRef || !this._videoRef.isConnected) {
            this._videoRef = document.querySelector(this._SELECTORS.VIDEO);
        }

        const rightControls = document.querySelector(this._SELECTORS.VIDEO_CONTROLS);
        if (rightControls && !document.querySelector(`#${this._CSS_CLASSES.PLAYER_TOOLS}`)) {
            this._injectControls(rightControls);
        }

        // Continuously apply filters (only if needed)
        this._applyFilters();
    }

    // =========================================================================
    // CONTROLS INJECTION
    // =========================================================================

    /**
     * Inject custom controls into the player
     * @private
     * @param {Element} container - Container element to inject into
     */
    _injectControls(container) {
        if (this._controlsInjected) return;

        const toolsDiv = document.createElement('div');
        toolsDiv.id = this._CSS_CLASSES.PLAYER_TOOLS;
        toolsDiv.style.cssText = `
            display: flex;
            align-items: center;
            margin-right: 10px;
            vertical-align: top;
        `;

        // Custom Speed Input
        if (this._settings?.enableCustomSpeed) {
            this._createSpeedInput(toolsDiv);
        }

        // Cinema Filters Toggle
        if (this._settings?.enableCinemaFilters) {
            this._createFilterToggle(toolsDiv);
        }

        // Insert before settings gear
        container.insertBefore(toolsDiv, container.firstChild);
        this._controlsInjected = true;
    }

    /**
     * Create speed input control
     * @private
     * @param {Element} parent - Parent element
     */
    _createSpeedInput(parent) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = this._PLAYER.SPEED_STEP || 0.1;
        input.min = this._PLAYER.SPEED_MIN || 0.1;
        input.max = this._PLAYER.SPEED_MAX || 5.0;
        input.value = '1.0';
        input.title = 'Custom Speed (e.g. 2.5)';
        input.style.cssText = `
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
        `;

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

        // Listen for rate changes from other sources
        const video = document.querySelector(this._SELECTORS.VIDEO);
        if (video) {
            video.addEventListener('ratechange', this._boundHandleRateChange);
        }

        this._speedInput = input;
        parent.appendChild(input);
    }

    /**
     * Create filter toggle button
     * @private
     * @param {Element} parent - Parent element
     */
    _createFilterToggle(parent) {
        const btn = document.createElement('button');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="white">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
        `;
        btn.title = 'Cinema Filters';
        btn.className = 'ytp-button';
        btn.style.cssText = `
            width: 30px;
            opacity: 0.9;
        `;

        // Create filter panel
        this._filterPanel = this._createFilterPanel();
        document.body.appendChild(this._filterPanel);

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = this._filterPanel.style.display !== 'none';
            this._filterPanel.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this._positionFilterPanel(btn);
            }
        });

        // Hide panel when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (this._filterPanel &&
                !this._filterPanel.contains(e.target) &&
                e.target !== btn) {
                this._filterPanel.style.display = 'none';
            }
        });

        parent.appendChild(btn);
    }

    /**
     * Position filter panel near button
     * @private
     * @param {Element} btn - Button element
     */
    _positionFilterPanel(btn) {
        const rect = btn.getBoundingClientRect();
        this._filterPanel.style.top = (rect.top - 140) + 'px';
        this._filterPanel.style.left = (rect.left - 50) + 'px';
    }

    // =========================================================================
    // FILTER PANEL
    // =========================================================================

    /**
     * Create filter panel UI
     * @private
     * @returns {HTMLElement}
     */
    _createFilterPanel() {
        const panel = document.createElement('div');
        panel.id = this._CSS_CLASSES.FILTER_PANEL;
        panel.style.cssText = `
            position: fixed;
            display: none;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            width: 200px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            color: white;
            font-family: Roboto, Arial;
        `;

        const { FILTER_MIN = 50, FILTER_MAX = 200, FILTER_DEFAULT = 100 } = this._PLAYER;

        // Brightness slider
        panel.appendChild(this._createSlider('Brightness', FILTER_MIN, FILTER_MAX, FILTER_DEFAULT, (val) => {
            this._settings.filterBrightness = val;
            this._applyFilters();
        }));

        // Contrast slider
        panel.appendChild(this._createSlider('Contrast', FILTER_MIN, FILTER_MAX, FILTER_DEFAULT, (val) => {
            this._settings.filterContrast = val;
            this._applyFilters();
        }));

        // Reset button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        resetBtn.style.cssText = `
            width: 100%;
            padding: 6px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 11px;
            margin-top: 8px;
        `;
        resetBtn.addEventListener('click', () => this._resetFilters(panel));
        panel.appendChild(resetBtn);

        return panel;
    }

    /**
     * Create a slider control
     * @private
     * @param {string} label - Slider label
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} value - Default value
     * @param {Function} callback - Change callback
     * @returns {HTMLElement}
     */
    _createSlider(label, min, max, value, callback) {
        const container = document.createElement('div');
        container.style.marginBottom = '12px';

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 4px;
        `;
        header.innerHTML = `<span>${label}</span><span id="val-${label}">${value}%</span>`;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.value = value;
        input.style.cssText = `
            width: 100%;
            cursor: pointer;
        `;

        input.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) {
                header.querySelector(`#val-${label}`).textContent = val + '%';
                callback(val);
            }
        });

        container.appendChild(header);
        container.appendChild(input);
        return container;
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
        const video = document.querySelector(this._SELECTORS.VIDEO);
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
        const video = document.querySelector(this._SELECTORS.VIDEO);
        if (video && this._speedInput && document.activeElement !== this._speedInput) {
            this._speedInput.value = video.playbackRate.toFixed(1);
        }
    }

    // =========================================================================
    // FILTERS
    // =========================================================================

    /**
     * Apply video filters
     * @private
     */
    _applyFilters() {
        // Use cached reference if available
        const video = this._videoRef || document.querySelector(this._SELECTORS.VIDEO);
        if (!video) return;

        const brightness = this._settings?.filterBrightness || 100;
        const contrast = this._settings?.filterContrast || 100;

        // Optimization: Create filter string once
        const filterString = (brightness === 100 && contrast === 100) 
            ? '' 
            : `brightness(${brightness}%) contrast(${contrast}%)`;

        // Only update if changed (Browser optimization usually handles this, but good to be explicit)
        if (video.style.filter !== filterString) {
            video.style.filter = filterString;
        }
    }

    /**
     * Reset filters to default
     * @private
     * @param {HTMLElement} panel - Filter panel element
     */
    _resetFilters(panel) {
        const inputs = panel.querySelectorAll('input[type="range"]');
        inputs.forEach(input => {
            input.value = 100;
            input.dispatchEvent(new Event('input'));
        });
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

        const panel = document.querySelector(`#${this._CSS_CLASSES.FILTER_PANEL}`);
        if (panel) panel.remove();

        this._controlsInjected = false;
        this._filterPanel = null;
        this._speedInput = null;
    }

    /**
     * Clean up event listeners
     * @private
     */
    _cleanupListeners() {
        const video = document.querySelector(this._SELECTORS.VIDEO);
        if (video) {
            video.removeEventListener('ratechange', this._boundHandleRateChange);
            video.style.filter = '';
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
        const video = document.querySelector(this._SELECTORS.VIDEO);
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

    /**
     * Get current filter settings
     * @returns {Object}
     */
    getFilters() {
        return {
            brightness: this._settings?.filterBrightness || 100,
            contrast: this._settings?.filterContrast || 100
        };
    }

    /**
     * Set filter values
     * @param {number} brightness
     * @param {number} contrast
     */
    setFilters(brightness, contrast) {
        if (this._settings) {
            this._settings.filterBrightness = brightness;
            this._settings.filterContrast = contrast;
            this._applyFilters();
        }
    }
};
