window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideComments = class HideComments extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideComments', 'hideComments', 'ypp-hide-comments'); }
};
