/**
 * YouTube Search Grid - Production-Hardened Layout Ownership
 * 
 * Fixes:
 * 1. Comprehensive Shorts coverage (all renderer types)
 * 2. Observer performance (node caching, debouncing)
 * 3. Renderer classification (grid vs non-grid items)
 */

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchRedesign = class SearchRedesign {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.isSearchPage = false;
        this.settings = null;
        this.observer = null;
        this.gridContainer = null;
        this.ytSearchRoot = null;

        // Performance: Track processed nodes
        this.processedNodes = new WeakSet();
        this.debounceTimer = null;
    }

    /**
     * Initialize feature
     */
    run(settings) {
        this.update(settings);
    }

    /**
     * Update settings
     */
    update(settings) {
        this.settings = settings;

        if (settings?.searchGrid || settings?.hideSearchShorts || settings?.cleanSearch) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable feature
     */
    enable() {
        console.log('[YPP:GRID] Enabling production-hardened grid');

        if (this.isActive) {
            this.checkPage();
            return;
        }

        this.isActive = true;
        this.Utils.log('Production grid system enabled', 'GRID');

        this.checkPage();
        window.addEventListener('yt-navigate-finish', () => this.checkPage());
    }

    /**
     * Check if on search page
     */
    checkPage() {
        const wasSearchPage = this.isSearchPage;
        this.isSearchPage = window.location.pathname === '/results';

        if (this.isSearchPage && !wasSearchPage) {
            this.activateGrid();
        } else if (!this.isSearchPage && wasSearchPage) {
            this.deactivateGrid();
        }
    }

    /**
     * Activate grid layout
     */
    activateGrid() {
        console.log('[YPP:GRID] Activating grid');

        // Wait for YouTube to render
        setTimeout(() => {
            this.initializeGrid();
            this.normalizeLayout();
            this.startObserver();
        }, 500);
    }

    /**
     * Initialize grid container
     */
    initializeGrid() {
        console.log('[YPP:GRID] Initializing grid');

        // Find YouTube's search root - try multiple selectors
        this.ytSearchRoot = document.querySelector('ytd-item-section-renderer[page-subtype="search"] #contents') ||
            document.querySelector('ytd-search ytd-item-section-renderer #contents') ||
            document.querySelector('ytd-search #contents');

        if (!this.ytSearchRoot) {
            console.error('[YPP:GRID] YouTube search root not found');
            return false;
        }

        console.log('[YPP:GRID] Found search root');

        // Create grid container
        if (!document.getElementById('ypp-grid-root')) {
            this.gridContainer = document.createElement('div');
            this.gridContainer.id = 'ypp-grid-root';
            this.gridContainer.className = 'ypp-grid-root';

            this.ytSearchRoot.insertBefore(this.gridContainer, this.ytSearchRoot.firstChild);
            console.log('[YPP:GRID] ✅ Grid container created');
        } else {
            this.gridContainer = document.getElementById('ypp-grid-root');
        }

        document.body.classList.add('ypp-grid-active');
        return true;
    }

    /**
     * Normalize layout - move items into grid
     */
    normalizeLayout() {
        if (!this.gridContainer || !this.ytSearchRoot) {
            console.error('[YPP:GRID] Cannot normalize - not initialized');
            return;
        }

        console.log('[YPP:GRID] Normalizing layout');

        // Get all children (except our grid)
        const allItems = Array.from(this.ytSearchRoot.children).filter(
            child => child.id !== 'ypp-grid-root'
        );

        let movedCount = 0;
        let removedCount = 0;
        let skippedCount = 0;

        allItems.forEach(item => {
            // Skip already processed nodes
            if (this.processedNodes.has(item)) {
                skippedCount++;
                return;
            }

            // Mark as processed
            this.processedNodes.add(item);

            if (this.shouldRemoveShorts(item)) {
                // Hide Shorts completely
                console.log('[YPP:GRID] Hiding Shorts:', item.tagName);
                item.style.display = 'none';
                removedCount++;
            } else if (this.isGridEligible(item)) {
                // Move to grid
                this.gridContainer.appendChild(item);
                movedCount++;
            }
            // Else: leave in place (channels, playlists, etc.)
        });

        console.log(`[YPP:GRID] ✅ Moved: ${movedCount}, Hidden: ${removedCount}, Skipped: ${skippedCount}`);
    }

    /**
     * Check if item is eligible for grid (videos only)
     */
    isGridEligible(item) {
        const tagName = item.tagName;

        // Only videos in grid
        if (tagName === 'YTD-VIDEO-RENDERER') {
            return !this.isShortVideo(item);
        }

        // Rich items if they're videos
        if (tagName === 'YTD-RICH-ITEM-RENDERER') {
            const link = item.querySelector('a');
            return link && !link.href.includes('/shorts/');
        }

        return false;
    }

    /**
     * Comprehensive Shorts detection
     */
    shouldRemoveShorts(item) {
        const tagName = item.tagName;

        // Shorts shelves (Fix #1: comprehensive coverage)
        if (tagName === 'YTD-SHELF-RENDERER') {
            const hasReelShelf = item.querySelector('ytd-reel-shelf-renderer') !== null;
            const titleText = item.textContent || '';
            const hasShortsTitle = /shorts|#shorts/i.test(titleText);

            if (hasReelShelf || hasShortsTitle) {
                return true;
            }
        }

        // Direct reel shelf renderers
        if (tagName === 'YTD-REEL-SHELF-RENDERER') {
            return true;
        }

        // Rich shelf renderers marked as Shorts
        if (tagName === 'YTD-RICH-SHELF-RENDERER') {
            if (item.hasAttribute('is-shorts') || /shorts/i.test(item.textContent || '')) {
                return true;
            }
        }

        // Secondary shelf renderers
        if (tagName === 'YTD-HORIZONTAL-CARD-LIST-RENDERER') {
            if (/shorts/i.test(item.textContent || '')) {
                return true;
            }
        }

        // Individual Short videos
        if (tagName === 'YTD-VIDEO-RENDERER' || tagName === 'YTD-RICH-ITEM-RENDERER') {
            return this.isShortVideo(item);
        }

        return false;
    }

    /**
     * Check if individual video is a Short
     */
    isShortVideo(item) {
        // URL check
        const link = item.querySelector('a#thumbnail, a#video-title, a.yt-simple-endpoint');
        if (link?.href?.includes('/shorts/')) {
            return true;
        }

        // Badge check
        const badges = item.querySelectorAll('.badge-style-type-simple, ytd-badge-supported-renderer');
        for (const badge of badges) {
            if (/shorts/i.test(badge.textContent || '')) {
                return true;
            }
        }

        // Accessibility label check
        const ariaLabel = item.getAttribute('aria-label') || '';
        if (/shorts/i.test(ariaLabel)) {
            return true;
        }

        return false;
    }

    /**
     * Start mutation observer with performance optimization
     */
    startObserver() {
        if (!this.ytSearchRoot) return;

        console.log('[YPP:GRID] Starting optimized observer');

        // Fix #2: Debounced, efficient observer
        this.observer = new MutationObserver((mutations) => {
            // Only care about added nodes
            const hasNewNodes = mutations.some(m =>
                m.type === 'childList' && m.addedNodes.length > 0
            );

            if (!hasNewNodes) return;

            // Clear existing timer
            clearTimeout(this.debounceTimer);

            // Debounce: wait for mutations to settle
            this.debounceTimer = setTimeout(() => {
                if (this.isSearchPage && this.isActive) {
                    console.log('[YPP:GRID] New content detected, normalizing');
                    this.normalizeLayout();
                }
            }, 300);
        });

        // Only watch direct children of search root
        this.observer.observe(this.ytSearchRoot, {
            childList: true,
            subtree: false // Don't watch deep changes
        });

        console.log('[YPP:GRID] ✅ Observer started');
    }

    /**
     * Deactivate grid
     */
    deactivateGrid() {
        console.log('[YPP:GRID] Deactivating');

        // Clean up observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        // Clear debounce timer
        clearTimeout(this.debounceTimer);

        // Move items back
        if (this.gridContainer && this.ytSearchRoot) {
            const items = Array.from(this.gridContainer.children);
            items.forEach(item => {
                this.ytSearchRoot.appendChild(item);
            });

            this.gridContainer.remove();
            this.gridContainer = null;
        }

        // Restore hidden Shorts
        const hiddenItems = this.ytSearchRoot?.querySelectorAll('[style*="display: none"]');
        hiddenItems?.forEach(item => {
            item.style.display = '';
        });

        document.body.classList.remove('ypp-grid-active');

        // Clear processed nodes cache
        this.processedNodes = new WeakSet();

        this.ytSearchRoot = null;
    }

    /**
     * Disable feature
     */
    disable() {
        this.deactivateGrid();
        this.isActive = false;
        this.isSearchPage = false;
    }
};
