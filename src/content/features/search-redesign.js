/**
 * YouTube Search Redesign - Layout Manager
 * 
 * Features:
 * - Removes Shorts from search results (DOM removal, not hiding)
 * - Normalizes video card layout for clean horizontal display
 * - Idempotent processing with WeakSet tracking
 * - Optimized MutationObserver for infinite scroll
 * - State persistence for user preferences
 * 
 * YOUTUBE DOM STRUCTURE:
 * ytd-search
 *   └─ ytd-two-column-search-results-renderer
 *      └─ #primary
 *         └─ ytd-section-list-renderer
 *            └─ #contents
 *               └─ ytd-item-section-renderer (x N, for infinite scroll)
 *                  └─ #contents ← Grid container
 *                     ├─ ytd-video-renderer
 *                     ├─ ytd-playlist-renderer
 *                     ├─ ytd-radio-renderer (Mix)
 *                     ├─ ytd-channel-renderer
 *                     ├─ ytd-shelf-renderer
 *                     └─ ytd-reel-shelf-renderer (Shorts - REMOVE)
 */

(function() {
    'use strict';

    // Namespace definition
    window.YPP = window.YPP || {};
    window.YPP.features = window.YPP.features || {};

    /**
     * SearchRedesign class manages YouTube search result page layout
     * @class SearchRedesign
     */
    window.YPP.features.SearchRedesign = class SearchRedesign {
        /**
         * CSS class names for styling
         * @static
         * @readonly
         */
        static get CLASSES() {
            return {
                GRID_CONTAINER: 'ypp-search-grid-container',
                GRID_ITEM: 'ypp-grid-item',
                FULL_WIDTH: 'ypp-full-width-item',
                NORMALIZED_CAROUSEL: 'ypp-normalized-carousel'
            };
        }

        /**
         * CSS selectors for DOM queries
         * @static
         * @readonly
         */
        static get SELECTORS() {
            return {
                SEARCH_CONTAINER: 'ytd-search',
                SECTION_RENDERER: 'ytd-item-section-renderer',
                GRID_CONTENTS: '#contents',
                VIDEO_RENDERER: 'ytd-video-renderer',
                PLAYLIST_RENDERER: 'ytd-playlist-renderer',
                RADIO_RENDERER: 'ytd-radio-renderer',
                CHANNEL_RENDERER: 'ytd-channel-renderer',
                SHELF_RENDERER: 'ytd-shelf-renderer',
                RICH_SHELF_RENDERER: 'ytd-rich-shelf-renderer',
                REEL_SHELF_RENDERER: 'ytd-reel-shelf-renderer',
                RICH_ITEM_RENDERER: 'ytd-rich-item-renderer',
                BACKGROUND_PROMO: 'ytd-background-promo-renderer',
                HORIZONTAL_CAROUSEL: 'ytd-horizontal-card-list-renderer',
                FILTER_HEADER: 'ytd-search-sub-menu-renderer'
            };
        }

        /**
         * Creates a new SearchRedesign instance
         * @constructor
         */
        constructor() {
            // Dependencies (initialized lazily)
            this._constants = null;
            this._utils = null;

            // State management
            this._isEnabled = false;
            this._settings = null;
            this._observer = null;

            // Idempotency tracking using WeakSet (memory-safe)
            this._processedNodes = new WeakSet();
            this._processedContainers = new WeakSet();

            // Bound event handlers (preserved for cleanup)
            this._boundProcessMutations = this._processMutations.bind(this);
            this._boundCheckPage = this._checkPage.bind(this);
        }

        /**
         * Lazy getter for CONSTANTS
         * @private
         * @returns {Object|null}
         */
        get _CONSTANTS() {
            if (!this._constants && window.YPP.CONSTANTS) {
                this._constants = window.YPP.CONSTANTS;
            }
            return this._constants;
        }

        /**
         * Lazy getter for Utils
         * @private
         * @returns {Object|null}
         */
        get _Utils() {
            if (!this._utils && window.YPP.Utils) {
                this._utils = window.YPP.Utils;
            }
            return this._utils;
        }

        /**
         * Logs a message with appropriate level
         * @private
         * @param {string} message - Message to log
         * @param {string} [level='INFO'] - Log level
         */
        _log(message, level = 'INFO') {
            const utils = this._Utils;
            if (utils?.log) {
                utils.log(message, level);
            } else {
                console[level.toLowerCase()]?.(`[SearchRedesign] ${message}`);
            }
        }

        /**
         * Main entry point for the feature
         * @async
         * @param {Object} settings - Feature settings
         * @param {boolean} [settings.searchGrid] - Enable grid layout
         * @param {boolean} [settings.hideSearchShorts] - Hide Shorts
         * @returns {Promise<void>}
         */
        async run(settings) {
            this._settings = Object.freeze(settings || {});

            // Validate required settings structure
            if (!this._validateSettings()) {
                this._log('Invalid settings provided', 'WARN');
                return;
            }

            // Load persisted preferences
            const savedMode = await this._loadViewPreference();
            if (savedMode !== null) {
                this._isGridMode = (savedMode === 'grid');
            }

            // Enable/disable based on settings
            const shouldEnable = this._settings.searchGrid || this._settings.hideSearchShorts;
            if (shouldEnable) {
                this.enable();
            } else {
                this.disable();
            }
        }

        /**
         * Validates settings object
         * @private
         * @returns {boolean}
         */
        _validateSettings() {
            const settings = this._settings;
            // Allow empty settings object, just check type
            return settings === null || typeof settings === 'object';
        }

        /**
         * Enables the feature
         */
        enable() {
            if (this._isEnabled) return;

            this._isEnabled = true;
            this._log('Search Redesign: Feature enabled', 'INFO');

            this._checkPage();
            window.addEventListener('yt-navigate-finish', this._boundCheckPage);
        }

        /**
         * Disables the feature and cleans up
         */
        disable() {
            if (!this._isEnabled) return;

            this._isEnabled = false;
            this._disconnectObserver();
            this._cleanupNodeTracking();
            this._cleanupDOMClasses();
            this._cleanupEventListeners();

            this._log('Search Redesign: Feature disabled', 'INFO');
        }

        /**
         * Cleans up node tracking WeakSets
         * @private
         */
        _cleanupNodeTracking() {
            this._processedNodes = new WeakSet();
            this._processedContainers = new WeakSet();
        }

        /**
         * Removes all added CSS classes from DOM
         * @private
         */
        _cleanupDOMClasses() {
            const body = document.body;
            if (body) {
                body.classList.remove('ypp-search-grid-mode', 'ypp-search-list-mode');
            }

            // Batch cleanup for performance
            const selectors = [
                `.${SearchRedesign.CLASSES.GRID_CONTAINER}`,
                `.${SearchRedesign.CLASSES.GRID_ITEM}`,
                `.${SearchRedesign.CLASSES.FULL_WIDTH}`
            ];

            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.classList.remove(
                        SearchRedesign.CLASSES.GRID_CONTAINER,
                        SearchRedesign.CLASSES.GRID_ITEM,
                        SearchRedesign.CLASSES.FULL_WIDTH
                    );
                });
            });
        }

        /**
         * Removes event listeners
         * @private
         */
        _cleanupEventListeners() {
            window.removeEventListener('yt-navigate-finish', this._boundCheckPage);

            // Clean up toggle button listeners if they exist
            const toggleContainer = document.getElementById('ypp-view-toggle');
            if (toggleContainer) {
                const buttons = toggleContainer.querySelectorAll('button');
                buttons.forEach(btn => {
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode?.replaceChild(newBtn, btn);
                });
            }
        }

        /**
         * Checks if on search results page and initializes
         * @private
         */
        _checkPage() {
            if (!this._isEnabled) return;

            const pathname = window.location.pathname;
            const isSearchPage = pathname === '/results';

            if (isSearchPage) {
                this._applyModeClasses();
                this._startObserver();
            } else {
                this._disconnectObserver();
                this._removePageClasses();
            }
        }

        /**
         * Removes page-specific classes
         * @private
         */
        _removePageClasses() {
            const body = document.body;
            if (body) {
                body.classList.remove('ypp-search-grid-mode', 'ypp-search-list-mode');
            }
        }

        /**
         * Applies CSS classes based on current mode
         * @private
         */
        _applyModeClasses() {
            const body = document.body;
            if (body) {
                body.classList.toggle('ypp-search-grid-mode', this._isGridMode);
                body.classList.toggle('ypp-search-list-mode', !this._isGridMode);
            }
        }

        /**
         * Starts the MutationObserver for DOM changes
         * @private
         */
        _startObserver() {
            if (this._observer) return;

            const searchContainer = document.querySelector(SearchRedesign.SELECTORS.SEARCH_CONTAINER);
            if (!searchContainer) {
                // Retry with exponential backoff
                this._waitForElementWithRetry(SearchRedesign.SELECTORS.SEARCH_CONTAINER)
                    .then(() => this._startObserver())
                    .catch(() => this._log('Search container not found', 'WARN'));
                return;
            }

            // Initial processing of existing content
            this._processExistingContent();

            // Set up mutation observer
            this._observer = new MutationObserver(this._boundProcessMutations);
            this._observer.observe(searchContainer, {
                childList: true,
                subtree: true
            });

            this._log('MutationObserver started', 'DEBUG');
        }

        /**
         * Retries waiting for element with exponential backoff
         * @private
         * @param {string} selector - CSS selector
         * @param {number} [maxRetries=3] - Maximum retry attempts
         * @returns {Promise<Element>}
         */
        async _waitForElementWithRetry(selector, maxRetries = 3) {
            const utils = this._Utils;
            if (utils?.waitForElement) {
                return utils.waitForElement(selector, 5000);
            }

            // Fallback implementation
            return new Promise((resolve, reject) => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }

                let attempts = 0;
                const observer = new MutationObserver(() => {
                    const el = document.querySelector(selector);
                    if (el) {
                        observer.disconnect();
                        resolve(el);
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });

                setTimeout(() => {
                    observer.disconnect();
                    reject(new Error('Element not found'));
                }, 10000);
            });
        }

        /**
         * Processes existing content on page load
         * @private
         */
        _processExistingContent() {
            const sections = document.querySelectorAll(SearchRedesign.SELECTORS.SECTION_RENDERER);
            if (sections?.length > 0) {
                this._processBatch(sections);
            }
        }

        /**
         * Disconnects the MutationObserver
         * @private
         */
        _disconnectObserver() {
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
                this._log('MutationObserver disconnected', 'DEBUG');
            }
        }

        /**
         * Processes mutation records from MutationObserver
         * @private
         * @param {MutationRecord[]} mutations - Array of mutations
         */
        _processMutations(mutations) {
            // Early exit for irrelevant mutations
            const relevantMutations = mutations.filter(m => 
                m.type === 'childList' && 
                m.addedNodes.length > 0 &&
                m.target.closest(SearchRedesign.SELECTORS.SEARCH_CONTAINER)
            );

            if (relevantMutations.length === 0) return;

            for (const mutation of relevantMutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    this._processNodeTree(node);
                }
            }
        }

        /**
         * Processes a node and its children
         * @private
         * @param {Node} node - Node to process
         */
        _processNodeTree(node) {
            // Check if this node is a section
            if (node.tagName === SearchRedesign.SELECTORS.SECTION_RENDERER.replace('ytd-', 'YTD-')) {
                this._processSection(node);
                return;
            }

            // Check if node is already in a processed container
            if (node.parentElement?.classList.contains(SearchRedesign.CLASSES.GRID_CONTAINER)) {
                this._processNode(node);
                return;
            }

            // Search for sections in added nodes
            if (node.querySelector) {
                const sections = node.querySelectorAll(SearchRedesign.SELECTORS.SECTION_RENDERER);
                if (sections.length) {
                    this._processBatch(sections);
                }
            }
        }

        /**
         * Processes multiple sections
         * @private
         * @param {NodeList|Array} sections - Sections to process
         */
        _processBatch(sections) {
            Array.from(sections).forEach(section => this._processSection(section));
        }

        /**
         * Processes a single section
         * @private
         * @param {Element} section - Section element
         */
        _processSection(section) {
            const contents = section.querySelector(SearchRedesign.SELECTORS.GRID_CONTENTS);
            
            // Validation checks
            if (!contents || this._processedContainers.has(contents)) return;

            // Check for empty state (no results)
            if (contents.querySelector(SearchRedesign.SELECTORS.BACKGROUND_PROMO)) {
                this._log('Empty search results detected', 'DEBUG');
                return;
            }

            // Mark as processed and apply container class
            this._processedContainers.add(contents);
            contents.classList.add(SearchRedesign.CLASSES.GRID_CONTAINER);

            // Process all children
            Array.from(contents.children).forEach(child => {
                this._processNode(child);
            });
        }

        /**
         * Processes a single node (video, playlist, etc.)
         * @private
         * @param {Element} node - Node to process
         */
        _processNode(node) {
            // Idempotency check
            if (!node || node.nodeType !== Node.ELEMENT_NODE || this._processedNodes.has(node)) return;
            
            this._processedNodes.add(node);

            const tagName = node.tagName;

            // Step 1: Remove Shorts
            if (this._isShortsContent(node)) {
                this._removeShortsNode(node, tagName);
                return;
            }

            // Step 2: Normalize for layout
            this._normalizeNodeLayout(node, tagName);
        }

        /**
         * Checks if a node is Shorts content
         * @private
         * @param {Element} node - Node to check
         * @returns {boolean}
         */
        _isShortsContent(node) {
            const tagName = node.tagName;

            // Direct Shorts shelf detection
            if (tagName === 'YTD-REEL-SHELF-RENDERER') return true;
            
            // Rich shelf with Shorts attribute
            if (tagName === 'YTD-RICH-SHELF-RENDERER' && node.hasAttribute('is-shorts')) return true;

            // Shelf with Shorts in title
            if (tagName === 'YTD-SHELF-RENDERER') {
                const titleEl = node.querySelector('#title');
                const titleText = titleEl?.textContent || '';
                if (/Shorts|Reels/i.test(titleText)) return true;
                if (node.querySelector('ytd-reel-shelf-renderer')) return true;
            }

            // Video linking to /shorts/
            if (tagName === 'YTD-VIDEO-RENDERER') {
                const link = node.querySelector('a#thumbnail, a#video-title');
                if (link?.href?.includes('/shorts/')) return true;
                
                const overlay = node.querySelector('ytd-thumbnail-overlay-time-status-renderer');
                if (overlay?.getAttribute('overlay-style') === 'SHORTS') return true;
                
                const ariaElements = node.querySelector('[aria-label*="Shorts" i], [title*="Shorts" i]');
                if (ariaElements) return true;
            }

            return false;
        }

        /**
         * Safely removes a Shorts node from DOM
         * @private
         * @param {Element} node - Node to remove
         * @param {string} tagName - Tag name for logging
         */
        _removeShortsNode(node, tagName) {
            try {
                if (node.parentElement) {
                    this._log(`Removing Shorts: ${tagName}`, 'DEBUG');
                    node.remove();
                }
            } catch (error) {
                this._log(`Failed to remove Shorts (${tagName}): ${error.message}`, 'ERROR');
            }
        }

        /**
         * Normalizes a node for the grid layout
         * @private
         * @param {Element} node - Node to normalize
         * @param {string} tagName - Tag name
         */
        _normalizeNodeLayout(node, tagName) {
            switch (tagName) {
                case 'YTD-VIDEO-RENDERER':
                case 'YTD-PLAYLIST-RENDERER':
                case 'YTD-RADIO-RENDERER':
                    this._applyGridItemStyles(node);
                    break;
                case 'YTD-CHANNEL-RENDERER':
                    this._applyFullWidthStyles(node);
                    break;
                case 'YTD-SHELF-RENDERER':
                case 'YTD-RICH-SHELF-RENDERER':
                    this._normalizeShelf(node);
                    break;
                case 'YTD-RICH-ITEM-RENDERER':
                    this._normalizeRichItem(node);
                    break;
                default:
                    this._applyFullWidthStyles(node);
            }
        }

        /**
         * Applies grid item styles to a node
         * @private
         * @param {Element} node - Node to style
         */
        _applyGridItemStyles(node) {
            node.classList.add(SearchRedesign.CLASSES.GRID_ITEM);
            node.classList.remove(SearchRedesign.CLASSES.FULL_WIDTH);
            
            // Clear inline styles that might interfere
            node.style.width = '';
            node.style.maxWidth = '';
            node.style.margin = '';
            node.style.display = '';
        }

        /**
         * Applies full-width styles to a node
         * @private
         * @param {Element} node - Node to style
         */
        _applyFullWidthStyles(node) {
            node.classList.add(SearchRedesign.CLASSES.FULL_WIDTH);
            node.classList.remove(SearchRedesign.CLASSES.GRID_ITEM);
        }

        /**
         * Normalizes shelf elements
         * @private
         * @param {Element} node - Shelf node
         */
        _normalizeShelf(node) {
            const videos = node.querySelectorAll(
                `${SearchRedesign.SELECTORS.VIDEO_RENDERER}, ytd-grid-video-renderer`
            );
            
            if (videos.length > 0) {
                this._applyFullWidthStyles(node);
                
                // Normalize horizontal carousels
                const carousel = node.querySelector(
                    `${SearchRedesign.SELECTORS.HORIZONTAL_CAROUSEL} ${SearchRedesign.SELECTORS.GRID_CONTENTS}`
                );
                
                if (carousel && !carousel.classList.contains(SearchRedesign.CLASSES.NORMALIZED_CAROUSEL)) {
                    carousel.classList.add(SearchRedesign.CLASSES.NORMALIZED_CAROUSEL);
                    Object.assign(carousel.style, {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        overflowX: 'visible'
                    });
                }

                // Process child videos
                videos.forEach(video => {
                    if (this._processedNodes.has(video)) return;
                    this._processedNodes.add(video);
                    
                    if (!this._isShortsContent(video)) {
                        this._applyGridItemStyles(video);
                    } else {
                        this._removeShortsNode(video, video.tagName);
                    }
                });
            } else {
                this._applyFullWidthStyles(node);
            }
        }

        /**
         * Normalizes rich item elements
         * @private
         * @param {Element} node - Rich item node
         */
        _normalizeRichItem(node) {
            if (node.querySelector(SearchRedesign.SELECTORS.VIDEO_RENDERER)) {
                this._applyGridItemStyles(node);
            } else {
                this._applyFullWidthStyles(node);
            }
        }

        /**
         * Loads persisted view preference
         * @private
         * @async
         * @returns {Promise<string|null>}
         */
        async _loadViewPreference() {
            try {
                const utils = this._Utils;
                if (utils?.getSetting) {
                    return await utils.getSetting('searchViewMode');
                }
            } catch (error) {
                this._log(`Failed to load view preference: ${error.message}`, 'WARN');
            }
            return null;
        }

        /**
         * Saves view preference
         * @private
         * @async
         * @param {string} mode - 'grid' or 'list'
         * @returns {Promise<void>}
         */
        async _saveViewPreference(mode) {
            try {
                const utils = this._Utils;
                if (utils?.saveSetting) {
                    await utils.saveSetting('searchViewMode', mode);
                }
            } catch (error) {
                this._log(`Failed to save view preference: ${error.message}`, 'WARN');
            }
        }

        /**
         * Getter for grid mode state
         * @returns {boolean}
         */
        get _isGridMode() {
            return this.__isGridMode !== undefined ? this.__isGridMode : true;
        }

        /**
         * Setter for grid mode state
         * @param {boolean} value
         */
        set _isGridMode(value) {
            this.__isGridMode = Boolean(value);
        }
    };

    // Static property for grid mode (using closure to avoid property descriptor issues)
    Object.defineProperty(window.YPP.features.SearchRedesign.prototype, '_isGridMode', {
        get: function() { return this.__isGridMode !== undefined ? this.__isGridMode : true; },
        set: function(value) { this.__isGridMode = Boolean(value); },
        configurable: true,
        enumerable: false
    });

})();
