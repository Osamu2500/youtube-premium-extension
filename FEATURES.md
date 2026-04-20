# YouTube Premium Plus — Feature Registry
> **This file is the single source of truth for all extension features.**
> Update it whenever a feature is added, removed, renamed, or moved.
> Antigravity: Read this file first at the start of every session before touching any code.

---

## How to Use This Document

| Column | Meaning |
|---|---|
| **Feature Name** | Human-readable name shown in the popup UI |
| **Class Name** | The JS class name registered in `FEATURE_MAP` in `constants.js` |
| **File Path** | Path relative to `src/` |
| **Settings Key** | The key in `DEFAULT_SETTINGS` that enables/disables this feature (`null` = always on) |
| **Pages** | Which YouTube pages this feature runs on |
| **Status** | `stable` / `wip` / `broken` / `disabled` |
| **Depends On** | Other features or systems this feature requires to work |
| **Description** | One sentence: what it does for the user |

---

## 🎛️ Player Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Player Core | `Player` | `content/features/player/player.js` | `null` | watch | stable | — | Core player enhancements: PiP, speed, loop, and snapshot |
| Volume Booster | `VolumeBooster` | `content/features/player/volume-booster.js` | `enableVolumeBoost` | watch | stable | Player | Increases audio gain past 100% using Web Audio API |
| Auto Quality | `AutoQuality` | `content/features/player/auto-quality.js` | `autoQuality`, `autoCinema` | watch | stable | — | Forces highest video quality and theater mode |
| Time Display | `TimeDisplay` | `content/features/player/time-display.js` | `enableRemainingTime` | watch | stable | — | Shows remaining time and saved time adjusted for speed |
| Player Tools | `PlayerTools` | `content/features/player/player-tools.js` | `videoControlsEnabled` | watch | stable | Player | Custom speed slider, cinema filters panel, brightness/contrast controls |
| Return Dislike | `ReturnDislike` | `content/features/player/return-dislike.js` | `null` | watch | stable | — | Fetches and displays dislike count via Return YouTube Dislike API |
| SponsorBlock | `SponsorBlock` | `content/features/player/sponsor-block.js` | `null` | watch | stable | — | Skips sponsored segments using SponsorBlock community database |
| Mini Player | `MiniPlayer` | `content/features/player/mini-player.js` | `enablePiP` | watch | stable | — | Picture-in-picture and mini player controls |
| Video Filters | `VideoFilters` | `content/features/player/video-filters.js` | `enableCinemaFilters` | watch | stable | — | Brightness, contrast, saturation, hue CSS filters on the video element |
| Ambient Mode | `AmbientMode` | `content/features/player/ambient-mode/ambient-mode.js` | `ambientMode` | watch | stable | — | Projects video colors as a glowing backdrop behind the player |
| Audio Mode | `AudioMode` | `content/features/player/ambient-mode/audio-mode.js` | `audioModeEnabled` | watch | stable | — | Minimises video to audio-only mode with album-art style display |
| Video Controls | `VideoControls` | `content/features/player/video-controls/video-controls.js` | `videoControlsEnabled` | watch | stable | Player | Injects custom buttons (snapshot, loop, PiP) into player controls bar |

---

## 🏠 Home Page Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Home Organizer | `HomeOrganizer` | `content/features/pages/home/home-organizer.js` | `hookFreeHome` | home | stable | — | Removes algorithmic sections, promoted content, and hook-free layout |
| Shorts Tools | `ShortsTools` | `content/features/pages/home/shorts-tools.js` | `hideShorts` | home, search, subscriptions | stable | — | Hides Shorts shelf, Shorts links, and Shorts tab from navigation |

---

## 🔍 Search Page Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Search Redesign | `SearchRedesign` | `content/features/pages/search/search-redesign.js` | `searchGrid` | search | stable | — | Converts search results from list view to a configurable grid layout |
| Advanced Filter | `AdvancedFilter` | `content/features/pages/search/advanced-filter.js` | `cleanSearch` | search | stable | — | Hides "For You", "People also watched", channel cards, and Shorts from search |

---

## 📺 Watch Page Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Zen Mode | `ZenMode` | `content/features/pages/watch/zen-mode.js` | `zenMode` | watch | stable | — | Hides all distractions, dims UI, focuses entirely on the video |
| Focus Mode | `FocusMode` | `content/features/pages/watch/focus-mode.js` | `enableFocusMode` | watch | stable | — | Removes comments, sidebar, merch, and end screens for distraction-free viewing |
| Study Mode | `StudyMode` | `content/features/pages/watch/study-mode.js` | `studyMode` | watch | stable | — | Forces 1.25x speed, enables focus mode, adds study-optimised layout |
| Watch History | `WatchHistoryTracker` | `content/features/pages/watch/watch-history.js` | `null` | watch | stable | — | Tracks videos watched in current session for continue-watching feature |
| Continue Watching | `ContinueWatching` | `content/features/pages/watch/continue-watching.js` | `null` | home | stable | WatchHistoryTracker | Shows a "Continue Watching" row on the home page for unfinished videos |

---

## 📚 Library Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| History Tracker | `HistoryTracker` | `content/features/pages/library/history/history-tracker.js` | `null` | history | stable | — | Enhanced watch history with extended metadata and session grouping |
| History Redesign | `HistoryRedesign` | `content/features/pages/library/history/history-redesign.js` | `null` | history | stable | — | Visual redesign of the history page with grid layout and better filtering |
| Playlist Redesign | `PlaylistRedesign` | `content/features/pages/library/playlist/playlist-redesign.js` | `null` | playlist | stable | — | Improves playlist page layout with better spacing and controls |
| Playlist Duration | `PlaylistDuration` | `content/features/pages/library/playlist/duration-calculator.js` | `null` | playlist | stable | — | Calculates and displays total playlist duration and time at current speed |
| Reverse Playlist | `ReversePlaylist` | `content/features/pages/library/playlist/reverse-playlist.js` | `null` | playlist | stable | — | Adds a button to play a playlist in reverse order |

---

## 👥 Subscriptions Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Subscription Folders | `SubscriptionFolders` | `content/features/pages/subscriptions/subscription-folders.js` | `subscriptionFolders` | subscriptions | stable | — | Groups subscribed channels into user-defined folders |
| Subscription Manager | `SubscriptionManager` | `content/features/pages/subscriptions/subscription-manager.js` | `null` | subscriptions | stable | — | Bulk subscription management — sort, filter, unsubscribe |
| Subscriptions UI | — | `content/features/pages/subscriptions/subscriptions-ui.js` | `null` | subscriptions | stable | SubscriptionFolders | UI components for the subscription folder system |
| Subscriptions Index | — | `content/features/pages/subscriptions/index.js` | `null` | subscriptions | stable | — | Entry point that initialises all subscription feature modules |

---

## 🌐 Global / Core Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Theme | `Theme` | `content/features/core/global/theme.js` | `premiumTheme` | all | stable | — | Applies the active CSS theme and CSS variable overrides to YouTube |
| Content Control | `ContentControl` | `content/features/core/global/content-control.js` | `null` | all | stable | — | Master toggle system for hiding comments, merch, live chat, end screens |
| Night Mode | `NightModeManager` | `content/features/core/global/night-mode.js` | `blueLight` | all | stable | — | Blue light filter and dim overlay with adjustable intensity sliders |
| Data API | `DataAPI` | `content/features/core/global/data-api.js` | `null` | all | stable | — | Bridges page context to extension context for accessing YouTube player APIs |
| Mark Watched | `MarkWatched` | `content/features/core/global/mark-watched.js` | `enableMarkWatched` | all | broken | — | Right-click to manually mark videos as watched; hides watched videos from feed |
| Keyboard Shortcuts | `KeyboardShortcuts` | `content/features/core/global/keyboard-shortcuts.js` | `keyboardShortcuts` | all | stable | — | Custom hotkeys for zen mode, focus mode, snapshot, speed, PiP, ambient mode |
| Stats Visualizer | `StatsVisualizer` | `content/features/core/global/stats/stats-visualizer.js` | `null` | all | wip | HistoryTracker | Displays watch time analytics and stats panel |

---

## 🗂️ Layout Features

| Feature Name | Class Name | File Path | Settings Key | Pages | Status | Depends On | Description |
|---|---|---|---|---|---|---|---|
| Layout Manager | `Layout` | `content/features/core/layout/layout-manager.js` | `homeColumns` | home, search, channel | stable | — | Controls grid column count (1–8) via CSS variable `--ypp-active-columns` |
| Header Nav | `HeaderNav` | `content/features/core/layout/header-nav.js` | `navTrending` | all | stable | UIManager | Injects quick-nav buttons (Trending, Shorts, History, etc.) into the masthead |
| Sidebar Manager | `SidebarManager` | `content/features/core/layout/sidebar.js` | `forceHideSidebar` | all | stable | — | Controls sidebar visibility: hover mode, force hide, mini guide override |

---

## ⚙️ Infrastructure (Not Features — Do Not Add to FEATURE_MAP)

| System | File Path | Purpose |
|---|---|---|
| Main Bootstrap | `content/main.js` | Extension entry point, SPA navigation handler, settings loader |
| Feature Manager | `content/feature-manager.js` | Instantiates and runs all features, error tracking, safeRun wrapper |
| Base Feature | `content/features/base-feature.js` | Abstract base class all features extend — lifecycle: update/enable/disable |
| Constants | `content/constants.js` | All DOM selectors, DEFAULT_SETTINGS, FEATURE_MAP, TIMINGS, THEMES |
| Settings Schema | `content/settings-schema.js` | Schema validation, default merging, migration logic |
| Utils | `content/utils.js` | DOMObserver, logging, toast, waitFor, loadSettings, performance helpers |
| Service Worker | `background/service-worker.js` | MV3 background worker — messaging, storage sync, alarms |
| Vite Entry | `content/index.js` | Import order for Vite bundler — ALL feature files must be listed here |
| Styles | `content/styles.css` | Global CSS injected into YouTube — theme variables, layout overrides |

---

## 🔴 Known Broken / Incomplete Features

| Feature | Problem | Priority |
|---|---|---|
| Mark Watched / Hide Watched | Runs once on load, misses SPA re-renders, no persistence of watched IDs | High |
| Stats Visualizer | Partially implemented, not connected to real watch data | Medium |
| `getConfigKey()` in BaseFeature | Returns `null` by default — many features can't be toggled from popup | High |
| Search page blank grid space | Same margin/mini-guide bug as homepage — not yet fixed for search | High |

---

## 🗺️ Settings Key Master Index

Every key in `DEFAULT_SETTINGS` mapped to which feature uses it:

| Settings Key | Feature | Type | Default |
|---|---|---|---|
| `premiumTheme` | Theme | boolean | `true` |
| `activeTheme` | Theme | string | `'default'` |
| `trueBlack` | Theme (legacy) | boolean | `false` |
| `hideScrollbar` | Theme | boolean | `false` |
| `homeColumns` | Layout Manager | number | `4` |
| `searchColumns` | Layout Manager | number | `4` |
| `channelColumns` | Layout Manager | number | `4` |
| `hideShorts` | Shorts Tools | boolean | `false` |
| `hideSearchShorts` | Advanced Filter | boolean | `true` |
| `hideMixes` | Content Control | boolean | `false` |
| `hideWatched` | Mark Watched | boolean | `false` |
| `enableMarkWatched` | Mark Watched | boolean | `true` |
| `hideMerch` | Content Control | boolean | `false` |
| `hideComments` | Content Control | boolean | `false` |
| `hideLiveChat` | Content Control | boolean | `false` |
| `hideFundraiser` | Content Control | boolean | `false` |
| `hideEndScreens` | Content Control | boolean | `false` |
| `hookFreeHome` | Home Organizer | boolean | `false` |
| `autoCinema` | Player | boolean | `false` |
| `enablePiP` | Mini Player | boolean | `true` |
| `enableTranscript` | Player | boolean | `true` |
| `enableSnapshot` | Video Controls | boolean | `true` |
| `enableLoop` | Video Controls | boolean | `true` |
| `enableVolumeBoost` | Volume Booster | boolean | `true` |
| `searchGrid` | Search Redesign | boolean | `true` |
| `cleanSearch` | Advanced Filter | boolean | `true` |
| `navTrending` | Header Nav | boolean | `true` |
| `forceHideSidebar` | Sidebar Manager | boolean | `false` |
| `hoverSidebar` | Sidebar Manager | boolean | `true` |
| `enableCustomSpeed` | Player Tools | boolean | `true` |
| `enableCinemaFilters` | Player Tools | boolean | `true` |
| `filterBrightness` | Video Filters | number | `100` |
| `filterContrast` | Video Filters | number | `100` |
| `adSkipper` | Player | boolean | `true` |
| `blueLight` | Night Mode | number | `0` |
| `dim` | Night Mode | number | `0` |
| `zenMode` | Zen Mode | boolean | `false` |
| `enableFocusMode` | Focus Mode | boolean | `false` |
| `cinemaMode` | Focus Mode | boolean | `false` |
| `dopamineDetox` | Focus Mode | boolean | `false` |
| `ambientMode` | Ambient Mode | boolean | `false` |
| `audioModeEnabled` | Audio Mode | boolean | `false` |
| `videoControlsEnabled` | Video Controls | boolean | `true` |
| `subscriptionFolders` | Subscription Folders | boolean | `true` |
| `studyMode` | Study Mode | boolean | `false` |
| `keyboardShortcuts` | Keyboard Shortcuts | boolean | `true` |
| `shortcut_zenMode` | Keyboard Shortcuts | string | `'Shift+Z'` |
| `shortcut_focusMode` | Keyboard Shortcuts | string | `'Shift+F'` |
| `shortcut_cinemaMode` | Keyboard Shortcuts | string | `'Shift+C'` |
| `shortcut_snapshot` | Keyboard Shortcuts | string | `'Shift+S'` |
| `shortcut_loop` | Keyboard Shortcuts | string | `'Shift+L'` |
| `shortcut_pip` | Keyboard Shortcuts | string | `'Shift+P'` |
| `shortcut_speedDown` | Keyboard Shortcuts | string | `'Shift+,'` |
| `shortcut_speedUp` | Keyboard Shortcuts | string | `'Shift+.'` |
| `shortcut_speedReset` | Keyboard Shortcuts | string | `'Shift+R'` |
| `shortcut_ambientMode` | Keyboard Shortcuts | string | `'Shift+M'` |

---

## 📋 Instructions for Antigravity

**At the start of every session:**
1. Read this file completely before opening any feature file
2. Check the "Known Broken" table — don't create new features on top of broken foundations
3. When editing a feature, confirm its `Settings Key` matches `getConfigKey()` in its class
4. When adding a new feature, add a row to this file AND add it to `FEATURE_MAP` in `constants.js` AND add its import to `src/content/index.js`
5. Never rename a settings key without a migration entry in `settings-schema.js`
6. After any edit to a feature file, run `npm run build` before testing

**File size rule:** If any feature file exceeds 300 lines, flag it for splitting before adding more code to it.

**The three files you must never edit carelessly:**
- `content/constants.js` — changing FEATURE_MAP or DEFAULT_SETTINGS breaks the entire system
- `content/features/base-feature.js` — changing the lifecycle breaks all 36 features simultaneously  
- `src/content/index.js` — wrong import order or missing import breaks the Vite bundle silently
