/**
 * Settings Schema & Validator for YouTube Premium Plus
 *
 * Defines the expected type, default, and optional range for every setting key.
 * Used by Utils.loadSettings to sanitize user settings on every load:
 *   - Unknown keys are silently dropped (prevents stale/renamed keys from accumulating)
 *   - Missing keys are filled from defaults (forwards-compatible when new features ship)
 *   - Wrong type values are reset to defaults
 *   - Number values outside their defined range are clamped
 */
window.YPP = window.YPP || {};

window.YPP.SettingsSchema = {
    // =========================================================================
    // SCHEMA DEFINITION
    // Each key maps to: { type, default, [min], [max], [values] }
    //   type   - 'boolean' | 'number' | 'string'
    //   default - value used when key is missing or invalid
    //   min/max - range clamp for numbers
    //   values  - array of allowed values for strings (enum-like)
    // =========================================================================
    schema: Object.freeze({
        // --- Theme ---
        premiumTheme:        { type: 'boolean', default: true },
        activeTheme:         { type: 'string',  default: 'default', values: ['default','ocean','sunset','dracula','forest','midnight','cherry','system'] },
        trueBlack:           { type: 'boolean', default: false },
        hideScrollbar:       { type: 'boolean', default: false },
        customProgressBar:   { type: 'boolean', default: false },
        progressBarColor:    { type: 'string',  default: '#ff0000' },

        // --- Layout ---
        grid4x4:             { type: 'boolean', default: true },
        homeColumns:         { type: 'number',  default: 4, min: 1, max: 8 },
        searchColumns:       { type: 'number',  default: 4, min: 1, max: 8 },
        channelColumns:      { type: 'number',  default: 4, min: 1, max: 8 },
        displayFullTitle:    { type: 'boolean', default: false },

        // --- Visibility ---
        hideShorts:          { type: 'boolean', default: false },
        hideSearchShorts:    { type: 'boolean', default: true },
        hideMixes:           { type: 'boolean', default: false },
        hideWatched:         { type: 'boolean', default: false },
        enableMarkWatched:   { type: 'boolean', default: true },
        hideMerch:           { type: 'boolean', default: false },
        hideComments:        { type: 'boolean', default: false },
        hideLiveChat:        { type: 'boolean', default: false },
        hideFundraiser:      { type: 'boolean', default: false },
        hideEndScreens:      { type: 'boolean', default: false },
        hookFreeHome:        { type: 'boolean', default: false },

        // --- Player ---
        autoCinema:          { type: 'boolean', default: false },
        blueProgress:        { type: 'boolean', default: false },
        enablePiP:           { type: 'boolean', default: true },
        enableTranscript:    { type: 'boolean', default: true },
        enableSnapshot:      { type: 'boolean', default: true },
        enableLoop:          { type: 'boolean', default: true },

        // --- Search ---
        searchGrid:          { type: 'boolean', default: true },
        cleanSearch:         { type: 'boolean', default: true },
        autoVideoFilter:     { type: 'boolean', default: true },

        // --- Navigation ---
        navTrending:         { type: 'boolean', default: true },
        navShorts:           { type: 'boolean', default: true },
        navSubscriptions:    { type: 'boolean', default: true },
        navWatchLater:       { type: 'boolean', default: true },
        navPlaylists:        { type: 'boolean', default: true },
        navHistory:          { type: 'boolean', default: true },
        forceHideSidebar:    { type: 'boolean', default: false },
        hoverSidebar:        { type: 'boolean', default: true },
        logoRedirectSub:     { type: 'boolean', default: false },

        // --- Shorts Tools ---
        shortsAutoScroll:    { type: 'boolean', default: false },

        // --- Player Tools ---
        enableCustomSpeed:   { type: 'boolean', default: true },
        enableCinemaFilters: { type: 'boolean', default: true },
        filterBrightness:    { type: 'number',  default: 100, min: 50, max: 200 },
        filterContrast:      { type: 'number',  default: 100, min: 50, max: 200 },

        // --- Ad Skipper ---
        adSkipper:           { type: 'boolean', default: true },

        // --- Night Mode ---
        blueLight:           { type: 'number',  default: 0, min: 0, max: 100 },
        dim:                 { type: 'number',  default: 0, min: 0, max: 100 },

        // --- Focus Modes ---
        zenMode:             { type: 'boolean', default: false },
        dopamineDetox:       { type: 'boolean', default: false },
        enableFocusMode:     { type: 'boolean', default: false },
        cinemaMode:          { type: 'boolean', default: false },
        minimalMode:         { type: 'boolean', default: false },
        studyMode:           { type: 'boolean', default: false },

        // --- Auto Actions ---
        autoPiP:             { type: 'boolean', default: false },

        // --- New Features ---
        ambientMode:         { type: 'boolean', default: false },
        audioModeEnabled:    { type: 'boolean', default: false },
        videoControlsEnabled:{ type: 'boolean', default: true },
        subscriptionFolders: { type: 'boolean', default: true },

        // --- Watch Time Alert ---
        watchTimeAlert:      { type: 'boolean', default: false },
        watchTimeAlertHours: { type: 'number',  default: 2, min: 1, max: 8 },

        // --- Keyboard Shortcuts ---
        keyboardShortcuts:      { type: 'boolean', default: true },
        shortcut_zenMode:       { type: 'string', default: 'Shift+Z' },
        shortcut_focusMode:     { type: 'string', default: 'Shift+F' },
        shortcut_cinemaMode:    { type: 'string', default: 'Shift+C' },
        shortcut_snapshot:      { type: 'string', default: 'Shift+S' },
        shortcut_loop:          { type: 'string', default: 'Shift+L' },
        shortcut_pip:           { type: 'string', default: 'Shift+P' },
        shortcut_speedDown:     { type: 'string', default: 'Shift+,' },
        shortcut_speedUp:       { type: 'string', default: 'Shift+.' },
        shortcut_speedReset:    { type: 'string', default: 'Shift+R' },
        shortcut_ambientMode:   { type: 'string', default: 'Shift+M' }
    }),

    // =========================================================================
    // VALIDATE & MERGE
    // Merges stored settings with defaults, enforcing schema rules per key.
    // Returns a clean, fully-populated settings object safe to hand to features.
    // =========================================================================

    /**
     * Validate and sanitize a raw settings object against the schema.
     * Missing keys are filled from defaults. Wrong types / out-of-range numbers
     * are reset to defaults. Unknown keys are dropped with a debug warning.
     *
     * @param {Object} raw - Raw settings from chrome.storage
     * @returns {Object} Sanitized settings object
     */
    validateAndMerge(raw) {
        if (!raw || typeof raw !== 'object') {
            window.YPP.Utils?.log('Settings: no stored settings, using defaults.', 'SCHEMA', 'debug');
            return this._defaults();
        }

        const out = {};
        let warnings = 0;

        for (const [key, rule] of Object.entries(this.schema)) {
            const value = raw[key];

            if (value === undefined || value === null) {
                // Key missing — use default (new feature shipped, user hasn't seen setting yet)
                out[key] = rule.default;
                continue;
            }

            if (typeof value !== rule.type) {
                // Wrong type (e.g. string where boolean expected) — reset silently
                window.YPP.Utils?.log(`Settings: "${key}" expected ${rule.type}, got ${typeof value}. Resetting to default.`, 'SCHEMA', 'warn');
                out[key] = rule.default;
                warnings++;
                continue;
            }

            // String enum validation (defensive against Array mutation/injection)
            if (rule.type === 'string' && Array.isArray(rule.values) && rule.values.length > 0) {
                // Ensure value is a primitive string before using .includes()
                if (typeof value !== 'string' || !rule.values.includes(value)) {
                    window.YPP.Utils?.log(`Settings: "${key}" value "${value}" not in allowed list. Resetting.`, 'SCHEMA', 'warn');
                    out[key] = rule.default;
                    warnings++;
                    continue;
                }
            }

            // Number range clamp
            if (rule.type === 'number') {
                const clamped = Math.min(
                    Math.max(value, rule.min ?? -Infinity),
                    rule.max ?? Infinity
                );
                if (clamped !== value) {
                    window.YPP.Utils?.log(`Settings: "${key}" value ${value} clamped to ${clamped}.`, 'SCHEMA', 'debug');
                }
                out[key] = clamped;
                continue;
            }

            out[key] = value;
        }

        // Warn about unknown keys (stale settings from old versions)
        for (const key of Object.keys(raw)) {
            if (!this.schema[key]) {
                window.YPP.Utils?.log(`Settings: unknown key "${key}" ignored (stale/renamed?).`, 'SCHEMA', 'debug');
            }
        }

        if (warnings > 0) {
            window.YPP.Utils?.log(`Settings: ${warnings} key(s) reset to defaults due to type errors.`, 'SCHEMA', 'warn');
        }

        return out;
    },

    /**
     * Return a fresh settings object built entirely from schema defaults.
     * @returns {Object}
     */
    _defaults() {
        const out = {};
        for (const [key, rule] of Object.entries(this.schema)) {
            out[key] = rule.default;
        }
        return out;
    }
};
