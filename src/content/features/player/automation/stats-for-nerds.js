window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StatsForNerds = class StatsForNerds extends window.YPP.features.BaseFeature {
    constructor() {
        super('StatsForNerds');
    }

    getConfigKey() {
        return 'enableStatsForNerds';
    }

    async enable() {
        await super.enable();
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('stats-nerds', 'video', (elements) => {
                this._openStats();
            }, true);
        }
        
        this._openStats();
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('stats-nerds');
        }
        
        // Try to close it by clicking the close button on the stats panel
        const closeBtn = document.querySelector('.html5-video-info-panel-close');
        if (closeBtn) {
            closeBtn.click();
        }
    }

    _openStats() {
        if (!this.isEnabled) return;
        
        const video = document.querySelector('video');
        if (!video) return;

        // If stats panel is already open, do nothing
        if (document.querySelector('.html5-video-info-panel[style*="display: block"]')) {
            return;
        }

        // YouTube's player API has a method to toggle stats
        const player = document.querySelector('.html5-video-player');
        if (player && typeof player.toggleStats === 'function') {
            player.toggleStats();
            this.utils?.log('Auto-opened Stats for Nerds via API', 'STATS', 'debug');
            
            if (window.YPP.sharedObserver) {
                window.YPP.sharedObserver.unregister('stats-nerds');
            }
        } else {
            // Fallback: Dispatch a contextmenu event to trigger the menu, then click the item
            // This is brittle so we prefer the API.
        }
    }
};
