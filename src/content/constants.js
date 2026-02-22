/**
 * Constants for YouTube Premium Plus
 * Centralized configuration, selectors, and settings
 */
window.YPP = window.YPP || {};

window.YPP.CONSTANTS = {
    // =========================================================================
    // DOM SELECTORS
    // =========================================================================
    SELECTORS: {
        // Grid & Layout
        GRID_RENDERER: 'ytd-rich-grid-renderer',
        GRID_CONTENTS: '#contents',
        GRID_ROW: 'ytd-rich-grid-row',
        VIDEO_ITEM: 'ytd-rich-item-renderer',

        // Search Grid
        SEARCH_GRID_CONTENTS: '#contents.ytd-two-column-search-results-renderer',
        SEARCH_VIDEO_RENDERER: 'ytd-video-renderer',

        // Header & Navigation
        MASTHEAD: 'ytd-masthead',
        CHIPS_BAR: 'ytd-feed-filter-chip-bar-renderer',
        CHIPS_WRAPPER: '#chips-wrapper',

        // Shorts
        SHORTS_SECTION: 'ytd-rich-section-renderer[is-shorts]',
        SHORTS_LINK: 'a[title="Shorts"]',
        SHORTS_SHELF: 'ytd-reel-shelf-renderer',
        SHORTS_TAB: 'ytd-guide-entry-renderer a[title="Shorts"]',
        SHORTS_MINI_GUIDE: 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
        SHORTS_CONTAINER: 'ytd-shorts',
        SHORTS_CONTAINER_ALT: '#shorts-container',

        // Player
        THEATER_BUTTON: '.ytp-size-button',
        WATCH_FLEXY: 'ytd-watch-flexy',
        PLAYER: '.html5-video-player',
        PLAYER_CONTAINER: '#player-container-outer',
        PLAYER_OUTER: '#ytd-player',
        VIDEO: 'video',
        VIDEO_CONTROLS: '.ytp-right-controls',
        SUBTITLES_BTN: '.ytp-subtitles-button',

        // Content
        COMMENTS_SECTION: 'ytd-comments',
        MERCH_SHELF: 'ytd-merch-shelf-renderer',
        RELATED_ITEMS: '#related',
        END_SCREENS: '.ytp-ce-element',

        // Sidebar
        GUIDE_BUTTON: '#guide-button',
        GUIDE_ICON: '#guide-icon',
        APP: 'ytd-app',
        MAIN_GUIDE: 'ytd-guide-renderer',
        MINI_GUIDE: 'ytd-mini-guide-renderer',

        // Search
        SEARCH_CONTAINER: 'ytd-search',
        SECTION_RENDERER: 'ytd-item-section-renderer',
        SEARCH_CONTENTS: '#contents',
        VIDEO_RENDERER: 'ytd-video-renderer',
        PLAYLIST_RENDERER: 'ytd-playlist-renderer',
        RADIO_RENDERER: 'ytd-radio-renderer',
        CHANNEL_RENDERER: 'ytd-channel-renderer',
        SHELF_RENDERER: 'ytd-shelf-renderer',
        RICH_SHELF_RENDERER: 'ytd-rich-shelf-renderer',
        REEL_SHELF_RENDERER: 'ytd-reel-shelf-renderer',
        RICH_ITEM_RENDERER: 'ytd-rich-item-renderer',
        BACKGROUND_PROMO: 'ytd-background-promo-renderer',
        HORIZONTAL_CAROUSEL: 'ytd-horizontal-card-list-renderer',
        FILTER_HEADER: 'ytd-search-sub-menu-renderer',

        // Watched
        WATCHED_OVERLAY: 'ytd-thumbnail-overlay-resume-playback-renderer #progress',

        // Ad Skipper
        AD_PLAYER: '.html5-video-player',
        AD_CONTAINER: ['.ad-showing', '.ad-interrupting'],
        AD_SKIP_BUTTON: [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-skip-ad-button',
            '.videoAdUiSkipButton',
            'button[id^="skip-button"]',
            '.ytp-ad-overlay-close-button'
        ],
        AD_OVERLAY: '.ytp-ad-module',
        AD_PLAYER_OVERLAY: '.ytp-ad-player-overlay',

        // Metadata Selectors (Centralized)
        METADATA_SELECTORS: {
            TITLE: [
                'h1.ytd-watch-metadata',
                '#title h1',
                'ytd-shorts-player-overlay-renderer #title'
            ],
            CHANNEL: [
                'ytd-video-owner-renderer #channel-name a',
                '#channel-name a',
                'ytd-reel-player-header-renderer #channel-name a'
            ]
        },
        
        // Mark as Watched
        THUMBNAIL_CONTAINER: 'ytd-thumbnail'
    },

    // =========================================================================
    // CSS CLASSES
    // =========================================================================
    CSS_CLASSES: {
        THEME_ENABLED: 'yt-premium-plus-theme',
        HIDE_SHORTS: 'ypp-hide-shorts',
        HIDE_MIXES: 'ypp-hide-mixes',
        HIDE_WATCHED: 'ypp-hide-watched',
        HIDE_MERCH: 'ypp-hide-merch',
        HIDE_COMMENTS: 'ypp-hide-comments',
        HIDE_ENDSCREENS: 'ypp-hide-endscreens',
        DOPAMINE_DETOX: 'ypp-dopamine-detox',
        ZEN_MODE: 'ypp-zen-mode',
        HOOK_FREE: 'ypp-hook-free-home',
        BLUE_PROGRESS: 'ypp-blue-progress',
        SIDEBAR_COLLAPSED: 'ypp-sidebar-collapsed',

        // Mark as Watched
        MANUALLY_WATCHED: 'ypp-manually-watched',
        WATCHED_ICON: 'ypp-watched-icon',

        // Search Redesign
        SEARCH_GRID_MODE: 'ypp-search-grid-mode',
        SEARCH_LIST_MODE: 'ypp-search-list-mode',
        GRID_CONTAINER: 'ypp-search-grid-container',
        GRID_ITEM: 'ypp-grid-item',
        FULL_WIDTH: 'ypp-full-width-item',
        HIDDEN_SHORT: 'ypp-hidden-short',

        // View Toggle
        VIEW_TOGGLE: 'ypp-view-mode-toggle',
        TOGGLE_BTN: 'ypp-toggle-btn',

        // Focus Mode
        FOCUS_MODE: 'ypp-focus-mode',
        CINEMA_MODE: 'ypp-cinema-mode',
        MINIMAL_MODE: 'ypp-minimal-mode',
        DOPAMINE_DETOX_STYLE: 'ypp-detox-style',
        CINEMA_STYLE: 'ypp-cinema-style',
        MINIMAL_STYLE: 'ypp-minimal-style',

        // Zen Mode
        ZEN_TOAST: 'ypp-zen-toast',

        // Toast
        TOAST: 'ypp-toast',

        // Page Context
        WATCH_PAGE: 'ypp-watch-page',
        SHORTS_PAGE: 'ypp-shorts-page',
        HOME_PAGE: 'ypp-home-page',

        // Player Tools
        PLAYER_TOOLS: 'ypp-player-tools',
        FILTER_PANEL: 'ypp-filter-panel'
    },

    // =========================================================================
    // DEFAULT SETTINGS
    // =========================================================================
    // =========================================================================
    // DEFAULT SETTINGS
    // =========================================================================
    DEFAULT_SETTINGS: {
        // Theme
        premiumTheme: true,
        activeTheme: 'default', // default, ocean, sunset, dracula, forest, midnight, cherry
        trueBlack: false, // Legacy: treated as 'midnight' theme if true during migration
        hideScrollbar: false,
        customProgressBar: false,
        progressBarColor: '#ff0000',

        // Layout
        grid4x4: true, // Legacy (can be kept for migration or removed)
        homeColumns: 4,
        searchColumns: 4,
        channelColumns: 4,

        // Visibility
        hideShorts: false,
        hideSearchShorts: true,
        hideMixes: false,
        hideWatched: false,
        enableMarkWatched: true,
        hideMerch: false,
        hideComments: false,
        hideEndScreens: false,
        hookFreeHome: false,

        // Player
        autoCinema: false,
        blueProgress: false,
        enablePiP: true,
        enableTranscript: true,
        enableSnapshot: true,
        enableLoop: true,

        // Search Redesign
        searchGrid: true,
        cleanSearch: true,
        autoVideoFilter: true,

        // Navigation
        navTrending: true,
        navShorts: true,
        navSubscriptions: true,
        navWatchLater: true,
        navPlaylists: true,
        navHistory: true,
        forceHideSidebar: false,

        // Shorts Tools
        shortsAutoScroll: false,

        // Player Tools
        enableCustomSpeed: true,
        enableCinemaFilters: true,
        filterBrightness: 100,
        filterContrast: 100,

        // Ad Skipper
        adSkipper: true,

        // Night Mode
        blueLight: 0,
        dim: 0,

        // Zen Mode
        zenMode: false,

        // Focus Mode
        dopamineDetox: false,
        enableFocusMode: false,
        cinemaMode: false,
        minimalMode: false,
        
        // Auto Actions
        autoPiP: false,
        
        // New Features
        ambientMode: false,
        audioModeEnabled: false,
        videoControlsEnabled: true,
        subscriptionFolders: true,

        // Study Mode
        studyMode: false
    },



    // =========================================================================
    // GRID CONFIGURATION
    // =========================================================================
    GRID: {
        DESKTOP_COLUMNS: 4,
        ITEM_GAP: 16,
        ROW_GAP: 32,
        MIN_ITEM_WIDTH: 280,
        RESPONSIVE_BREAKPOINTS: {
            LARGE: 1600,
            MEDIUM: 1200,
            SMALL: 900,
            MOBILE: 640
        }
    },

    // =========================================================================
    // TIMING CONSTANTS (milliseconds)
    // =========================================================================
    TIMINGS: {
        // Waits and Timeouts
        ELEMENT_WAIT_DEFAULT: 10000,
        TOAST_DISPLAY: 3000,
        TOAST_FADE: 300,

        // Polling and Intervals
        AD_SKIPPER_INTERVAL: 500,
        PLAYER_TOOLS_INTERVAL: 1000,
        SHORTS_CHECK_INTERVAL: 500,
        STUDY_ENFORCE_INTERVAL: 5000,

        // Debounce Delays
        DEBOUNCE_DEFAULT: 50,
        DEBOUNCE_SEARCH: 500,
        DEBOUNCE_RESIZE: 150,
        DEBOUNCE_NAVIGATION: 200,

        // Animation
        TRANSITION_FAST: 150,
        TRANSITION_MEDIUM: 300,
        TRANSITION_SLOW: 500,

        // Ad Skipper
        AD_PLAYBACK_SPEED: 16
    },

    // =========================================================================
    // STUDY MODE
    // =========================================================================
    STUDY: {
        DEFAULT_SPEED: 1.25,
        MIN_SPEED: 0.1,
        MAX_SPEED: 5.0,
        SPEED_STEP: 0.1
    },

    // =========================================================================
    // PLAYER TOOLS
    // =========================================================================
    PLAYER: {
        SPEED_MIN: 0.1,
        SPEED_MAX: 5.0,
        SPEED_STEP: 0.1,
        FILTER_MIN: 50,
        FILTER_MAX: 200,
        FILTER_DEFAULT: 100
    },

    // =========================================================================
    // AMBIENT MODE
    // =========================================================================
    AMBIENT: {
        FPS: 10,
        SAMPLE_STEP: 10,
        GLOW_SIZE: 150,
        GLOW_BLUR: 30,
        OPACITY: 0.5,
        CANVAS_SIZE: 50
    },

    // =========================================================================
    // VIDEO THUMBNAIL
    // =========================================================================
    THUMBNAIL: {
        ASPECT_RATIO: '16/9',
        BORDER_RADIUS: '12px'
    },

    // =========================================================================
    // TYPOGRAPHY
    // =========================================================================
    TYPOGRAPHY: {
        TITLE_FONT_SIZE: '1.6rem',
        TITLE_LINE_HEIGHT: '2.2rem',
        TITLE_MAX_LINES: 2,
        METADATA_FONT_SIZE: '1.3rem'
    },

    // =========================================================================
    // THEME DEFINITIONS
    // =========================================================================
    THEMES: {
        SYSTEM: { key: 'system', label: 'System (Auto)', class: '' },
        DEFAULT: { key: 'default', label: 'Default (Premium)', class: '' },
        OCEAN: { key: 'ocean', label: 'Ocean Blue', class: 'ypp-theme-ocean' },
        SUNSET: { key: 'sunset', label: 'Sunset Glow', class: 'ypp-theme-sunset' },
        DRACULA: { key: 'dracula', label: 'Dracula', class: 'ypp-theme-dracula' },
        FOREST: { key: 'forest', label: 'Forest', class: 'ypp-theme-forest' },
        MIDNIGHT: { key: 'midnight', label: 'Midnight (OLED)', class: 'ypp-theme-midnight' },
        CHERRY: { key: 'cherry', label: 'Cherry Blossom', class: 'ypp-theme-cherry' }
    },

    // =========================================================================
    // FEATURE MAPPING
    // =========================================================================
    FEATURE_MAP: {
        theme: 'Theme',
        layout: 'Layout',
        homeOrganizer: 'HomeOrganizer',
        subsOrganizer: 'SubscriptionsOrganizer',
        advancedFilter: 'AdvancedFilter',
        zenMode: 'ZenMode',
        studyMode: 'StudyMode',
        focusMode: 'FocusMode',
        player: 'Player',
        contentControl: 'ContentControl',
        sidebar: 'SidebarManager',
        headerNav: 'HeaderNav',
        searchRedesign: 'SearchRedesign',
        shortsTools: 'ShortsTools',
        playerTools: 'PlayerTools',
        // New Features
        playlistDuration: 'PlaylistDuration',
        statsVisualizer: 'StatsVisualizer',
        watchHistory: 'WatchHistoryTracker',
        historyTracker: 'HistoryTracker',
        historyRedesign: 'HistoryRedesign',
        playlistRedesign: 'PlaylistRedesign',
        ambientMode: 'AmbientMode',
        audioMode: 'AudioMode',
        videoControls: 'VideoControls',
        returnYouTubeDislike: 'ReturnDislike',
        sponsorBlock: 'SponsorBlock',
        miniPlayer: 'MiniPlayer',
        videoFilters: 'VideoFilters',
        reversePlaylist: 'ReversePlaylist',
        dataAPI: 'DataAPI',
        nightMode: 'NightModeManager',
        continueWatching: 'ContinueWatching',
        subscriptionFolders: 'SubscriptionFolders',
        markWatched: 'MarkWatched'
    }
};

// Deep freeze CONSTANTS.DEFAULT_SETTINGS to prevent accidental state mutation
const deepFreeze = obj => {
    Object.keys(obj).forEach(prop => {
        if (typeof obj[prop] === 'object' && obj[prop] !== null && !Object.isFrozen(obj[prop])) {
            deepFreeze(obj[prop]);
        }
    });
    return Object.freeze(obj);
};

if (window.YPP.CONSTANTS && window.YPP.CONSTANTS.DEFAULT_SETTINGS) {
    deepFreeze(window.YPP.CONSTANTS.DEFAULT_SETTINGS);
}
