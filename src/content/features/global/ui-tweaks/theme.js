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
window.YPP.features.Theme = class ThemeManager extends window.YPP.features.BaseFeature {
    /**
     * Initialize Theme Manager
     * @constructor
     */
    constructor() {
        super('ThemeManager');
        this._initConstants();
        this._initState();
    }

    getConfigKey() {
        return 'premiumTheme';
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
    }

    /**
     * Enable theme features
     */
    enable() {
        this._run(this.settings);
    }

    /**
     * Disable all theme features
     */
    disable() {
        try {
            this._toggleTheme(false);
            this._cleanupClasses();
            this._cleanupCustomVariables();

            this._isActive = false;
        } catch (error) {
            this._Utils.log?.(`Error disabling theme: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Update theme with new settings
     */
    onUpdate() {
        this._run(this.settings);
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

            // Apply global customizations (Typography, density, accent color, etc)
            this._applyCustomizationSettings();

        } catch (error) {
            this._Utils.log?.(`Error running theme: ${error.message}`, 'THEME', 'error');
        }
    }

    /**
     * Toggle the theme based on settings.
     * Handles premium theme, true black (legacy), and new multi-themes.
     * @param {boolean} enable - Whether premium theme is enabled
     */
    _toggleTheme(enable) {
        const root = document.documentElement;
        const body = document.body;
        
        // Toggle base premium class
        root.classList.toggle(this._CSS_CLASSES.THEME_ENABLED, enable);
        const enableEffects = this._settings.enableThemeEffects !== false;
        root.classList.toggle('ypp-theme-effects', enableEffects && enable);
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
            
            this.addListener(this._systemMediaQuery, 'change', this._systemListener);
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
            // Handled by BaseFeature cleanupEvents when feature is disabled,
            // but we explicitly remove if toggling themes manually.
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

    // =========================================================================
    // VISIBILITY SETTINGS REMOVED: Now centrally managed by GlobalLayoutManager
    // =========================================================================

    /**
     * Apply extensive UI customization settings (Typography, layout density, colors)
     * @private
     */
    _applyCustomizationSettings() {
        if (!this._settings) return;
        const root = document.documentElement;
        


        // Font Scale
        if (this._settings.fontScale !== undefined) {
            root.style.setProperty('--ypp-font-scale', (this._settings.fontScale / 100).toFixed(2));
        }


        // Accent Color
        if (this._settings.accentColor) {
            let hex = this._settings.accentColor;
            
            // Check if it's one of the 56 predefined premium colors from tempo
            if (this._CONSTANTS.PREMIUM_COLORS && this._CONSTANTS.PREMIUM_COLORS[hex]) {
                hex = this._CONSTANTS.PREMIUM_COLORS[hex];
            }
            
            root.style.setProperty('--ypp-accent-primary', hex);
            root.style.setProperty('--ypp-accent-color', hex);  // alias for backwards compat
            root.style.setProperty('--ypp-accent-glow', hex + '66');
            root.style.setProperty('--ypp-accent-hover', hex + 'cc');
            root.style.setProperty('--ypp-accent-gradient', `linear-gradient(135deg, ${hex} 0%, ${hex}cc 100%)`);
        }



        // Card Style
        if (this._settings.cardStyle) {
            root.setAttribute('data-ypp-card-style', this._settings.cardStyle);
        }


    }

    /**
     * Cleanup CSS classes
     * @private
     */
    _cleanupClasses() {
        // Collect all potential classes managed by visibility toggles
        const classes = [
            this._CSS_CLASSES.THEME_ENABLED,
            'ypp-theme-effects'
        ].filter(Boolean); // Filter out any undefined constants

        // Clean both documentElement and body just in case
        document.documentElement.classList.remove(...classes);
        document.body.classList.remove(...classes);
    }

    /**
     * Cleanup inline CSS variables injected by customization settings
     * @private
     */
    _cleanupCustomVariables() {
        const root = document.documentElement;
        
        // Remove styling variables
        root.style.removeProperty('--ypp-font-scale');
        root.style.removeProperty('--ypp-accent-primary');
        root.style.removeProperty('--ypp-accent-color');  // alias
        root.style.removeProperty('--ypp-accent-glow');
        root.style.removeProperty('--ypp-accent-hover');
        root.style.removeProperty('--ypp-accent-gradient');
        
        // Remove styling data attributes
        root.removeAttribute('data-ypp-card-style');
    }



    // =========================================================================
    // WATCHED VIDEOS
    // =========================================================================
    // NOTE: Watched video detection and hiding is fully owned by HideWatched
    // (features/core/global/hide-watched.js). Theme.js only toggles the body
    // class 'ypp-hide-watched' so the CSS selector activates — the actual
    // card-level [data-ypp-watched] attribute is set by HideWatched.

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



