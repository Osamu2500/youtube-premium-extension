window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GrayscaleThumbnails = class GrayscaleThumbnails extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('GrayscaleThumbnails', 'grayscaleThumbnails', window.YPP.CONSTANTS?.CSS_CLASSES?.GRAYSCALE_THUMBNAILS || 'ypp-grayscale-thumbnails');
    }
};
