window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.CleanMixUrls = class CleanMixUrls extends window.YPP.features.BaseFeature {
    constructor() {
        super('CleanMixUrls');
        this.handleMixClick = this.handleMixClick.bind(this);
    }

    getConfigKey() {
        return 'cleanMixUrls';
    }

    async enable() {
        await super.enable();
        this.addListener(document, 'click', this.handleMixClick, true);
    }

    handleMixClick(e) {
        if (!this.isEnabled) return;
        
        const a = e.target.closest('a[href]');
        if (a && a.href.includes('list=RD')) {
            try {
                const url = new URL(a.href, window.location.origin);
                const list = url.searchParams.get('list');
                
                if (list && list.startsWith('RD')) {
                    url.searchParams.delete('list');
                    url.searchParams.delete('start_radio');
                    
                    a.href = url.pathname + url.search + url.hash;
                    this.utils?.log('Cleaned Mix URL on click:', a.href, 'CONTENT');
                }
            } catch (err) {
                // Ignore URL parsing errors
            }
        }
    }
};
