window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.RedirectShorts = class RedirectShorts extends window.YPP.features.BaseFeature {
    constructor() {
        super('RedirectShorts');
        this.checkUrl = this.checkUrl.bind(this);
    }

    getConfigKey() {
        return 'redirectShorts';
    }

    async enable() {
        await super.enable();
        this.checkUrl();
    }

    async disable() {
        await super.disable();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        this.checkUrl();
    }

    checkUrl() {
        if (!this.isEnabled) return;
        const url = window.location.href;
        if (url.includes('/shorts/')) {
            this.utils.log?.('Redirecting Short to regular player', 'RedirectShorts');
            const newUrl = url.replace('/shorts/', '/watch?v=');
            window.location.replace(newUrl);
        }
    }
};
