/**
 * YouTube Search Redesign - Premium Glass UI
 * 
 * Architecture:
 * - Uses a distinct "Grid Mode" (`ypp-search-grid-mode`) on body.
 * - Hides Shorts via CSS for performance/stability.
 * - Implements a responsive CSS Grid for results.
 * - Features a persistent View Toggle (Grid/List).
 */

export class SearchRedesign {
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

        if (this._settings.searchGrid) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable the feature and start listening for navigation
     */
    enable() {
        if (this._isEnabled) return;
        this._isEnabled = true;

        this._log('Search Redesign Enabled', 'info');
        
        // Initial Check
        this._handleNavigation();
        
        // Listen for Nav
        window.addEventListener('yt-navigate-finish', this._handleNavigation);
    }

    /**
     * Disable the feature and perform cleanup
     */
    disable() {
        if (!this._isEnabled) return;
        this._isEnabled = false;
        
        this._disconnectObserver();
        this._removeClasses();
        this._removeViewToggle();
        window.removeEventListener('yt-navigate-finish', this._handleNavigation);
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
            this._applyViewMode();
            this._injectViewToggle();
            this._startObserver();
            this._applyDefaultFilter();
        } else {
            this._disconnectObserver();
            this._removeClasses();
        }
    }

    /**
     * Automatically select "Videos" filter if no filter is active
     * @private
     */
    _applyDefaultFilter() {
        // 1. Check if we already have a filter param (sp=...)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('sp')) return;

        // 2. Poll for chips to click "Videos"
        this._pollForElement('yt-chip-cloud-chip-renderer', () => {
             // Re-check params in case they changed during poll
             if (new URLSearchParams(window.location.search).has('sp')) return;

             const chips = Array.from(document.querySelectorAll('yt-chip-cloud-chip-renderer'));
             const videoChip = chips.find(c => c.textContent.trim() === 'Videos' || c.querySelector('#text')?.textContent.trim() === 'Videos');

             if (videoChip && !videoChip.hasAttribute('selected')) {
                 this._log('Applying default "Videos" filter', 'info');
                 // Try native click on the web component
                 videoChip.click();
             }
        });
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
        this._updateToggleButtonState();
        
        try {
            await window.YPP.Utils?.saveSetting('searchViewMode', mode);
        } catch (error) {
            this._log('Failed to save view mode preference', 'error');
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
     * Update the active state of toggle buttons
     * @private
     */
    _updateToggleButtonState() {
        const container = document.getElementById('ypp-view-toggle');
        if (!container) return;

        const btns = container.querySelectorAll(`.${SearchRedesign.CLASSES.TOGGLE_BTN}`);
        btns.forEach(btn => {
            if (btn.dataset.mode === this._viewMode) {
                btn.classList.add(SearchRedesign.CLASSES.ACTIVE);
            } else {
                btn.classList.remove(SearchRedesign.CLASSES.ACTIVE);
            }
        });
    }

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
     * Poll for a DOM element existence
     * @private
     * @param {string} selector - CSS Selector
     * @param {Function} callback - Success callback
     * @param {number} maxAttempts - Max retries (default 20)
     * @param {number} interval - Interval in ms (default 200)
     */
    _pollForElement(selector, callback, maxAttempts = 20, interval = 200) {
        let attempts = 0;
        const check = () => {
            const el = document.querySelector(selector);
            if (el) {
                callback(el);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, interval);
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

            // Setup observer
            this._observer = new MutationObserver(this._processMutations);
            this._observer.observe(target, { childList: true, subtree: true });
        });
    }

    /**
     * Handle mutation records
     * @private
     * @param {MutationRecord[]} mutations 
     */
    _processMutations(mutations) {
        try {
            let shouldProcess = false;
            // Efficiently check if relevant nodes were added
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    shouldProcess = true;
                    break; // Optimization: one match is enough to trigger process
                }
            }

            if (shouldProcess) {
                // Debounce processing to avoid layout thrashing
                if (this._debounceTimer) clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(() => this._processAll(), 50);
            }
        } catch (error) {
            this._log('Error processing mutations: ' + error.message, 'error');
        }
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
     * Process all search results on the page
     * @private
     */
    _processAll() {
        if (!this._isEnabled) return;

        try {
            // 1. Identify Grid Containers (Section Contents)
            const itemSections = document.querySelectorAll(SearchRedesign.SELECTORS.ITEM_SECTION);
            itemSections.forEach(section => {
                const contents = section.querySelector(SearchRedesign.SELECTORS.CONTENTS);
                
                // Validate: Only treat as grid if it contains video renderers
                // This prevents styling non-result sections incorrectly
                if (contents && contents.querySelector('ytd-video-renderer')) {
                    if (!contents.classList.contains(SearchRedesign.CLASSES.GRID_CONTAINER)) {
                        contents.classList.add(SearchRedesign.CLASSES.GRID_CONTAINER);
                    }
                    
                    // 2. Process Children within the verified container
                    Array.from(contents.children).forEach(child => this._processNode(child));
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
     */
    _processNode(node) {
        // Only process Element nodes
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        // Idempotency check: Don't process same node twice
        if (this._processedNodes.has(node)) return;
        this._processedNodes.add(node);

        const tag = node.tagName.toLowerCase();

        const _hideNode = (el) => {
            el.classList.add('ypp-hidden-short');
            el.style.display = 'none';
            // Also hide parent section if this is the only content
            const parentSection = el.closest('ytd-item-section-renderer');
            if (parentSection) {
                parentSection.style.display = 'none';
            }
        };

        // A. SHORTS DETECTION (Hide them)
        if (this._isShorts(node)) {
            _hideNode(node);
            return;
        }

        // Special handling for Shelf Renderers (Container of Shorts)
        if (tag === 'ytd-shelf-renderer' && this._isShortsShelf(node)) {
             _hideNode(node);
             return;
        }

        // B. LAYOUT NORMALIZATION (For Grid Mode)
        // Only apply if inside a grid container
        if (node.parentElement?.classList.contains(SearchRedesign.CLASSES.GRID_CONTAINER)) {
            // Grid Items: Videos, Radios, Playlists
            if (tag === 'ytd-video-renderer' || tag === 'ytd-radio-renderer' || tag === 'ytd-playlist-renderer') {
                node.classList.add(SearchRedesign.CLASSES.GRID_ITEM);
                this._cleanInlineStyles(node);
            } 
            // Full Width Items: Channels, Shelves, etc.
            else {
                node.classList.add(SearchRedesign.CLASSES.FULL_WIDTH);
            }
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
