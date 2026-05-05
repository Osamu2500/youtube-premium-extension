# Graph Report - .  (2026-05-05)

## Corpus Check
- 106 files · ~85,959 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 938 nodes · 1352 edges · 73 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 106 · Candidates: 129
- Excluded: 122 untracked · 370 ignored · 0 sensitive · 1 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `bdb49a7`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `getSelector()` - 18 edges
2. `query()` - 17 edges
3. `ElementCache` - 11 edges
4. `_applyAll()` - 11 edges
5. `_run()` - 10 edges
6. `SearchRedesign` - 10 edges
7. `applySettings()` - 9 edges
8. `_run()` - 9 edges
9. `NightModeManager` - 8 edges
10. `_toggleTheme()` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (13): applyPreset(), applyPresetFromUI(), applyThemeToPopup(), initHistoryWidget(), initThemeSelector(), _processWriteQueue(), queueSettingsWrite(), renderHeatmap() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (20): _applyCustomizationSettings(), _applyHideScrollbar(), _applyTheme(), _applyTrueBlack(), _applyVisibilitySettings(), _cleanupClasses(), constructor(), disable() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (22): _applyCinemaStyle(), _applyDetoxStyle(), _applyFocusState(), _applyMinimalStyle(), constructor(), disable(), enable(), _ensureTheaterMode() (+14 more)

### Community 3 - "Community 3"
Cohesion: 0.24
Nodes (21): getChipsBar(), getComments(), getGrid(), getGridContents(), getGuideButton(), getMainGuide(), getMasthead(), getMerch() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (18): apply(), _createChipsBar(), disable(), _extractDuration(), _extractIsMix(), _extractIsShort(), _extractSubscriptionStatus(), _extractTitle() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (11): applyFeedFilters(), clearFeedFilters(), disable(), forceRefreshFeed(), handleNavigation(), resetFeedVisibility(), setActiveFolder(), setupFeedFilters() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (16): _applyAll(), _clickTheaterButton(), disable(), _disableAutoCinema(), _disableAutoPiP(), _disableCinemaMode(), _disableMinimalMode(), _enableAutoCinema() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.19
Nodes (14): applySettings(), checkRedirect(), _cleanupDOM(), disable(), enable(), handleShortsAdded(), hideShortsGlobally(), onUpdate() (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (12): _checkForPlayer(), _cleanupListeners(), constructor(), _disable(), _enable(), _initConstants(), _initState(), _injectControls() (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (14): _attemptBuild(), _build(), disable(), _esc(), _extractPlaylistData(), _isPlaylistPage(), _renderDurationCard(), _renderHTML() (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.19
Nodes (14): _checkWatchTimeAlert(), disable(), enable(), extractMetadata(), handlePause(), handlePlay(), _handleStartTracking(), handleTimeUpdate() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (14): _applyAmbientMode(), _clearCache(), disable(), enable(), _getAverageColor(), _handleNavigation(), _initCanvas(), _loop() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (11): _addContextMenu(), _addWatchedBadge(), enable(), _getVideoId(), _loadWatchedIds(), markAsWatched(), _processCard(), _processCards() (+3 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (15): constructor(), createSpeedPanel(), disable(), enable(), _enableCaptions(), _enforceState(), injectSpeedControl(), loadConfig() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.19
Nodes (11): _applyCompressorState(), _buildAudioGraph(), disable(), enable(), initAudioContext(), _restoreAudioState(), run(), setBalance() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (4): _comboFromEvent(), _handleKey(), _normalizeCombo(), _showToast()

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (10): createButton(), _createLoopButton(), _createPiPButton(), _createSnapshotButton(), _createSpeedControls(), enable(), handleAutoPiP(), injectControls() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.19
Nodes (9): _cleanInlineStyles(), _flattenShelf(), _isFlattenableShelf(), _isShorts(), _isShortsShelf(), _pollForElement(), processAll(), processNode() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (12): _aggregate(), _createOverlay(), _disable(), _drawBarChart(), _enable(), _injectStyles(), _loadAndRender(), _renderChannels() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (9): applyGridClass(), checkRoute(), _createButton(), enable(), injectFilterBar(), injectManageButton(), injectOrganizerButton(), injectSidebarGroups() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (10): _cleanup(), _clearAvatarPollTimer(), _clearPollTimer(), disable(), _doInject(), _findMenu(), _onMutation(), _scheduleAvatarRefresh() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (11): createWidget(), disable(), enable(), _handleVisibility(), injectComponentStyles(), loadStats(), _mountAndStart(), mountUI() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (10): disable(), enable(), handleTagClick(), loadTags(), organizeFeed(), _processGridItems(), refreshAllTagButtons(), removePopover() (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (12): _attachToVideo(), _checkAndAttach(), disable(), enable(), _finishScroll(), _isOnShortsPage(), onPageChange(), _onTimeUpdate() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.23
Nodes (13): addResizeListener(), applyGridLayout(), _applyWithRetry(), _cleanup(), constructor(), _debouncedApply(), disable(), enable() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.27
Nodes (11): clearSegments(), disable(), enable(), fetchSegments(), getVideoId(), handleNavigation(), handleVideoLoaded(), init() (+3 more)

### Community 26 - "Community 26"
Cohesion: 0.2
Nodes (6): cleanupEvents(), disable(), enable(), getConfigKey(), run(), update()

### Community 27 - "Community 27"
Cohesion: 0.21
Nodes (7): _applySidebarState(), enable(), _handleNavigate(), _injectButtons(), _observeHeader(), _scheduleInjection(), _updateActiveStates()

### Community 28 - "Community 28"
Cohesion: 0.21
Nodes (6): check(), cleanup(), handleAbort(), init(), startTracking(), _updateVars()

### Community 29 - "Community 29"
Cohesion: 0.21
Nodes (6): cleanup(), disable(), enable(), init(), onUpdate(), startObserving()

### Community 31 - "Community 31"
Cohesion: 0.23
Nodes (9): createPanel(), disable(), enable(), injectToggle(), makeDraggable(), restorePosition(), setupListeners(), _teardownAudio() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (8): _applyComputedFilter(), disable(), enable(), _removeFilterPanel(), _restoreFilterState(), run(), toggleFilterPanel(), update()

### Community 33 - "Community 33"
Cohesion: 0.26
Nodes (1): ElementCache

### Community 34 - "Community 34"
Cohesion: 0.27
Nodes (7): enable(), fetchDislikes(), formatNumber(), handleNavigation(), isWatchPage(), run(), updateUI()

### Community 35 - "Community 35"
Cohesion: 0.27
Nodes (8): cleanup(), disable(), enable(), getVideoId(), handleNavigation(), init(), onUpdate(), restoreTime()

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (6): disable(), enable(), init(), removeUI(), run(), update()

### Community 37 - "Community 37"
Cohesion: 0.21
Nodes (5): enable(), handleCardClick(), init(), run(), showGroupSelector()

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (8): applyFeatures(), _domSweep(), getFeature(), init(), instantiateFeatures(), resetErrors(), safeRun(), setupLifecycleBindings()

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (1): SearchRedesign

### Community 40 - "Community 40"
Cohesion: 0.27
Nodes (7): addChannelToGroup(), createGroup(), deleteGroup(), init(), loadGroups(), removeChannelFromGroup(), saveGroups()

### Community 41 - "Community 41"
Cohesion: 0.33
Nodes (7): disable(), enable(), getThumbnailUrl(), getVideoTitle(), injectStyles(), run(), showThumbnailOverlay()

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (7): disable(), disconnectAudio(), enable(), handleVideoLoaded(), init(), onUpdate(), setupAudioNodes()

### Community 43 - "Community 43"
Cohesion: 0.31
Nodes (5): disable(), enable(), onVideoChange(), runAutoTasks(), update()

### Community 44 - "Community 44"
Cohesion: 0.31
Nodes (4): enable(), initDOM(), injectToggleButton(), startLoop()

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (1): NightModeManager

### Community 47 - "Community 47"
Cohesion: 0.33
Nodes (5): disable(), enable(), ensureSidebarState(), handleNavigation(), update()

### Community 48 - "Community 48"
Cohesion: 0.31
Nodes (4): calculateDuration(), enable(), formatTime(), renderCard()

### Community 49 - "Community 49"
Cohesion: 0.28
Nodes (3): applyViewMode(), enable(), setViewMode()

### Community 50 - "Community 50"
Cohesion: 0.36
Nodes (6): _addChannelToGroup(), openOrganizer(), promptNewCategory(), renderCategoriesList(), renderChannelsList(), _scrapeChannelsFromPage()

### Community 51 - "Community 51"
Cohesion: 0.32
Nodes (3): enable(), _getWatchedIds(), _processCards()

### Community 52 - "Community 52"
Cohesion: 0.36
Nodes (4): apply(), enable(), handleMutations(), injectStyles()

### Community 53 - "Community 53"
Cohesion: 0.32
Nodes (3): _cacheVideoElement(), enable(), onVideoChange()

### Community 54 - "Community 54"
Cohesion: 0.36
Nodes (5): disable(), enable(), scanForVideos(), startObserver(), stopObserver()

### Community 55 - "Community 55"
Cohesion: 0.32
Nodes (3): attachBar(), _bindEvents(), updateBarPosition()

### Community 56 - "Community 56"
Cohesion: 0.39
Nodes (5): disable(), enable(), run(), showRemainingTime(), update()

### Community 57 - "Community 57"
Cohesion: 0.43
Nodes (6): addChannelToFolder(), addFolder(), deleteFolder(), load(), removeChannelFromFolder(), save()

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (1): ErrorHandler

### Community 59 - "Community 59"
Cohesion: 0.38
Nodes (3): checkUrl(), enable(), onPageChange()

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (2): getVideoElement(), handleWheel()

### Community 61 - "Community 61"
Cohesion: 0.43
Nodes (4): _applyDefaultFilter(), checkAndApply(), _log(), _pollForElement()

### Community 63 - "Community 63"
Cohesion: 0.38
Nodes (3): cleanup(), init(), startObserver()

### Community 64 - "Community 64"
Cohesion: 0.43
Nodes (4): applyOverlay(), injectCRTSVGFilter(), injectOverlayCSS(), injectSpecialEffectsSVG()

### Community 65 - "Community 65"
Cohesion: 0.52
Nodes (6): drawCurve(), injectEQStyles(), syncBandUI(), toggleEQPanel(), updateBalanceTrack(), updateGainTrack()

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (1): UIManager

### Community 67 - "Community 67"
Cohesion: 0.4
Nodes (2): on(), once()

### Community 68 - "Community 68"
Cohesion: 0.47
Nodes (3): extractData(), init(), scrapeFromScriptTags()

### Community 69 - "Community 69"
Cohesion: 0.8
Nodes (4): buildMenuHTML(), diskHTML(), esc(), letterAvatar()

### Community 71 - "Community 71"
Cohesion: 0.5
Nodes (2): injectFilterBar(), renderFilterBar()

### Community 72 - "Community 72"
Cohesion: 0.83
Nodes (3): _defaults(), migrate(), validateAndMerge()

### Community 73 - "Community 73"
Cohesion: 0.83
Nodes (3): buildAdjustTab(), buildPresetsTab(), createFilterPanel()

### Community 74 - "Community 74"
Cohesion: 1
Nodes (2): extractData(), getAvatarUrl()

### Community 76 - "Community 76"
Cohesion: 0.67
Nodes (2): main(), Main execution function.          Returns:         int: Exit code (0 for succ

### Community 77 - "Community 77"
Cohesion: 1
Nodes (2): broadcastStats(), getPlayer()

## Knowledge Gaps
- **1 isolated node(s):** `Main execution function.          Returns:         int: Exit code (0 for succ`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 33`** (1 nodes): `ElementCache`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `SearchRedesign`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `NightModeManager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `ErrorHandler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `getVideoElement()`, `handleWheel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `UIManager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (2 nodes): `on()`, `once()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (2 nodes): `injectFilterBar()`, `renderFilterBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (2 nodes): `extractData()`, `getAvatarUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (2 nodes): `main()`, `Main execution function.          Returns:         int: Exit code (0 for succ`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (2 nodes): `broadcastStats()`, `getPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Main execution function.          Returns:         int: Exit code (0 for succ` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._