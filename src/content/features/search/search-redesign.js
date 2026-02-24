/**
 * YouTube Search Redesign - Premium Glass UI
 * 
 * Architecture:
 * - Uses a distinct "Grid Mode" (`ypp-search-grid-mode`) on body.
 * - Hides Shorts via CSS for performance/stability.
 * - Implements a responsive CSS Grid for results.
 * - Features a persistent View Toggle (Grid/List).
 */

window.YPP.features.SearchRedesign = class SearchRedesign {
    // =========================================================================
    // CONSTANTS & CONFIG
    // =========================================================================
    
    /**
     * CSS Classes used for styling and state management
     * @readonly
     */
    static CLASSES = {
        GRID_MODE: 'ypp-search-grid-mode',
        LIST_MODE: 'ypp-search-list-mode',
        GRID_CONTAINER: 'ypp-search-grid-container',
        GRID_ITEM: 'ypp-grid-item',
        FULL_WIDTH: 'ypp-full-width-item',
        HIDDEN_SHORT: 'ypp-hidden-short',
        TOGGLE_BTN: 'ypp-toggle-btn',
        TOGGLE_CONTAINER: 'ypp-view-mode-toggle',
        ACTIVE: 'active'
    };

    /**
     * DOM Selectors for targeting YouTube elements
     * @readonly
     */
    static SELECTORS = {
        SEARCH_CONTAINER: 'ytd-search',
        SECTION_LIST: 'ytd-section-list-renderer',
        ITEM_SECTION: 'ytd-item-section-renderer',
        CONTENTS: '#contents',
        FILTER_HEADER: 'ytd-search-sub-menu-renderer',
        TOOLS_CONTAINER: '#filter-menu', // Target for toggle button
        
        // Renderers
        VIDEO: 'ytd-video-renderer',
        PLAYLIST: 'ytd-playlist-renderer',
        CHANNEL: 'ytd-channel-renderer',
        SHELF: 'ytd-shelf-renderer',
        RADIO: 'ytd-radio-renderer',
        REEL_SHELF: 'ytd-reel-shelf-renderer', // Shorts Shelf
        RICH_SHELF: 'ytd-rich-shelf-renderer'
    };

    /**
     * View modes supported by the redesign
     * @readonly
     */
    static MODES = {
        GRID: 'grid',
        LIST: 'list'
    };

    /**
     * Element tags that are considered noise (shelves, promos) and may be hidden.
     * Defined once as a static Set to avoid re-allocation on every mutation.
     * NOTE: ytd-continuation-item-renderer is intentionally excluded — it is
     * YouTube's IntersectionObserver sentinel for infinite scroll.
     * @readonly
     */
    static NOISE_TAGS = new Set([
        'ytd-shelf-renderer',
        'ytd-horizontal-card-list-renderer',
        'ytd-universal-watch-card-renderer',
        'ytd-background-promo-renderer',
        'ytd-search-refinement-card-renderer',
        'ytd-reel-shelf-renderer',
        'ytd-rich-shelf-renderer',
    ]);

    /**
     * Element tags that represent actual content (videos, playlists, channels).
     * @readonly
     */
    static VIDEO_TAGS = new Set([
        'ytd-video-renderer',
        'ytd-playlist-renderer',
        'ytd-radio-renderer',
        'ytd-channel-renderer',
    ]);

    /**
     * SVG Icons for the view toggle buttons
     * @readonly
     */
    static ICONS = {
        GRID: '<svg viewBox="0 0 24 24" height="20" width="20"><path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" fill="currentColor"/></svg>',
        LIST: '<svg viewBox="0 0 24 24" height="20" width="20"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" fill="currentColor"/></svg>'
    };

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    constructor() {
        /** @type {boolean} Feature enabled state */
        this._isEnabled = false;
        
        /** @type {Object} Feature settings */
        this._settings = {};
        
        /** @type {MutationObserver|null} Observer for dynamic content */
        this._observer = null;
        
        /** @type {WeakSet<Node>} Track processed nodes for idempotency */
        this._processedNodes = new WeakSet();
        
        /** @type {string} Current view mode ('grid' or 'list') */
        this._viewMode = SearchRedesign.MODES.GRID;

        /** @type {string|null} Track last query to distinguish fresh searches */
        this._lastQuery = null;
        
        /** @type {boolean} CRITICAL FIX: Initialize batching flag to prevent errors */
        this._batching = false;
        
        // Bind methods to ensure correct 'this' context
        this._handleNavigation = this._handleNavigation.bind(this);
        this._processMutations = this._processMutations.bind(this);
    }

    /**
     * Initialize the feature with settings
     * @param {Object} settings - Application settings
     */
    async init(settings) {
        this._settings = settings || {};
        
        // Load persisted view preference
        try {
            const savedMode = await window.YPP.Utils?.getSetting('searchViewMode');
            this._viewMode = savedMode || SearchRedesign.MODES.GRID;
        } catch (error) {
            this._log('Failed to load view preference', 'warn');
        }

        // Enable if either Grid or AutoFilter is on
        if (this._settings.searchGrid || this._settings.autoVideoFilter) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * FeatureManager entry point — called with latest settings on every settings update.
     * @param {Object} settings
     */
    run(settings) {
        this._settings = settings || {};

        // Reset the processed-node cache on each navigation so new pages
        // start with a clean slate. Mutations during scroll do NOT reset it —
        // see _processAll — so stable cards are not re-processed mid-session.
        this._processedNodes = new WeakSet();

        // Load persisted view preference — check chrome.storage first, fall back to localStorage
        chrome.storage.local.get(['searchViewMode'], (result) => {
            const mode = result.searchViewMode || localStorage.getItem('ypp_searchViewMode') || 'grid';
            if (mode !== this._viewMode) {
                this._viewMode = mode;
                this._applyViewMode();
            }
        });

        const shouldEnable = this._settings.searchGrid || this._settings.cleanSearch;
        if (shouldEnable) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable the feature, wire navigation listener, and process current page.
     */
    enable() {
        if (this._isEnabled) {
            // Already enabled — re-process in case settings changed
            this._handleNavigation();
            return;
        }
        this._isEnabled = true;

        window.addEventListener('yt-navigate-finish', this._handleNavigation);

        // Listen for live view mode changes from the popup
        this._boundMessageListener = (msg) => {
            if (msg.type === 'YPP_SET_SEARCH_VIEW_MODE' && msg.mode) {
                this._viewMode = msg.mode;
                this._applyViewMode();
                try {
                    localStorage.setItem('ypp_searchViewMode', msg.mode);
                } catch (_) {}
            }
        };
        chrome.runtime.onMessage.addListener(this._boundMessageListener);

        // Process current page immediately
        this._handleNavigation();
        this._log('SearchRedesign enabled', 'info');
    }

    /**
     * Disable the feature and perform cleanup
     */
    disable() {
        if (!this._isEnabled) return;
        this._isEnabled = false;
        
        this._disconnectObserver();
        // Remove all body state classes on disable
        document.body.classList.remove(
            SearchRedesign.CLASSES.GRID_MODE,
            SearchRedesign.CLASSES.LIST_MODE,
            'ypp-search-clean-grid'
        );
        this._removeViewToggle();
        document.body.classList.remove('ypp-filter-pending'); // Cleanup
        window.removeEventListener('yt-navigate-finish', this._handleNavigation);

        if (this._boundMessageListener) {
            chrome.runtime.onMessage.removeListener(this._boundMessageListener);
            this._boundMessageListener = null;
        }
    }


    // =========================================================================
    // LOGIC: NAVIGATION & PAGE CHECK
    // =========================================================================
    
    /**
     * Handle navigation events to initialize or cleanup based on page type
     * @private
     */
    _handleNavigation() {
        if (!this._isEnabled) return;

        const isSearch = window.location.pathname === '/results';
        
        if (isSearch) {
            // Apply grid if enabled
            if (this._settings.searchGrid) {
                this._applyViewMode();
                this._startObserver();
            }

            // Apply clean-grid class (hides shelf noise sections)
            if (this._settings.hideSearchShelves) {
                document.body.classList.add('ypp-search-clean-grid');
            } else {
                document.body.classList.remove('ypp-search-clean-grid');
            }

            // Apply filter logic
            if (this._settings.autoVideoFilter) {
                this._checkAndApplyFilter();
            }
        } else {
            this._disconnectObserver();
            // Clean up all body classes when leaving search page
            document.body.classList.remove(
                SearchRedesign.CLASSES.GRID_MODE,
                SearchRedesign.CLASSES.LIST_MODE,
                'ypp-search-clean-grid'
            );
            this._lastQuery = null; // Reset query on nav away
        }
    }

    /**
     * Check if we need to auto-apply the filter
     * @private
     */
    _checkAndApplyFilter() {
        const urlParams = new URLSearchParams(window.location.search);
        const currentQuery = urlParams.get('search_query');
        const hasFilter = urlParams.has('sp');

        if (!currentQuery) return; // Not a valid search

        // Use Session Storage to track if we've already defaulted this specific search
        // This allows the user to manually switch back to "All" (clearing 'sp') without us fighting them.
        const lastAutoQuery = sessionStorage.getItem('ypp_last_auto_query');
        
        // If this is a NEW query that we haven't handled yet
        if (currentQuery !== lastAutoQuery) {
            
            if (!hasFilter) {
                // No filter active, apply default
                this._applyDefaultFilter(currentQuery);
            } else {
                // User navigated directly to a filtered URL (e.g. valid bookmark)
                // Mark as handled so we don't mess with it later
                sessionStorage.setItem('ypp_last_auto_query', currentQuery);
            }
        }
    }

    /**
     * Automatically select "Videos" filter
     * @private
     * @param {string} query - The current search query to mark as handled
     */
    _applyDefaultFilter(query) {
        this._log(`Applying default Videos filter for: ${query}`, 'info');
        
        // 1. Enter Pending State
        document.body.classList.add('ypp-filter-pending');

        // 2. Poll for chips with increased tenacity
        this._pollForElement('ytd-feed-filter-chip-bar-renderer', (bar) => {
             // Abort if user navigated or filter changed in the meantime
             const currentParams = new URLSearchParams(window.location.search);
             if (currentParams.has('sp')) {
                 document.body.classList.remove('ypp-filter-pending');
                 sessionStorage.setItem('ypp_last_auto_query', query);
                 return;
             }

             const chips = Array.from(bar.querySelectorAll('yt-chip-cloud-chip-renderer'));
             
             // Find "Videos" chip
             const videoChip = chips.find(c => {
                 const text = c.innerText || c.textContent;
                 return /^\s*Videos\s*$/i.test(text);
             });

             if (videoChip) {
                 // Check if already selected (should have been caught by sp check, but double check)
                 if (videoChip.hasAttribute('selected') || videoChip.classList.contains('selected')) {
                     document.body.classList.remove('ypp-filter-pending');
                     sessionStorage.setItem('ypp_last_auto_query', query);
                     return; 
                 }

                 this._log('Clicking Videos chip', 'info');
                 
                 // Mark as handled BEFORE clicking to prevent loops if click triggers immediate update
                 sessionStorage.setItem('ypp_last_auto_query', query);

                 // Trigger Click (Try multiple methods for robustness)
                 videoChip.click();
                 if (videoChip.querySelector('button')) videoChip.querySelector('button').click();
                 
                 // Remove pending class delay
                 setTimeout(() => {
                     document.body.classList.remove('ypp-filter-pending');
                 }, 500);
             } else {
                 // Keep polling if not found (don't remove pending class yet)
             }
        }, 50, 200); // 10s timeout
        
        // Safety: Remove pending class eventually
        setTimeout(() => {
            document.body.classList.remove('ypp-filter-pending');
        }, 4000);
    }

    /**
     * Log messages with a standard prefix
     * @private
     * @param {string} msg - Message to log
     * @param {string} level - Log level ('info', 'warn', 'error')
     */
    _log(msg, level = 'info') {
        const prefix = '[SearchRedesign]';
        // Use YPP Utils logger if available, otherwise console
        if (window.YPP.Utils?.log) {
            window.YPP.Utils.log(msg, 'SEARCH', level);
        } else {
            console[level]?.(`${prefix} ${msg}`);
        }
    }

    // =========================================================================
    // LOGIC: VIEW MODE & TOGGLE
    // =========================================================================
    
    /**
     * Apply CSS classes to body based on current view mode
     * @private
     */
    _applyViewMode() {
        const body = document.body;
        if (this._viewMode === SearchRedesign.MODES.GRID) {
            body.classList.add(SearchRedesign.CLASSES.GRID_MODE);
            body.classList.remove(SearchRedesign.CLASSES.LIST_MODE);
        } else {
            body.classList.add(SearchRedesign.CLASSES.LIST_MODE);
            body.classList.remove(SearchRedesign.CLASSES.GRID_MODE);
        }
    }

    /**
     * Set the active view mode and update UI/Persistence
     * @private
     * @param {string} mode - 'grid' or 'list'
     */
    async _setViewMode(mode) {
        if (!Object.values(SearchRedesign.MODES).includes(mode)) return;

        this._viewMode = mode;
        this._applyViewMode();
        
        try {
            localStorage.setItem('ypp_searchViewMode', mode);
            // Also sync to chrome.storage so popup reflects current state
            chrome.storage.local.set({ searchViewMode: mode });
        } catch (error) {
            this._log('Failed to save view mode preference', 'warn');
        }
    }

    /**
     * Inject the Grid/List toggle buttons into the YouTube UI
     * @private
     */
    _injectViewToggle() {
        // Poll for the filter menu container
        this._pollForElement(SearchRedesign.SELECTORS.FILTER_HEADER, (container) => {
            // Avoid duplicate injection
            if (document.getElementById('ypp-view-toggle')) return;

            // Create Container
            const toggleContainer = document.createElement('div');
            toggleContainer.id = 'ypp-view-toggle';
            toggleContainer.className = SearchRedesign.CLASSES.TOGGLE_CONTAINER;

            // Create Grid Button
            const gridBtn = this._createToggleButton(
                SearchRedesign.MODES.GRID, 
                'Grid View', 
                SearchRedesign.ICONS.GRID
            );
            
            // Create List Button
            const listBtn = this._createToggleButton(
                SearchRedesign.MODES.LIST, 
                'List View', 
                SearchRedesign.ICONS.LIST
            );

            toggleContainer.appendChild(gridBtn);
            toggleContainer.appendChild(listBtn);

            // Insert into DOM
            container.appendChild(toggleContainer);
            this._updateToggleButtonState();
        });
    }

    /**
     * Helper to create a toggle button element
     * @private
     * @param {string} mode - Mode associated with the button
     * @param {string} title - Tooltip title
     * @param {string} iconSvg - SVG content
     * @returns {HTMLElement}
     */
    _createToggleButton(mode, title, iconSvg) {
        const btn = document.createElement('button');
        btn.className = SearchRedesign.CLASSES.TOGGLE_BTN;
        btn.title = title;
        btn.dataset.mode = mode;
        
        // Safety: Use DOMParser to avoid direct innerHTML assignment
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(iconSvg, 'image/svg+xml');
            if (doc.documentElement && doc.documentElement.tagName === 'svg') {
                btn.appendChild(doc.documentElement);
            } else {
                throw new Error('Invalid SVG');
            }
        } catch (e) {
            // Fallback for safety (though constants should be valid)
            btn.textContent = title;
            this._log('Error parsing SVG icon: ' + e.message, 'warn');
        }
        
        btn.addEventListener('click', (e) => {
            // Prevent default YouTube navigation if any
            e.preventDefault();
            e.stopPropagation();
            this._setViewMode(mode);
        });

        return btn;
    }

    /**
     * No-op: toggle UI is now in the popup, not injected into the page.
     * Kept for backward-compat with disable() which calls _removeViewToggle().
     * @private
     */
    _updateToggleButtonState() { /* no-op — UI is in popup */ }

    /**
     * Remove the toggle button from DOM
     * @private
     */
    _removeViewToggle() {
        const toggle = document.getElementById('ypp-view-toggle');
        if (toggle) {
            toggle.remove();
        }
    }

    /**
     * Poll for a DOM element with exponential backoff
     * @private
     * @param {string} selector - CSS Selector
     * @param {Function} callback - Success callback
     * @param {number} maxWaitMs - Maximum total wait time in milliseconds (default 4000ms)
     * @param {number} startInterval - Starting interval in ms (default 100ms)
     */
    _pollForElement(selector, callback, maxWaitMs = 4000, startInterval = 100) {
        const startTime = Date.now();
        let currentInterval = startInterval;
        
        const check = () => {
            const el = document.querySelector(selector);
            if (el) {
                callback(el);
                return;
            }
            
            const elapsed = Date.now() - startTime;
            if (elapsed < maxWaitMs) {
                // Exponential backoff: 100ms, 200ms, 400ms, 800ms...
                currentInterval = Math.min(currentInterval * 2, 1000);
                setTimeout(check, currentInterval);
            } else {
                this._log(`Element ${selector} not found after ${maxWaitMs}ms`, 'warn');
            }
        };
        
        check();
    }

    // =========================================================================
    // LOGIC: MUTATION OBSERVER & PROCESSING
    // =========================================================================
    
    /**
     * Start observing the search container for new results
     * @private
     */
    _startObserver() {
        if (this._observer) return;

        // Use polling to wait for search container
        this._pollForElement(SearchRedesign.SELECTORS.SEARCH_CONTAINER, (target) => {
            // Double check observer wasn't created during poll wait
            if (this._observer) return;

            // Process existing content immediately
            this._processAll();

            // Setup observer with specific config for performance
            this._observer = new MutationObserver(this._processMutations);
            this._observer.observe(target, { 
                childList: true, 
                subtree: true,
                attributes: false // We only care about new nodes
            });
        });
    }

    /**
     * Handle mutation records with optimized batching
     * @private
     * @param {MutationRecord[]} mutations 
     */
    _processMutations(mutations) {
        let shouldProcess = false;
        for (const m of mutations) {
            if (m.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }

        if (!shouldProcess) return;

        // Debounce: if already waiting, let the existing timer handle it.
        // This ensures late-arriving scroll mutations aren't swallowed.
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this._processAll();
            this._debounceTimer = null;
        }, 150);
    }

    /**
     * Disconnect observer and cleanup timer
     * @private
     */
    _disconnectObserver() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }

    /**
     * Process all search results on the page.
     * Two-pass: first hide noise sections, then wire up grids for video sections.
     * @private
     */
    _processAll() {
        if (!this._isEnabled) return;

        try {
            const itemSections = document.querySelectorAll(SearchRedesign.SELECTORS.ITEM_SECTION);

            itemSections.forEach(section => {
                const contents = section.querySelector(SearchRedesign.SELECTORS.CONTENTS);
                if (!contents) return;

                // ── PASS 1: NOISE DETECTION ──────────────────────────────────────────
                // Only hide a section if ALL its meaningful (non-transient) children are
                // confirmed noise types. NEVER hide based on "no videos yet" — that
                // fires while YouTube is still loading (continuation items shown first).

                // Exclude continuation items — they are transient load indicators
                const children = Array.from(contents.children).filter(
                    c => c.tagName.toLowerCase() !== 'ytd-continuation-item-renderer'
                );

                const { NOISE_TAGS, VIDEO_TAGS } = SearchRedesign;
                const hasVideos = children.some(c => VIDEO_TAGS.has(c.tagName.toLowerCase()));
                // Only all-noise when every NON-transient child is a confirmed noise tag
                const allNoise = children.length > 0 &&
                    children.every(c => NOISE_TAGS.has(c.tagName.toLowerCase()));

                if (this._settings.hideSearchShelves && allNoise) {
                    // We are confident this section only has shelf/promo noise — safe to hide
                    section.classList.add('ypp-noise-section');
                    section.style.setProperty('display', 'none', 'important');
                    return;
                }

                // If we previously hid this section but it now has videos, restore it
                if (section.classList.contains('ypp-noise-section') && hasVideos) {
                    section.classList.remove('ypp-noise-section');
                    section.style.removeProperty('display');
                }

                // Skip sections that are still loading (no children yet)
                if (children.length === 0) return;

                // ── PASS 2: GRID SETUP ───────────────────────────────────────────────
                if (hasVideos) {
                    if (!contents.classList.contains(SearchRedesign.CLASSES.GRID_CONTAINER)) {
                        contents.classList.add(SearchRedesign.CLASSES.GRID_CONTAINER);
                    }
                    // Process each child
                    children.forEach(child => this._processNode(child, contents));
                }
            });
        } catch (error) {
            this._log('Error in _processAll: ' + error.message, 'error');
        }
    }


    /**
     * Process a single result node
     * @private
     * @param {Node} node
     * @param {Element} [gridContainer] - The grid container (passed from _processAll)
     */
    _processNode(node, gridContainer) {
        // Only process Element nodes
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        // Idempotency check: Don't process same node twice
        if (this._processedNodes.has(node)) return;
        this._processedNodes.add(node);

        const tag = node.tagName.toLowerCase();

        // Use static class constant — avoids re-allocating a new Set on every node
        const { NOISE_TAGS } = SearchRedesign;

        // A. NOISE NODE — hide only the individual noise element, NOT the parent section.
        // Sections can contain a mix of noise and video renderers (e.g. a shelf + videos),
        // so nuking the whole section would hide real video cards.
        if (NOISE_TAGS.has(tag)) {
            if (this._settings.hideSearchShelves) {
                node.style.setProperty('display', 'none', 'important');
            }
            return;
        }

        // B. SHORTS DETECTION
        if (this._isShorts(node)) {
            node.style.setProperty('display', 'none', 'important');
            return;
        }

        // C. GRID LAYOUT (only in grid mode, only for video/playlist/radio)
        const container = gridContainer || node.parentElement;
        if (container?.classList.contains(SearchRedesign.CLASSES.GRID_CONTAINER)) {
            if (tag === 'ytd-video-renderer' || tag === 'ytd-radio-renderer' || tag === 'ytd-playlist-renderer') {
                node.classList.add(SearchRedesign.CLASSES.GRID_ITEM);
                this._cleanInlineStyles(node);
            } else if (tag === 'ytd-channel-renderer') {
                // Channels span full row
                node.classList.add(SearchRedesign.CLASSES.FULL_WIDTH);
            }
            // Other unknown renderers: leave them — CSS :has() will hide parent section if they're alone
        }
    }

    /**
     * Determine if a node is Shorts content
     * @private
     * @param {Element} node 
     * @returns {boolean}
     */
    _isShorts(node) {
        const tag = node.tagName.toLowerCase();
        
        // 1. Tag-based detection (Most reliable)
        if (tag === 'ytd-reel-shelf-renderer') return true;
        if (tag === 'ytd-rich-shelf-renderer' && node.hasAttribute('is-shorts')) return true;

        // 2. Content-based detection (Fallback)
        // Check for specific Shorts links or overlay badges
        if (node.querySelector('a[href*="/shorts/"]')) return true;
        
        // "SHORTS" overlay style is a strong signal on some card types
        if (node.querySelector('[overlay-style="SHORTS"]')) return true;

        // 3. Header/Title detection (For Shelves)
        // Check if shelf title mentions "Shorts"
        const title = node.querySelector('#title-container #title')?.textContent?.trim() || '';
        if (title.includes('Shorts')) return true;
        
        // 4. Metadata Badge detection (New)
        // Look for specific metadata badges often found on Shorts in search
        const metadata = node.querySelectorAll('ytd-badge-supported-renderer');
        for (const badge of metadata) {
            if (badge.textContent.trim() === 'Shorts') return true;
        }

        return false;
    }

    /**
     * Determine if a shelf renderer contains Shorts
     * @private
     * @param {Element} node
     * @returns {boolean}
     */
    _isShortsShelf(node) {
         // Check title text
         const title = node.querySelector('#title-container #title')?.textContent?.trim() || '';
         if (/shorts/i.test(title)) return true;

         // Check for Shorts icon
         if (node.querySelector('ytd-icon-button-renderer[aria-label="Shorts"]')) return true;

         // Check for content (vertical videos)
         if (node.querySelector('a[href*="/shorts/"]')) return true;

         return false;
    }

    /**
     * Remove inline width styles that YouTube JS applies
     * @private
     * @param {HTMLElement} node 
     */
    _cleanInlineStyles(node) {
        if (node.style.width) node.style.width = '';
        if (node.style.maxWidth) node.style.maxWidth = '';
    }

    /**
     * Remove applied CSS classes from body
     * @private
     */
    _removeClasses() {
        document.body.classList.remove(
            SearchRedesign.CLASSES.GRID_MODE,
            SearchRedesign.CLASSES.LIST_MODE
        );
    }
}

// Expose to window for FeatureManager
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.SearchRedesign = SearchRedesign;
