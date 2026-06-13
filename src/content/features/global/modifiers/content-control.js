/**
 * Content Control Module
 * Manages visibility of distraction elements (Shorts, comments, etc.).
 */
window.YPP = window.YPP || {};
/**
 * Content Control Manager
 * Manages visibility of distraction elements and handles Shorts redirects.
 * @class ContentControl
 */
window.YPP.features.ContentControl = class ContentControl extends window.YPP.features.BaseFeature {
    /**
     * Initialize Content Control
     */
    constructor() {
        super('ContentControl');
        
        // Bind methods for safe event listener removal
        this.handleMixClick = this.handleMixClick.bind(this);
    }

    /**
     * Always active, manages its own sub-settings
     * @returns {null}
     */
    getConfigKey() {
        return null;
    }

    /**
     * Enable content control
     */
    async enable() {
        await super.enable();
        // Register click listener in capture phase for mix URLs
        this.addListener(document, 'click', this.handleMixClick, true);
        this.applySettings();
    }

    /**
     * Disable content control and cleanup
     */
    async disable() {
        await super.disable();
        this._cleanupDOM();
    }

    /**
     * Update settings
     */
    async onUpdate() {
        this.applySettings();
    }

    /**
     * Apply content control rules based on settings.
     */
    applySettings() {
        const settings = this.settings;

        // Class Toggles for other elements
        const toggle = (cls, state) => document.body.classList.toggle(cls, !!state);

        toggle('ypp-hide-comments', settings.hideComments);
        toggle('ypp-hide-sidebar', settings.hideSidebar);
        toggle('ypp-hide-endscreens', settings.hideEndScreens);
        toggle('ypp-hide-cards', settings.hideCards);
        toggle('ypp-hide-merch', settings.hideMerch);
        toggle('ypp-hide-promo-shelves', settings.hidePromoShelves);
        
        // Unhook & Focus Modifiers
        toggle('ypp-hide-annotations', settings.hideAnnotations);
        toggle('ypp-hide-related', settings.hideRelated);
        toggle('ypp-hide-feed', settings.hideFeed);
        toggle('ypp-hide-trending', settings.hideTrending);
        toggle('ypp-hide-mixes', settings.hideMixes);
        toggle('ypp-aggressive-shorts-block', settings.aggressiveShortsBlock);
    }

    /**
     * Clean up manual DOM modifications
     * @private
     */
    _cleanupDOM() {
        // Revert all CSS classes
        document.body.classList.remove(
            'ypp-hide-comments',
            'ypp-hide-sidebar',
            'ypp-hide-endscreens',
            'ypp-hide-cards',
            'ypp-hide-merch',
            'ypp-hide-annotations',
            'ypp-hide-related',
            'ypp-hide-feed',
            'ypp-hide-trending',
            'ypp-hide-mixes',
            'ypp-aggressive-shorts-block'
        );
        document.querySelectorAll('[data-ypp-is-short]').forEach(el => el.removeAttribute('data-ypp-is-short'));
    }

    /**
     * Intercept clicks on links that contain Mix playlists and clean them
     */
    handleMixClick(e) {
        if (!this.settings?.cleanMixUrls) return;
        
        // Find the closest anchor tag that was clicked
        const a = e.target.closest('a[href]');
        if (a && a.href.includes('list=RD')) {
            try {
                // Parse URL and strip Mix parameters
                const url = new URL(a.href, window.location.origin);
                const list = url.searchParams.get('list');
                
                if (list && list.startsWith('RD')) {
                    url.searchParams.delete('list');
                    url.searchParams.delete('start_radio');
                    
                    // Update the href so YouTube's SPA router picks up the clean URL
                    a.href = url.pathname + url.search + url.hash;
                    this.utils?.log('Cleaned Mix URL on click:', a.href, 'CONTENT');
                }
            } catch (err) {
                // Ignore URL parsing errors
            }
        }
    }
};
