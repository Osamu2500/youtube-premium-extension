/**
 * Feature: Hide Explore Topics
 * Description: Hides the category chips/topics bar on the homepage and other feeds.
 * Strategy: Fast CSS toggle applying display: none to yt-chip-cloud-renderer elements.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideExploreTopics = class HideExploreTopics extends window.YPP.features.BaseToggleFeature {
    /**
     * Initializes the toggle feature.
     * @param {string} settingsKey - The key in YPP settings (hideExploreTopics).
     * @param {string} cssClass - The global CSS class applied to the body.
     */
    constructor() {
        super('HideExploreTopics', 'hideExploreTopics', 'ypp-hide-explore-topics');
    }
};
