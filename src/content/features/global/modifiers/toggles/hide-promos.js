/**
 * Feature: Hide Promos
 * Description: Hides promotional shelves like movies, games, or YouTube Premium offers in the feed.
 * Strategy: Fast CSS toggle applying display: none to the relevant UI components.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HidePromos = class HidePromos extends window.YPP.features.BaseToggleFeature {
    constructor() { super('HidePromos', 'hidePromoShelves', 'ypp-hide-promo-shelves'); }
};
