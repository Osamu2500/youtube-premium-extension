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
        this.settings = null;
        this._redirectListenerAdded = false;
        this._isMonitoring = false;
        this.Utils = window.YPP.Utils;
        
        // Initialize centralized DOM observer
        this.domObserver = new window.YPP.Utils.DOMObserver();
        
        // Bind methods for safe event listener removal
        this.checkRedirect = this.checkRedirect.bind(this);
        this.handleShortsAdded = this.handleShortsAdded.bind(this);
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
        this.showShortsGlobally();
        
        // Stop monitoring Shorts
        this.stopShortsMonitoring();

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
            this.removeShortsFromDOM();  // Initial removal
            this.startShortsMonitoring(); // Continuous monitoring
            this.redirectShorts();
        } else {
            this.showShortsGlobally();
            this.stopShortsMonitoring();
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
     * Helper to toggle global shorts hiding class.
     */
    hideShortsGlobally() {
        document.body.classList.add('ypp-hide-shorts');
    }

    /**
     * Helper to remove global shorts hiding class.
     */
    showShortsGlobally() {
        document.body.classList.remove('ypp-hide-shorts');
    }

    /**
     * Remove Shorts elements from DOM completely
     * More aggressive than CSS hiding - actually removes elements
     * This matches the behavior of "Remove YouTube Shorts" extension
     */
    removeShortsFromDOM() {
        if (!this.settings?.hideShorts) return;

        const SHORTS_PATTERNS = [
            // Primary Shorts shelves
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer[is-shorts]',
            'ytd-shelf-renderer[is-shorts]',
            'ytm-reel-shelf-renderer',
            
            // NEW: Grid shelf model (critical for search/feed)
            'grid-shelf-view-model',
            
            // NEW: Individual reel items
            'ytd-reel-item-renderer',
            
            // Individual Shorts videos - ALL renderer types
            'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
            'ytd-video-renderer:has(a[href*="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
            'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            'ytd-playlist-video-renderer:has(a[href*="/shorts/"])',
            
            // Navigation entries
            'ytd-guide-entry-renderer:has(a[title="Shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
            
            // Channel tabs
            'tp-yt-paper-tab[aria-label="Shorts"]',
            'yt-tab-shape[tab-title="Shorts"]',
            
            // Watch page sidebar
            '#related ytd-reel-shelf-renderer',
            'ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer'
        ];

        let removed = 0;
        const startTime = performance.now();

        SHORTS_PATTERNS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // Double-check it's actually a Shorts element before removing
                    if (this._isShortsElement(el)) {
                        // Use parentNode.removeChild for better compatibility
                        if (el.parentNode) {
                            el.parentNode.removeChild(el);
                        } else {
                            el.remove();
                        }
                        removed++;
                    }
                });
            } catch (err) {
                // Skip invalid selectors (e.g., :has() not supported in some browsers)
            }
        });

        // Remove Shorts filter chips (critical for search page)
        this._removeShortsChips();

        // Heuristic-based removal for elements that might not match exact selectors
        this._removeShortsByHeuristics();

        const duration = (performance.now() - startTime).toFixed(2);
        if (removed > 0) {
            this.Utils?.log(`Removed ${removed} Shorts elements from DOM (${duration}ms)`, 'CONTENT');
        }
    }

    /**
     * Check if an element is actually a Shorts element
     * @param {HTMLElement} element 
     * @returns {boolean}
     */
    _isShortsElement(element) {
        if (!element) return false;

        // Check tag names
        const tagName = element.tagName?.toLowerCase();
        if (tagName === 'ytd-reel-shelf-renderer' || tagName.includes('reel')) return true;

        // Check attributes
        if (element.hasAttribute('is-shorts')) return true;

        // Check for /shorts/ links
        if (element.querySelector('a[href*="/shorts/"]')) return true;

        // Check ARIA labels
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel?.toLowerCase().includes('shorts')) return true;

        // Check title/text content
        const title = element.querySelector('#title, [title]');
        if (title?.textContent?.toLowerCase().includes('shorts') || 
            title?.getAttribute('title')?.toLowerCase().includes('shorts')) {
            return true;
        }

        return false;
    }

    /**
     * Remove Shorts filter chips from search results
     * Critical for search page to prevent filtering by Shorts
     */
    _removeShortsChips() {
        const chips = document.querySelectorAll("yt-chip-cloud-chip-renderer");
        chips.forEach(chip => {
            const textElement = chip.querySelector("#text");
            if (textElement && textElement.innerText.trim() === "Shorts") {
                if (chip.parentNode) {
                    chip.parentNode.removeChild(chip);
                } else {
                    chip.remove();
                }
            }
        });
    }

    /**
     * Remove Shorts using heuristic detection
     * Catches elements that might not match CSS selectors
     */
    _removeShortsByHeuristics() {
        // Check all shelf renderers
        const shelves = document.querySelectorAll('ytd-shelf-renderer, ytd-rich-shelf-renderer');
        shelves.forEach(shelf => {
            if (this._isShortsElement(shelf)) {
                shelf.remove();
            }
        });

        // Check all video renderers with Shorts badge
        const videos = document.querySelectorAll(
            'ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
        );
        videos.forEach(video => {
            const badge = video.querySelector('span[aria-label="Shorts"], ytd-badge-supported-renderer');
            if (badge?.textContent?.toLowerCase().includes('shorts') ||
                badge?.getAttribute('aria-label')?.toLowerCase().includes('shorts')) {
                video.remove();
            }
        });
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

    /**
     * Start continuous monitoring for dynamically loaded Shorts
     * Uses centralized DOMObserver.
     */
    startShortsMonitoring() {
        if (this._isMonitoring || !this.settings?.hideShorts) return;

        this.Utils?.log('Starting continuous Shorts monitoring via DOMObserver', 'CONTENT');

        // Start the observer
        this.domObserver.start();

        // Register a catch-all callback for dynamically added content containers
        // Since Shorts can appear in various forms, we watch the main content area
        // and run our comprehensive detection logic when it updates.
        this.domObserver.register(
            'shorts-monitor',
            '#contents, ytd-rich-grid-row, ytd-item-section-renderer', 
            this.handleShortsAdded,
            false // Don't run immediately, removeShortsFromDOM already did the initial pass
        );

        this._isMonitoring = true;
    }

    /**
     * Stop continuous Shorts monitoring
     */
    stopShortsMonitoring() {
        if (this._isMonitoring) {
            this.domObserver.unregister('shorts-monitor');
            this.domObserver.stop();
            this._isMonitoring = false;
            this.Utils?.log('Stopped Shorts monitoring', 'CONTENT');
        }
    }

    /**
     * Handle newly added Shorts elements
     * Called by MutationObserver when potential Shorts are detected
     */
    handleShortsAdded() {
        if (!this.settings?.hideShorts) return;

        // Use same removal logic as initial load
        const SHORTS_PATTERNS = [
            // Primary Shorts shelves
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer[is-shorts]',
            'ytd-shelf-renderer[is-shorts]',
            'ytm-reel-shelf-renderer',
            
            // Grid shelf model and reel items
            'grid-shelf-view-model',
            'ytd-reel-item-renderer',
            
            // Individual Shorts videos - ALL renderer types
            'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
            'ytd-video-renderer:has(a[href*="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
            'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            'ytd-playlist-video-renderer:has(a[href*="/shorts/"])',
            
            // Search results specific
            '#contents.ytd-item-section-renderer ytd-video-renderer:has(a[href*="/shorts/"])',
            'ytd-search ytd-video-renderer:has(a[href*="/shorts/"])',
            
            // Subscription feed specific
            'ytd-grid-video-renderer:has(span[aria-label="Shorts"])',
            'ytd-browse[page-subtype="subscriptions"] ytd-grid-video-renderer:has(a[href*="/shorts/"])',
            
            // Watch page sidebar
            '#related ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            
            // Navigation entries
            'ytd-guide-entry-renderer:has(a[title="Shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])'
        ];

        let removed = 0;

        SHORTS_PATTERNS.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (this._isShortsElement(el)) {
                        if (el.parentNode) {
                            el.parentNode.removeChild(el);
                        } else {
                            el.remove();
                        }
                        removed++;
                    }
                });
            } catch (err) {
                // Skip invalid selectors
            }
        });

        // Remove Shorts chips
        this._removeShortsChips();

        // Also run heuristic check
        this._removeShortsByHeuristics();

        if (removed > 0) {
            this.Utils?.log(`Dynamic removal: ${removed} Shorts elements`, 'CONTENT');
        }
    }
};
