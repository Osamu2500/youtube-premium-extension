window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.RedirectShorts = class RedirectShorts extends window.YPP.features.BaseFeature {
    constructor() {
        super('RedirectShorts');
        this.checkRedirect = this.checkRedirect.bind(this);
    }

    getConfigKey() { return 'redirectShorts'; }

    async enable() {
        await super.enable();
        // Check immediately on load
        this.checkRedirect();
        // Also listen for SPA navigations
        this.addListener(window, 'yt-navigate-start', this.checkRedirect);
    }

    async disable() {
        await super.disable();
    }

    onPageChange(url) {
        if (!this.isEnabled) return;
        this.checkRedirect();
    }

    checkRedirect() {
        if (!this.settings?.redirectShorts) return;

        if (location.pathname.startsWith('/shorts/')) {
            const videoId = location.pathname.split('/shorts/')[1]?.split('/')[0];

            if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                this.utils?.log('Redirecting Short to Watch:', videoId, 'RedirectShorts');
                
                // Construct the new URL
                const targetUrl = `/watch?v=${videoId}`;
                
                // Attempt an elegant SPA redirect first
                const app = document.querySelector('ytd-app');
                if (app && typeof app.fire === 'function') {
                    app.fire('yt-navigate', { endpoint: { commandMetadata: { webCommandMetadata: { url: targetUrl } } } });
                } else {
                    // Fallback to fast location replace
                    location.replace(targetUrl);
                }
            } else if (videoId) {
                this.utils?.log('Invalid video ID format:', videoId, 'RedirectShorts', 'warn');
            }
        }
    }
};
