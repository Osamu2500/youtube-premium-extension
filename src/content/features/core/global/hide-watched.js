window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideWatched = class HideWatched extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideWatched');
        this._boundProcess = this._processCards.bind(this);
    }

    getConfigKey() { return 'hideWatched'; }

    async enable() {
        await super.enable();
        this._processCards();
        window.YPP.events?.on('dom:nodes-added', this._boundProcess);
        window.YPP.events?.on('page:changed', this._boundProcess);
        window.YPP.events?.on('watched:updated', this._boundProcess);
    }

    async disable() {
        await super.disable();
        window.YPP.events?.off('dom:nodes-added', this._boundProcess);
        window.YPP.events?.off('page:changed', this._boundProcess);
        window.YPP.events?.off('watched:updated', this._boundProcess);
        // Restore all hidden cards
        document.querySelectorAll(
            '[data-ypp-hidden="watched"]'
        ).forEach(card => {
            card.style.opacity = '';
            card.style.display = '';
            card.style.pointerEvents = '';
            card.style.filter = '';
            delete card.dataset.yppHidden;
        });
    }

    // Get watched IDs from MarkWatched feature
    _getWatchedIds() {
        const markWatched = window.YPP?.MainApp?.featureManager?.getFeature('markWatched');
        if (markWatched && markWatched._watchedIds) {
            return markWatched._watchedIds;
        }
        return new Set();
    }

    // Get video ID from card
    _getVideoId(card) {
        const anchor = card.querySelector('a#thumbnail, a.ytd-thumbnail');
        if (anchor) {
            const href = anchor.href || anchor.getAttribute('href') || '';
            const match = href.match(/[?&]v=([^&]+)/);
            if (match) return match[1];
        }
        return card.dataset.videoId || null;
    }

    _processCards() {
        if (!this.isEnabled) return;

        const watchedIds = this._getWatchedIds();
        if (watchedIds.size === 0) return;

        const mode = this.settings?.hideWatchedMode || 'dim';
        const selectors = [
            'ytd-rich-item-renderer',
            window.YPP.CONSTANTS.SELECTORS.VIDEO_RENDERER || 'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(card => {
                const videoId = this._getVideoId(card);
                if (!videoId) return;

                if (watchedIds.has(videoId)) {
                    card.dataset.yppHidden = 'watched';
                    if (mode === 'hide') {
                        card.style.display = 'none';
                    } else {
                        // Dim mode — visible but clearly watched
                        card.style.opacity = '0.3';
                        card.style.filter = 'grayscale(60%)';
                        card.style.pointerEvents = 'auto';
                    }
                } else {
                    // Restore if previously hidden
                    if (card.dataset.yppHidden === 'watched') {
                        card.style.opacity = '';
                        card.style.display = '';
                        card.style.filter = '';
                        delete card.dataset.yppHidden;
                    }
                }
            });
        });
    }
};
