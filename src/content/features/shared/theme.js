/**
 * Theme Manager - Handles visual theming and content visibility features
 * Uses centralized constants for configuration
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Theme Manager
 * @class ThemeManager
 */
window.YPP.features.Theme = class ThemeManager {
    /**
     * Initialize Theme Manager
     * @constructor
     */
    constructor() {
        this._initConstants();
        this._initState();
    }

    /**
     * Initialize constants from centralized config
     * @private
     */
    _initConstants() {
        this._CONSTANTS = window.YPP.CONSTANTS || {};
        this._SELECTORS = this._CONSTANTS.SELECTORS || {};
        this._CSS_CLASSES = this._CONSTANTS.CSS_CLASSES || {};
        this._GRID = this._CONSTANTS.GRID || {};
        this._TIMINGS = this._CONSTANTS.TIMINGS || {};
        this._Utils = window.YPP.Utils || {};
    }

    /**
     * Initialize internal state
     * @private
     */
    _initState() {
        this._isActive = false;
        this._settings = null;
        this._shortsObserver = null;
        this._watchedObserver = null;
        this._progressBarStyle = null;
        this._WATCHED_THRESHOLD = 85;
        this._SHORTS_DEBOUNCE = this._TIMINGS.DEBOUNCE_DEFAULT || 100;
        this._WATCHED_DEBOUNCE = this._TIMINGS.DEBOUNCE_SEARCH || 500;
    }

    /**
     * Enable theme features
     * @param {Object} settings - User settings
     */
    enable(settings) {
        this._run(settings);
    }

    /**
     * Disable all theme features
     */
    disable() {
        try {
            this._toggleTheme(false);
            this._applyTrueBlack(false);
            this._applyHideScrollbar(false);
            this._applyProgressBarColor(null);
            this._manageShortsObserver(false);
            this._manageWatchedObserver(false);
            this._cleanupClasses();

            this._isActive = false;
        } catch (error) {
            this._Utils.log?.(`Error disabling theme: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Update theme with new settings
     * @param {Object} settings - Updated settings
     */
    update(settings) {
        this._run(settings);
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    /**
     * Run theme application
     * @private
     * @param {Object} settings
     */
    _run(settings) {
        this._settings = settings || {};
        this._isActive = true;

        try {
            // Apply theme
            this._toggleTheme(this._settings.premiumTheme);

            // Apply visibility settings
            this._applyVisibilitySettings();

            // Apply UI customization
            this._applyTrueBlack(this._settings.trueBlack);
            this._applyHideScrollbar(this._settings.hideScrollbar);

            // Progress bar
            if (this._settings.customProgressBar) {
                this._applyProgressBarColor(this._settings.progressBarColor || '#ff0000');
            } else {
                this._applyProgressBarColor(null);
            }

            // Shorts management
            const hideShorts = this._settings.hideShorts || this._settings.hideSearchShorts;
            this._manageShortsObserver(hideShorts);

            // Watched videos
            this._manageWatchedObserver(this._settings.hideWatched);

        } catch (error) {
            this._Utils.log?.(`Error running theme: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Toggle the theme based on settings.
     * Handles premium theme, true black (legacy), and new multi-themes.
     * @param {boolean} enable - Whether premium theme is enabled
     */
    /**
     * Toggle the theme based on settings.
     * Handles premium theme, true black (legacy), and new multi-themes.
     * @param {boolean} enable - Whether premium theme is enabled
     */
    _toggleTheme(enable) {
        const root = document.documentElement;
        const body = document.body;
        
        // Remove base premium class
        root.classList.toggle(this._CSS_CLASSES.THEME_ENABLED, enable);
        if (body) body.classList.toggle(this._CSS_CLASSES.THEME_ENABLED, enable);

        this._Utils.log(`Toggling theme: ${enable ? 'ON' : 'OFF'}`, 'THEME');

        if (enable) {
            // Determine active theme
            let activeThemeKey = this._settings.activeTheme || 'default';

            // Legacy support: if trueBlack is on and theme is default, use midnight
            // This ensures users who had "True Black" enabled before the update get the Midnight theme
            if (this._settings.trueBlack === true && activeThemeKey === 'default') {
                this._Utils.log('Legacy True Black enabled -> Forcing Midnight theme', 'THEME');
                activeThemeKey = 'midnight';
            }
            
            
            // Optimization: Only inject if theme changed or not yet injected
            if (activeThemeKey !== this._currentThemeKey) {
                this._Utils.log(`Theme changed (${this._currentThemeKey} -> ${activeThemeKey}), injecting...`, 'THEME');
                this._injectThemeFile(activeThemeKey);
                this._currentThemeKey = activeThemeKey;
            } else {
                 this._Utils.log(`Theme '${activeThemeKey}' already active, skipping injection.`, 'THEME', 'debug');
            }
            
            // Show feedback (only if not initial load to avoid spam)
            // But for now, let's show it to be sure
            // if (this._Utils && typeof this._Utils.createToast === 'function') {
            //     const themeName = Object.values(this._CONSTANTS.THEMES).find(t => t.key === activeThemeKey)?.label || 'Theme';
            //      this._Utils.createToast(`Applied ${themeName}`);
            // }

        } else {
            this._removeThemeFile();
            this._currentThemeKey = null;
        }
    }

    /**
     * Force reload the current theme (used by Force Apply button)
     */
    forceReload() {
        if (this._currentThemeKey) {
            this._Utils.log('Force reloading theme...', 'THEME');
            this._injectThemeFile(this._currentThemeKey, true);
        } else {
             // If no theme active, maybe try to enable based on settings?
             this._run(this._settings);
        }
    }

    /**
     * Inject specific theme CSS file
     * @param {string} themeKey 
     * @param {boolean} [force=false] - Force cache bust
     */
    _injectThemeFile(themeKey, force = false) {
        const id = 'ypp-active-theme-css';
        let link = document.getElementById(id);

        const cssUrl = chrome.runtime.getURL(`src/content/themes/${themeKey}.css`);
        
        // Only use timestamp if forced, otherwise let Chrome handle caching (or not)
        // Actually, for local dev/updates, we probably don't need timestamp unless dev is changing files.
        // But "Force Apply" implies we want to be sure.
        const fullUrl = force ? `${cssUrl}?t=${Date.now()}` : cssUrl;

        if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.className = 'ypp-theme-link';
            document.head.appendChild(link);
        }

        // Always update to ensure we force a repaint/reload if requested
        link.href = fullUrl;

        // VERIFICATION LOG
        this._Utils.log(`Injecting Theme: ${themeKey} (Force: ${force})`, 'THEME');
        this._Utils.log(`URL: ${fullUrl}`, 'THEME');
    }

    /**
     * Remove the injected theme file
     */
    _removeThemeFile() {
        const id = 'ypp-active-theme-css';
        const link = document.getElementById(id);
        if (link) link.remove();
    }

    /**
     * Apply True Black overrides (Now handled via Midnight Theme)
     * Kept for reference or specific edge case overrides if needed in future
     */
    _applyTrueBlack() {
        // Deprecated: Handled by .ypp-theme-midnight class
    }

    /**
     * Apply hide scrollbar
     * @private
     * @param {boolean} enable
     */
    _applyHideScrollbar(enable) {
        document.body.classList.toggle('ypp-hide-scrollbar', enable);
    }

    /**
     * Apply custom progress bar color
     * @private
     * @param {string|null} color
     */
    _applyProgressBarColor(color) {
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

    /**
     * Apply visibility settings
     * @private
     */
    _applyVisibilitySettings() {
        const toggle = (cls, state) => {
            if (cls) document.body.classList.toggle(cls, !!state);
        };

        toggle(this._CSS_CLASSES.HIDE_SHORTS, this._settings.hideShorts);
        toggle(this._CSS_CLASSES.HIDE_MIXES, this._settings.hideMixes);
        toggle(this._CSS_CLASSES.HIDE_WATCHED, this._settings.hideWatched);
        toggle(this._CSS_CLASSES.HIDE_MERCH, this._settings.hideMerch);
        toggle(this._CSS_CLASSES.HIDE_COMMENTS, this._settings.hideComments);
        toggle(this._CSS_CLASSES.HIDE_ENDSCREENS, this._settings.hideEndScreens);
        toggle(this._CSS_CLASSES.BLUE_PROGRESS, this._settings.blueProgress);
        toggle(this._CSS_CLASSES.HOOK_FREE, this._settings.hookFreeHome);

        // Search specific
        toggle('ypp-clean-search', this._settings.cleanSearch);
        toggle('ypp-hide-search-shorts', this._settings.hideSearchShorts);
        toggle('ypp-search-grid-mode', this._settings.searchGrid);
    }

    /**
     * Cleanup CSS classes
     * @private
     */
    _cleanupClasses() {
        const classes = [
            this._CSS_CLASSES.THEME_ENABLED,
            this._CSS_CLASSES.HIDE_SHORTS,
            this._CSS_CLASSES.HIDE_MIXES,
            this._CSS_CLASSES.HIDE_WATCHED,
            this._CSS_CLASSES.HIDE_MERCH,
            this._CSS_CLASSES.HIDE_COMMENTS,
            this._CSS_CLASSES.HIDE_ENDSCREENS,
            this._CSS_CLASSES.BLUE_PROGRESS,
            this._CSS_CLASSES.HOOK_FREE,
            'ypp-clean-search',
            'ypp-hide-search-shorts',
            'ypp-search-grid-mode',
            'ypp-hide-scrollbar'
        ];

        document.documentElement.classList.remove(...classes);
    }

    // =========================================================================
    // SHORTS MANAGEMENT
    // =========================================================================

    /**
     * Manage shorts observer
     * @private
     * @param {boolean} enable
     */
    _manageShortsObserver(enable) {
        this._hideShortsElements(enable);

        if (enable) {
            if (!this._shortsObserver) {
                const processMutations = () => this._hideShortsElements(true);
                const debouncedProcess = this._Utils.debounce?.(processMutations, this._SHORTS_DEBOUNCE) || debounce(processMutations, this._SHORTS_DEBOUNCE);

                this._shortsObserver = new MutationObserver((mutations) => {
                    const hasRelevantMutation = mutations.some(m =>
                        m.addedNodes.length > 0 &&
                        (m.target.tagName?.includes('YTD') || m.target.id === 'contents')
                    );

                    if (hasRelevantMutation) {
                        debouncedProcess();
                    }
                });

                this._shortsObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else {
            if (this._shortsObserver) {
                this._shortsObserver.disconnect();
                this._shortsObserver = null;
            }
            this._hideShortsElements(false);
        }
    }

    /**
     * Hide or show shorts elements
     * @private
     * @param {boolean} enable
     */
    _hideShortsElements(enable) {
        const selectors = [
            this._SELECTORS.SHORTS_SECTION || 'ytd-rich-section-renderer[is-shorts]',
            this._SELECTORS.SHORTS_SHELF,
            'ytd-rich-shelf-renderer[is-shorts]',
            'ytd-secondary-search-container-renderer',
            'a[href^="/shorts"]'
        ];

        selectors.forEach(sel => {
            try {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                    if (el.tagName === 'A' && !el.closest('ytd-rich-item-renderer')) return;
                    el.style.display = enable ? 'none' : '';
                });
            } catch (error) {
                // Skip invalid selectors
            }
        });

        // Content heuristics for containers
        if (enable) {
            const potentialContainers = document.querySelectorAll(
                'ytd-shelf-renderer, ytd-rich-shelf-renderer, ytd-item-section-renderer'
            );
            potentialContainers.forEach(container => {
                if (this._isShortsContainer(container)) {
                    container.style.display = 'none';
                }
            });
        }
    }

    /**
     * Detect if container is shorts
     * @private
     * @param {HTMLElement} container
     * @returns {boolean}
     */
    _isShortsContainer(container) {
        if (!container) return false;

        try {
            // Check tag
            if (container.tagName === 'YTD-REEL-SHELF-RENDERER') return true;
            if (container.hasAttribute('is-shorts')) return true;

            // Check title
            const titleEl = container.querySelector('#title');
            if (titleEl?.textContent) {
                const title = titleEl.textContent.trim().toLowerCase();
                if (title === 'shorts' || title.includes('shorts')) return true;
            }

            // Check aria-label
            const ariaLabel = container.getAttribute('aria-label');
            if (ariaLabel?.toLowerCase().includes('shorts')) return true;

            return false;
        } catch (error) {
            this._Utils.log?.(`Error checking shorts container: ${error.message}`, 'THEME', 'warn');
            return false;
        }
    }

    // =========================================================================
    // WATCHED VIDEOS
    // =========================================================================

    /**
     * Manage watched observer
     * @private
     * @param {boolean} enable
     */
    _manageWatchedObserver(enable) {
        this._processWatchedVideos();

        if (enable) {
            if (!this._watchedObserver) {
                const process = () => this._processWatchedVideos();
                const debouncedProcess = this._Utils.debounce?.(process, this._WATCHED_DEBOUNCE) || debounce(process, this._WATCHED_DEBOUNCE);

                this._watchedObserver = new MutationObserver((mutations) => {
                    const relevant = mutations.some(m => m.addedNodes.length > 0 || m.type === 'attributes');
                    if (relevant) debouncedProcess();
                });

                this._watchedObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else {
            if (this._watchedObserver) {
                this._watchedObserver.disconnect();
                this._watchedObserver = null;
            }
        }
    }

    /**
     * Process and mark watched videos
     * @private
     */
    _processWatchedVideos() {
        try {
            const selector = this._SELECTORS.WATCHED_OVERLAY || 'ytd-thumbnail-overlay-resume-playback-renderer #progress';
            const progressBars = document.querySelectorAll(selector);

            if (!progressBars?.length) return;

            progressBars.forEach(bar => {
                try {
                    const width = bar?.style?.width;
                    if (!width) return;

                    const percent = parseFloat(width);
                    if (isNaN(percent)) return;

                    const isWatched = percent > this._WATCHED_THRESHOLD;

                    const container = bar.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer');
                    if (container) {
                        if (isWatched) {
                            container.setAttribute('is-watched', '');
                        } else {
                            container.removeAttribute('is-watched');
                        }
                    }
                } catch (err) {
                    // Skip individual element errors
                }
            });
        } catch (error) {
            this._Utils.log?.(`Error processing watched videos: ${error.message}`, 'THEME', 'error');
        }
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    /**
     * Check if theme is active
     * @returns {boolean}
     */
    isActive() {
        return this._isActive;
    }

    /**
     * Get current settings
     * @returns {Object}
     */
    getSettings() {
        return { ...this._settings };
    }

    /**
     * Toggle a setting dynamically
     * @param {string} key - Setting key
     * @param {boolean} value - New value
     */
    setSetting(key, value) {
        if (this._settings) {
            // Create a copy to handle frozen objects
            this._settings = { ...this._settings, [key]: value };
            this._run(this._settings);
        }
    }
};

// Helper debounce function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
