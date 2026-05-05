# Knowledge Graph Report — YouTube Premium+ Extension  (2026-05-05)

## Corpus Summary
- **1009** nodes · **3602** edges · **108** communities
- Source: `src/` directory — all feature modules, infrastructure, and UI layers

## Architecture Overview

The extension is organized into **7 architectural layers**:

| Layer | Description |
|-------|-------------|
| **Runtime Core** | FeatureManager, BaseFeature, ErrorHandler, UIManager, EventBus |
| **Settings** | Schema/migration, popup UI, presets, storage writes |
| **Theme & Visual** | Night mode, theme engine, OLED true-black, scrollbar control |
| **Player Features** | Cinema/focus modes, speed, PiP, ambient mode, audio EQ, SponsorBlock |
| **Feed & Content** | Feed filters, tag organizer, Shorts hider, watched hider, shelf flattener |
| **Page Features** | Home organizer, search redesign, watch modes, subscriptions filter |
| **Data & Stats** | Watch stats, data scraper, account menu, YouTube data API |

## God Nodes (Most Connected — Core Abstractions)

1. `popup.js` — **26 edges**
2. `theme.js` — **24 edges**
3. `focus-mode.js` — **24 edges**
4. `dom-api.js` — **21 edges**
5. `advanced-filter.js` — **21 edges**
6. `subscription-folders.js` — **21 edges**
7. `modes-manager.js` — **19 edges**
8. `getSelector()` — **18 edges**
9. `query()` — **17 edges**
10. `content-control.js` — **17 edges**

## Community Index

| # | Name | Nodes | Cohesion |
|---|------|-------|----------|
| 3 | [theme.js Feature](#theme.js-feature) | 44 | 0.04 |
| 5 | [search-observer.js Feature](#search-observer.js-feature) | 35 | 0.04 |
| 7 | [popup.js Feature](#popup.js-feature) | 27 | 0.05 |
| 9 | [Focus / Zen / Study Modes](#focus--zen--study-modes) | 25 | 0.08 |
| 10 | [YouTube DOM Selectors](#youtube-dom-selectors) | 22 | 0.12 |
| 11 | [advanced-filter.js Feature](#advanced-filter.js-feature) | 22 | 0.08 |
| 12 | [subscription-folders.js Feature](#subscription-folders.js-feature) | 22 | 0.07 |
| 13 | [Watch Mode Manager](#watch-mode-manager) | 20 | 0.11 |
| 14 | [playlist-redesign.js Feature](#playlist-redesign.js-feature) | 18 | 0.09 |
| 15 | [watch-history.js Feature](#watch-history.js-feature) | 18 | 0.09 |
| 16 | [Focus / Zen / Study Modes](#focus--zen--study-modes) | 18 | 0.1 |
| 17 | [player-tools.js Feature](#player-tools.js-feature) | 18 | 0.09 |
| 18 | [Watched Badge Renderer](#watched-badge-renderer) | 17 | 0.1 |
| 19 | [Focus / Zen / Study Modes](#focus--zen--study-modes) | 17 | 0.11 |
| 20 | [Volume Booster](#volume-booster) | 17 | 0.1 |
| 21 | [keyboard-shortcuts.js Feature](#keyboard-shortcuts.js-feature) | 16 | 0.07 |
| 22 | [multi-select.js Feature](#multi-select.js-feature) | 16 | 0.1 |
| 23 | [stats-visualizer.js Feature](#stats-visualizer.js-feature) | 16 | 0.11 |
| 24 | [subscriptions-ui.js Feature](#subscriptions-ui.js-feature) | 16 | 0.1 |
| 25 | [Video Player Core](#video-player-core) | 16 | 0.11 |
| 26 | [account-menu.js Feature](#account-menu.js-feature) | 15 | 0.1 |
| 27 | [Watched Video Hider](#watched-video-hider) | 15 | 0.11 |
| 28 | [Home Feed Organizer](#home-feed-organizer) | 15 | 0.11 |
| 29 | [shorts-tools.js Feature](#shorts-tools.js-feature) | 15 | 0.12 |
| 30 | [history-tracker.js Feature](#history-tracker.js-feature) | 15 | 0.12 |
| 31 | [Video Resume / Timestamp Saver](#video-resume--timestamp-saver) | 15 | 0.13 |
| 32 | [Base Feature Class](#base-feature-class) | 14 | 0.1 |
| 33 | [Header Nav & Sidebar Injector](#header-nav--sidebar-injector) | 14 | 0.1 |
| 34 | [folder-ui.js Feature](#folder-ui.js-feature) | 13 | 0.08 |
| 35 | [Video Player Core](#video-player-core) | 13 | 0.1 |
| 36 | [video-controls.js Feature](#video-controls.js-feature) | 13 | 0.12 |
| 37 | [video-filters.js Feature](#video-filters.js-feature) | 13 | 0.12 |
| 39 | [DOM Element Cache](#dom-element-cache) | 12 | 0.13 |
| 40 | [reverse-playlist.js Feature](#reverse-playlist.js-feature) | 12 | 0.12 |
| 41 | [context-menu.js Feature](#context-menu.js-feature) | 12 | 0.11 |
| 42 | [Return Dislike Count](#return-dislike-count) | 12 | 0.14 |
| 43 | [Video Resume / Timestamp Saver](#video-resume--timestamp-saver) | 12 | 0.14 |
| 44 | [feature-manager.js Feature](#feature-manager.js-feature) | 11 | 0.15 |
| 45 | [Search Page Redesign](#search-page-redesign) | 11 | 0.15 |
| 46 | [subscription-manager.js Feature](#subscription-manager.js-feature) | 11 | 0.14 |
| 47 | [audio-compressor.js Feature](#audio-compressor.js-feature) | 10 | 0.16 |
| 48 | [Auto Video Tasks (Quality/Pause)](#auto-video-tasks-qualitypause) | 10 | 0.16 |
| 49 | [audio-mode.js Feature](#audio-mode.js-feature) | 10 | 0.17 |
| 50 | [Video Element Cache Helper](#video-element-cache-helper) | 9 | 0.11 |
| 51 | [Night Mode / Blue Light Filter](#night-mode--blue-light-filter) | 9 | 0.17 |
| 52 | [Sidebar State Manager](#sidebar-state-manager) | 9 | 0.17 |
| 53 | [duration-calculator.js Feature](#duration-calculator.js-feature) | 9 | 0.15 |
| 54 | [search-view-mode.js Feature](#search-view-mode.js-feature) | 9 | 0.14 |
| 55 | [subs-ui-modal.js Feature](#subs-ui-modal.js-feature) | 9 | 0.18 |
| 56 | [Auto-Like Feature](#auto-like-feature) | 9 | 0.17 |
| 57 | [Intentional Delay / Mindful Watch](#intentional-delay--mindful-watch) | 9 | 0.15 |
| 58 | [Watched Video Hider](#watched-video-hider) | 8 | 0.16 |
| 59 | [history-redesign.js Feature](#history-redesign.js-feature) | 8 | 0.18 |
| 60 | [Channel Folder Storage](#channel-folder-storage) | 8 | 0.21 |
| 61 | [Auto Video Tasks (Quality/Pause)](#auto-video-tasks-qualitypause) | 8 | 0.16 |
| 62 | [global-bar-ui.js Feature](#global-bar-ui.js-feature) | 8 | 0.16 |
| 63 | [Watched Video Hider](#watched-video-hider) | 8 | 0.18 |
| 64 | [Intentional Delay / Mindful Watch](#intentional-delay--mindful-watch) | 8 | 0.2 |
| 65 | [Remaining Time Display](#remaining-time-display) | 8 | 0.2 |
| 66 | [Error Handler](#error-handler) | 7 | 0.17 |
| 67 | [Shorts Page Redirect](#shorts-page-redirect) | 7 | 0.19 |
| 68 | [Watch Page Utilities](#watch-page-utilities) | 7 | 0.14 |
| 69 | [Watch Page Utilities](#watch-page-utilities) | 7 | 0.19 |
| 70 | [Wheel Volume/Seek Controls](#wheel-volumeseek-controls) | 7 | 0.17 |
| 71 | [video-filters-overlay.js Feature](#video-filters-overlay.js-feature) | 7 | 0.21 |
| 72 | [Volume Booster](#volume-booster) | 7 | 0.26 |
| 73 | [UI Manager](#ui-manager) | 7 | 0.14 |
| 74 | [Event Bus](#event-bus) | 6 | 0.2 |
| 75 | [YouTube Data Scraper](#youtube-data-scraper) | 6 | 0.23 |
| 76 | [Hide Metrics (Likes/Views)](#hide-metrics-likesviews) | 6 | 0.2 |
| 77 | [Hide Playlists & Podcasts](#hide-playlists--podcasts) | 6 | 0.2 |
| 78 | [Hide Thumbnails](#hide-thumbnails) | 6 | 0.2 |
| 79 | [Redirect to Subscriptions on Home](#redirect-to-subscriptions-on-home) | 6 | 0.2 |
| 80 | [Account Menu HTML Builder](#account-menu-html-builder) | 5 | 0.4 |
| 81 | [index.js Feature](#index.js-feature) | 5 | 0.2 |
| 82 | [Subscriptions Feed Filter UI](#subscriptions-feed-filter-ui) | 5 | 0.25 |
| 83 | [Settings Schema & Migration](#settings-schema--migration) | 4 | 0.42 |
| 84 | [video-filters-ui.js Feature](#video-filters-ui.js-feature) | 4 | 0.42 |
| 85 | [example_script.py Feature](#example_script.py-feature) | 3 | 0.33 |
| 86 | [service-worker.js Feature](#service-worker.js-feature) | 3 | 0.33 |
| 87 | [Account Menu Data Extractor](#account-menu-data-extractor) | 3 | 0.5 |
| 88 | [Sidebar State Manager](#sidebar-state-manager) | 3 | 0.33 |
| 89 | [Stats Bridge (Injected Script)](#stats-bridge-injected-script) | 3 | 0.5 |
| 90 | [constants.js Feature](#constants.js-feature) | 2 | 0.5 |
| 91 | [main.js Feature](#main.js-feature) | 2 | 0.5 |
| 92 | [audit_features.js Feature](#audit_features.js-feature) | 2 | 0.5 |
| 93 | [check-features.js Feature](#check-features.js-feature) | 2 | 0.5 |
| 94 | [generate_audit.js Feature](#generate_audit.js-feature) | 2 | 0.5 |
| 95 | [Playlist Tools UI](#playlist-tools-ui) | 1 | 1.0 |
| 96 | [Playlist Tools UI](#playlist-tools-ui) | 1 | 1.0 |
| 97 | [test_bundle.js Feature](#test_bundle.js-feature) | 1 | 1.0 |
| 98 | [vite.config.js Feature](#vite.config.js-feature) | 1 | 1.0 |
| 99 | [index.js Feature](#index.js-feature) | 1 | 1.0 |
| 100 | [index.js Feature](#index.js-feature) | 1 | 1.0 |
| 101 | [filter-presets.js Feature](#filter-presets.js-feature) | 1 | 1.0 |
| 102 | [index.js Feature](#index.js-feature) | 1 | 1.0 |
| 103 | [video-filters-presets.js Feature](#video-filters-presets.js-feature) | 1 | 1.0 |
| 104 | [index.js Feature](#index.js-feature) | 1 | 1.0 |
| 105 | [button.js Feature](#button.js-feature) | 1 | 1.0 |
| 106 | [panel.js Feature](#panel.js-feature) | 1 | 1.0 |
| 108 | [ast_extract.py Feature](#ast_extract.py-feature) | 1 | 1.0 |
| 109 | [audit_features.py Feature](#audit_features.py-feature) | 1 | 1.0 |
| 110 | [check_cache.py Feature](#check_cache.py-feature) | 1 | 1.0 |
| 111 | [find_dividers.js Feature](#find_dividers.js-feature) | 1 | 1.0 |
| 112 | [fix_dup.js Feature](#fix_dup.js-feature) | 1 | 1.0 |
| 113 | [fix_js.js Feature](#fix_js.js-feature) | 1 | 1.0 |
| 114 | [test_popup.js Feature](#test_popup.js-feature) | 1 | 1.0 |
| 115 | [verify.js Feature](#verify.js-feature) | 1 | 1.0 |

---

## Communities (Detailed)

### theme.js Feature
> Nodes primarily from theme.js

- **Community ID**: 3  |  **Cohesion**: 0.04  |  **Nodes**: 44

**Nodes**: `toggle()`, `content-control.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `applySettings()`, `_cleanupDOM()`, `hideShortsGlobally()`, `showShortsGlobally()`, `removeShortsFromDOM()` _(+32 more)_

### search-observer.js Feature
> Nodes primarily from search-observer.js

- **Community ID**: 5  |  **Cohesion**: 0.04  |  **Nodes**: 35

**Nodes**: `utils.js`, `cleanup()`, `handleAbort()`, `check()`, `scheduleCheck()`, `checkElements()`, `status()`, `init()`, `startTracking()`, `_scheduleUpdate()`, `_updateVars()`, `stop()` _(+23 more)_

### popup.js Feature
> Nodes primarily from popup.js

- **Community ID**: 7  |  **Cohesion**: 0.05  |  **Nodes**: 27

**Nodes**: `popup.js`, `switchTab()`, `loadSettings()`, `gatherSettings()`, `saveSettings()`, `showSaveIndicator()`, `initThemeSelector()`, `initSearchViewMode()`, `_processWriteQueue()`, `queueSettingsWrite()`, `updateSetting()`, `notifyThemeChange()` _(+15 more)_

### Focus / Zen / Study Modes
> Immersive viewing modes that strip distractions from the watch page

- **Community ID**: 9  |  **Cohesion**: 0.08  |  **Nodes**: 25

**Nodes**: `focus-mode.js`, `waitForElement()`, `constructor()`, `_initConstants()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `_run()`, `_applyFocusState()`, `_toggleDetox()`, `_applyDetoxStyle()` _(+13 more)_

### YouTube DOM Selectors
> Centralized getter functions for every major YouTube DOM region

- **Community ID**: 10  |  **Cohesion**: 0.12  |  **Nodes**: 22

**Nodes**: `dom-api.js`, `getSelector()`, `query()`, `queryAll()`, `getGrid()`, `getGridContents()`, `getVideoItems()`, `getPlayer()`, `getPlayerContainer()`, `getWatchFlexy()`, `getVideoElement()`, `getVideoControls()` _(+10 more)_

### advanced-filter.js Feature
> Nodes primarily from advanced-filter.js

- **Community ID**: 11  |  **Cohesion**: 0.08  |  **Nodes**: 22

**Nodes**: `advanced-filter.js`, `getConfigKey()`, `constructor()`, `run()`, `init()`, `disable()`, `_createChipsBar()`, `_handleChipClick()`, `_updateChipsUI()`, `apply()`, `_checkCriteriaStrict()`, `_getVideoCards()` _(+10 more)_

### subscription-folders.js Feature
> Nodes primarily from subscription-folders.js

- **Community ID**: 12  |  **Cohesion**: 0.07  |  **Nodes**: 22

**Nodes**: `subscription-folders.js`, `constructor()`, `getConfigKey()`, `update()`, `disable()`, `setupNavigationListener()`, `handleNavigation()`, `isFeedPage()`, `getActiveFolder()`, `getHideShorts()`, `getHideWatched()`, `setHideShorts()` _(+10 more)_

### Watch Mode Manager
> Orchestrates switching between Focus, Zen, Study, and Cinema modes

- **Community ID**: 13  |  **Cohesion**: 0.11  |  **Nodes**: 20

**Nodes**: `modes-manager.js`, `getConfigKey()`, `constructor()`, `run()`, `update()`, `disable()`, `_applyAll()`, `_enableCinemaMode()`, `_disableCinemaMode()`, `_clickTheaterButton()`, `_exitTheaterModeIfNeeded()`, `_enableMinimalMode()` _(+8 more)_

### playlist-redesign.js Feature
> Nodes primarily from playlist-redesign.js

- **Community ID**: 14  |  **Cohesion**: 0.09  |  **Nodes**: 18

**Nodes**: `playlist-redesign.js`, `constructor()`, `getConfigKey()`, `run()`, `disable()`, `_isPlaylistPage()`, `_reset()`, `_tryInit()`, `_attemptBuild()`, `_watchForChanges()`, `_extractPlaylistData()`, `_formatDur()` _(+6 more)_

### watch-history.js Feature
> Nodes primarily from watch-history.js

- **Community ID**: 15  |  **Cohesion**: 0.09  |  **Nodes**: 18

**Nodes**: `watch-history.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onVideoChange()`, `_isOnShortsPage()`, `_handleStartTracking()`, `attachListeners()`, `stopTracking()`, `extractMetadata()`, `handlePlay()` _(+6 more)_

### Focus / Zen / Study Modes
> Immersive viewing modes that strip distractions from the watch page

- **Community ID**: 16  |  **Cohesion**: 0.1  |  **Nodes**: 18

**Nodes**: `zen-mode.js`, `getConfigKey()`, `constructor()`, `run()`, `update()`, `enable()`, `disable()`, `_handleNavigation()`, `_clearCache()`, `toggleZen()`, `autoCinema()`, `_applyAmbientMode()` _(+6 more)_

### player-tools.js Feature
> Nodes primarily from player-tools.js

- **Community ID**: 17  |  **Cohesion**: 0.09  |  **Nodes**: 18

**Nodes**: `player-tools.js`, `getConfigKey()`, `constructor()`, `_initConstants()`, `_initState()`, `run()`, `_update()`, `_enable()`, `_disable()`, `_startMonitoring()`, `_checkForPlayer()`, `_injectControls()` _(+6 more)_

### Watched Badge Renderer
> Scans feed cards and applies watched badges using stored IDs

- **Community ID**: 18  |  **Cohesion**: 0.1  |  **Nodes**: 17

**Nodes**: `mark-watched.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_loadWatchedIds()`, `_saveWatchedIds()`, `markAsWatched()`, `unmarkAsWatched()`, `isWatched()`, `_getVideoId()`, `_processCards()` _(+5 more)_

### Focus / Zen / Study Modes
> Immersive viewing modes that strip distractions from the watch page

- **Community ID**: 19  |  **Cohesion**: 0.11  |  **Nodes**: 17

**Nodes**: `study-mode.js`, `getConfigKey()`, `constructor()`, `run()`, `update()`, `enable()`, `disable()`, `injectSpeedControl()`, `toggleSpeedPanel()`, `createSpeedPanel()`, `removeSpeedPanel()`, `removeUI()` _(+5 more)_

### Volume Booster
> Boosts volume beyond 100% by routing audio through a GainNode

- **Community ID**: 20  |  **Cohesion**: 0.1  |  **Nodes**: 17

**Nodes**: `volume-booster.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `update()`, `run()`, `initAudioContext()`, `_buildAudioGraph()`, `_restoreAudioState()`, `_applyCompressorState()`, `setVolume()` _(+5 more)_

### keyboard-shortcuts.js Feature
> Nodes primarily from keyboard-shortcuts.js

- **Community ID**: 21  |  **Cohesion**: 0.07  |  **Nodes**: 16

**Nodes**: `keyboard-shortcuts.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_handleKey()`, `_comboFromEvent()`, `_normalizeCombo()`, `_toggleSetting()`, `_toggleCinema()`, `_triggerSnapshot()`, `_toggleLoop()` _(+4 more)_

### multi-select.js Feature
> Nodes primarily from multi-select.js

- **Community ID**: 22  |  **Cohesion**: 0.1  |  **Nodes**: 16

**Nodes**: `multi-select.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_init()`, `_getVideoCards()`, `_getVideoData()`, `_attachCheckboxes()`, `_toggleSelect()`, `_clearAll()`, `_updateActionBar()` _(+4 more)_

### stats-visualizer.js Feature
> Nodes primarily from stats-visualizer.js

- **Community ID**: 23  |  **Cohesion**: 0.11  |  **Nodes**: 16

**Nodes**: `stats-visualizer.js`, `constructor()`, `getConfigKey()`, `run()`, `update()`, `_enable()`, `_disable()`, `_loadAndRender()`, `_aggregate()`, `_createOverlay()`, `_renderStats()`, `_set()` _(+4 more)_

### subscriptions-ui.js Feature
> Nodes primarily from subscriptions-ui.js

- **Community ID**: 24  |  **Cohesion**: 0.1  |  **Nodes**: 16

**Nodes**: `subscriptions-ui.js`, `constructor()`, `enable()`, `disable()`, `observePage()`, `checkRoute()`, `applyGridClass()`, `injectManageButton()`, `injectOrganizerButton()`, `_createButton()`, `injectFilterBar()`, `reapplyFilters()` _(+4 more)_

### Video Player Core
> Core player module: detects the player, manages state, and wires up control injection

- **Community ID**: 25  |  **Cohesion**: 0.11  |  **Nodes**: 16

**Nodes**: `player.js`, `constructor()`, `enable()`, `disable()`, `update()`, `run()`, `handleAutoPiP()`, `injectControls()`, `_createSnapshotButton()`, `_createLoopButton()`, `_createSpeedControls()`, `_createPiPButton()` _(+4 more)_

### account-menu.js Feature
> Nodes primarily from account-menu.js

- **Community ID**: 26  |  **Cohesion**: 0.1  |  **Nodes**: 15

**Nodes**: `account-menu.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_onMutation()`, `_findMenu()`, `_startPolling()`, `_clearPollTimer()`, `_clearAvatarPollTimer()`, `_doInject()`, `_scheduleAvatarRefresh()` _(+3 more)_

### Watched Video Hider
> Hides already-watched videos from feeds using stored watch history

- **Community ID**: 27  |  **Cohesion**: 0.11  |  **Nodes**: 15

**Nodes**: `layout-manager.js`, `constructor()`, `_initState()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `updateSettings()`, `startObserver()`, `_debouncedApply()`, `addResizeListener()`, `_applyWithRetry()` _(+3 more)_

### Home Feed Organizer
> Injects organizer, manage buttons, sidebar groups, and filter bars into the home feed

- **Community ID**: 28  |  **Cohesion**: 0.11  |  **Nodes**: 15

**Nodes**: `home-organizer.js`, `getConfigKey()`, `constructor()`, `run()`, `enable()`, `disable()`, `loadTags()`, `toggleFolderForChannel()`, `refreshAllTagButtons()`, `organizeFeed()`, `_processGridItems()`, `handleTagClick()` _(+3 more)_

### shorts-tools.js Feature
> Nodes primarily from shorts-tools.js

- **Community ID**: 29  |  **Cohesion**: 0.12  |  **Nodes**: 15

**Nodes**: `shorts-tools.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onPageChange()`, `update()`, `_isOnShortsPage()`, `_checkAndAttach()`, `_attachToVideo()`, `_removeVideoListeners()`, `_onVideoEnded()` _(+3 more)_

### history-tracker.js Feature
> Nodes primarily from history-tracker.js

- **Community ID**: 30  |  **Cohesion**: 0.12  |  **Nodes**: 15

**Nodes**: `history-tracker.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onPageChange()`, `_mountAndStart()`, `_stopAndUnmount()`, `_handleVisibility()`, `mountUI()`, `loadStats()`, `createWidget()` _(+3 more)_

### Video Resume / Timestamp Saver
> Saves and restores playback position across sessions per video ID

- **Community ID**: 31  |  **Cohesion**: 0.13  |  **Nodes**: 15

**Nodes**: `sponsor-block.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `handleNavigation()`, `init()`, `stop()`, `handleVideoLoaded()`, `getVideoId()`, `fetchSegments()` _(+3 more)_

### Base Feature Class
> Abstract base class that all feature modules extend

- **Community ID**: 32  |  **Cohesion**: 0.1  |  **Nodes**: 14

**Nodes**: `base-feature.js`, `constructor()`, `update()`, `getConfigKey()`, `enable()`, `disable()`, `waitForElement()`, `pollFor()`, `addListener()`, `cleanupEvents()`, `onBusEvent()`, `onPageChange()` _(+2 more)_

### Header Nav & Sidebar Injector
> Injects custom navigation buttons into the YouTube header and sidebar

- **Community ID**: 33  |  **Cohesion**: 0.1  |  **Nodes**: 14

**Nodes**: `header-nav.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_applySidebarState()`, `_observeHeader()`, `_handleNavigate()`, `_scheduleInjection()`, `_injectButtons()`, `_createButton()`, `_isCurrentPage()` _(+2 more)_

### folder-ui.js Feature
> Nodes primarily from folder-ui.js

- **Community ID**: 34  |  **Cohesion**: 0.08  |  **Nodes**: 13

**Nodes**: `folder-ui.js`, `_escHtml()`, `constructor()`, `injectGuideFolders()`, `renderGuideFolders()`, `removeGuideFolders()`, `renderFilterChips()`, `removeFilterChips()`, `_createToggleChip()`, `updateChipStylesForFolder()`, `injectCardBadges()`, `injectChannelBadge()` _(+1 more)_

### Video Player Core
> Core player module: detects the player, manages state, and wires up control injection

- **Community ID**: 35  |  **Cohesion**: 0.1  |  **Nodes**: 13

**Nodes**: `mini-player.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `cleanup()`, `init()`, `startObserving()`, `handleIntersection()`, `requestPip()`, `exitPip()` _(+1 more)_

### video-controls.js Feature
> Nodes primarily from video-controls.js

- **Community ID**: 36  |  **Cohesion**: 0.12  |  **Nodes**: 13

**Nodes**: `video-controls.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_setupAudio()`, `_teardownAudio()`, `injectToggle()`, `togglePanel()`, `createPanel()`, `setupListeners()`, `makeDraggable()` _(+1 more)_

### video-filters.js Feature
> Nodes primarily from video-filters.js

- **Community ID**: 37  |  **Cohesion**: 0.12  |  **Nodes**: 13

**Nodes**: `video-filters.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `update()`, `run()`, `createButton()`, `toggleFilterPanel()`, `_removeFilterPanel()`, `_applyComputedFilter()`, `_restoreFilterState()` _(+1 more)_

### DOM Element Cache
> Caches and watches DOM elements to avoid repeated querySelector calls

- **Community ID**: 39  |  **Cohesion**: 0.13  |  **Nodes**: 12

**Nodes**: `element-cache.js`, `ElementCache`, `.constructor()`, `.get()`, `.getAll()`, `.set()`, `.has()`, `.remove()`, `.clear()`, `.getStats()`, `.watch()`, `.destroy()`

### reverse-playlist.js Feature
> Nodes primarily from reverse-playlist.js

- **Community ID**: 40  |  **Cohesion**: 0.12  |  **Nodes**: 12

**Nodes**: `reverse-playlist.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `run()`, `update()`, `handleNavigation()`, `init()`, `injectButton()`, `toggleReverse()`, `removeUI()`

### context-menu.js Feature
> Nodes primarily from context-menu.js

- **Community ID**: 41  |  **Cohesion**: 0.11  |  **Nodes**: 12

**Nodes**: `context-menu.js`, `getConfigKey()`, `constructor()`, `enable()`, `disable()`, `update()`, `run()`, `init()`, `injectButton()`, `injectChannelHeaderButton()`, `handleCardClick()`, `showGroupSelector()`

### Return Dislike Count
> Fetches and displays the dislike count via the Return YouTube Dislike API

- **Community ID**: 42  |  **Cohesion**: 0.14  |  **Nodes**: 12

**Nodes**: `return-dislike.js`, `constructor()`, `getConfigKey()`, `run()`, `enable()`, `disable()`, `isWatchPage()`, `handleNavigation()`, `fetchDislikes()`, `updateUI()`, `updateRatingBar()`, `formatNumber()`

### Video Resume / Timestamp Saver
> Saves and restores playback position across sessions per video ID

- **Community ID**: 43  |  **Cohesion**: 0.14  |  **Nodes**: 12

**Nodes**: `video-resumer.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `handleNavigation()`, `cleanup()`, `getVideoId()`, `init()`, `restoreTime()`, `handleTimeUpdate()`

### feature-manager.js Feature
> Nodes primarily from feature-manager.js

- **Community ID**: 44  |  **Cohesion**: 0.15  |  **Nodes**: 11

**Nodes**: `feature-manager.js`, `constructor()`, `init()`, `setupLifecycleBindings()`, `resetErrors()`, `instantiateFeatures()`, `getFeature()`, `applyFeatures()`, `safeRun()`, `_domSweep()`, `disableAll()`

### Search Page Redesign
> Restyles the search results page with a cleaner layout

- **Community ID**: 45  |  **Cohesion**: 0.15  |  **Nodes**: 11

**Nodes**: `search-redesign.js`, `SearchRedesign`, `.getConfigKey()`, `.constructor()`, `.init()`, `.run()`, `.enable()`, `.disable()`, `._handleNavigation()`, `._log()`, `._removeClasses()`

### subscription-manager.js Feature
> Nodes primarily from subscription-manager.js

- **Community ID**: 46  |  **Cohesion**: 0.14  |  **Nodes**: 11

**Nodes**: `subscription-manager.js`, `constructor()`, `init()`, `loadGroups()`, `saveGroups()`, `createGroup()`, `deleteGroup()`, `addChannelToGroup()`, `removeChannelFromGroup()`, `getGroups()`, `getChannelsInGroup()`

### audio-compressor.js Feature
> Nodes primarily from audio-compressor.js

- **Community ID**: 47  |  **Cohesion**: 0.16  |  **Nodes**: 10

**Nodes**: `audio-compressor.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `disconnectAudio()`, `init()`, `handleVideoLoaded()`, `setupAudioNodes()`

### Auto Video Tasks (Quality/Pause)
> Runs automated tasks on video change: quality selection, auto-pause, etc.

- **Community ID**: 48  |  **Cohesion**: 0.16  |  **Nodes**: 10

**Nodes**: `auto-quality.js`, `constructor()`, `getConfigKey()`, `update()`, `enable()`, `disable()`, `onVideoChange()`, `runAutoTasks()`, `applyAutoQuality()`, `enforceTheaterMode()`

### audio-mode.js Feature
> Nodes primarily from audio-mode.js

- **Community ID**: 49  |  **Cohesion**: 0.17  |  **Nodes**: 10

**Nodes**: `audio-mode.js`, `getConfigKey()`, `constructor()`, `run()`, `enable()`, `disable()`, `injectStyles()`, `showThumbnailOverlay()`, `getThumbnailUrl()`, `getVideoTitle()`

### Video Element Cache Helper
> Caches the active video element reference and reacts to video changes

- **Community ID**: 50  |  **Cohesion**: 0.11  |  **Nodes**: 9

**Nodes**: `dom-observer.js`, `constructor()`, `start()`, `stop()`, `register()`, `unregister()`, `_onMutations()`, `_flush()`, `setHasMutatedListeners()`

### Night Mode / Blue Light Filter
> Night mode manager: dims screen and injects blue-light CSS filters

- **Community ID**: 51  |  **Cohesion**: 0.17  |  **Nodes**: 9

**Nodes**: `night-mode.js`, `NightModeManager`, `.getConfigKey()`, `.constructor()`, `.run()`, `._applyBlueLight()`, `._createBlueLightFilter()`, `._removeBlueLight()`, `._applyDim()`

### Sidebar State Manager
> Persists and restores YouTube sidebar open/collapsed state across navigation

- **Community ID**: 52  |  **Cohesion**: 0.17  |  **Nodes**: 9

**Nodes**: `sidebar.js`, `getConfigKey()`, `constructor()`, `update()`, `enable()`, `disable()`, `handleNavigation()`, `ensureSidebarState()`, `toggleGuideIfMissing()`

### duration-calculator.js Feature
> Nodes primarily from duration-calculator.js

- **Community ID**: 53  |  **Cohesion**: 0.15  |  **Nodes**: 9

**Nodes**: `duration-calculator.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `calculateDuration()`, `parseTime()`, `formatTime()`, `renderCard()`

### search-view-mode.js Feature
> Nodes primarily from search-view-mode.js

- **Community ID**: 54  |  **Cohesion**: 0.14  |  **Nodes**: 9

**Nodes**: `search-view-mode.js`, `constructor()`, `sync()`, `init()`, `run()`, `enable()`, `disable()`, `applyViewMode()`, `setViewMode()`

### subs-ui-modal.js Feature
> Nodes primarily from subs-ui-modal.js

- **Community ID**: 55  |  **Cohesion**: 0.18  |  **Nodes**: 9

**Nodes**: `subs-ui-modal.js`, `openOrganizer()`, `closeModal()`, `renderChannelsList()`, `_scrapeChannelsFromPage()`, `filterChannelsList()`, `renderCategoriesList()`, `_addChannelToGroup()`, `promptNewCategory()`

### Auto-Like Feature
> Automatically clicks the Like button on videos after a configurable delay

- **Community ID**: 56  |  **Cohesion**: 0.17  |  **Nodes**: 9

**Nodes**: `auto-like.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_tryLike()`, `_waitAndLike()`, `_getLikeButton()`, `_isAlreadyLiked()`

### Intentional Delay / Mindful Watch
> Adds a countdown delay before playback to encourage intentional viewing

- **Community ID**: 57  |  **Cohesion**: 0.15  |  **Nodes**: 9

**Nodes**: `ambient-mode.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `injectToggleButton()`, `initDOM()`, `startLoop()`

### Watched Video Hider
> Hides already-watched videos from feeds using stored watch history

- **Community ID**: 58  |  **Cohesion**: 0.16  |  **Nodes**: 8

**Nodes**: `hide-watched.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_getWatchedIds()`, `_getVideoId()`, `_processCards()`

### history-redesign.js Feature
> Nodes primarily from history-redesign.js

- **Community ID**: 59  |  **Cohesion**: 0.18  |  **Nodes**: 8

**Nodes**: `history-redesign.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `apply()`, `injectStyles()`, `handleMutations()`

### Channel Folder Storage
> CRUD operations for persisting subscription folders to chrome.storage

- **Community ID**: 60  |  **Cohesion**: 0.21  |  **Nodes**: 8

**Nodes**: `folder-storage.js`, `constructor()`, `load()`, `save()`, `addFolder()`, `deleteFolder()`, `addChannelToFolder()`, `removeChannelFromFolder()`

### Auto Video Tasks (Quality/Pause)
> Runs automated tasks on video change: quality selection, auto-pause, etc.

- **Community ID**: 61  |  **Cohesion**: 0.16  |  **Nodes**: 8

**Nodes**: `auto-pause.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onVideoChange()`, `_cacheVideoElement()`, `handleVisibilityChange()`

### global-bar-ui.js Feature
> Nodes primarily from global-bar-ui.js

- **Community ID**: 62  |  **Cohesion**: 0.16  |  **Nodes**: 8

**Nodes**: `global-bar-ui.js`, `constructor()`, `attachBar()`, `removeAll()`, `hasBar()`, `repositionAll()`, `updateBarPosition()`, `_bindEvents()`

### Watched Video Hider
> Hides already-watched videos from feeds using stored watch history

- **Community ID**: 63  |  **Cohesion**: 0.18  |  **Nodes**: 8

**Nodes**: `global-bar.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `startObserver()`, `stopObserver()`, `scanForVideos()`

### Intentional Delay / Mindful Watch
> Adds a countdown delay before playback to encourage intentional viewing

- **Community ID**: 64  |  **Cohesion**: 0.2  |  **Nodes**: 8

**Nodes**: `intentional-delay.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_onPageChange()`, `_showOverlay()`, `_removeOverlay()`

### Remaining Time Display
> Overlays estimated remaining playback time on the player

- **Community ID**: 65  |  **Cohesion**: 0.2  |  **Nodes**: 8

**Nodes**: `time-display.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `update()`, `run()`, `showRemainingTime()`

### Error Handler
> Global error capture, logging, and recovery for runtime faults

- **Community ID**: 66  |  **Cohesion**: 0.17  |  **Nodes**: 7

**Nodes**: `error-handler.js`, `ErrorHandler`, `.constructor()`, `.logError()`, `.getErrors()`, `.clearErrors()`, `.handleError()`

### Shorts Page Redirect
> Redirects the Shorts page to the regular watch page

- **Community ID**: 67  |  **Cohesion**: 0.19  |  **Nodes**: 7

**Nodes**: `redirect-shorts.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onPageChange()`, `checkUrl()`

### Watch Page Utilities
> Comment filtering and continue-watching prompt suppression

- **Community ID**: 68  |  **Cohesion**: 0.14  |  **Nodes**: 7

**Nodes**: `comment-filter.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `onUpdate()`, `handleComments()`

### Watch Page Utilities
> Comment filtering and continue-watching prompt suppression

- **Community ID**: 69  |  **Cohesion**: 0.19  |  **Nodes**: 7

**Nodes**: `continue-watching.js`, `constructor()`, `getConfigKey()`, `init()`, `startObserver()`, `handleNewVideo()`, `cleanup()`

### Wheel Volume/Seek Controls
> Mouse-wheel handler for volume and seek control on the video element

- **Community ID**: 70  |  **Cohesion**: 0.17  |  **Nodes**: 7

**Nodes**: `wheel-controls.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `getVideoElement()`, `handleWheel()`

### video-filters-overlay.js Feature
> Nodes primarily from video-filters-overlay.js

- **Community ID**: 71  |  **Cohesion**: 0.21  |  **Nodes**: 7

**Nodes**: `video-filters-overlay.js`, `applyOverlay()`, `injectSVGSharpness()`, `injectCRTSVGFilter()`, `injectSpecialEffectsSVG()`, `injectOverlayCSS()`, `removeOverlay()`

### Volume Booster
> Boosts volume beyond 100% by routing audio through a GainNode

- **Community ID**: 72  |  **Cohesion**: 0.26  |  **Nodes**: 7

**Nodes**: `volume-booster-ui.js`, `toggleEQPanel()`, `syncBandUI()`, `updateGainTrack()`, `updateBalanceTrack()`, `drawCurve()`, `injectEQStyles()`

### UI Manager
> Mounts, heals, and removes dynamically injected UI widgets

- **Community ID**: 73  |  **Cohesion**: 0.14  |  **Nodes**: 7

**Nodes**: `ui-manager.js`, `UIManager`, `.constructor()`, `.mount()`, `.remove()`, `.heal()`, `.destroy()`

### Event Bus
> Pub/sub event emitter powering page-change and feature coordination

- **Community ID**: 74  |  **Cohesion**: 0.2  |  **Nodes**: 6

**Nodes**: `event-bus.js`, `constructor()`, `on()`, `once()`, `emit()`, `clear()`

### YouTube Data Scraper
> Scrapes structured video/channel data from YouTube's embedded JSON script tags

- **Community ID**: 75  |  **Cohesion**: 0.23  |  **Nodes**: 6

**Nodes**: `data-api.js`, `constructor()`, `init()`, `extractData()`, `scrapeFromScriptTags()`, `getHeaders()`

### Hide Metrics (Likes/Views)
> Hides like counts, view counts, and other engagement metrics from the UI

- **Community ID**: 76  |  **Cohesion**: 0.2  |  **Nodes**: 6

**Nodes**: `hide-metrics.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_apply()`

### Hide Playlists & Podcasts
> Removes playlist and podcast entries from feed and sidebar

- **Community ID**: 77  |  **Cohesion**: 0.2  |  **Nodes**: 6

**Nodes**: `hide-playlists-podcasts.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_apply()`

### Hide Thumbnails
> Hides all video thumbnails to reduce visual noise and clickbait

- **Community ID**: 78  |  **Cohesion**: 0.2  |  **Nodes**: 6

**Nodes**: `hide-thumbnails.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_update()`

### Redirect to Subscriptions on Home
> Redirects the YouTube home page to the subscriptions feed

- **Community ID**: 79  |  **Cohesion**: 0.2  |  **Nodes**: 6

**Nodes**: `redirect-home.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`, `_checkRedirect()`

### Account Menu HTML Builder
> Builds the HTML for the custom account menu items and avatar templates

- **Community ID**: 80  |  **Cohesion**: 0.4  |  **Nodes**: 5

**Nodes**: `account-menu-ui.js`, `esc()`, `letterAvatar()`, `diskHTML()`, `buildMenuHTML()`

### index.js Feature
> Nodes primarily from index.js

- **Community ID**: 81  |  **Cohesion**: 0.2  |  **Nodes**: 5

**Nodes**: `index.js`, `constructor()`, `getConfigKey()`, `enable()`, `disable()`

### Subscriptions Feed Filter UI
> Injects a filter bar into the subscriptions page to hide/show by criteria

- **Community ID**: 82  |  **Cohesion**: 0.25  |  **Nodes**: 5

**Nodes**: `subs-ui-filter.js`, `injectFilterBar()`, `renderFilterBar()`, `reapplyFilters()`, `_filterFeedNow()`

### Settings Schema & Migration
> Defines default settings, validates shape, and migrates legacy storage

- **Community ID**: 83  |  **Cohesion**: 0.42  |  **Nodes**: 4

**Nodes**: `settings-schema.js`, `validateAndMerge()`, `migrate()`, `_defaults()`

### video-filters-ui.js Feature
> Nodes primarily from video-filters-ui.js

- **Community ID**: 84  |  **Cohesion**: 0.42  |  **Nodes**: 4

**Nodes**: `video-filters-ui.js`, `createFilterPanel()`, `buildPresetsTab()`, `buildAdjustTab()`

### example_script.py Feature
> Nodes primarily from example_script.py

- **Community ID**: 85  |  **Cohesion**: 0.33  |  **Nodes**: 3

**Nodes**: `example_script.py`, `main()`, `Main execution function.          Returns:         int: Exit code (0 for succ`

### service-worker.js Feature
> Nodes primarily from service-worker.js

- **Community ID**: 86  |  **Cohesion**: 0.33  |  **Nodes**: 3

**Nodes**: `service-worker.js`, `startTimer()`, `stopTimer()`

### Account Menu Data Extractor
> Extracts user avatar URL and account data from the YouTube account menu DOM

- **Community ID**: 87  |  **Cohesion**: 0.5  |  **Nodes**: 3

**Nodes**: `account-menu-data.js`, `getAvatarUrl()`, `extractData()`

### Sidebar State Manager
> Persists and restores YouTube sidebar open/collapsed state across navigation

- **Community ID**: 88  |  **Cohesion**: 0.33  |  **Nodes**: 3

**Nodes**: `subs-ui-sidebar.js`, `escHtml()`, `injectSidebarGroups()`

### Stats Bridge (Injected Script)
> Injected page-script that reads player state and broadcasts stats to the extension

- **Community ID**: 89  |  **Cohesion**: 0.5  |  **Nodes**: 3

**Nodes**: `stats-bridge.js`, `getPlayer()`, `broadcastStats()`

### constants.js Feature
> Nodes primarily from constants.js

- **Community ID**: 90  |  **Cohesion**: 0.5  |  **Nodes**: 2

**Nodes**: `constants.js`, `deepFreeze()`

### main.js Feature
> Nodes primarily from main.js

- **Community ID**: 91  |  **Cohesion**: 0.5  |  **Nodes**: 2

**Nodes**: `main.js`, `safeLog()`

### audit_features.js Feature
> Nodes primarily from audit_features.js

- **Community ID**: 92  |  **Cohesion**: 0.5  |  **Nodes**: 2

**Nodes**: `audit_features.js`, `getFiles()`

### check-features.js Feature
> Nodes primarily from check-features.js

- **Community ID**: 93  |  **Cohesion**: 0.5  |  **Nodes**: 2

**Nodes**: `check-features.js`, `walkDir()`

### generate_audit.js Feature
> Nodes primarily from generate_audit.js

- **Community ID**: 94  |  **Cohesion**: 0.5  |  **Nodes**: 2

**Nodes**: `generate_audit.js`, `getFiles()`

### Playlist Tools UI
> Builds the extended playlist UI: duration card, HTML rendering, and page detection

- **Community ID**: 95  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `fix_escapes.js`

### Playlist Tools UI
> Builds the extended playlist UI: duration card, HTML rendering, and page detection

- **Community ID**: 96  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `fix_escapes.py`

### test_bundle.js Feature
> Nodes primarily from test_bundle.js

- **Community ID**: 97  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `test_bundle.js`

### vite.config.js Feature
> Nodes primarily from vite.config.js

- **Community ID**: 98  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `vite.config.js`

### index.js Feature
> Nodes primarily from index.js

- **Community ID**: 99  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `index.js`

### index.js Feature
> Nodes primarily from index.js

- **Community ID**: 100  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `index.js`

### filter-presets.js Feature
> Nodes primarily from filter-presets.js

- **Community ID**: 101  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `filter-presets.js`

### index.js Feature
> Nodes primarily from index.js

- **Community ID**: 102  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `index.js`

### video-filters-presets.js Feature
> Nodes primarily from video-filters-presets.js

- **Community ID**: 103  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `video-filters-presets.js`

### index.js Feature
> Nodes primarily from index.js

- **Community ID**: 104  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `index.js`

### button.js Feature
> Nodes primarily from button.js

- **Community ID**: 105  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `button.js`

### panel.js Feature
> Nodes primarily from panel.js

- **Community ID**: 106  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `panel.js`

### ast_extract.py Feature
> Nodes primarily from ast_extract.py

- **Community ID**: 108  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `ast_extract.py`

### audit_features.py Feature
> Nodes primarily from audit_features.py

- **Community ID**: 109  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `audit_features.py`

### check_cache.py Feature
> Nodes primarily from check_cache.py

- **Community ID**: 110  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `check_cache.py`

### find_dividers.js Feature
> Nodes primarily from find_dividers.js

- **Community ID**: 111  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `find_dividers.js`

### fix_dup.js Feature
> Nodes primarily from fix_dup.js

- **Community ID**: 112  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `fix_dup.js`

### fix_js.js Feature
> Nodes primarily from fix_js.js

- **Community ID**: 113  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `fix_js.js`

### test_popup.js Feature
> Nodes primarily from test_popup.js

- **Community ID**: 114  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `test_popup.js`

### verify.js Feature
> Nodes primarily from verify.js

- **Community ID**: 115  |  **Cohesion**: 1.0  |  **Nodes**: 1

**Nodes**: `verify.js`

---

## Knowledge Gaps

Communities with cohesion < 0.1 may represent:
- Files that import many utilities without strong internal coupling
- Bundled/minified code mixed in from `Temporary/` folder
- Features that are planned but not yet fully connected

> **Tip**: Run `python -m graphify update src/` (scoped to src only) to exclude
> minified bundle artifacts from the `Temporary/` folder.