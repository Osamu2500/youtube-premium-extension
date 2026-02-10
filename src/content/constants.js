// Constants for YouTube Premium Plus
window.YPP = window.YPP || {};

window.YPP.CONSTANTS = {
    SELECTORS: {
        GRID_RENDERER: 'ytd-rich-grid-renderer',
        GRID_CONTENTS: '#contents.ytd-rich-grid-renderer',
        GRID_ROW: 'ytd-rich-grid-row',
        VIDEO_ITEM: 'ytd-rich-item-renderer',
        MASTHEAD: 'ytd-masthead',
        CHIPS_BAR: 'ytd-feed-filter-chip-bar-renderer',
        CHIPS_WRAPPER: '#chips-wrapper',
        SHORTS_SECTION: 'ytd-rich-section-renderer[is-shorts]',
        SHORTS_LINK: 'a[title="Shorts"]',
        SHORTS_SHELF: 'ytd-reel-shelf-renderer',
        // Common Shorts selectors
        SHORTS_TAB: 'ytd-guide-entry-renderer a[title="Shorts"]',
        SHORTS_MINI_GUIDE: 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',

        THEATER_BUTTON: '.ytp-size-button',
        WATCH_FLEXY: 'ytd-watch-flexy',
        COMMENTS_SECTION: 'ytd-comments',
        MERCH_SHELF: 'ytd-merch-shelf-renderer',
        RELATED_ITEMS: '#related',
        END_SCREENS: '.ytp-ce-element',

        PLAYER_CONTROLS: '.ytp-right-controls',
        VIDEO_ELEMENT: 'video',
        TITLE_ELEMENT: '#below #title',
        WATCHED_OVERLAY: 'ytd-thumbnail-overlay-resume-playback-renderer #progress',

        // Sidebar Selectors
        GUIDE_BUTTON: '#guide-button',
        GUIDE_ICON: '#guide-icon',
        APP: 'ytd-app',
        MAIN_GUIDE: 'ytd-guide-renderer',
        MINI_GUIDE: 'ytd-mini-guide-renderer'
    },
    GRID: {
        DESKTOP_COLUMNS: 4,
        ITEM_GAP: 16,
        ROW_GAP: 32,
        MIN_ITEM_WIDTH: 280
    },
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
        SIDEBAR_COLLAPSED: 'ypp-sidebar-collapsed'
    },
    DEFAULT_SETTINGS: {
        premiumTheme: true,
        grid4x4: true,
        hideShorts: false,
        autoCinema: false,
        hideSearchShorts: true,
        hideComments: false,
        hideMerch: false,
        hideEndScreens: false,
        blueProgress: false,
        zenMode: false,
        enableSnapshot: true,
        enableLoop: true,
        hookFreeHome: false,
        studyMode: false,
        hideMixes: false,
        hideWatched: false,
        enablePiP: true,
        enableTranscript: true,
        dopamineDetox: false,

        // Search Redesign Defaults
        searchGrid: true,
        cleanSearch: true,

        // Navigation Defaults
        navTrending: true,
        navShorts: true,
        navSubscriptions: true,
        navWatchLater: true,
        navPlaylists: true,
        navHistory: true,
        forceHideSidebar: false,

        // New Feature Defaults
        shortsAutoScroll: false,
        enableCustomSpeed: true,
        enableCinemaFilters: true,
        filterBrightness: 100,
        filterContrast: 100
    },

    /**
     * Timing Constants (milliseconds)
     * Centralized timing values for consistency and easy tuning
     */
    TIMINGS: {
        // Waits and Timeouts
        ELEMENT_WAIT_DEFAULT: 10000,      // Default timeout for waitForElement
        TOAST_DISPLAY: 3000,               // Toast notification duration
        TOAST_FADE: 300,                   // Toast fade out animation

        // Polling and Intervals
        AD_SKIPPER_INTERVAL: 500,          // How often to check for ads
        PLAYER_TOOLS_INTERVAL: 1000,       // Player controls injection check

        // Debounce Delays
        DEBOUNCE_DEFAULT: 50,              // Default DOM observer debounce
        DEBOUNCE_SEARCH: 500,              // Search results processing debounce

        // Ad Skipper
        AD_PLAYBACK_SPEED: 16              // Speed multiplier for ad fast-forward
    }
};
