/**
 * Theme Manager - Handles visual theming and content visibility features
 * @class ThemeManager
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Theme = class ThemeManager {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.shortsObserver = null;
        this.watchedObserver = null;
        
        // Constants
        this.WATCHED_THRESHOLD = 85; // Percentage threshold for marking videos as watched
        this.SHORTS_OBSERVER_DEBOUNCE = 100; // ms
        this.WATCHED_OBSERVER_DEBOUNCE = 500; // ms
    }

    /**
     * Enable theme features with provided settings
     * @param {Object} settings - User settings object
     */
    enable(settings) {
        this.run(settings);
    }

    /**
     * Disable all theme features and clean up observers
     */
    disable() {
        try {
            this.toggleTheme(false);
            this.applyTrueBlack(false);
            this.applyHideScrollbar(false);
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
        } catch (error) {
            this.Utils?.log(`Error disabling theme: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Update theme with new settings
     * @param {Object} settings - Updated settings object
     */
    update(settings) {
        this.run(settings);
    }

    /**
     * Apply all theme settings
     * @param {Object} settings - Settings object with theme preferences
     * @private
     */
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

    /**
     * Detects and marks videos as watched based on progress bar percentage
     * @private
     */
    processWatchedVideos() {
        try {
            const selector = this.CONSTANTS?.SELECTORS?.WATCHED_OVERLAY || 
                           'ytd-thumbnail-overlay-resume-playback-renderer #progress';
            const progressBars = document.querySelectorAll(selector);
            
            if (!progressBars || progressBars.length === 0) return;
            
            progressBars.forEach(bar => {
                try {
                    const width = bar?.style?.width;
                    if (!width) return;

                    const percent = parseFloat(width);
                    if (isNaN(percent)) return;

                    const isWatched = percent > this.WATCHED_THRESHOLD;

                    const container = bar.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer');
                    if (container) {
                        if (isWatched) {
                            container.setAttribute('is-watched', '');
                        } else {
                            container.removeAttribute('is-watched');
                        }
                    }
                } catch (err) {
                    // Silently skip this element if there's an error
                }
            });
        } catch (error) {
            this.Utils?.log(`Error processing watched videos: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Determine if a container looks like a Shorts shelf
     * @param {HTMLElement} container - Element to check
     * @returns {boolean} True if container appears to be a Shorts shelf
     * @private
     */
    isShortsContainer(container) {
        if (!container) return false;

        try {
            // Fast checks - element type and attributes
            if (container.tagName === 'YTD-REEL-SHELF-RENDERER') return true;
            if (container.hasAttribute('is-shorts')) return true;

            // Title Check - look for "Shorts" text
            const titleEl = container.querySelector('#title');
            if (titleEl?.textContent) {
                const title = titleEl.textContent.trim().toLowerCase();
                if (title === 'shorts' || title.includes('shorts')) return true;
            }

            // Aria-label check
            const ariaLabel = container.getAttribute('aria-label');
            if (ariaLabel?.toLowerCase().includes('shorts')) return true;

            return false;
        } catch (error) {
            this.Utils?.log(`Error checking shorts container: ${error.message}`, 'THEME', 'error');
            return false;
        }
    }
};
