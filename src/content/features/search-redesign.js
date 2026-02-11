/**
 * YouTube Search Grid - Stable Container Ownership
 * 
 * DESIGN STRATEGY:
 * 1. Own the Container: Target `ytd-section-list-renderer > #contents`
 * 2. Flatten Layout: Use CSS `display: contents` on wrapper sections
 * 3. Strict Grid: Apply CSS Grid to the main container
 * 4. Deterministic Processing: Single debounced pass to classify items
 * 5. Robust Shorts Removal: Hide by renderer type and URL/metadata
 */

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchRedesign = class SearchRedesign {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;

        this.isEnabled = false;
        this.settings = null;
        this.observer = null;
        this.debounceTimer = null;
        this.isGridMode = true;

        this._boundProcessLayout = this.processLayout.bind(this);
        this._boundCheckPage = this.checkPage.bind(this);
    }

    run(settings) {
        this.settings = settings;
        if (settings?.searchGrid || settings?.hideSearchShorts) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.Utils.log('Search Grid Redesign: Activated', 'GRID');

        this.checkPage();
        window.addEventListener('yt-navigate-finish', this._boundCheckPage);
    }

    disable() {
        this.isEnabled = false;
        this.disconnectObserver();
        document.body.classList.remove('ypp-search-grid-mode', 'ypp-search-list-mode');
        window.removeEventListener('yt-navigate-finish', this._boundCheckPage);
    }

    checkPage() {
        if (!this.isEnabled) return;

        // Strict Page Detection
        if (window.location.pathname === '/results') {
            this.applyModeClasses();
            this.waitForContainer();
            this.injectViewToggle();
        } else {
            this.disconnectObserver();
            document.body.classList.remove('ypp-search-grid-mode', 'ypp-search-list-mode');
        }
    }

    applyModeClasses() {
        document.body.classList.toggle('ypp-search-grid-mode', this.isGridMode);
        document.body.classList.toggle('ypp-search-list-mode', !this.isGridMode);
    }

    waitForContainer() {
        // Find the true video list container
        // Structure: ytd-two-column-search-results-renderer -> #primary -> ytd-section-list-renderer -> #contents
        const selector = 'ytd-section-list-renderer #contents';

        this.Utils.waitForElement(selector).then(container => {
            if (container) {
                this.ownContainer(container);
            }
        });
    }

    ownContainer(container) {
        if (this.observer) this.disconnectObserver();

        this.Utils.log('Search Grid: Taking container ownership', 'GRID');

        // Initial Pass
        this.processLayout(container);

        // Single Debounced Observer on Container
        this.observer = new MutationObserver(() => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.processLayout(container);
            }, 50); // Debounce to stabilize infinite scroll
        });

        this.observer.observe(container, {
            childList: true,
            subtree: true // Needed to catch items loading inside sections
        });
    }

    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        clearTimeout(this.debounceTimer);
    }

    /**
     * CORE LOGIC: Single processing pass
     * Scans all relevant items, classifies them, and hides shorts.
     * No caching, no complexity. Stability first.
     */
    processLayout(container) {
        // Select logic: Flattening approach
        // We look for all direct renderers that might be inside sections
        const items = container.querySelectorAll(
            'ytd-video-renderer, ytd-channel-renderer, ytd-playlist-renderer, ytd-shelf-renderer, ytd-reel-shelf-renderer, ytd-radio-renderer'
        );

        items.forEach(item => {
            // 1. Shorts Prevention (Kill it first)
            if (this.isShorts(item)) {
                item.style.display = 'none';
                item.classList.add('ypp-hidden-short');
                return;
            }

            // 2. Classification
            const tagName = item.tagName;

            if (tagName === 'YTD-VIDEO-RENDERER') {
                // It's a grid item (Video)
                item.classList.add('ypp-grid-item');
                item.classList.remove('ypp-full-width-item');
                // Ensure internal styles are reset for grid
                item.style.display = '';
                item.style.width = '';
            } else {
                // It's everything else (Channel, Playlist, etc.) -> Full Width
                item.classList.add('ypp-full-width-item');
                item.classList.remove('ypp-grid-item');

                // Special check for mixed shelves (Recently uploaded shorts leak)
                if (tagName === 'YTD-SHELF-RENDERER') {
                    if (this.containsShorts(item)) {
                        item.classList.add('ypp-hidden-short');
                        item.style.display = 'none';
                    }
                }
            }
        });
    }

    isShorts(node) {
        const tagName = node.tagName;

        // Structural Removal
        if (tagName === 'YTD-REEL-SHELF-RENDERER') return true;

        // Videos
        if (tagName === 'YTD-VIDEO-RENDERER') {
            // URL Check
            const link = node.querySelector('a#thumbnail[href*="/shorts/"]');
            if (link) return true;

            // Metadata Checks
            if (node.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="SHORTS"]')) return true;
            if (node.querySelector('[aria-label*="Shorts" i]')) return true;
        }

        return false;
    }

    containsShorts(shelf) {
        const title = shelf.querySelector('#title')?.textContent || '';
        if (/Shorts|Reels/i.test(title)) return true;
        if (shelf.querySelector('ytd-reel-shelf-renderer')) return true;
        // Check grid children
        if (shelf.querySelector('ytd-grid-video-renderer[is-short]')) return true;
        return false;
    }

    async injectViewToggle() {
        if (document.getElementById('ypp-view-toggle')) return;

        const filterHeader = await this.Utils.waitForElement('ytd-search-sub-menu-renderer', 5000);
        if (!filterHeader) return;

        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'ypp-view-toggle';
        toggleBtn.className = 'ypp-view-mode-toggle';
        toggleBtn.innerHTML = `
            <button class="ypp-toggle-btn ${this.isGridMode ? 'active' : ''}" data-mode="grid" title="Grid View">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zM3 14h7v7H3v-7z" fill="currentColor"/></svg>
            </button>
            <button class="ypp-toggle-btn ${!this.isGridMode ? 'active' : ''}" data-mode="list" title="Compact List">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" fill="currentColor"/></svg>
            </button>
        `;

        filterHeader.appendChild(toggleBtn);

        toggleBtn.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.isGridMode = (mode === 'grid');
                this.applyModeClasses();

                toggleBtn.querySelectorAll('.ypp-toggle-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.mode === mode);
                });
            });
        });
    }
};
