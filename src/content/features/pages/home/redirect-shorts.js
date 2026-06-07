window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.RedirectShorts = class RedirectShorts extends window.YPP.features.BaseFeature {
    static CONFIG = {
        SHORTS_PATH: '/shorts/',
        WATCH_PATH: '/watch?v='
    };

    constructor() {
        super('RedirectShorts');
        this.checkUrl = this.checkUrl.bind(this);
    }

    getConfigKey() {
        return 'redirectShorts';
    }

    async enable() {
        await super.enable();
        try {
            this.checkUrl();
        } catch (e) {
            this.utils.log?.(`Enable error: ${e.message}`, 'RedirectShorts', 'error');
        }
    }

    async disable() {
        await super.disable();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        this.checkUrl();
    }

    /**
     * Checks if current URL is a Shorts URL and redirects to standard watch player.
     */
    checkUrl() {
        if (!this.isEnabled) return;
        try {
            const url = window.location.href;
            if (url.includes(RedirectShorts.CONFIG.SHORTS_PATH)) {
                this.utils.log?.('Redirecting Short to regular player', 'RedirectShorts');
                const newUrl = url.replace(RedirectShorts.CONFIG.SHORTS_PATH, RedirectShorts.CONFIG.WATCH_PATH);
                window.location.replace(newUrl);
            }
        } catch (e) {
            this.utils.log?.(`Check URL error: ${e.message}`, 'RedirectShorts', 'error');
        }
    }
};
