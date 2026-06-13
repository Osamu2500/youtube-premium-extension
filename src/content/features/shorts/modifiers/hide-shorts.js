window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HideShorts = class HideShorts extends window.YPP.features.BaseFeature {
    constructor() {
        super('HideShorts');
        this.handleShortsAdded = this.handleShortsAdded.bind(this);
        this._isMonitoringShorts = false;
        
        // Setup CSS rules to inject
        this._styleId = 'ypp-hide-shorts-style';
    }

    getConfigKey() { return null; } // Controlled by multiple keys (hideShorts, hideSearchShorts)

    async enable() {
        await super.enable();
        this.applySettings();
    }

    async disable() {
        await super.disable();
        this._cleanupDOM();
        this.stopShortsMonitoring();
    }

    onUpdate() {
        this.applySettings();
    }

    applySettings() {
        // Toggle the body classes that popup.css/content.css relies on
        document.body.classList.toggle('ypp-hide-shorts', !!this.settings.hideShorts);
        document.body.classList.toggle('ypp-hide-search-shorts', !!this.settings.hideSearchShorts);
        
        // Also inject dynamic styles for absolute hiding without rely entirely on external CSS
        this._injectStyles();

        // If either is enabled, we need to monitor the DOM to add attributes
        if (this.settings.hideShorts || this.settings.hideSearchShorts) {
            this.removeShortsFromDOM();
            this.startShortsMonitoring();
        } else {
            this._cleanupDOM();
            this.stopShortsMonitoring();
        }
    }
    
    _injectStyles() {
        let styleEl = document.getElementById(this._styleId);
        
        if (!this.settings.hideShorts && !this.settings.hideSearchShorts) {
            if (styleEl) styleEl.remove();
            return;
        }

        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = this._styleId;
            document.head.appendChild(styleEl);
        }

        let css = '';
        if (this.settings.hideShorts) {
            css += `
                ytd-reel-shelf-renderer,
                ytd-rich-shelf-renderer[is-shorts],
                ytd-rich-section-renderer[is-shorts],
                ytd-shelf-renderer[is-shorts],
                ytm-reel-shelf-renderer,
                grid-shelf-view-model,
                ytd-reel-item-renderer,
                ytd-rich-item-renderer:has(a[href*="/shorts/"]),
                ytd-video-renderer:has(a[href*="/shorts/"]):not([is-search]),
                ytd-grid-video-renderer:has(a[href*="/shorts/"]),
                ytd-compact-video-renderer:has(a[href*="/shorts/"]),
                ytd-playlist-video-renderer:has(a[href*="/shorts/"]),
                ytd-guide-entry-renderer:has(a[title="Shorts"]),
                ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
                tp-yt-paper-tab[aria-label="Shorts"],
                yt-tab-shape[tab-title="Shorts"],
                #related ytd-reel-shelf-renderer,
                ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer,
                [data-ypp-is-short="true"] {
                    display: none !important;
                }
            `;
        }
        
        if (this.settings.hideSearchShorts) {
            css += `
                ytd-video-renderer[is-search]:has(a[href*="/shorts/"]),
                ytd-search ytd-reel-shelf-renderer {
                    display: none !important;
                }
            `;
        }

        styleEl.textContent = css;
    }

    _cleanupDOM() {
        const styleEl = document.getElementById(this._styleId);
        if (styleEl) styleEl.remove();
        
        document.body.classList.remove('ypp-hide-shorts', 'ypp-hide-search-shorts');
        document.querySelectorAll('[data-ypp-is-short]').forEach(el => el.removeAttribute('data-ypp-is-short'));
    }

    removeShortsFromDOM() {
        const SHORTS_PATTERNS = [
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-rich-section-renderer[is-shorts]',
            'ytd-shelf-renderer[is-shorts]',
            'ytm-reel-shelf-renderer',
            'grid-shelf-view-model',
            'ytd-reel-item-renderer',
            'ytd-rich-item-renderer:has(a[href*="/shorts/"])',
            'ytd-grid-video-renderer:has(a[href*="/shorts/"])',
            'ytd-compact-video-renderer:has(a[href*="/shorts/"])',
            'ytd-playlist-video-renderer:has(a[href*="/shorts/"])',
            'ytd-guide-entry-renderer:has(a[title="Shorts"])',
            'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
            'tp-yt-paper-tab[aria-label="Shorts"]',
            'yt-tab-shape[tab-title="Shorts"]',
            '#related ytd-reel-shelf-renderer',
            'ytd-watch-next-secondary-results-renderer ytd-reel-shelf-renderer'
        ];

        let removed = 0;
        try {
            const combinedSelector = SHORTS_PATTERNS.join(', ');
            const elements = document.querySelectorAll(combinedSelector);
            elements.forEach(el => {
                if (this._isShortsElement(el)) {
                    if (!el.hasAttribute('data-ypp-is-short')) {
                        el.setAttribute('data-ypp-is-short', 'true');
                        removed++;
                    }
                }
            });
            
            // Search specific shorts videos if enabled
            if (this.settings.hideSearchShorts && window.location.pathname === '/results') {
                document.querySelectorAll('ytd-video-renderer:has(a[href*="/shorts/"])').forEach(el => {
                    el.setAttribute('is-search', 'true');
                });
            }
        } catch (err) {
            this.utils?.log(`Error removing shorts: ${err.message}`, 'HideShorts', 'error');
        }

        this._removeShortsChips();
        this._removeShortsByHeuristics();

        if (removed > 0) {
            this.utils?.log(`Removed ${removed} Shorts elements from DOM`, 'HideShorts');
        }
    }

    _isShortsElement(element) {
        if (!element) return false;
        const tagName = element.tagName?.toLowerCase();
        if (tagName === 'ytd-reel-shelf-renderer' || tagName.includes('reel')) return true;
        if (element.hasAttribute('is-shorts')) return true;
        if (element.querySelector('a[href*="/shorts/"]')) return true;
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel?.toLowerCase().includes('shorts')) return true;
        const title = element.querySelector('#title, [title]');
        if (title?.textContent?.toLowerCase().includes('shorts') || 
            title?.getAttribute('title')?.toLowerCase().includes('shorts')) {
            return true;
        }
        return false;
    }

    _removeShortsChips() {
        const chips = document.querySelectorAll("yt-chip-cloud-chip-renderer");
        chips.forEach(chip => {
            const textElement = chip.querySelector("#text");
            if (textElement && textElement.innerText.trim() === "Shorts") {
                if (!chip.hasAttribute('data-ypp-is-short')) {
                    chip.setAttribute('data-ypp-is-short', 'true');
                }
            }
        });
    }

    _removeShortsByHeuristics() {
        if (window.location.pathname === '/results') return;
        const shelves = document.querySelectorAll('ytd-shelf-renderer, ytd-rich-shelf-renderer');
        shelves.forEach(shelf => {
            if (this._isShortsElement(shelf)) {
                if (!shelf.hasAttribute('data-ypp-is-short')) {
                    shelf.setAttribute('data-ypp-is-short', 'true');
                }
            }
        });
        const videos = document.querySelectorAll(
            'ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
        );
        videos.forEach(video => {
            const badge = video.querySelector('span[aria-label="Shorts"], ytd-badge-supported-renderer');
            if (badge?.getAttribute('aria-label') === 'Shorts' ||
                badge?.textContent?.trim() === 'Shorts') {
                if (!video.hasAttribute('data-ypp-is-short')) {
                    video.setAttribute('data-ypp-is-short', 'true');
                }
            }
        });
    }

    startShortsMonitoring() {
        if (this._isMonitoringShorts) return;
        this.utils?.log('Starting continuous Shorts monitoring via DOMObserver', 'HideShorts');
        const isSearchPage = window.location.pathname === '/results';
        const monitorSelector = isSearchPage
            ? 'ytd-rich-item-renderer, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-guide-entry-renderer, yt-chip-cloud-chip-renderer'
            : 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-reel-shelf-renderer, ytd-rich-shelf-renderer, ytd-guide-entry-renderer, yt-chip-cloud-chip-renderer';

        this.observer.register(
            'shorts-monitor',
            monitorSelector,
            this.handleShortsAdded,
            false 
        );
        this._isMonitoringShorts = true;
    }

    stopShortsMonitoring() {
        if (this._isMonitoringShorts) {
            this.observer.unregister('shorts-monitor');
            this._isMonitoringShorts = false;
            this.utils?.log('Stopped Shorts monitoring', 'HideShorts');
        }
    }

    handleShortsAdded(elements) {
        if (!elements || !Array.isArray(elements) || elements.length === 0) {
            this.removeShortsFromDOM();
            return;
        }

        let removed = 0;
        elements.forEach(el => {
            if (!el) return;
            
            // Search specific shorts videos if enabled
            if (this.settings.hideSearchShorts && window.location.pathname === '/results' && el.tagName?.toLowerCase() === 'ytd-video-renderer') {
                if (el.querySelector('a[href*="/shorts/"]')) {
                    el.setAttribute('is-search', 'true');
                }
            }

            if (window.location.pathname === '/results') return; // Do not hide real results

            if (this._isShortsElement(el)) {
                if (!el.hasAttribute('data-ypp-is-short')) {
                    el.setAttribute('data-ypp-is-short', 'true');
                    removed++;
                }
                return;
            }
            
            if (el.tagName && el.tagName.toLowerCase() === 'yt-chip-cloud-chip-renderer') {
                const textElement = el.querySelector("#text");
                if (textElement && textElement.innerText.trim() === "Shorts") {
                    if (!el.hasAttribute('data-ypp-is-short')) {
                        el.setAttribute('data-ypp-is-short', 'true');
                        removed++;
                    }
                }
                return;
            }

            try {
                const nestedShorts = el.querySelectorAll('ytd-reel-shelf-renderer, a[href*="/shorts/"]');
                if (nestedShorts.length > 0 && this._isShortsElement(el)) {
                     if (!el.hasAttribute('data-ypp-is-short')) {
                         el.setAttribute('data-ypp-is-short', 'true');
                         removed++;
                     }
                }
            } catch(e) {}
        });

        if (removed > 0) {
            this.utils?.log(`Dynamic removal: ${removed} Shorts elements`, 'HideShorts');
        }
    }
};
