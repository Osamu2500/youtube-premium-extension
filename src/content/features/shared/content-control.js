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
window.YPP.features.ContentControl = class ContentControl {
    /**
     * Initialize Content Control
     */
    constructor() {
        this.observer = null;
        this.settings = null;
        this._redirectListenerAdded = false;
        this.Utils = window.YPP.Utils;
        // Bind methods for safe event listener removal
        this.checkRedirect = this.checkRedirect.bind(this);
    }

    /**
     * Enable content control with settings
     * @param {Object} settings - User settings
     */

    enable(settings) {
        this.run(settings);
    }

    /**
     * Disable content control and cleanup
     */
    disable() {
        // Revert all CSS classes
        document.body.classList.remove(
            'ypp-hide-comments',
            'ypp-hide-sidebar',
            'ypp-hide-endscreens',
            'ypp-hide-cards',
            'ypp-hide-merch'
        );

        // Remove Shorts CSS
        const style = document.getElementById('ypp-shorts-css');
        if (style) style.remove();

        // Remove listeners
        if (this._redirectListenerAdded) {
            window.removeEventListener('yt-navigate-start', this.checkRedirect);
            this._redirectListenerAdded = false;
        }
    }

    /**
     * Update settings and re-apply rules.
     * @param {Object} settings 
     */
    update(settings) {
        this.run(settings);
    }

    /**
     * Apply content control rules based on settings.
     * @param {Object} settings 
     */
    run(settings) {
        this.settings = settings;

        // 1. Shorts Handling
        if (settings.hideShorts) {
            this.hideShortsGlobally();
            this.redirectShorts();
        } else {
            // Revert Shorts specific changes
            const style = document.getElementById('ypp-shorts-css');
            if (style) style.remove();
            window.removeEventListener('yt-navigate-start', this.checkRedirect);
        }

        // 2. Class Toggles for other elements
        const toggle = (cls, state) => document.body.classList.toggle(cls, !!state);

        toggle('ypp-hide-comments', settings.hideComments);
        toggle('ypp-hide-sidebar', settings.hideSidebar);
        toggle('ypp-hide-endscreens', settings.hideEndScreens);
        toggle('ypp-hide-cards', settings.hideCards);
        toggle('ypp-hide-merch', settings.hideMerch);
    }

    /**
     * Inject global CSS to hide Shorts shelves and tabs.
     */
    hideShortsGlobally() {
        if (!document.getElementById('ypp-shorts-css')) {
            const style = document.createElement('style');
            style.id = 'ypp-shorts-css';
            style.textContent = `
                /* Home Page Shorts Shelf */
                ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]) { display: none !important; }
                
                /* Sidebar Shorts */
                ytd-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }
                ytd-mini-guide-entry-renderer:has(a[title="Shorts"]) { display: none !important; }
                
                /* Search Results Shorts */
                ytd-reel-shelf-renderer { display: none !important; }
                
                /* Grid Video Shorts */
                ytd-grid-video-renderer:has(span#text[aria-label="Shorts"]) { display: none !important; }
                
                /* Mobile/Other */
                ytm-reel-shelf-renderer { display: none !important; }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Setup redirect logic for Shorts URLs.
     */
    redirectShorts() {
        // Immediate check
        this.checkRedirect();

        // Add listener only once to avoid duplicates
        if (!this._redirectListenerAdded) {
            window.addEventListener('yt-navigate-start', this.checkRedirect);
            this._redirectListenerAdded = true;
        }
    }

    /**
     * Check if current URL is a Short and redirect to standard Watch.
     */
    checkRedirect() {
        if (location.pathname.startsWith('/shorts/')) {
            // Extract video ID and validate format
            const videoId = location.pathname.split('/shorts/')[1]?.split('/')[0];

            // YouTube video IDs are exactly 11 characters: alphanumeric, underscore, hyphen
            if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                this.Utils?.log('Redirecting Short to Watch:', videoId, 'CONTENT');
                location.replace('/watch?v=' + videoId);
            } else if (videoId) {
                this.Utils?.log('Invalid video ID format:', videoId, 'CONTENT', 'warn');
            }
        }
    }
};
