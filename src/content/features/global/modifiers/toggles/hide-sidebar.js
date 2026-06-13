/**
 * Feature: Hide Sidebar
 * Description: Completely removes the secondary sidebar in watch mode and pushes the primary content to fill the space.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HideSidebar = class HideSidebar extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HideSidebar', 'hideSidebar', 'ypp-hide-sidebar'); }
};
