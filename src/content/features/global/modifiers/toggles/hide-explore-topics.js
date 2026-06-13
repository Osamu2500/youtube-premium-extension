window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Hide Explore Topics
 * Hides the topic chips bar globally.
 */
window.YPP.features.HideExploreTopics = class HideExploreTopics extends window.YPP.features.BaseToggleFeature {
    constructor() {
        super('HideExploreTopics', 'hideExploreTopics', 'ypp-hide-explore-topics');
    }
};
