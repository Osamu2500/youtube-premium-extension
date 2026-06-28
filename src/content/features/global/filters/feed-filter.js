window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * FeedFilter
 * ----------
 * Removes unwanted content from the feed based on user preferences.
 * Extends BaseFilterFeature for unified hiding mechanics.
 * Scaffolded based on logic from jpdngflnlekafjhdlcnijphhcmeibdoa
 */
window.YPP.features.FeedFilter = class FeedFilter extends window.YPP.features.BaseFilterFeature {
    static CARD_SELECTORS = [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-post-renderer',
        'ytd-backstage-post-thread-renderer',
        'ytd-shared-post-renderer'
    ].join(',');

    constructor() {
        super('FeedFilter');
        this._allowedPages = ['/', '/index', '/feed/subscriptions', '/results'];
        this._boundProcessMutations = this._processMutations.bind(this);
    }

    getConfigKey() { return 'feedFilter'; }

    async enable() {
        await super.enable();
        
        // Initial scan
        this._processCards();

        // React to SPA navigation
        this.onBusEvent('app:pageChange', () => {
            this._processCards();
        });

        // Register observer for added cards
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register(
                'feed-filter-cards',
                FeedFilter.CARD_SELECTORS,
                this._boundProcessMutations,
                true,
                true
            );
        }
    }

    async disable() {
        await super.disable();
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('feed-filter-cards');
        }
    }

    async onUpdate() {
        this._unhideAll();
        this._processCards();
    }

    _processMutations(nodes) {
        if (!this.isEnabled || !this._shouldRunOnCurrentPage()) return;
        nodes.forEach(card => this._evaluateCard(card));
    }

    _processCards() {
        if (!this.isEnabled || !this._shouldRunOnCurrentPage()) return;
        const cards = document.querySelectorAll(FeedFilter.CARD_SELECTORS);
        cards.forEach(card => this._evaluateCard(card));
    }

    _evaluateCard(card) {
        if (!card || !card.isConnected) return;
        
        // Settings flags
        const hideLive = this.settings?.hideLiveStreams;
        const hideUpcoming = this.settings?.hideUpcoming;
        const hidePosts = this.settings?.hidePosts;
        const keywordsRaw = this.settings?.feedFilterKeywords || '';
        
        const keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);
        
        // Check Posts
        const isPost = card.tagName.toLowerCase().includes('post-renderer') || card.tagName.toLowerCase().includes('post-thread');
        if (hidePosts && isPost) {
            this._hideElement(card, 'post');
            return;
        }

        // Only evaluate videos below
        if (isPost) return;

        // Check Live
        if (hideLive) {
            const isLive = card.querySelector('.badge-style-type-live-now') || card.querySelector('ytd-badge-supported-renderer[is-live]');
            if (isLive) {
                this._hideElement(card, 'live stream');
                return;
            }
        }

        // Check Upcoming / Premiere
        if (hideUpcoming) {
            const isUpcoming = card.querySelector('[overlay-style="UPCOMING"]') || card.querySelector('.badge-style-type-simple[aria-label*="Premiere"]');
            if (isUpcoming) {
                this._hideElement(card, 'upcoming');
                return;
            }
        }

        // Check Keywords
        if (keywords.length > 0) {
            const titleEl = card.querySelector('#video-title, #video-title-link');
            if (titleEl) {
                const titleText = titleEl.textContent.trim().toLowerCase();
                const matchedKeyword = keywords.find(kw => titleText.includes(kw));
                if (matchedKeyword) {
                    this._hideElement(card, `keyword: ${matchedKeyword}`);
                    return;
                }
            }
        }
    }
};
