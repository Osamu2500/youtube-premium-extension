/**
 * Focus Mode Feature - Reduces visual distractions
 * @class FocusMode
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.FocusMode = class FocusMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
    }

    /**
     * Enable focus mode features
     * @param {Object} settings - User settings object
     */
    enable(settings) {
        this.run(settings);
    }

    /**
     * Disable focus mode features
     */
    disable() {
        try {
            this.toggleDetox(false);
            this.toggleFocus(false);
        } catch (error) {
            this.Utils?.log(`Error disabling focus mode: ${error.message}`, 'FOCUS', 'error');
        }
    }

    /**
     * Update focus mode settings
     * @param {Object} settings - Updated settings
     */
    update(settings) {
        this.run(settings);
    }

    /**
     * Apply focus mode settings
     * @param {Object} settings - Settings object
     * @private
     */
    run(settings) {
        try {
            this.toggleDetox(settings.dopamineDetox);
            this.toggleFocus(settings.enableFocusMode);
        } catch (error) {
            this.Utils?.log(`Error running focus mode: ${error.message}`, 'FOCUS', 'error');
        }
    }

    /**
     * Toggle grayscale dopamine detox mode
     * @param {boolean} enable - Enable or disable
     * @private
     */
    toggleDetox(enable) {
        document.body.classList.toggle(this.CONSTANTS.CSS_CLASSES.DOPAMINE_DETOX, enable);
    }

    /**
     * Toggle generic distraction hiding
     * @param {boolean} enable - Enable or disable
     * @private
     */
    toggleFocus(enable) {
        document.body.classList.toggle('ypp-focus-mode', enable);
    }
};
