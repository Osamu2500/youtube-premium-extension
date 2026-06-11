export const DEFAULT_SETTINGS = {
    schemaVersion: 1,
    // Theme
    premiumTheme: true,
    gridAnimator: true,
    enableAccountMenu: true,
    activeTheme: 'default',
    cardStyle: 'glass',
    trueBlack: false,
    hideScrollbar: false,
    customScrollbar: false,
    grayscaleThumbnails: false,

    // Layout
    grid4x4: false,
    autoScaleLayout: true,
    homeColumns: 4,
    searchColumns: 4,
    channelColumns: 4,
    displayFullTitle: false,

    // Visibility
    hideShorts: false,
    hideSearchShorts: true,
    hideMixes: false,
    hideExploreTopics: false,
    hidePromoShelves: false,
    hideWatched: false,
    hideWatchedMode: 'dim',
    hideWatchedThreshold: 80,
    enableMarkWatched: true,
    hideMerch: false,
    hideComments: false,
    hideLiveChat: false,
    hideFundraiser: false,
    hideEndScreens: false,
    hookFreeHome: false,
    hideSearchShelves: true,
    hideChannelCards: false,
    autoVideoFilter: true,

    // Player
    autoCinema: false,
    autoQuality: false,
    enablePiP: true,
    enableTranscript: true,
    enableSnapshot: true,
    enableLoop: true,
    enableRemainingTime: true,
    enableVolumeBoost: true,
    volumeLevel: 1,
    volumeBoostBass: 0,
    volumeBoostTreble: 0,

    // Search Redesign
    searchGrid: true,
    cleanSearch: true,

    // Navigation
    navTrending: true,
    navShorts: true,
    navSubscriptions: true,
    navWatchLater: true,
    navPlaylists: true,
    navHistory: true,
    forceHideSidebar: false,
    logoRedirectSub: false,
    sidebarLayout: 'expanded',
    
    // Playlist & History
    continueWatching: true,
    reversePlaylist: false,
    historyRedesign: true,

    // Shorts Tools
    shortsAutoScroll: false,
    redirectShorts: false,

    // Player Tools
    enableCustomSpeed: true,
    enableCinemaFilters: true,
    enableGlobalPlayerBar: true,
    cinemaFilterIndex: 0,
    cinemaFilterBrightness: 100,
    cinemaFilterContrast: 100,
    cinemaFilterSaturate: 100,
    cinemaFilterHue: 0,
    cinemaFilterBlur: 0,
    cinemaFilterOpacity: 100,

    // Custom Player Bar
    pb_snapshot: 'front',
    pb_loop: 'front',
    pb_speed: 'front',
    pb_pip: 'front',
    pb_volume: 'front',
    pb_cinema: 'front',
    pb_native_play: 'front',
    pb_native_next: 'front',
    pb_native_mute: 'front',
    pb_native_cast: 'front',
    pb_native_autoplay: 'front',
    pb_native_cc: 'front',
    pb_native_miniplayer: 'front',
    pb_native_theater: 'front',
    pb_native_fullscreen: 'front',

    // Ad Skipper
    adSkipper: true,
    sponsorBlock: true,
    // SponsorBlock per-category toggles
    sb_sponsor:          true,
    sb_intro:            true,
    sb_selfpromo:        true,
    sb_interaction:      false,
    sb_music_offtopic:   false,
    sb_preview:          false,
    returnYouTubeDislike: true,

    splitScrolling: false,

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
    floatingPlayer: false,
    
    // Player Automation
    autoSkipAds: true,
    autoSkipPromos: false,
    autoSkipSponsors: false,
    autoPlayNext: false,
    
    // New Features
    autoLike: false,
    hidePlaylists: false,
    hidePodcasts: false,
    multiSelect: true,
    hideMetrics: false,
    hideThumbnails: false,
    redirectHome: false,
    intentionalDelay: false,
    ambientMode: false,
    audioModeEnabled: false,
    videoControlsEnabled: true,
    subscriptionFolders: true,
    wheelControls: true,
    audioCompressor: false,
    videoResumer: true,
    autoPause: false,
    commentFilter: false,
    commentFilterAction: 'dim',       // 'dim' | 'hide'
    commentFilterCustomKeywords: '',  // comma-separated user keywords
    contextMenu: true,
    enableBookmarks: true,
    cinematicMode: false,

    // Study Mode
    studyMode: false,

    // Stats Visualizer
    statsVisualizer: false,

    // Subscription Organizer (legacy)
    enableSubsManager: false,

    // Watch Time Alert
    watchTimeAlert: false,
    watchTimeAlertHours: 2,

    // Keyboard Shortcuts
    keyboardShortcuts: true,
    shortcut_zenMode:     'Shift+Z',
    shortcut_focusMode:   'Shift+F',
    shortcut_cinemaMode:  'Shift+C',
    shortcut_minimalMode: 'Shift+M',
    shortcut_snapshot:    'Shift+S',
    shortcut_loop:        'Shift+L',
    shortcut_pip:         'Shift+P',
    shortcut_speedDown:   'Shift+,',
    shortcut_speedUp:     'Shift+.',
    shortcut_speedReset:  'Shift+R',
    shortcut_ambientMode: 'Shift+A',

    // Onboarding
    hasSeenOnboarding: false,
};
