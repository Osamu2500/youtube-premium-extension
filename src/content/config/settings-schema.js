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
        schemaVersion:       { type: 'number',  default: 1 },
        // --- Theme ---
        premiumTheme:        { type: 'boolean', default: true },
        activeTheme:         { type: 'string',  default: 'default', values: ['default','ocean','sunset','dracula','forest','midnight','cherry','system', 'coffee', 'cyberpunk', 'nord'] },
        trueBlack:           { type: 'boolean', default: false },
        hideScrollbar:       { type: 'boolean', default: false },

        // --- Layout ---
        autoScaleLayout:     { type: 'boolean', default: true },
        useSquareCorners:    { type: 'boolean', default: false },
        grid4x4:             { type: 'boolean', default: false },
        homeColumns:         { type: 'number',  default: 4, min: 1, max: 8 },
        searchColumns:       { type: 'number',  default: 4, min: 1, max: 8 },
        channelColumns:      { type: 'number',  default: 4, min: 1, max: 8 },
        subscriptionsColumns:{ type: 'number',  default: 4, min: 1, max: 8 },
        displayFullTitle:    { type: 'boolean', default: false },

        // --- Visibility ---
        hideShorts:          { type: 'boolean', default: false },
        hideSearchShorts:    { type: 'boolean', default: true },
        hideMixes:           { type: 'boolean', default: false },
        hideExploreTopics:   { type: 'boolean', default: false },
        hideWatched:         { type: 'boolean', default: false },
        hideWatchedMode:     { type: 'string',  default: 'dim', values: ['dim', 'hide'] },
        hideWatchedThreshold:{ type: 'number',  default: 80, min: 0, max: 100 },
        enableMarkWatched:   { type: 'boolean', default: true },
        hideMerch:           { type: 'boolean', default: false },
        hideComments:        { type: 'boolean', default: false },
        hideLiveChat:        { type: 'boolean', default: false },
        hideFundraiser:      { type: 'boolean', default: false },
        hideEndScreens:      { type: 'boolean', default: false },
        // Search visibility
        hideSearchShelves:   { type: 'boolean', default: true },
        hideChannelCards:    { type: 'boolean', default: false },
        autoVideoFilter:     { type: 'boolean', default: true },

        // --- Content Filtering / Unhook ---
        hideAnnotations:     { type: 'boolean', default: false },
        hideRelated:         { type: 'boolean', default: false },
        hideFeed:            { type: 'boolean', default: false },
        hideTrending:        { type: 'boolean', default: false },
        aggressiveShortsBlock: { type: 'boolean', default: false },
        hideShortVideos:     { type: 'boolean', default: false },
        minVideoDuration:    { type: 'number',  default: 5, min: 0, max: 60 },

        // --- Customization ---
        fontFamily:          { type: 'string',  default: 'inter', values: ['inter', 'system', 'mono'] },
        fontScale:           { type: 'number',  default: 100, min: 80, max: 130 },
        densityMode:         { type: 'string',  default: 'comfortable', values: ['comfortable', 'compact', 'spacious'] },
        accentColor:         { type: 'string',  default: '#ff4e45' },
        enableAnimations:    { type: 'boolean', default: true },
        reducedMotion:       { type: 'boolean', default: false },
        cardStyle:           { type: 'string',  default: 'glass', values: ['glass', 'flat', 'elevated', 'folder', 'bento', 'neon', 'compact', 'polaroid', 'neumorphic', 'cyberpunk', 'holographic', 'minimalist', 'retro', 'brutalism', 'skeuomorphic', 'frosted', 'summer', 'winter', 'spring', 'autumn'] },
        thumbRadius:         { type: 'number',  default: 8, min: 0, max: 24 },
        sidebarOpacity:      { type: 'number',  default: 100, min: 50, max: 100 },
        customScrollbar:     { type: 'boolean', default: false },
        grayscaleThumbnails: { type: 'boolean', default: false },
        homeColumns:         { type: 'number',  default: 0, min: 0, max: 10 }, // 0 = Auto
        channelColumns:      { type: 'number',  default: 0, min: 0, max: 10 }, // 0 = Auto

        // --- Player ---
        autoCinema:          { type: 'boolean', default: false },
        enablePiP:           { type: 'boolean', default: true },
        enableTranscript:    { type: 'boolean', default: true },
        enableSnapshot:      { type: 'boolean', default: true },
        enableLoop:          { type: 'boolean', default: true },
        enableRemainingTime: { type: 'boolean', default: true },
        enableVolumeBoost:   { type: 'boolean', default: true },
        volumeLevel:         { type: 'number',  default: 1, min: 1, max: 6 },
        volumeBoostBass:     { type: 'number',  default: 0, min: -12, max: 12 },
        volumeBoostTreble:   { type: 'number',  default: 0, min: -12, max: 12 },
        volumeBalance:       { type: 'number',  default: 0, min: -1, max: 1 },
        volumeEqBands:       { type: 'string',  default: '[0,0,0,0,0,0,0,0,0,0]' },
        volumeCompressor:    { type: 'boolean', default: true },
        volumeMono:          { type: 'boolean', default: false },

        // --- Search ---
        searchGrid:          { type: 'boolean', default: true },
        cleanSearch:         { type: 'boolean', default: true },

        // --- Player Automation ---
        autoSkipAds:         { type: 'boolean', default: true },
        autoSkipPromos:      { type: 'boolean', default: false },
        autoSkipSponsors:    { type: 'boolean', default: false },
        sponsorBlock:        { type: 'boolean', default: true },
        autoPlayNext:        { type: 'boolean', default: false },
        navHistory:          { type: 'boolean', default: true },
        forceHideSidebar:    { type: 'boolean', default: false },
        floatingGuide:       { type: 'boolean', default: false },
        logoRedirectSub:     { type: 'boolean', default: false },

        // --- Shorts Tools ---
        shortsAutoScroll:    { type: 'boolean', default: false },
        shortsVolumeNormalizer:{ type: 'boolean', default: true },
        hideShortsInteraction: { type: 'boolean', default: false },

        // --- Player Tools ---
        enableCustomSpeed:       { type: 'boolean', default: true },
        enableCinemaFilters:     { type: 'boolean', default: true },
        enableGlobalPlayerBar:   { type: 'boolean', default: true },
        // Video Speed Controller (Advanced)
        enableVideoSpeedController: { type: 'boolean', default: true },
        vscSpeedStep:            { type: 'number',  default: 0.25, min: 0.05, max: 1.0 },
        vscPreferredSpeed:       { type: 'number',  default: 2.0, min: 0.1, max: 16.0 },
        vscRememberSpeed:        { type: 'boolean', default: true },
        vscAudioSupport:         { type: 'boolean', default: false },
        vscHideByDefault:        { type: 'boolean', default: false },
        vscForceSpeed:           { type: 'boolean', default: false },
        vscControllerOpacity:    { type: 'number',  default: 0.3, min: 0.1, max: 1.0 },
        // Cinema Filters — persisted state (preset index + slider adjustments)
        cinemaFilterIndex:       { type: 'number',  default: 0,   min: 0, max: 42 }, // 43 filters total (0-42)
        cinemaFilterBrightness:  { type: 'number',  default: 100, min: 0, max: 200 },
        cinemaFilterContrast:    { type: 'number',  default: 100, min: 0, max: 200 },
        cinemaFilterSaturate:    { type: 'number',  default: 100, min: 0, max: 200 },
        cinemaFilterHue:         { type: 'number',  default: 0,   min: 0, max: 360 },
        cinemaFilterSepia:       { type: 'number',  default: 0,   min: 0, max: 100 },
        cinemaFilterGrayscale:   { type: 'number',  default: 0,   min: 0, max: 100 },
        cinemaFilterInvert:      { type: 'number',  default: 0,   min: 0, max: 100 },
        cinemaFilterBlur:        { type: 'number',  default: 0,   min: 0, max: 10  },
        cinemaFilterOpacity:     { type: 'number',  default: 100, min: 10, max: 100 },

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
        floatingPlayer:      { type: 'boolean', default: false },

        // --- New Features ---
        cinematicMode:       { type: 'boolean', default: false },
        cinematicMuted:      { type: 'boolean', default: true },
        ambientMode:         { type: 'boolean', default: false },
        ambientIntensity:    { type: 'number',  default: 0.6, min: 0.1, max: 1.0 },
        ambientBlur:         { type: 'number',  default: 120, min: 20, max: 200 },
        audioModeEnabled:    { type: 'boolean', default: false },
        videoControlsEnabled:{ type: 'boolean', default: true },
        subscriptionFolders: { type: 'boolean', default: true },
        sponsorBlock:        { type: 'boolean', default: false },
        returnYouTubeDislike:{ type: 'boolean', default: false },
        wheelControls:       { type: 'boolean', default: true },
        enableBookmarks:     { type: 'boolean', default: true },
        audioCompressor:     { type: 'boolean', default: false },
        videoResumer:        { type: 'boolean', default: true },
        autoPause:           { type: 'boolean', default: false },
        commentFilter:       { type: 'boolean', default: true },
        commentFilterAction: { type: 'string', default: 'dim', values: ['dim', 'hide'] },
        commentFilterCustomKeywords: { type: 'string', default: '' },
        contextMenu:         { type: 'boolean', default: true },
        enableAccountMenu:   { type: 'boolean', default: true },
        playlistRedesign:    { type: 'boolean', default: true },
        glassPlayerUI:       { type: 'boolean', default: true },
        sidebarComments:     { type: 'boolean', default: false },
        miniPlayer:          { type: 'boolean', default: false },
        redirectShorts:      { type: 'boolean', default: false },

        // --- Watch Time Alert ---
        watchTimeAlert:      { type: 'boolean', default: false },
        watchTimeAlertHours: { type: 'number',  default: 2, min: 1, max: 8 },

        // --- Stats ---
        enableStatsForNerds: { type: 'boolean', default: false },

        // --- Subscription Organizer (legacy) ---
        enableSubsManager:   { type: 'boolean', default: false },

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
        shortcut_ambientMode:   { type: 'string', default: 'Shift+M' },
        
        // Video Speed Controller Shortcuts
        vscShortcutSlower:       { type: 'string',  default: 's' },
        vscShortcutFaster:       { type: 'string',  default: 'd' },
        vscShortcutRewind:       { type: 'string',  default: 'z' },
        vscShortcutAdvance:      { type: 'string',  default: 'x' },
        vscShortcutReset:        { type: 'string',  default: 'r' },
        vscShortcutPreferred:    { type: 'string',  default: 'g' },
        vscShortcutToggleDisplay:{ type: 'string',  default: 'v' },

        // --- Content Visibility (missing from original schema) ---
        hidePlaylists:       { type: 'boolean', default: false },
        hidePodcasts:        { type: 'boolean', default: false },
        hidePosts:           { type: 'boolean', default: false },
        hideThumbnails:      { type: 'boolean', default: false },
        hideCards:           { type: 'boolean', default: false },
        hideMetrics:         { type: 'boolean', default: false },
        redirectHome:        { type: 'boolean', default: false },
        multiSelect:         { type: 'boolean', default: true  },
        autoLike:            { type: 'boolean', default: false },
        autoQuality:         { type: 'boolean', default: false },
        intentionalDelay:    { type: 'boolean', default: false },
        markWatched:         { type: 'boolean', default: true  },
        hideVoiceSearch:     { type: 'boolean', default: false },
        cleanMixUrls:        { type: 'boolean', default: false },
        stopShortsLooping:   { type: 'boolean', default: false },

        // --- Blocklist ---
        blockedChannels:     { type: 'string',  default: '' },
        blockedKeywords:     { type: 'string',  default: '' },

        // --- Playlist & History (missing from original schema) ---
        reversePlaylist:     { type: 'boolean', default: false },
        playlistDuration:    { type: 'boolean', default: true  },
        continueWatching:    { type: 'boolean', default: true  },
        historyRedesign:     { type: 'boolean', default: true  },

        // --- Global Player Bar ---
        globalPlayerBarPosition: { type: 'string', default: 'right', values: ['right', 'left', 'top'] },

        // --- Custom Player Bar (Placements) ---
        pb_snapshot:         { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_loop:             { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_speed:            { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_pip:              { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_volume:           { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_cinema:           { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_play:      { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_next:      { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_mute:      { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_cast:      { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_autoplay:  { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_cc:        { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_miniplayer:{ type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_theater:   { type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },
        pb_native_fullscreen:{ type: 'string', default: 'front', values: ['front', 'back', 'hidden'] },

        // --- Sidebar Layout ---
        sidebarLayout:       { type: 'string',  default: 'compact', values: ['compact', 'spacious', 'expanded', 'grid'] },
        splitScrolling:      { type: 'boolean', default: false },

        // --- Navigation ---
        navTrending:         { type: 'boolean', default: true },
        navShorts:           { type: 'boolean', default: true },
        navSubscriptions:    { type: 'boolean', default: true },
        navWatchLater:       { type: 'boolean', default: true },
        navPlaylists:        { type: 'boolean', default: true },

        // --- Subscription Manager extras ---
        enableFilterBar:     { type: 'boolean', default: false },
        enableChannelHealth: { type: 'boolean', default: false },

        // --- UI Redesigns (popup Customization tab) ---

        // --- New Customization Engine Variables ---
        glassBlur:           { type: 'number',  default: 120, min: 0, max: 200 },
        glassTintOpacity:    { type: 'number',  default: 50,  min: 0, max: 100 },
        borderOpacity:       { type: 'number',  default: 8,   min: 0, max: 100 },
        fontFamily:          { type: 'string',  default: 'inter', values: ['inter', 'system', 'mono'] },
        enableAnimations:    { type: 'boolean', default: true },
        reducedMotion:       { type: 'boolean', default: false },
        accentColor:         { type: 'string',  default: '#3ea6ff' },
        thumbRadius:         { type: 'number',  default: 12, min: 0, max: 24 },
        densityMode:         { type: 'string',  default: 'comfortable', values: ['compact', 'comfortable', 'spacious'] },
        cardStyle:           { type: 'string',  default: 'glass', values: ['glass', 'flat', 'elevated', 'folder', 'bento', 'neon', 'compact', 'polaroid', 'neumorphic', 'cyberpunk', 'holographic', 'minimalist', 'retro', 'brutalism', 'skeuomorphic', 'frosted', 'summer', 'winter', 'spring', 'autumn'] },
        sidebarOpacity:      { type: 'number',  default: 100, min: 50, max: 100 }
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

        // Intercept and mutate old settings layout
        raw = this.migrate(raw);

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
     * Migrate old settings schema to the current schema.
     * @param {Object} raw - Raw settings object
     * @returns {Object} Migrated settings object
     */
    migrate(raw) {
        let currentVersion = raw.schemaVersion || 0;
        
        // Example: If migrating from version 0 to 1
        if (currentVersion < 1) {
            // Note: v0 had no schemaVersion. 
            // If trueBlack was set, we migrate it to activeTheme = 'midnight'
            if (raw.trueBlack === true && raw.activeTheme === 'default') {
                raw.activeTheme = 'midnight';
                window.YPP.Utils?.log('Migrated trueBlack -> activeTheme = midnight', 'SCHEMA', 'info');
            }
            raw.schemaVersion = 1;
        }

        // Future migrations go here: if (currentVersion < 2) { ... }

        return raw;
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
