window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideExploreTopics = class HideExploreTopics extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideExploreTopics');
        this.selectors = 'ytd-feed-filter-chip-bar-renderer, yt-chip-cloud-renderer, yt-related-chip-cloud-renderer, #chips-wrapper';
    }

    getConfigKey() {
        return 'hideExploreTopics';
    }

    async enable() {
        await super.enable();
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('hide-explore-topics', this.selectors, (elements) => {
                this._processElements(elements);
            });
        }
        
        this.onPageChange();
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('hide-explore-topics');
        }
        
        document.querySelectorAll(this.selectors).forEach(el => {
            el.style.removeProperty('display');
            el.removeAttribute('data-ypp-processed-explore');
        });
    }

    onPageChange() {
        if (!this.isEnabled) return;
        
        const existing = document.querySelectorAll(this.selectors);
        if (existing.length) {
            this._processElements(Array.from(existing));
        }
    }

    _processElements(elements) {
        for (const el of elements) {
            if (el.hasAttribute('data-ypp-processed-explore')) continue;
            
            // Forcefully hide using the DOM mastery pattern
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-ypp-processed-explore', 'true');
            
            this.utils?.log('Force hid explore topics bar', 'EXPLORE', 'debug');
        }
    }
};
