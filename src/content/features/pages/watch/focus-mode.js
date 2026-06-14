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
window.YPP.features.FocusMode = class FocusMode extends window.YPP.features.BaseFeature {
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
        // Detox styles are now handled globally in styles.css via the ypp-dopamine-detox class
    }

    /**
     * Remove detox style
     * @private
     */
    _removeDetoxStyle() {
        // Detox styles are now handled globally in styles.css via the ypp-dopamine-detox class
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
            // WatchPageManager handles adding/removing body.ypp-focus-mode class.
            
            // Focus Mode hides chat
            if (this.settings?.hideChat) document.body.classList.add('ypp-hide-chat');
            if (this.settings?.hideLiveChat) document.body.classList.add('ypp-hide-live-chat');
            
            this.utils.log?.('Focus mode enabled', 'FOCUS');
        } else {
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
        
        this._createMathModal(num1, num2, answer);
    }

    _createMathModal(num1, num2, answer) {
        if (document.getElementById('ypp-strict-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'ypp-strict-modal';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
            z-index: 999999; display: flex; align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgba(30, 30, 30, 0.9); border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px; padding: 32px; width: 340px; text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); font-family: 'Inter', sans-serif;
            color: #fff; transition: transform 0.2s ease;
        `;

        modal.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">🔒 Strict Mode Active</div>
            <div style="font-size: 14px; color: #aaa; margin-bottom: 24px;">To unlock, solve the equation:</div>
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 24px; color: #ff4e45;">${num1} × ${num2}</div>
            <input type="number" id="ypp-strict-input" placeholder="Your Answer" style="
                width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(0, 0, 0, 0.5); color: #fff; font-size: 18px; text-align: center;
                box-sizing: border-box; outline: none; margin-bottom: 16px;
            " autocomplete="off" />
            <div style="display: flex; gap: 12px;">
                <button id="ypp-strict-cancel" style="
                    flex: 1; padding: 12px; border-radius: 8px; border: none; background: rgba(255,255,255,0.1);
                    color: #fff; cursor: pointer; font-size: 14px; font-weight: 600;
                ">Cancel</button>
                <button id="ypp-strict-submit" style="
                    flex: 1; padding: 12px; border-radius: 8px; border: none; background: #ff4e45;
                    color: #fff; cursor: pointer; font-size: 14px; font-weight: 600;
                ">Unlock</button>
            </div>
            <div id="ypp-strict-error" style="color: #ff4e45; font-size: 12px; margin-top: 12px; min-height: 15px;"></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = document.getElementById('ypp-strict-input');
        const submitBtn = document.getElementById('ypp-strict-submit');
        const cancelBtn = document.getElementById('ypp-strict-cancel');
        const errorDiv = document.getElementById('ypp-strict-error');

        input.focus();

        const validate = () => {
            if (parseInt(input.value.trim()) === answer) {
                this.strictModeEndTime = null;
                this.toggleFeature('enableFocusMode', false);
                this.toggleFeature('dopamineDetox', false);
                this.utils.createToast?.('Strict Mode Unlocked!');
                overlay.remove();
                
                // Fire a click event on the toggle in the popup if it's open
                const focusToggle = document.querySelector('#enableFocusMode');
                if (focusToggle) focusToggle.checked = false;
            } else {
                errorDiv.textContent = 'Incorrect. Try again.';
                input.value = '';
                input.focus();
                
                // Shake animation
                modal.style.transform = 'translateX(-10px)';
                setTimeout(() => modal.style.transform = 'translateX(10px)', 50);
                setTimeout(() => modal.style.transform = 'translateX(-10px)', 100);
                setTimeout(() => modal.style.transform = 'translateX(10px)', 150);
                setTimeout(() => modal.style.transform = 'translateX(0)', 200);
            }
        };

        submitBtn.onclick = validate;
        cancelBtn.onclick = () => overlay.remove();
        input.onkeydown = (e) => {
            if (e.key === 'Enter') validate();
            if (e.key === 'Escape') overlay.remove();
        };
    }
};
