window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Square Corners
 * Removes border-radius from all video thumbnails and UI elements.
 */
window.YPP.features.SquareCorners = class SquareCorners extends window.YPP.features.BaseFeature {
    constructor() {
        super('SquareCorners');
    }

    getConfigKey() {
        return 'useSquareCorners';
    }

    async enable() {
        document.body.classList.add('ypp-use-square-corners');
    }

    async disable() {
        document.body.classList.remove('ypp-use-square-corners');
    }
};
