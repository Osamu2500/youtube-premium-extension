// Focus Mode Feature
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.FocusMode = class FocusMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
    }

    run(settings) {
        this.toggleDetox(settings.dopamineDetox);
        this.toggleFocus(settings.enableFocusMode);
    }

    toggleDetox(enable) {
        // Toggles Grayscale
        document.body.classList.toggle(this.CONSTANTS.CSS_CLASSES.DOPAMINE_DETOX, enable);
    }

    toggleFocus(enable) {
        // Toggles generic distraction hiding
        document.body.classList.toggle('ypp-focus-mode', enable);
    }
};
