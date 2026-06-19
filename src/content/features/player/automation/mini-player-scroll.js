window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MiniPlayerScroll = class MiniPlayerScroll extends window.YPP.features.BaseFeature {
    constructor() {
        super('MiniPlayerScroll');
        this._boundHandleScroll = this._handleScroll.bind(this);
        this.isMini = false;
    }

    getConfigKey() {
        return 'miniPlayer';
    }

    async enable() {
        await super.enable();
        this.addListener(window, 'scroll', this._boundHandleScroll, { passive: true });
        this._handleScroll(); // Check initial state
    }

    async disable() {
        await super.disable();
        
        // Revert to default if we forced miniplayer
        if (this.isMini) {
            const miniBtn = document.querySelector('.ytp-miniplayer-button');
            if (miniBtn) miniBtn.click();
            this.isMini = false;
        }
    }

    _handleScroll() {
        if (!this.isEnabled) return;

        const video = document.querySelector('video');
        const playerContainer = document.querySelector('#player-container-outer') || document.querySelector('#player');
        if (!video || !playerContainer) return;

        // Check if user scrolled past the video player completely
        const rect = playerContainer.getBoundingClientRect();
        const isPastVideo = rect.bottom < 0;

        const miniBtn = document.querySelector('.ytp-miniplayer-button');
        if (!miniBtn) return;

        // We check if miniplayer is currently active
        // YouTube usually adds an attribute when active, or we track our own state
        const isNativeMini = document.body.hasAttribute('miniplayer-active');

        if (isPastVideo && !this.isMini && !isNativeMini) {
            miniBtn.click();
            this.isMini = true;
            this.utils?.log('Auto-enabled miniplayer on scroll', 'MINIPLAYER', 'debug');
        } else if (!isPastVideo && this.isMini) {
            // Restore when scrolling back up
            miniBtn.click();
            this.isMini = false;
            this.utils?.log('Restored player from miniplayer on scroll', 'MINIPLAYER', 'debug');
        }
    }
};
