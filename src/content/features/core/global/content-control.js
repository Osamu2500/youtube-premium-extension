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
        this.checkRedirect = this.checkRedirect.bind(this);
        this.handleShortsAdded = this.handleShortsAdded.bind(this);
        this._isMonitoringShorts = false;
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
        // Register navigation listener once, checkRedirect handles settings check
        this.addListener(window, 'yt-navigate-start', this.checkRedirect);
        this.applySettings();
    }

    /**
     * Disable content control and cleanup
     */
    async disable() {
        await super.disable();
        this._cleanupDOM();
        this._isMonitoringShorts = false;
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

        // 1. Shorts Handling
        if (settings.hideShorts) {
            this.hideShortsGlobally();
            this.removeShortsFromDOM();  // Initial removal
            this.startShortsMonitoring(); // Continuous monitoring
            this.checkRedirect(); // Immediate check
        } else {
            this.showShortsGlobally();
            this.stopShortsMonitoring();
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
            'ypp-hide-shorts'
        );
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

        try {
            const combinedSelector = SHORTS_PATTERNS.join(', ');
            const elements = document.querySelectorAll(combinedSelector);
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
            this.utils?.log(`Error removing shorts: ${err.message}`, 'CONTENT', 'error');
        }

        // Remove Shorts filter chips (critical for search page)
        this._removeShortsChips();

        // Heuristic-based removal for elements that might not match exact selectors
        this._removeShortsByHeuristics();

        const duration = (performance.now() - startTime).toFixed(2);
        if (removed > 0) {
            this.utils?.log(`Removed ${removed} Shorts elements from DOM (${duration}ms)`, 'CONTENT');
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
     * Catches elements that might not match CSS selectors.
     * IMPORTANT: Skipped on search result pages — ytd-video-renderer there are real results,
     * not Shorts, and badge scanning causes false positives that delete visible video cards.
     */
    _removeShortsByHeuristics() {
        // Never run heuristics on search results — it removes real video cards
        if (window.location.pathname === '/results') return;

        // Check all shelf renderers
        const shelves = document.querySelectorAll('ytd-shelf-renderer, ytd-rich-shelf-renderer');
        shelves.forEach(shelf => {
            if (this._isShortsElement(shelf)) {
                shelf.remove();
            }
        });

        // Check video renderers with Shorts badge — only on non-search pages
        const videos = document.querySelectorAll(
            'ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
        );
        videos.forEach(video => {
            const badge = video.querySelector('span[aria-label="Shorts"], ytd-badge-supported-renderer');
            // Be strict: only remove if aria-label is explicitly "Shorts" (not just contains "shorts")
            if (badge?.getAttribute('aria-label') === 'Shorts' ||
                badge?.textContent?.trim() === 'Shorts') {
                video.remove();
            }
        });
    }

    /**
     * Check if current URL is a Short and redirect to standard Watch.
     */
    checkRedirect() {
        if (!this.settings?.hideShorts) return;

        if (location.pathname.startsWith('/shorts/')) {
            // Extract video ID and validate format
            const videoId = location.pathname.split('/shorts/')[1]?.split('/')[0];

            // YouTube video IDs are exactly 11 characters: alphanumeric, underscore, hyphen
            if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                this.utils?.log('Redirecting Short to Watch:', videoId, 'CONTENT');
                location.replace('/watch?v=' + videoId);
            } else if (videoId) {
                this.utils?.log('Invalid video ID format:', videoId, 'CONTENT', 'warn');
            }
        }
    }

    /**
     * Start continuous monitoring for dynamically loaded Shorts
     * Uses centralized DOMObserver.
     */
    startShortsMonitoring() {
        if (this._isMonitoringShorts || !this.settings?.hideShorts) return;

        this.utils?.log('Starting continuous Shorts monitoring via DOMObserver', 'CONTENT');

        const isSearchPage = window.location.pathname === '/results';
        const monitorSelector = isSearchPage
            ? 'ytd-rich-item-renderer, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-guide-entry-renderer, yt-chip-cloud-chip-renderer'
            : 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-guide-entry-renderer, yt-chip-cloud-chip-renderer';

        // Register a callback for dynamically added content containers that might contain shorts
        this.observer.register(
            'shorts-monitor',
            monitorSelector,
            this.handleShortsAdded,
            false // Don't run immediately, removeShortsFromDOM already did the initial pass
        );

        this._isMonitoringShorts = true;
    }

    /**
     * Stop continuous Shorts monitoring
     */
    stopShortsMonitoring() {
        if (this._isMonitoringShorts) {
            this.observer.unregister('shorts-monitor');
            this._isMonitoringShorts = false;
            this.utils?.log('Stopped Shorts monitoring', 'CONTENT');
        }
    }

    /**
     * Handle newly added Shorts elements
     * Called by MutationObserver when potential Shorts are detected
     * @param {HTMLElement[]} elements - Array of newly added or modified elements
     */
    handleShortsAdded(elements) {
        if (!this.settings?.hideShorts) return;

        // On search results, ytd-video-renderer cards are real results — never delete them here.
        // The CSS :has(a[href*="/shorts/"]) + removeShortsFromDOM() handle search Shorts precisely.
        if (window.location.pathname === '/results') return;

        // If no specifically mutated elements provided, or not an array, fallback to standard scan
        if (!elements || !Array.isArray(elements) || elements.length === 0) {
            this.removeShortsFromDOM();
            return;
        }

        let removed = 0;

        elements.forEach(el => {
            if (!el) return;
            
            // First check if the element itself is a short/shorts chip
            if (this._isShortsElement(el)) {
                if (el.parentNode) el.parentNode.removeChild(el); else el.remove();
                removed++;
                return;
            }
            
            // Check for Shorts chips
            if (el.tagName && el.tagName.toLowerCase() === 'yt-chip-cloud-chip-renderer') {
                const textElement = el.querySelector("#text");
                if (textElement && textElement.innerText.trim() === "Shorts") {
                    if (el.parentNode) el.parentNode.removeChild(el); else el.remove();
                    removed++;
                }
                return;
            }

            // Otherwise, see if it CONTAINS known short elements (rare for these specific selectors but safe to check)
            try {
                const nestedShorts = el.querySelectorAll('ytd-reel-shelf-renderer, a[href*="/shorts/"]');
                if (nestedShorts.length > 0 && this._isShortsElement(el)) {
                     if (el.parentNode) el.parentNode.removeChild(el); else el.remove();
                     removed++;
                }
            } catch(e) {}
        });

        if (removed > 0) {
            this.utils?.log(`Dynamic removal (Optimized): ${removed} Shorts elements`, 'CONTENT');
        }
    }
};
