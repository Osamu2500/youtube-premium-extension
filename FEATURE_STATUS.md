# Extension Feature Status Tracker

This document tracks the exhaustive current status of **every single feature** built within the YouTube Premium+ Extension. It is meant for developers and agents to quickly navigate, understand what works, and identify areas that need focus or improvement.

---

## 🟢 Fully Built & Working (Stable)
These features are well-tested, fully integrated into the UI, and functioning as intended.

### Player Features
*   **Bookmarks Manager (`bookmarks.js`)** - Captures highlights/transcripts to local storage with full popup UI.
*   **Return YouTube Dislike (`return-dislike.js`)** - Injects dislike counts using the RYD API.
*   **SponsorBlock (`sponsor-block.js`)** - Skips sponsor segments automatically using the SponsorBlock API.
*   **Video Resumer (`video-resumer.js`)** - Remembers and resumes video playback position across sessions.
*   **Auto Quality (`auto-quality.js`)** - Forces the highest or selected video quality automatically.
*   **Time Display (`time-display.js`)** - Enhances the time display (e.g., remaining time toggle).
*   **Player Tools (`player-tools.js`)** - Core UI injection for player overlay controls.
*   **Intentional Delay (`intentional-delay.js`)** - Forces a configurable pause before letting a video play.

### Global & Core Features
*   **Theme Manager (`theme.js`)** - High-quality glassmorphic/flat themes, custom colors, fonts, and dark mode.
*   **Keyboard Shortcuts (`keyboard-shortcuts.js`)** - Comprehensive hotkey manager for controlling all custom extension features.
*   **Hide Watched (`hide-watched.js`)** - Dims or hides videos that have been fully watched (based on threshold).
*   **Mark Watched (`mark-watched.js`)** - Allows manual marking of videos as watched.
*   **Night Mode / Dark Mode (`night-mode.js`)** - Enforces deep dark mode across YouTube.

### Subscriptions & Library
*   **Subscription Folders (`subscription-folders.js` / `folder-ui.js`)** - Allows grouping subscriptions into folders with a custom UI.
*   **Subscription Deck Mode (`deck-mode.js`)** - Advanced column-based layout for the subscriptions feed.
*   **Context Menu (`context-menu.js`)** - Custom right-click context menus for subscription items.

### Search & Layout
*   **Search Redesign (`search-redesign.js`)** - Modern grid-based layout for YouTube search results.
*   **Header Navigation (`header-nav.js`)** - Replaces default header links with custom navigation options.
*   **Sidebar Manager (`sidebar.js` / `sidebar-layout.js`)** - Controls the left sidebar state (hover, hidden, compact).

### Watch Page Modes
*   **Focus Mode (`focus-mode.js`)** - Hides distractions like comments and related videos for deep work.
*   **Zen Mode (`zen-mode.js`)** - Hides the entire UI leaving only the video.
*   **Study Mode (`study-mode.js`)** - Similar to focus mode, tailored for educational content with speed enforcements.

---

## 🟡 Half Built / Needs Improvement
These features exist and function partially, but need optimization, edge-case handling, or UI polish.

*   **History & Watch Time Analytics (`history-tracker.js`, `watch-history.js`)**
    *   *Status:* Needs Polish
    *   *Details:* Logs watch time and renders heatmaps/calendars in the popup. 
    *   *Focus needed:* Timezone offsets for the calendar grid sometimes cause day mismatches. The UI can be sluggish if storage is flooded with thousands of video logs. Needs pagination or better cleanup routines.
*   **Playlist Redesign & Duration (`playlist-redesign.js`, `duration-calculator.js`)**
    *   *Status:* Half Built
    *   *Details:* Redesigns playlist views and calculates total playlist length.
    *   *Focus needed:* YouTube frequently changes playlist DOM structures; the duration calculator occasionally fails to sum hidden videos in lazy-loaded lists.
*   **Custom Video Player Controls (`video-controls/`, `wheel-controls.js`)**
    *   *Status:* Half Built
    *   *Details:* Allows volume control via mouse wheel and advanced playback buttons.
    *   *Focus needed:* Wheel controls sometimes conflict with native scrolling if the mouse is near the edge of the player.
*   **Ambient Mode Enhancements (`ambient-mode/`)**
    *   *Status:* Needs Improvement
    *   *Details:* Adds custom glowing effects behind the player.
    *   *Focus needed:* High CPU usage on 4k videos. Needs WebGL or better Canvas optimization.
*   **Global Player Bar (`global-bar.js`, `global-bar-ui.js`)**
    *   *Status:* Needs Improvement
    *   *Details:* A persistent mini-player bar that floats across pages.
    *   *Focus needed:* State synchronization issues when moving between the Watch page and the Home page quickly via SPA navigation.
*   **Volume Booster & Audio Compressor (`volume-booster/`, `audio-compressor.js`)**
    *   *Status:* Needs Improvement
    *   *Details:* Modifies the AudioContext to boost volume beyond 100% and normalize loud/quiet sounds.
    *   *Focus needed:* Sometimes causes audio clipping or desyncs if the user switches audio output devices while playing.

---

## 🔴 Broken / Needs Fixing
These features currently have significant bugs, fail to load, or are severely outdated due to YouTube DOM changes.

*   **Hide Playlists & Podcasts (`hide-playlists-podcasts.js`)**
    *   *Status:* Broken
    *   *Details:* Was intended to filter out Mixes and Podcasts from the Home feed.
    *   *Focus needed:* YouTube completely changed how "Mixes" are tagged in the DOM rendering them undetectable by the current selectors.
*   **Auto Pause (`auto-pause.js`)**
    *   *Status:* Broken
    *   *Details:* Pauses video when switching tabs.
    *   *Focus needed:* The Page Visibility API logic conflicts with YouTube's own background-play settings, causing infinite pause/play loops on some browser versions.
*   **Mini Player Overrides (`mini-player.js`)**
    *   *Status:* Broken
    *   *Details:* Customizations for YouTube's native Mini-player.
    *   *Focus needed:* The script fails to attach to the mini-player iframe properly due to cross-origin or delayed loading issues.

---

## 🏗️ Minor / Auxiliary Modules (Working, but small)
*   **Auto Like (`auto-like.js`)** - Automatically likes videos after a set percentage is watched.
*   **Comment Filter (`comment-filter.js`)** - Hides comments based on generic rules.
*   **Continue Watching (`continue-watching.js`)** - Prompts to resume the last video on the Home page.
*   **Hide Metrics / Hide Thumbnails (`hide-metrics.js`, `hide-thumbnails.js`)** - Simple CSS injectors to hide views/likes/thumbnails.
*   **Redirect Home / Redirect Shorts (`redirect-home.js`, `redirect-shorts.js`)** - Redirects URLs away from Home feed or Shorts feed.
*   **Reverse Playlist (`reverse-playlist.js`)** - Simple script to play playlists backwards.
*   **Video Filters (`video-filters/`)** - Applies basic CSS `filter` properties (sepia, contrast, etc.) to the video element.
*   **Account Menu (`account-menu/`)** - Cleans up the native YouTube profile dropdown.
*   **Data API (`data-api.js`)** - Internal fetch wrapper for any YouTube API calls.

---

*Note: Update this file whenever a major feature is added, refactored, or deprecated.*
