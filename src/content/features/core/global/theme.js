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
            if (this._settings.trueBlack === true && activeThemeKey === 'default') {
                this._Utils.log('Legacy True Black enabled -> Forcing Midnight theme', 'THEME');
                activeThemeKey = 'midnight';
            }

            // Handle System Theme
            if (activeThemeKey === 'system') {
                this._handleSystemTheme();
                return; // _handleSystemTheme will call _injectThemeFile
            } else {
                // If not system, stop listening for system changes
                this._stopSystemListener();
            }
            
            this._applyTheme(activeThemeKey);

        } else {
            this._stopSystemListener();
            this._removeThemeFile();
            this._currentThemeKey = null;
        }
    }

    /**
     * Handle System Theme logic
     * @private
     */
    _handleSystemTheme() {
        if (!this._systemMediaQuery) {
            this._systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this._systemListener = (e) => {
                const newTheme = e.matches ? 'midnight' : 'ocean'; // Default mapping: Dark -> Midnight, Light -> Ocean (or default)
                // Actually, let's map: Dark -> Midnight (OLED), Light -> Default (Premium)
                // Or better: Let user decide? For now, hardcode sensible defaults.
                // YouTube is mostly dark. 'default' is the Premium Dark.
                // Let's use 'default' for Dark and maybe 'ocean' for light? 
                // Wait, YouTube doesn't really have a light theme in this extension context properly supported yet?
                // The extension is "Premium Plus", mostly dark mode oriented.
                // Let's assume System Dark = Midnight, System Light = Default (Premium/Dark-ish) or disable?
                // For safety: System defaults to 'default' (Premium)
                
                this._Utils.log(`System theme changed: ${e.matches ? 'Dark' : 'Light'}`, 'THEME');
                this._applyTheme(e.matches ? 'midnight' : 'default'); 
            };
            
            // Add listener
            this._systemMediaQuery.addEventListener('change', this._systemListener);
        }

        // Apply initial
        const isDark = this._systemMediaQuery.matches;
        this._applyTheme(isDark ? 'midnight' : 'default');
    }

    /**
     * Stop listening for system theme changes
     * @private
     */
    _stopSystemListener() {
        if (this._systemMediaQuery && this._systemListener) {
            this._systemMediaQuery.removeEventListener('change', this._systemListener);
            this._systemMediaQuery = null;
            this._systemListener = null;
        }
    }

    /**
     * Apply a specific theme key
     * @private
     * @param {string} themeKey 
     */
    _applyTheme(themeKey) {
        // Optimization: Only inject if theme changed or not yet injected
        if (themeKey !== this._currentThemeKey || !document.getElementById('ypp-active-theme-css')) {
            this._Utils.log(`Theme changed (${this._currentThemeKey} -> ${themeKey}), injecting...`, 'THEME');
            this._injectThemeFile(themeKey);
            this._currentThemeKey = themeKey;
        } else {
             this._Utils.log(`Theme '${themeKey}' already active, skipping injection.`, 'THEME', 'debug');
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
    // WATCHED VIDEOS
    // =========================================================================

    /**
    /**
     * Manage watched observer using IntersectionObserver for better performance
     * @private
     * @param {boolean} enable
     */
    _manageWatchedObserver(enable) {
        if (!enable) {
            if (this._watchedObserver) {
                this._watchedObserver.disconnect();
                this._watchedObserver = null;
            }
            if (this._domObserver) {
                this._domObserver.disconnect();
                this._domObserver = null;
            }
            return;
        }

        // Initialize IntersectionObserver if it doesn't exist
        if (!this._watchedObserver) {
            this._watchedObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this._processWatchedVideo(entry.target);
                    }
                });
            }, { rootMargin: '200px' }); // Load slightly before visible
        }

        // Initialize a low-priority MutationObserver just to find new video elements
        if (!this._domObserver) {
            const scan = () => {
                const containers = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
                containers.forEach(container => {
                    if (!container.dataset.yppWatchedObserved) {
                        this._watchedObserver.observe(container);
                        container.dataset.yppWatchedObserved = 'true';
                    }
                });
            };
            
            const debouncedScan = this._Utils.debounce?.(scan, 1000) || scan;
            this._domObserver = new MutationObserver((mutations) => {
                if (mutations.some(m => m.addedNodes.length > 0)) debouncedScan();
            });
            this._domObserver.observe(document.body, { childList: true, subtree: true });
            
            // Initial scan
            scan();
        }
    }

    /**
     * Process and mark a single watched video
     * @private
     * @param {Element} container - The video container element
     */
    _processWatchedVideo(container) {
        try {
            const selector = this._SELECTORS.WATCHED_OVERLAY || 'ytd-thumbnail-overlay-resume-playback-renderer #progress';
            const bar = container.querySelector(selector);
            
            if (!bar) return;

            const width = bar?.style?.width;
            if (!width) return;

            const percent = parseFloat(width);
            if (isNaN(percent)) return;

            const isWatched = percent > this._WATCHED_THRESHOLD;

            if (isWatched) {
                container.setAttribute('is-watched', '');
            } else {
                // Don't remove if it was manually marked as watched
                if (!container.querySelector('.ypp-manually-watched')) {
                    container.removeAttribute('is-watched');
                }
            }
        } catch (error) {
            // Ignore minor errors for individual elements
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
