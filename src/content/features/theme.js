// Theme Manager
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Theme = class ThemeManager {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.shortsObserver = null;
    }

    // New Standard Lifecycle
    enable(settings) {
        this.run(settings);
    }

    disable() {
        this.toggleTheme(false);
        this.applyTrueBlack(false);
        this.applyHideScrollbar(false);
        this.applyProgressBarColor(null);
        this.applyProgressBarColor(null);
        this.manageShortsObserver(false);
        this.manageWatchedObserver(false);

        // Disable other visibility toggles
        const classes = [
            this.CONSTANTS.CSS_CLASSES.HIDE_SHORTS,
            this.CONSTANTS.CSS_CLASSES.HIDE_MIXES,
            this.CONSTANTS.CSS_CLASSES.HIDE_WATCHED,
            this.CONSTANTS.CSS_CLASSES.HIDE_MERCH,
            this.CONSTANTS.CSS_CLASSES.HIDE_COMMENTS,
            this.CONSTANTS.CSS_CLASSES.HIDE_ENDSCREENS,
            this.CONSTANTS.CSS_CLASSES.BLUE_PROGRESS,
            this.CONSTANTS.CSS_CLASSES.HOOK_FREE,
            'ypp-clean-search',
            'ypp-hide-search-shorts',
            'ypp-search-grid'
        ];
        document.body.classList.remove(...classes);
    }

    update(settings) {
        this.run(settings);
    }

    run(settings) {
        this.toggleTheme(settings.premiumTheme);
        this.applyVisibilitySettings(settings);

        // UI Customization
        this.applyTrueBlack(settings.trueBlack);
        this.applyHideScrollbar(settings.hideScrollbar);

        if (settings.customProgressBar) {
            this.applyProgressBarColor(settings.progressBarColor || '#ff0000');
        } else {
            this.applyProgressBarColor(null); // Remove if disabled
        }



        // Specific Shorts Logic
        const hideShorts = settings.hideShorts || settings.hideSearchShorts;
        this.manageShortsObserver(hideShorts);

        // Watched Logic
        this.manageWatchedObserver(settings.hideWatched);
    }

    applyHideScrollbar(enable) {
        document.body.classList.toggle('ypp-hide-scrollbar', enable);
    }

    applyTrueBlack(enable) {
        const root = document.documentElement.style;
        if (enable) {
            root.setProperty('--yt-spec-base-background', '#000000', 'important');
            root.setProperty('--yt-spec-raised-background', '#090909', 'important');
            root.setProperty('--yt-spec-menu-background', '#0f0f0f', 'important');
        } else {
            root.removeProperty('--yt-spec-base-background');
            root.removeProperty('--yt-spec-raised-background');
            root.removeProperty('--yt-spec-menu-background');
        }
    }

    applyProgressBarColor(color) {
        const styleId = 'ypp-progress-bar-color';
        let style = document.getElementById(styleId);

        if (!color) {
            if (style) style.remove();
            return;
        }

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = `
            .ytp-play-progress, .ytp-scrubber-button {
                background-color: ${color} !important;
            }
            .ytp-swatch-background-color {
                background-color: ${color} !important;
            }
        `;
    }



    toggleTheme(enable) {
        document.body.classList.toggle(this.CONSTANTS.CSS_CLASSES.THEME_ENABLED, enable);
    }

    applyVisibilitySettings(settings) {
        const toggle = (cls, state) => document.body.classList.toggle(cls, !!state);

        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_SHORTS, settings.hideShorts);
        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_MIXES, settings.hideMixes);
        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_WATCHED, settings.hideWatched);
        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_MERCH, settings.hideMerch);
        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_COMMENTS, settings.hideComments);
        toggle(this.CONSTANTS.CSS_CLASSES.HIDE_ENDSCREENS, settings.hideEndScreens);
        toggle(this.CONSTANTS.CSS_CLASSES.BLUE_PROGRESS, settings.blueProgress);
        toggle(this.CONSTANTS.CSS_CLASSES.HOOK_FREE, settings.hookFreeHome);

        // Search Specific
        toggle('ypp-clean-search', settings.cleanSearch);
        toggle('ypp-hide-search-shorts', settings.hideSearchShorts);
        toggle('ypp-search-grid', settings.searchGrid);
    }

    /**
     * Start observing for Shorts to hide them dynamically.
     * @param {boolean} enable 
     */
    manageShortsObserver(enable) {
        this.hideShortsElements(enable);

        if (enable) {
            if (!this.shortsObserver) {
                const processMutations = () => this.hideShortsElements(true);
                const debouncedProcess = this.Utils.debounce(processMutations, 100);

                this.shortsObserver = new MutationObserver((mutations) => {
                    const hasRelevantMutation = mutations.some(m =>
                        m.addedNodes.length > 0 &&
                        (m.target.tagName.includes('YTD') || m.target.id === 'contents')
                    );

                    if (hasRelevantMutation) {
                        debouncedProcess();
                    }
                });
                this.shortsObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else {
            if (this.shortsObserver) {
                this.shortsObserver.disconnect();
                this.shortsObserver = null;
            }
            this.hideShortsElements(false);
        }
    }

    /**
     * Hide or Show Shorts elements based on selectors.
     * @param {boolean} enable 
     */
    hideShortsElements(enable) {
        // defined selectors for shorts elements
        const selectors = [
            this.CONSTANTS.SELECTORS.SHORTS_SECTION || 'ytd-rich-section-renderer[is-shorts]',
            'ytd-reel-shelf-renderer',
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-secondary-search-container-renderer',
            'a[href^="/shorts"]' // Aggressive link hiding if needed, but usually container is better
        ];

        // 1. Tag based / Attribute based hiding
        selectors.forEach(sel => {
            const elements = document.querySelectorAll(sel);
            elements.forEach(el => {
                // Determine if we should hide specific links or just containers
                if (el.tagName === 'A' && !el.closest('ytd-rich-item-renderer')) return; // Don't hide links in weird places
                el.style.display = enable ? 'none' : '';
            });
        });

        // 2. Content Heuristics (for items that don't have explicit tags yet)
        if (enable) {
            const potentialContainers = document.querySelectorAll(
                'ytd-shelf-renderer, ytd-rich-shelf-renderer, ytd-item-section-renderer'
            );
            potentialContainers.forEach(container => {
                if (this.isShortsContainer(container)) {
                    container.style.display = 'none';
                }
            });
        }
    }

    /**
     * Start observing for Watched videos to mark them.
     * @param {boolean} enable
     */
    manageWatchedObserver(enable) {
        this.processWatchedVideos(); // Run once immediately

        if (enable) {
            if (!this.watchedObserver) {
                const process = () => this.processWatchedVideos();
                const debouncedProcess = this.Utils.debounce(process, 500);

                this.watchedObserver = new MutationObserver((mutations) => {
                    // Check if relevant things changed
                    const relevant = mutations.some(m => m.addedNodes.length > 0 || m.type === 'attributes');
                    if (relevant) debouncedProcess();
                });

                // Observe body for dynamic loading
                this.watchedObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else {
            if (this.watchedObserver) {
                this.watchedObserver.disconnect();
                this.watchedObserver = null;
            }
            // Optional: Remove is-watched attributes if disabled? 
            // Might be expensive to crawl everything, usually fine to leave attributes if CSS class is removed.
        }
    }

    processWatchedVideos() {
        // Use generic selector from constants
        const selector = this.CONSTANTS.SELECTORS.WATCHED_OVERLAY || 'ytd-thumbnail-overlay-resume-playback-renderer #progress';
        const progressBars = document.querySelectorAll(selector);
        progressBars.forEach(bar => {
            const width = bar.style.width;
            if (!width) return;

            const percent = parseFloat(width);
            if (isNaN(percent)) return;

            // Threshold for "Watched": 85%
            const isWatched = percent > 85;

            const container = bar.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer');
            if (container) {
                if (isWatched) {
                    container.setAttribute('is-watched', '');
                } else {
                    container.removeAttribute('is-watched');
                }
            }
        });
    }

    /**
     * Determine if a container looks like a Shorts shelf.
     * @param {HTMLElement} container 
     * @returns {boolean}
     */
    isShortsContainer(container) {
        if (!container) return false;

        // Fast checks
        if (container.tagName === 'YTD-REEL-SHELF-RENDERER') return true;
        if (container.hasAttribute('is-shorts')) return true;

        // Title Check
        const titleEl = container.querySelector('#title');
        if (titleEl && titleEl.textContent) {
            const title = titleEl.textContent.trim().toLowerCase();
            if (title === 'shorts') return true;
        }

        // Icon Check (Shorts icon is usually distinct)
        const icon = container.querySelector('yt-icon');
        if (icon) {
            // Check paths or accessibility labels if available
        }

        return false;
    }
};
