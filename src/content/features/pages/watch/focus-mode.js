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
            
            // Actively eject DOM nodes
            this._ejectDistractions();
            
            this.utils.log?.('Focus mode enabled', 'FOCUS');
        } else {
            document.body.classList.remove('ypp-hide-chat');
            document.body.classList.remove('ypp-hide-live-chat');
            
            // Restore DOM nodes
            this._restoreDistractions();
            
            this.utils.log?.('Focus mode disabled', 'FOCUS');
        }
    }

    // =========================================================================
    // DOM EJECTION (True Distraction Removal)
    // =========================================================================

    _ejectDistractions() {
        if (!this.ejectedNodes) this.ejectedNodes = new Map();

        // Target containers
        const targets = {
            'comments': document.querySelector('#comments'),
            'related': document.querySelector('#secondary #related')
        };

        for (const [key, container] of Object.entries(targets)) {
            if (container && container.children.length > 0) {
                // Save children in a document fragment to preserve Polymer bindings
                const fragment = document.createDocumentFragment();
                while (container.firstChild) {
                    fragment.appendChild(container.firstChild);
                }
                this.ejectedNodes.set(key, { container, fragment });
            }
        }
    }

    _restoreDistractions() {
        if (!this.ejectedNodes) return;

        for (const [key, data] of this.ejectedNodes.entries()) {
            if (data.container && data.fragment) {
                data.container.appendChild(data.fragment);
            }
        }
        this.ejectedNodes.clear();
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
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(15px);
            z-index: 999999; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgba(25, 25, 30, 0.7); backdrop-filter: blur(20px) saturate(150%);
            -webkit-backdrop-filter: blur(20px) saturate(150%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px; padding: 40px; width: 380px; text-align: center;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            font-family: 'Inter', Roboto, sans-serif;
            color: #fff; transform: scale(0.9) translateY(20px); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        modal.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 16px;">🔒</div>
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Strict Mode Active</div>
            <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 32px;">Solve the equation to unlock Focus Mode:</div>
            <div style="font-size: 36px; font-weight: 800; margin-bottom: 32px; color: #ff4e45; text-shadow: 0 4px 12px rgba(255, 78, 69, 0.3);">${num1} × ${num2}</div>
            <input type="number" id="ypp-strict-input" placeholder="Your Answer" style="
                width: 100%; padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(0, 0, 0, 0.3); color: #fff; font-size: 20px; text-align: center;
                box-sizing: border-box; outline: none; margin-bottom: 20px; transition: border-color 0.2s, box-shadow 0.2s;
            " autocomplete="off" onfocus="this.style.borderColor='#ff4e45'; this.style.boxShadow='0 0 0 3px rgba(255, 78, 69, 0.2)';" onblur="this.style.borderColor='rgba(255, 255, 255, 0.15)'; this.style.boxShadow='none';" />
            <div style="display: flex; gap: 16px;">
                <button id="ypp-strict-cancel" style="
                    flex: 1; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
                    color: #fff; cursor: pointer; font-size: 15px; font-weight: 600; transition: background 0.2s;
                " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">Cancel</button>
                <button id="ypp-strict-submit" style="
                    flex: 1; padding: 14px; border-radius: 12px; border: none; background: #ff4e45;
                    color: #fff; cursor: pointer; font-size: 15px; font-weight: 600; transition: background 0.2s; box-shadow: 0 4px 12px rgba(255, 78, 69, 0.3);
                " onmouseover="this.style.background='#ff665e'" onmouseout="this.style.background='#ff4e45'">Unlock</button>
            </div>
            <div id="ypp-strict-error" style="color: #ff4e45; font-size: 13px; margin-top: 16px; min-height: 20px; font-weight: 500;"></div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1) translateY(0)';
        });

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
                
                // Shake animation (Anime.js style via CSS transition manipulation)
                if (window.anime) {
                    window.anime({
                        targets: modal,
                        translateX: [
                            { value: -10, duration: 50 },
                            { value: 10, duration: 50 },
                            { value: -10, duration: 50 },
                            { value: 10, duration: 50 },
                            { value: 0, duration: 50 }
                        ],
                        easing: 'easeInOutSine'
                    });
                } else {
                    modal.style.transition = 'transform 0.1s ease';
                    modal.style.transform = 'scale(1) translateX(-15px)';
                    setTimeout(() => modal.style.transform = 'scale(1) translateX(15px)', 50);
                    setTimeout(() => modal.style.transform = 'scale(1) translateX(-15px)', 100);
                    setTimeout(() => modal.style.transform = 'scale(1) translateX(15px)', 150);
                    setTimeout(() => modal.style.transform = 'scale(1) translateX(0)', 200);
                    setTimeout(() => modal.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 300);
                }
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
