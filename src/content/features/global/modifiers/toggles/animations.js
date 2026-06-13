window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Animations = class Animations extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('Animations');
    }

    getConfigKey() {
        // Only run if the user toggles animations or reduced motion
        return null;
    }

    async enable() {
        // BaseToggleFeature handles enabling via CSS_CLASSES, but since this
        // uses multiple classes and inverted logic (enableAnimations = false -> add no-animations class)
        // we override enable/disable to handle it properly.
        this._updateClasses();
    }

    async disable() {
        document.documentElement.classList.remove('ypp-no-animations');
        document.documentElement.classList.remove('ypp-reduced-motion');
    }

    async onUpdate() {
        this._updateClasses();
    }

    _updateClasses() {
        const s = this.settings || {};
        document.documentElement.classList.toggle('ypp-no-animations', s.enableAnimations === false);
        document.documentElement.classList.toggle('ypp-reduced-motion', !!s.reducedMotion);
    }
};
