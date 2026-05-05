# Graph Report - Youtube 2.0  (2026-05-05)

## Corpus Check
- 107 files · ~86,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1028 nodes · 1467 edges · 78 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Content Control & Settings Application]]
- [[_COMMUNITY_Community 1|Subscription Organizer UI Actions]]
- [[_COMMUNITY_Community 2|Feed Filter & Sort Engine]]
- [[_COMMUNITY_Community 3|Settings Persistence & Theme Popup]]
- [[_COMMUNITY_Community 4|Theme & Appearance Manager]]
- [[_COMMUNITY_Community 5|Watch Page Mode Styles (Cinema/Detox/Focus)]]
- [[_COMMUNITY_Community 6|DOM Selector API (Element Queries)]]
- [[_COMMUNITY_Community 7|Home Feed Organizer & Content Extraction]]
- [[_COMMUNITY_Community 8|Player Mode Manager (Cinema/PiP/Minimal)]]
- [[_COMMUNITY_Community 9|Shorts Tools & Content Filter]]
- [[_COMMUNITY_Community 10|Playlist Redesign & Duration Calculator]]
- [[_COMMUNITY_Community 11|Watch History Tracker]]
- [[_COMMUNITY_Community 12|Ambient Mode (Background Color)]]
- [[_COMMUNITY_Community 13|Player Core & Controls Injector]]
- [[_COMMUNITY_Community 14|Mark-Watched & Context Menu]]
- [[_COMMUNITY_Community 15|Video Controls (Speed/Captions)]]
- [[_COMMUNITY_Community 16|Audio Compressor]]
- [[_COMMUNITY_Community 17|Keyboard Shortcuts]]
- [[_COMMUNITY_Community 18|Bulk Video Actions (Queue/Watch Later)]]
- [[_COMMUNITY_Community 19|Stats Visualizer (History Analytics)]]
- [[_COMMUNITY_Community 20|Subscriptions Page UI Injection]]
- [[_COMMUNITY_Community 21|Account Menu Injector]]
- [[_COMMUNITY_Community 22|Layout Manager (Responsive Grid)]]
- [[_COMMUNITY_Community 23|Home Organizer Tag System]]
- [[_COMMUNITY_Community 24|Shorts Redirect & Auto-Scroll]]
- [[_COMMUNITY_Community 25|Stats Widget UI]]
- [[_COMMUNITY_Community 26|Custom Player Buttons (Loop/PiP/Snapshot)]]
- [[_COMMUNITY_Community 27|SponsorBlock Integration]]
- [[_COMMUNITY_Community 28|Base Feature Lifecycle]]
- [[_COMMUNITY_Community 29|Header Navigation & Sidebar]]
- [[_COMMUNITY_Community 30|DOM Observer]]
- [[_COMMUNITY_Community 31|Volume Booster Panel UI]]
- [[_COMMUNITY_Community 32|Video Filters Panel]]
- [[_COMMUNITY_Community 33|Element Cache]]
- [[_COMMUNITY_Community 34|Feature Base (init/run/update)]]
- [[_COMMUNITY_Community 35|Subscription Folder Card UI]]
- [[_COMMUNITY_Community 36|Feed Column Layout]]
- [[_COMMUNITY_Community 37|Return Dislike]]
- [[_COMMUNITY_Community 38|Video Resumer (Continue Watching)]]
- [[_COMMUNITY_Community 39|Feature Manager]]
- [[_COMMUNITY_Community 40|Search Redesign]]
- [[_COMMUNITY_Community 41|Subscription Group Storage]]
- [[_COMMUNITY_Community 42|Audio Mode (Background Audio)]]
- [[_COMMUNITY_Community 43|Auto-Quality & Player Tasks]]
- [[_COMMUNITY_Community 44|Hide Thumbnails Overlay]]
- [[_COMMUNITY_Community 46|Night Mode Manager]]
- [[_COMMUNITY_Community 47|Sidebar State Manager]]
- [[_COMMUNITY_Community 48|Playlist Duration Calculator]]
- [[_COMMUNITY_Community 49|Search View Mode]]
- [[_COMMUNITY_Community 50|Auto-Like Feature]]
- [[_COMMUNITY_Community 51|Focus/Study Mode Toggle]]
- [[_COMMUNITY_Community 52|Hide Watched Videos]]
- [[_COMMUNITY_Community 53|Comment Filter]]
- [[_COMMUNITY_Community 54|Subscription Folder Storage]]
- [[_COMMUNITY_Community 55|Video Element Cache]]
- [[_COMMUNITY_Community 56|Global Progress Bar]]
- [[_COMMUNITY_Community 57|Mark-Watched Video Scanner]]
- [[_COMMUNITY_Community 58|Intentional Delay Overlay]]
- [[_COMMUNITY_Community 59|Time Remaining Display]]
- [[_COMMUNITY_Community 60|Error Handler]]
- [[_COMMUNITY_Community 61|Redirect Home]]
- [[_COMMUNITY_Community 63|Search Observer]]
- [[_COMMUNITY_Community 64|Wheel Controls (Volume Scroll)]]
- [[_COMMUNITY_Community 65|Video Filter Overlay & Special Effects]]
- [[_COMMUNITY_Community 66|Audio EQ Panel UI]]
- [[_COMMUNITY_Community 67|UI Manager]]
- [[_COMMUNITY_Community 68|Event Bus]]
- [[_COMMUNITY_Community 69|YouTube Data API (Script Tag Scraper)]]
- [[_COMMUNITY_Community 70|Hide Metrics]]
- [[_COMMUNITY_Community 71|Hide Playlists & Podcasts]]
- [[_COMMUNITY_Community 72|Hide Thumbnails]]
- [[_COMMUNITY_Community 73|Redirect Home (Check)]]
- [[_COMMUNITY_Community 74|Account Menu HTML Builder]]
- [[_COMMUNITY_Community 76|Subscriptions Filter Bar]]
- [[_COMMUNITY_Community 77|Settings Schema Migration]]
- [[_COMMUNITY_Community 78|Video Filters UI Builder]]
- [[_COMMUNITY_Community 80|Account Menu Data]]
- [[_COMMUNITY_Community 82|Stats Bridge (Injected Script)]]

## God Nodes (most connected - your core abstractions)
1. `getSelector()` - 18 edges
2. `query()` - 17 edges
3. `ElementCache` - 11 edges
4. `_applyAll()` - 11 edges
5. `applySettings()` - 10 edges
6. `_run()` - 10 edges
7. `SearchRedesign` - 10 edges
8. `_run()` - 9 edges
9. `NightModeManager` - 8 edges
10. `_toggleTheme()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `applySettings()` --calls--> `toggle()`  [INFERRED]
  src\content\features\core\global\content-control.js → src\content\utils.js
- `_applyVisibilitySettings()` --calls--> `toggle()`  [INFERRED]
  src\content\features\core\global\theme.js → src\content\utils.js
- `_hideDistractions()` --calls--> `toggle()`  [INFERRED]
  src\content\features\pages\watch\focus-mode.js → src\content\utils.js
- `_pollForElement()` --calls--> `check()`  [INFERRED]
  src\content\features\pages\search\search-filter.js → src\content\utils.js
- `_pollForElement()` --calls--> `check()`  [INFERRED]
  src\content\features\pages\search\search-observer.js → src\content\utils.js

## Communities

### Community 0 - "Content Control & Settings Application"
Cohesion: 0.08
Nodes (20): check(), cleanup(), handleAbort(), init(), startTracking(), toggle(), _updateVars(), _applyDefaultFilter() (+12 more)

### Community 1 - "Subscription Organizer UI Actions"
Cohesion: 0.08
Nodes (11): takeSnapshot(), alert(), bulkUnsubscribe(), confirm(), prompt(), _addChannelToGroup(), openOrganizer(), promptNewCategory() (+3 more)

### Community 2 - "Feed Filter & Sort Engine"
Cohesion: 0.11
Nodes (18): applyFeedFilters(), _applyFeedFiltersNow(), _applySortOrder(), clearFeedFilters(), disable(), forceRefreshFeed(), handleNavigation(), _matchesDateFilter() (+10 more)

### Community 3 - "Settings Persistence & Theme Popup"
Cohesion: 0.1
Nodes (13): applyPreset(), applyPresetFromUI(), applyThemeToPopup(), initHistoryWidget(), initThemeSelector(), _processWriteQueue(), queueSettingsWrite(), renderHeatmap() (+5 more)

### Community 4 - "Theme & Appearance Manager"
Cohesion: 0.15
Nodes (20): _applyCustomizationSettings(), _applyHideScrollbar(), _applyTheme(), _applyTrueBlack(), _applyVisibilitySettings(), _cleanupClasses(), constructor(), disable() (+12 more)

### Community 5 - "Watch Page Mode Styles (Cinema/Detox/Focus)"
Cohesion: 0.17
Nodes (22): _applyCinemaStyle(), _applyDetoxStyle(), _applyFocusState(), _applyMinimalStyle(), constructor(), disable(), enable(), _ensureTheaterMode() (+14 more)

### Community 6 - "DOM Selector API (Element Queries)"
Cohesion: 0.24
Nodes (21): getChipsBar(), getComments(), getGrid(), getGridContents(), getGuideButton(), getMainGuide(), getMasthead(), getMerch() (+13 more)

### Community 7 - "Home Feed Organizer & Content Extraction"
Cohesion: 0.16
Nodes (18): apply(), _createChipsBar(), disable(), _extractDuration(), _extractIsMix(), _extractIsShort(), _extractSubscriptionStatus(), _extractTitle() (+10 more)

### Community 8 - "Player Mode Manager (Cinema/PiP/Minimal)"
Cohesion: 0.21
Nodes (16): _applyAll(), _clickTheaterButton(), disable(), _disableAutoCinema(), _disableAutoPiP(), _disableCinemaMode(), _disableMinimalMode(), _enableAutoCinema() (+8 more)

### Community 9 - "Shorts Tools & Content Filter"
Cohesion: 0.19
Nodes (14): applySettings(), checkRedirect(), _cleanupDOM(), disable(), enable(), handleShortsAdded(), hideShortsGlobally(), onUpdate() (+6 more)

### Community 10 - "Playlist Redesign & Duration Calculator"
Cohesion: 0.19
Nodes (14): _attemptBuild(), _build(), disable(), _esc(), _extractPlaylistData(), _isPlaylistPage(), _renderDurationCard(), _renderHTML() (+6 more)

### Community 11 - "Watch History Tracker"
Cohesion: 0.19
Nodes (14): _checkWatchTimeAlert(), disable(), enable(), extractMetadata(), handlePause(), handlePlay(), _handleStartTracking(), handleTimeUpdate() (+6 more)

### Community 12 - "Ambient Mode (Background Color)"
Cohesion: 0.2
Nodes (14): _applyAmbientMode(), _clearCache(), disable(), enable(), _getAverageColor(), _handleNavigation(), _initCanvas(), _loop() (+6 more)

### Community 13 - "Player Core & Controls Injector"
Cohesion: 0.18
Nodes (12): _checkForPlayer(), _cleanupListeners(), constructor(), _disable(), _enable(), _initConstants(), _initState(), _injectControls() (+4 more)

### Community 14 - "Mark-Watched & Context Menu"
Cohesion: 0.2
Nodes (11): _addContextMenu(), _addWatchedBadge(), enable(), _getVideoId(), _loadWatchedIds(), markAsWatched(), _processCard(), _processCards() (+3 more)

### Community 15 - "Video Controls (Speed/Captions)"
Cohesion: 0.22
Nodes (15): constructor(), createSpeedPanel(), disable(), enable(), _enableCaptions(), _enforceState(), injectSpeedControl(), loadConfig() (+7 more)

### Community 16 - "Audio Compressor"
Cohesion: 0.19
Nodes (11): _applyCompressorState(), _buildAudioGraph(), disable(), enable(), initAudioContext(), _restoreAudioState(), run(), setBalance() (+3 more)

### Community 17 - "Keyboard Shortcuts"
Cohesion: 0.15
Nodes (4): _comboFromEvent(), _handleKey(), _normalizeCombo(), _showToast()

### Community 18 - "Bulk Video Actions (Queue/Watch Later)"
Cohesion: 0.21
Nodes (11): _addToQueue(), _addToWatchLater(), _attachCheckboxes(), _clearAll(), disable(), enable(), _getVideoCards(), _init() (+3 more)

### Community 19 - "Stats Visualizer (History Analytics)"
Cohesion: 0.22
Nodes (12): _aggregate(), _createOverlay(), _disable(), _drawBarChart(), _enable(), _injectStyles(), _loadAndRender(), _renderChannels() (+4 more)

### Community 20 - "Subscriptions Page UI Injection"
Cohesion: 0.2
Nodes (9): applyGridClass(), checkRoute(), _createButton(), enable(), injectFilterBar(), injectManageButton(), injectOrganizerButton(), injectSidebarGroups() (+1 more)

### Community 21 - "Account Menu Injector"
Cohesion: 0.2
Nodes (10): _cleanup(), _clearAvatarPollTimer(), _clearPollTimer(), disable(), _doInject(), _findMenu(), _onMutation(), _scheduleAvatarRefresh() (+2 more)

### Community 22 - "Layout Manager (Responsive Grid)"
Cohesion: 0.23
Nodes (13): addResizeListener(), applyGridLayout(), _applyWithRetry(), _cleanup(), constructor(), _debouncedApply(), disable(), enable() (+5 more)

### Community 23 - "Home Organizer Tag System"
Cohesion: 0.22
Nodes (10): disable(), enable(), handleTagClick(), loadTags(), organizeFeed(), _processGridItems(), refreshAllTagButtons(), removePopover() (+2 more)

### Community 24 - "Shorts Redirect & Auto-Scroll"
Cohesion: 0.24
Nodes (12): _attachToVideo(), _checkAndAttach(), disable(), enable(), _finishScroll(), _isOnShortsPage(), onPageChange(), _onTimeUpdate() (+4 more)

### Community 25 - "Stats Widget UI"
Cohesion: 0.24
Nodes (11): createWidget(), disable(), enable(), _handleVisibility(), injectComponentStyles(), loadStats(), _mountAndStart(), mountUI() (+3 more)

### Community 26 - "Custom Player Buttons (Loop/PiP/Snapshot)"
Cohesion: 0.25
Nodes (10): createButton(), _createLoopButton(), _createPiPButton(), _createSnapshotButton(), _createSpeedControls(), enable(), handleAutoPiP(), injectControls() (+2 more)

### Community 27 - "SponsorBlock Integration"
Cohesion: 0.27
Nodes (11): clearSegments(), disable(), enable(), fetchSegments(), getVideoId(), handleNavigation(), handleVideoLoaded(), init() (+3 more)

### Community 28 - "Base Feature Lifecycle"
Cohesion: 0.2
Nodes (6): cleanupEvents(), disable(), enable(), getConfigKey(), run(), update()

### Community 29 - "Header Navigation & Sidebar"
Cohesion: 0.21
Nodes (7): _applySidebarState(), enable(), _handleNavigate(), _injectButtons(), _observeHeader(), _scheduleInjection(), _updateActiveStates()

### Community 30 - "DOM Observer"
Cohesion: 0.21
Nodes (6): cleanup(), disable(), enable(), init(), onUpdate(), startObserving()

### Community 31 - "Volume Booster Panel UI"
Cohesion: 0.23
Nodes (9): createPanel(), disable(), enable(), injectToggle(), makeDraggable(), restorePosition(), setupListeners(), _teardownAudio() (+1 more)

### Community 32 - "Video Filters Panel"
Cohesion: 0.24
Nodes (8): _applyComputedFilter(), disable(), enable(), _removeFilterPanel(), _restoreFilterState(), run(), toggleFilterPanel(), update()

### Community 33 - "Element Cache"
Cohesion: 0.26
Nodes (1): ElementCache

### Community 34 - "Feature Base (init/run/update)"
Cohesion: 0.24
Nodes (6): disable(), enable(), init(), removeUI(), run(), update()

### Community 35 - "Subscription Folder Card UI"
Cohesion: 0.21
Nodes (5): enable(), handleCardClick(), init(), run(), showGroupSelector()

### Community 36 - "Feed Column Layout"
Cohesion: 0.23
Nodes (6): activateDeck(), createColumn(), deactivateDeck(), disable(), distributeItems(), observeFeedMutations()

### Community 37 - "Return Dislike"
Cohesion: 0.27
Nodes (7): enable(), fetchDislikes(), formatNumber(), handleNavigation(), isWatchPage(), run(), updateUI()

### Community 38 - "Video Resumer (Continue Watching)"
Cohesion: 0.27
Nodes (8): cleanup(), disable(), enable(), getVideoId(), handleNavigation(), init(), onUpdate(), restoreTime()

### Community 39 - "Feature Manager"
Cohesion: 0.29
Nodes (8): applyFeatures(), _domSweep(), getFeature(), init(), instantiateFeatures(), resetErrors(), safeRun(), setupLifecycleBindings()

### Community 40 - "Search Redesign"
Cohesion: 0.29
Nodes (1): SearchRedesign

### Community 41 - "Subscription Group Storage"
Cohesion: 0.27
Nodes (7): addChannelToGroup(), createGroup(), deleteGroup(), init(), loadGroups(), removeChannelFromGroup(), saveGroups()

### Community 42 - "Audio Mode (Background Audio)"
Cohesion: 0.31
Nodes (7): disable(), disconnectAudio(), enable(), handleVideoLoaded(), init(), onUpdate(), setupAudioNodes()

### Community 43 - "Auto-Quality & Player Tasks"
Cohesion: 0.31
Nodes (5): disable(), enable(), onVideoChange(), runAutoTasks(), update()

### Community 44 - "Hide Thumbnails Overlay"
Cohesion: 0.33
Nodes (7): disable(), enable(), getThumbnailUrl(), getVideoTitle(), injectStyles(), run(), showThumbnailOverlay()

### Community 46 - "Night Mode Manager"
Cohesion: 0.33
Nodes (1): NightModeManager

### Community 47 - "Sidebar State Manager"
Cohesion: 0.33
Nodes (5): disable(), enable(), ensureSidebarState(), handleNavigation(), update()

### Community 48 - "Playlist Duration Calculator"
Cohesion: 0.31
Nodes (4): calculateDuration(), enable(), formatTime(), renderCard()

### Community 49 - "Search View Mode"
Cohesion: 0.28
Nodes (3): applyViewMode(), enable(), setViewMode()

### Community 50 - "Auto-Like Feature"
Cohesion: 0.33
Nodes (5): enable(), _getLikeButton(), _isAlreadyLiked(), _tryLike(), _waitAndLike()

### Community 51 - "Focus/Study Mode Toggle"
Cohesion: 0.31
Nodes (4): enable(), initDOM(), injectToggleButton(), startLoop()

### Community 52 - "Hide Watched Videos"
Cohesion: 0.32
Nodes (3): enable(), _getWatchedIds(), _processCards()

### Community 53 - "Comment Filter"
Cohesion: 0.36
Nodes (4): apply(), enable(), handleMutations(), injectStyles()

### Community 54 - "Subscription Folder Storage"
Cohesion: 0.43
Nodes (6): addChannelToFolder(), addFolder(), deleteFolder(), load(), removeChannelFromFolder(), save()

### Community 55 - "Video Element Cache"
Cohesion: 0.32
Nodes (3): _cacheVideoElement(), enable(), onVideoChange()

### Community 56 - "Global Progress Bar"
Cohesion: 0.32
Nodes (3): attachBar(), _bindEvents(), updateBarPosition()

### Community 57 - "Mark-Watched Video Scanner"
Cohesion: 0.36
Nodes (5): disable(), enable(), scanForVideos(), startObserver(), stopObserver()

### Community 58 - "Intentional Delay Overlay"
Cohesion: 0.39
Nodes (5): disable(), enable(), _onPageChange(), _removeOverlay(), _showOverlay()

### Community 59 - "Time Remaining Display"
Cohesion: 0.39
Nodes (5): disable(), enable(), run(), showRemainingTime(), update()

### Community 60 - "Error Handler"
Cohesion: 0.33
Nodes (1): ErrorHandler

### Community 61 - "Redirect Home"
Cohesion: 0.38
Nodes (3): checkUrl(), enable(), onPageChange()

### Community 63 - "Search Observer"
Cohesion: 0.38
Nodes (3): cleanup(), init(), startObserver()

### Community 64 - "Wheel Controls (Volume Scroll)"
Cohesion: 0.33
Nodes (2): getVideoElement(), handleWheel()

### Community 65 - "Video Filter Overlay & Special Effects"
Cohesion: 0.43
Nodes (4): applyOverlay(), injectCRTSVGFilter(), injectOverlayCSS(), injectSpecialEffectsSVG()

### Community 66 - "Audio EQ Panel UI"
Cohesion: 0.52
Nodes (6): drawCurve(), injectEQStyles(), syncBandUI(), toggleEQPanel(), updateBalanceTrack(), updateGainTrack()

### Community 67 - "UI Manager"
Cohesion: 0.29
Nodes (1): UIManager

### Community 68 - "Event Bus"
Cohesion: 0.4
Nodes (2): on(), once()

### Community 69 - "YouTube Data API (Script Tag Scraper)"
Cohesion: 0.47
Nodes (3): extractData(), init(), scrapeFromScriptTags()

### Community 70 - "Hide Metrics"
Cohesion: 0.4
Nodes (2): _apply(), enable()

### Community 71 - "Hide Playlists & Podcasts"
Cohesion: 0.4
Nodes (2): _apply(), enable()

### Community 72 - "Hide Thumbnails"
Cohesion: 0.4
Nodes (2): enable(), _update()

### Community 73 - "Redirect Home (Check)"
Cohesion: 0.4
Nodes (2): _checkRedirect(), enable()

### Community 74 - "Account Menu HTML Builder"
Cohesion: 0.8
Nodes (4): buildMenuHTML(), diskHTML(), esc(), letterAvatar()

### Community 76 - "Subscriptions Filter Bar"
Cohesion: 0.5
Nodes (2): injectFilterBar(), renderFilterBar()

### Community 77 - "Settings Schema Migration"
Cohesion: 0.83
Nodes (3): _defaults(), migrate(), validateAndMerge()

### Community 78 - "Video Filters UI Builder"
Cohesion: 0.83
Nodes (3): buildAdjustTab(), buildPresetsTab(), createFilterPanel()

### Community 80 - "Account Menu Data"
Cohesion: 1.0
Nodes (2): extractData(), getAvatarUrl()

### Community 82 - "Stats Bridge (Injected Script)"
Cohesion: 1.0
Nodes (2): broadcastStats(), getPlayer()

## Knowledge Gaps
- **Thin community `Community 33`** (12 nodes): `ElementCache`, `.clear()`, `.constructor()`, `.destroy()`, `.get()`, `.getAll()`, `.getStats()`, `.has()`, `.remove()`, `.set()`, `.watch()`, `element-cache.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (11 nodes): `SearchRedesign`, `.constructor()`, `.disable()`, `.enable()`, `.getConfigKey()`, `._handleNavigation()`, `.init()`, `._log()`, `._removeClasses()`, `.run()`, `search-redesign.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (9 nodes): `NightModeManager`, `._applyBlueLight()`, `._applyDim()`, `.constructor()`, `._createBlueLightFilter()`, `.getConfigKey()`, `._removeBlueLight()`, `.run()`, `night-mode.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (7 nodes): `ErrorHandler`, `.clearErrors()`, `.constructor()`, `.getErrors()`, `.handleError()`, `.logError()`, `error-handler.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (7 nodes): `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `getVideoElement()`, `handleWheel()`, `wheel-controls.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (7 nodes): `ui-manager.js`, `UIManager`, `.constructor()`, `.destroy()`, `.heal()`, `.mount()`, `.remove()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (6 nodes): `clear()`, `constructor()`, `emit()`, `on()`, `once()`, `event-bus.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (6 nodes): `_apply()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `hide-metrics.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (6 nodes): `_apply()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `hide-playlists-podcasts.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (6 nodes): `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `_update()`, `hide-thumbnails.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (6 nodes): `_checkRedirect()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `redirect-home.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (5 nodes): `subs-ui-filter.js`, `_filterFeedNow()`, `injectFilterBar()`, `reapplyFilters()`, `renderFilterBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (3 nodes): `extractData()`, `getAvatarUrl()`, `account-menu-data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `broadcastStats()`, `getPlayer()`, `stats-bridge.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toggle()` connect `Community 0` to `Community 9`, `Community 4`, `Community 5`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `_applyVisibilitySettings()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._