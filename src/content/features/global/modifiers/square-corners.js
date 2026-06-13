window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Square Corners
 * Removes border-radius from all video thumbnails and UI elements.
 */
window.YPP.features.SquareCorners = class SquareCorners extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('SquareCorners', 'useSquareCorners', 'ypp-use-square-corners');
    }
};
