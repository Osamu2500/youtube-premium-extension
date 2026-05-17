# Graph Report - Youtube 2.0  (2026-05-17)

## Corpus Check
- 117 files · ~414,439 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1103 nodes · 1580 edges · 82 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `getSelector()` - 18 edges
2. `query()` - 17 edges
3. `ElementCache` - 11 edges
4. `_applyAll()` - 11 edges
5. `applySettings()` - 10 edges
6. `SearchRedesign` - 10 edges
7. `_run()` - 9 edges
8. `_run()` - 9 edges
9. `NightModeManager` - 8 edges
10. `_toggleTheme()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `toggle()` --calls--> `applySettings()`  [INFERRED]
  src\content\utils.js → src\content\features\core\global\content-control.js
- `toggle()` --calls--> `_applyVisibilitySettings()`  [INFERRED]
  src\content\utils.js → src\content\features\core\global\theme.js
- `alert()` --calls--> `takeSnapshot()`  [INFERRED]
  src\content\features\pages\subscriptions\folder-ui.js → src\content\features\player\player.js
- `check()` --calls--> `_pollForElement()`  [INFERRED]
  src\content\utils.js → src\content\features\pages\search\search-filter.js
- `check()` --calls--> `_pollForElement()`  [INFERRED]
  src\content\utils.js → src\content\features\pages\search\search-observer.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (19): takeSnapshot(), alert(), bulkAddToFolder(), bulkUnsubscribe(), confirm(), _doUnsubscribe(), _getApiHeaders(), _getYoutubeConfig() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (19): check(), cleanup(), handleAbort(), init(), startTracking(), _updateVars(), _applyDefaultFilter(), checkAndApply() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (28): _applyCustomizationSettings(), _applyHideScrollbar(), _applyTheme(), _applyVisibilitySettings(), _cleanupClasses(), _cleanupCustomVariables(), constructor(), debounce() (+20 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (17): applyAccentColor(), applyDensity(), applyFontFamily(), applyPreset(), applyPresetFromUI(), applyThemeToPopup(), initHistoryWidget(), initThemeSelector() (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): applyFeedFilters(), _applyFeedFiltersNow(), _applySortOrder(), clearFeedFilters(), disable(), forceRefreshFeed(), handleNavigation(), _injectGridCSS() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (23): toggle(), _applyCinemaStyle(), _applyDetoxStyle(), _applyFocusState(), _applyMinimalStyle(), constructor(), disable(), enable() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.24
Nodes (21): getChipsBar(), getComments(), getGrid(), getGridContents(), getGuideButton(), getMainGuide(), getMasthead(), getMerch() (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (18): apply(), _createChipsBar(), disable(), _extractDuration(), _extractIsMix(), _extractIsShort(), _extractSubscriptionStatus(), _extractTitle() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (16): _applyAll(), _clickTheaterButton(), disable(), _disableAutoCinema(), _disableAutoPiP(), _disableCinemaMode(), _disableMinimalMode(), _enableAutoCinema() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (14): _attemptBuild(), _build(), disable(), _esc(), _extractPlaylistData(), _isPlaylistPage(), _renderDurationCard(), _renderHTML() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (14): applySettings(), checkRedirect(), _cleanupDOM(), disable(), enable(), handleShortsAdded(), hideShortsGlobally(), onUpdate() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (14): _checkWatchTimeAlert(), disable(), enable(), extractMetadata(), handlePause(), handlePlay(), _handleStartTracking(), handleTimeUpdate() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (14): _applyAmbientMode(), _clearCache(), disable(), enable(), _getAverageColor(), _handleNavigation(), _initCanvas(), _loop() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (12): _checkForPlayer(), _cleanupListeners(), constructor(), _disable(), _enable(), _initConstants(), _initState(), _injectControls() (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (12): _applyCompressorState(), _buildAudioGraph(), disable(), enable(), initAudioContext(), _loadSettings(), _restoreAudioState(), run() (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (11): _addContextMenu(), _addWatchedBadge(), enable(), _getVideoId(), _loadWatchedIds(), markAsWatched(), _processCard(), _processCards() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (15): constructor(), createSpeedPanel(), disable(), enable(), _enableCaptions(), _enforceState(), injectSpeedControl(), loadConfig() (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (4): _comboFromEvent(), _handleKey(), _normalizeCombo(), _showToast()

### Community 18 - "Community 18"
Cohesion: 0.21
Nodes (11): _addToQueue(), _addToWatchLater(), _attachCheckboxes(), _clearAll(), disable(), enable(), _getVideoCards(), _init() (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (12): _aggregate(), _createOverlay(), _disable(), _drawBarChart(), _enable(), _injectStyles(), _loadAndRender(), _renderChannels() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (9): applyGridClass(), checkRoute(), _createButton(), enable(), injectFilterBar(), injectManageButton(), injectOrganizerButton(), injectSidebarGroups() (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (10): _cleanup(), _clearAvatarPollTimer(), _clearPollTimer(), disable(), _doInject(), _findMenu(), _onMutation(), _scheduleAvatarRefresh() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.23
Nodes (13): addResizeListener(), applyGridLayout(), _applyWithRetry(), _cleanup(), constructor(), _debouncedApply(), disable(), enable() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (10): disable(), enable(), handleTagClick(), loadTags(), organizeFeed(), _processGridItems(), refreshAllTagButtons(), removePopover() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (12): _attachToVideo(), _checkAndAttach(), disable(), enable(), _finishScroll(), _isOnShortsPage(), onPageChange(), _onTimeUpdate() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (11): createWidget(), disable(), enable(), _handleVisibility(), injectComponentStyles(), loadStats(), _mountAndStart(), mountUI() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (10): createButton(), _createLoopButton(), _createPiPButton(), _createSnapshotButton(), _createSpeedControls(), enable(), handleAutoPiP(), injectControls() (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.27
Nodes (11): clearSegments(), disable(), enable(), fetchSegments(), getVideoId(), handleNavigation(), handleVideoLoaded(), init() (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (6): cleanupEvents(), disable(), enable(), getConfigKey(), run(), update()

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (9): enable(), _getWatchedIds(), _getWatchProgress(), _hasWatchedBadge(), _injectStyle(), _isWatched(), onUpdate(), _processCards() (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (7): _applySidebarState(), enable(), _handleNavigate(), _injectButtons(), _observeHeader(), _scheduleInjection(), _updateActiveStates()

### Community 31 - "Community 31"
Cohesion: 0.21
Nodes (6): cleanup(), disable(), enable(), init(), onUpdate(), startObserving()

### Community 32 - "Community 32"
Cohesion: 0.23
Nodes (9): createPanel(), disable(), enable(), injectToggle(), makeDraggable(), restorePosition(), setupListeners(), _teardownAudio() (+1 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (8): _applyComputedFilter(), disable(), enable(), _removeFilterPanel(), _restoreFilterState(), run(), toggleFilterPanel(), update()

### Community 34 - "Community 34"
Cohesion: 0.26
Nodes (1): ElementCache

### Community 35 - "Community 35"
Cohesion: 0.24
Nodes (6): disable(), enable(), init(), removeUI(), run(), update()

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (5): enable(), handleCardClick(), init(), run(), showGroupSelector()

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (6): activateDeck(), createColumn(), deactivateDeck(), disable(), distributeItems(), observeFeedMutations()

### Community 38 - "Community 38"
Cohesion: 0.32
Nodes (10): _applyFeatures(), _checkRoute(), _cleanup(), disable(), enable(), init(), _injectCSS(), _mountSidebarComments() (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.27
Nodes (7): enable(), fetchDislikes(), formatNumber(), handleNavigation(), isWatchPage(), run(), updateUI()

### Community 40 - "Community 40"
Cohesion: 0.27
Nodes (8): cleanup(), disable(), enable(), getVideoId(), handleNavigation(), init(), onUpdate(), restoreTime()

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (8): applyFeatures(), _domSweep(), getFeature(), init(), instantiateFeatures(), resetErrors(), safeRun(), setupLifecycleBindings()

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (1): SearchRedesign

### Community 43 - "Community 43"
Cohesion: 0.27
Nodes (7): addChannelToGroup(), createGroup(), deleteGroup(), init(), loadGroups(), removeChannelFromGroup(), saveGroups()

### Community 44 - "Community 44"
Cohesion: 0.31
Nodes (7): disable(), disconnectAudio(), enable(), handleVideoLoaded(), init(), onUpdate(), setupAudioNodes()

### Community 45 - "Community 45"
Cohesion: 0.31
Nodes (5): disable(), enable(), onVideoChange(), runAutoTasks(), update()

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (7): disable(), enable(), getThumbnailUrl(), getVideoTitle(), injectStyles(), run(), showThumbnailOverlay()

### Community 48 - "Community 48"
Cohesion: 0.33
Nodes (1): NightModeManager

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): disable(), enable(), ensureSidebarState(), handleNavigation(), update()

### Community 50 - "Community 50"
Cohesion: 0.31
Nodes (4): calculateDuration(), enable(), formatTimeText(), renderCard()

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (3): applyViewMode(), enable(), setViewMode()

### Community 52 - "Community 52"
Cohesion: 0.33
Nodes (5): enable(), _getLikeButton(), _isAlreadyLiked(), _tryLike(), _waitAndLike()

### Community 53 - "Community 53"
Cohesion: 0.31
Nodes (5): attachBar(), _bindEvents(), repositionAll(), updateBarPosition(), updateSettings()

### Community 54 - "Community 54"
Cohesion: 0.31
Nodes (5): disable(), enable(), scanForVideos(), startObserver(), stopObserver()

### Community 55 - "Community 55"
Cohesion: 0.31
Nodes (4): enable(), initDOM(), injectToggleButton(), startLoop()

### Community 56 - "Community 56"
Cohesion: 0.36
Nodes (7): C(), k(), L(), n(), o(), r(), t()

### Community 57 - "Community 57"
Cohesion: 0.36
Nodes (4): apply(), enable(), handleMutations(), injectStyles()

### Community 58 - "Community 58"
Cohesion: 0.43
Nodes (6): addChannelToFolder(), addFolder(), deleteFolder(), load(), removeChannelFromFolder(), save()

### Community 59 - "Community 59"
Cohesion: 0.32
Nodes (3): _cacheVideoElement(), enable(), onVideoChange()

### Community 60 - "Community 60"
Cohesion: 0.39
Nodes (5): disable(), enable(), _onPageChange(), _removeOverlay(), _showOverlay()

### Community 61 - "Community 61"
Cohesion: 0.46
Nodes (6): disable(), enable(), _injectStyle(), onPageChange(), _removeStyle(), update()

### Community 62 - "Community 62"
Cohesion: 0.39
Nodes (5): disable(), enable(), run(), showRemainingTime(), update()

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (1): ErrorHandler

### Community 65 - "Community 65"
Cohesion: 0.38
Nodes (3): checkUrl(), enable(), onPageChange()

### Community 67 - "Community 67"
Cohesion: 0.38
Nodes (3): cleanup(), init(), startObserver()

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (2): getVideoElement(), handleWheel()

### Community 69 - "Community 69"
Cohesion: 0.43
Nodes (4): applyOverlay(), injectCRTSVGFilter(), injectOverlayCSS(), injectSpecialEffectsSVG()

### Community 70 - "Community 70"
Cohesion: 0.29
Nodes (1): UIManager

### Community 71 - "Community 71"
Cohesion: 0.4
Nodes (2): on(), once()

### Community 72 - "Community 72"
Cohesion: 0.47
Nodes (3): extractData(), init(), scrapeFromScriptTags()

### Community 73 - "Community 73"
Cohesion: 0.4
Nodes (2): _apply(), enable()

### Community 74 - "Community 74"
Cohesion: 0.4
Nodes (2): _apply(), enable()

### Community 75 - "Community 75"
Cohesion: 0.4
Nodes (2): enable(), _update()

### Community 76 - "Community 76"
Cohesion: 0.4
Nodes (2): _checkRedirect(), enable()

### Community 77 - "Community 77"
Cohesion: 0.4
Nodes (3): add_channel_guard(), Fix styles.css: add .ypp-channel-page exclusion guards to all rules that could b, Insert :not(.ypp-channel-page) after the body selector.

### Community 78 - "Community 78"
Cohesion: 0.8
Nodes (4): buildMenuHTML(), diskHTML(), esc(), letterAvatar()

### Community 80 - "Community 80"
Cohesion: 0.5
Nodes (2): injectFilterBar(), renderFilterBar()

### Community 81 - "Community 81"
Cohesion: 0.8
Nodes (4): buildAdjustTab(), buildPresetsTab(), createFilterPanel(), _injectStyle()

### Community 82 - "Community 82"
Cohesion: 0.83
Nodes (3): _defaults(), migrate(), validateAndMerge()

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (2): extractData(), getAvatarUrl()

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): broadcastStats(), getPlayer()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Audit styles.css to find selectors that could bleed into the channel page. Print

## Knowledge Gaps
- **3 isolated node(s):** `Audit styles.css to find selectors that could bleed into the channel page. Print`, `Fix styles.css: add .ypp-channel-page exclusion guards to all rules that could b`, `Insert :not(.ypp-channel-page) after the body selector.`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 34`** (12 nodes): `ElementCache`, `.clear()`, `.constructor()`, `.destroy()`, `.get()`, `.getAll()`, `.getStats()`, `.has()`, `.remove()`, `.set()`, `.watch()`, `element-cache.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (11 nodes): `SearchRedesign`, `.constructor()`, `.disable()`, `.enable()`, `.getConfigKey()`, `._handleNavigation()`, `.init()`, `._log()`, `._removeClasses()`, `.run()`, `search-redesign.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (9 nodes): `NightModeManager`, `._applyBlueLight()`, `._applyDim()`, `.constructor()`, `._createBlueLightFilter()`, `.getConfigKey()`, `._removeBlueLight()`, `.run()`, `night-mode.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (7 nodes): `ErrorHandler`, `.clearErrors()`, `.constructor()`, `.getErrors()`, `.handleError()`, `.logError()`, `error-handler.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (7 nodes): `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `getVideoElement()`, `handleWheel()`, `wheel-controls.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (7 nodes): `ui-manager.js`, `UIManager`, `.constructor()`, `.destroy()`, `.heal()`, `.mount()`, `.remove()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (6 nodes): `clear()`, `constructor()`, `emit()`, `on()`, `once()`, `event-bus.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (6 nodes): `_apply()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `hide-metrics.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (6 nodes): `_apply()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `hide-playlists-podcasts.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (6 nodes): `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `_update()`, `hide-thumbnails.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (6 nodes): `_checkRedirect()`, `constructor()`, `disable()`, `enable()`, `getConfigKey()`, `redirect-home.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (5 nodes): `subs-ui-filter.js`, `_filterFeedNow()`, `injectFilterBar()`, `reapplyFilters()`, `renderFilterBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (3 nodes): `extractData()`, `getAvatarUrl()`, `account-menu-data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (3 nodes): `broadcastStats()`, `getPlayer()`, `stats-bridge.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (2 nodes): `audit_channel.py`, `Audit styles.css to find selectors that could bleed into the channel page. Print`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toggle()` connect `Community 5` to `Community 1`, `Community 10`, `Community 2`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `applySettings()` connect `Community 10` to `Community 5`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `_applyVisibilitySettings()` connect `Community 2` to `Community 5`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `Audit styles.css to find selectors that could bleed into the channel page. Print`, `Fix styles.css: add .ypp-channel-page exclusion guards to all rules that could b`, `Insert :not(.ypp-channel-page) after the body selector.` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._