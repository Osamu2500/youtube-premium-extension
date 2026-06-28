export const DEFAULT_SETTINGS = {
    schemaVersion: 1,
    // Theme
    premiumTheme: true,
    enableThemeEffects: true,
    gridAnimator: true,
    enableAccountMenu: true,
    activeTheme: 'default',
    cardStyle: 'glass',
    trueBlack: false,
    hideScrollbar: false,
    customScrollbar: false,
    grayscaleThumbnails: false,
    
    // Advanced Theming

    // Layout
    layout: true,
    grid4x4: false,
    autoScaleLayout: true,
    homeColumns: 0,  // 0 = auto (driven by AutoScaleGrid), 1–10 = manual override
    searchColumns: 4,
    channelColumns: 4,
    subscriptionsColumns: 4,
    historyColumns: 4,
    displayFullTitle: false,

    // Visibility
    hideShorts: false,
    hideSearchShorts: false,
    hideMixes: false,
    hideExploreTopics: false,
    hidePromoShelves: false,
    feedFilter: true,
    hideLiveStreams: false,
    hideUpcoming: false,
    hidePosts: false,
    feedFilterKeywords: '',
    hideWatched: false,
    hideWatchedMode: 'dim',
    hideWatchedThreshold: 80,
    enableMarkWatched: true,
    hideMerch: false,
    hideComments: false,
    hideLiveChat: false,
    hideFundraiser: false,
    headerNavEnabled: true,
    hideEndScreens: false,
    hideSearchShelves: true,
    hideChannelCards: false,
    hideCards: false,            // Player video card pop-ups
    hideAnnotations: false,      // Player on-screen annotations
    hideRelated: false,          // Watch page related sidebar
    hideVoiceSearch: false,      // Header microphone icon
    hideTrending: false,         // Trending guide entries
    hideFeed: false,             // Homepage feed
    hideShortsInteraction: false, // Shorts like/comment bar
    aggressiveShortsBlock: false, // Nuke shorts everywhere
    autoVideoFilter: true,

    // Player
    autoCinema: false,
    autoQuality: 'highres',
    enablePiP: true,
    enableTranscript: true,
    enableSnapshot: true,
    enableLoop: true,
    enableRemainingTime: true,
    enableVolumeBoost: true,
    volumeLevel: 1,
    volumeWidener: false,
    volumeWarmth: 0,
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
    enableCustomSidebar: true,
    sidebarLayout: 'spacious',
    
    // Playlist & History
    continueWatching: true,
    reversePlaylist: false,
    historyRedesign: true,
    playlistRedesign: true,

    // Shorts Tools
    shortsAutoScroll: false,
    redirectShorts: false,
    stopShortsLooping: false,
    hideShortVideos: false,
    minVideoDuration: 2,

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
    pb_bookmark: 'front',
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

    // Global Player Bar toggles
    gpb_showPlay: true,
    gpb_showTime: true,
    gpb_showVolume: true,
    gpb_showVolumeBoost: true,
    gpb_showFilters: true,
    gpb_showLoop: true,
    gpb_showPip: true,
    gpb_showFullscreen: true,

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
    autoLikeThreshold: 50,
    hidePlaylists: false,
    hidePodcasts: false,
    multiSelect: true,
    hideMetrics: false,
    hideThumbnails: false,
    intentionalDelay: false,
    intentionalDelayTime: 3,
    ambientMode: false,
    videoControlsEnabled: true,
    wheelControls: true,
    audioCompressor: false,
    autoPause: false,
    commentFilter: false,
    commentFilterAction: 'dim',       // 'dim' | 'hide'
    commentFilterCustomKeywords: '',  // comma-separated user keywords
    contextMenu: true,
    enableBookmarks: true,

    // Study Mode
    studyMode: false,

    // Stats Visualizer
    statsVisualizer: false,

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
    shortcut_ambientMode: 'Shift+A',

    // Video Speed Controller (Advanced)
    vscAudioSupport: false,
    vscRememberSpeed: true,
    vscHideByDefault: false,
    vscForceSpeed: false,
    vscShortcuts: [
        { action: 'showHide', key: 'V', value: null },
        { action: 'decrease', key: 'Z', value: 0.25 },
        { action: 'increase', key: 'X', value: 0.25 },
        { action: 'rewind', key: 'W', value: 10 },
        { action: 'advance', key: 'E', value: 10 },
        { action: 'reset', key: 'A', value: 1.0 },
        { action: 'preferred', key: 'Q', value: 2.0 },
        { action: 'mute', key: '', value: null },
        { action: 'decreaseVolume', key: '', value: null },
        { action: 'increaseVolume', key: '', value: null },
        { action: 'pause', key: '', value: null },
        { action: 'setMarker', key: '', value: null },
        { action: 'jumpMarker', key: '', value: null }
    ],

    // Onboarding
    hasSeenOnboarding: false,
};

