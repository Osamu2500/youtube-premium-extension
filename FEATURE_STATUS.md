# Extension Feature Status Tracker

This document tracks the exhaustive current status of **every single feature** built within the YouTube Premium+ Extension. It is dynamically generated based on a strict code audit of the actual source files, checking for architectural compliance (BaseFeature), memory leak prevention (cleanup), and error handling.

---

## 🟢 Fully Built & Stable
These features perfectly adhere to the extension's architecture, including extending `BaseFeature`, implementing `disable()` teardown, wrapping listeners, and using error handling.

### Cinematic Mode
*   **File:** `content/features/pages/home/cinematic-mode.js`
*   **What it does:** Cinematic Mode — Netflix-style home feed overlay.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Redirect Shorts
*   **File:** `content/features/pages/home/redirect-shorts.js`
*   **What it does:** Automatically redirects Shorts URLs (`/shorts/`) to the regular YouTube video player.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Shorts Tools
*   **File:** `content/features/pages/home/shorts-tools.js`
*   **What it does:** Shorts Tools (Auto-Scroll)
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### History Redesign
*   **File:** `content/features/pages/library/history/history-redesign.js`
*   **What it does:** Feature: History Page Redesign
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Reverse Playlist
*   **File:** `content/features/pages/library/playlist/reverse-playlist.js`
*   **What it does:** Reverse Playlist Feature
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Search Redesign
*   **File:** `content/features/pages/search/search-redesign.js`
*   **What it does:** Search Redesign — Orchestrator
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Focus Mode
*   **File:** `content/features/pages/watch/focus-mode.js`
*   **What it does:** Focus Mode Feature - Reduces visual distractions and enhances concentration
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

### Zen Mode
*   **File:** `content/features/pages/watch/zen-mode.js`
*   **What it does:** Zen Mode Feature
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes

## 🔧 Needs Improvement / Architectural Violations
These features function, but contain architectural violations (leaking event listeners, raw chrome.storage, missing DOM stamps, etc.) that need to be refactored before they are considered fully stable.

### Account Menu
*   **File:** `content/features/core/global/account-menu/account-menu.js`
*   **What it does:** AccountMenu — replaces YouTube's native account dropdown with an
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Content Control
*   **File:** `content/features/core/global/content-control.js`
*   **What it does:** Content Control Module
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Data Api
*   **File:** `content/features/core/global/data-api.js`
*   **What it does:** Feature: Data API Extractor
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Hide Metrics
*   **File:** `content/features/core/global/hide-metrics.js`
*   **What it does:** Hides view counts and likes globally by applying a CSS class to the body.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Hide Playlists Podcasts
*   **File:** `content/features/core/global/hide-playlists-podcasts.js`
*   **What it does:** Hides Playlists, Podcasts, and Mixes from video feeds (Home, Search, Subs) to clean up recommendations.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Hide Thumbnails
*   **File:** `content/features/core/global/hide-thumbnails.js`
*   **What it does:** Hides video thumbnails globally by applying a CSS class, reducing visual clutter.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found


### Keyboard Shortcuts
*   **File:** `content/features/core/global/keyboard-shortcuts.js`
*   **What it does:** Keyboard Shortcuts Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found



### Night Mode
*   **File:** `content/features/core/global/night-mode.js`
*   **What it does:** Night Mode Manager
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Redirect Home
*   **File:** `content/features/core/global/redirect-home.js`
*   **What it does:** Redirects the main YouTube homepage directly to the Subscriptions feed.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Stats Visualizer
*   **File:** `content/features/core/global/stats/stats-visualizer.js`
*   **What it does:** StatsVisualizer
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Theme
*   **File:** `content/features/core/global/theme.js`
*   **What it does:** Theme Manager - Handles visual theming and content visibility features
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Header Nav
*   **File:** `content/features/core/layout/header-nav.js`
*   **What it does:** Header Navigation Manager - Creates custom navigation buttons in the header
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Layout Manager
*   **File:** `content/features/core/layout/layout-manager.js`
*   **What it does:** Layout Manager (Grid)
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Sidebar
*   **File:** `content/features/core/layout/sidebar.js`
*   **What it does:** Sidebar Manager
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Home Organizer
*   **File:** `content/features/pages/home/home-organizer.js`
*   **What it does:** Home Feed Organizer
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage, Missing DOM stamp guards

### History Tracker
*   **File:** `content/features/pages/library/history/history-tracker.js`
*   **What it does:** Feature: Watch History Tracker Dashboard
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage, Raw setTimeout polling, Missing DOM stamp guards

### Duration Calculator
*   **File:** `content/features/pages/library/playlist/duration-calculator.js`
*   **What it does:** Calculates total playlist duration and displays it in a premium UI card, including adjusted times for higher playback speeds.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw setTimeout polling, Missing DOM stamp guards

### Playlist Redesign
*   **File:** `content/features/pages/library/playlist/playlist-redesign.js`
*   **What it does:** Feature: Playlist Page Redesign (Full UI Override)
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw chrome.storage, console.* usage, Raw setTimeout polling, Missing DOM stamp guards

### Advanced Filter
*   **File:** `content/features/pages/search/advanced-filter.js`
*   **What it does:** Advanced filtering system for the home page (sub/unsub, time, duration) with a visual chips bar UI.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, console.* usage, Missing DOM stamp guards

### Context Menu
*   **File:** `content/features/pages/subscriptions/context-menu.js`
*   **What it does:** Feature: Context Menu / Quick Action
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw chrome.storage, Raw setTimeout polling, Missing DOM stamp guards

### Deck Mode
*   **File:** `content/features/pages/subscriptions/deck-mode.js`
*   **What it does:** Provides a TweetDeck-style multi-column layout for the subscriptions feed based on user-defined folders.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Missing DOM stamp guards

### Subscription Folders
*   **File:** `content/features/pages/subscriptions/subscription-folders.js`
*   **What it does:** Subscription Folders — Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw MutationObserver, console.* usage

### Comment Filter
*   **File:** `content/features/pages/watch/comment-filter.js`
*   **What it does:** Feature: Comment Spam Filter
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Missing DOM stamp guards

### Continue Watching
*   **File:** `content/features/pages/watch/continue-watching.js`
*   **What it does:** Feature: Continue Watching Label & Prompt
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw setTimeout polling

### Modes Manager
*   **File:** `content/features/pages/watch/modes-manager.js`
*   **What it does:** Modes Manager — YouTube Premium Plus
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw setTimeout polling

### Study Mode
*   **File:** `content/features/pages/watch/study-mode.js`
*   **What it does:** Study Mode Feature - Optimized playback for learning
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw chrome.storage

### Watch History
*   **File:** `content/features/pages/watch/watch-history.js`
*   **What it does:** Feature: Real-Time Playback Tracker
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage

### Watch Redesign
*   **File:** `content/features/pages/watch/watch-redesign.js`
*   **What it does:** Watch Redesign Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, console.* usage

### Ambient Mode
*   **File:** `content/features/player/ambient-mode/ambient-mode.js`
*   **What it does:** Adds a custom massive blurred ambient lighting effect around the video player by rendering the video frame at 5fps to a canvas behind the player.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage

### Audio Mode
*   **File:** `content/features/player/ambient-mode/audio-mode.js`
*   **What it does:** Audio Mode - Hide video, show audio with thumbnail overlay
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: console.* usage

### Audio Compressor
*   **File:** `content/features/player/audio-compressor.js`
*   **What it does:** Feature: Audio Compressor
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Auto Like
*   **File:** `content/features/player/auto-like.js`
*   **What it does:** Automatically likes a video once you have watched at least 50% or reached the end.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Auto Pause
*   **File:** `content/features/player/auto-pause.js`
*   **What it does:** Auto Pause Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Auto Quality
*   **File:** `content/features/player/auto-quality.js`
*   **What it does:** Auto Quality & Theater feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Bookmarks
*   **File:** `content/features/player/bookmarks.js`
*   **What it does:** Bookmarks Manager
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Global Bar
*   **File:** `content/features/player/global-bar.js`
*   **What it does:** Global Player Bar — Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw setTimeout polling, Missing DOM stamp guards

### Intentional Delay
*   **File:** `content/features/player/intentional-delay.js`
*   **What it does:** Adds a 3-second mandatory "Take a breath" overlay before playing any video to prevent impulsive watching.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Mini Player
*   **File:** `content/features/player/mini-player.js`
*   **What it does:** Mini Player Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Player Tools
*   **File:** `content/features/player/player-tools.js`
*   **What it does:** Player Tools
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Player
*   **File:** `content/features/player/player.js`
*   **What it does:** Player Enhancements Module
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw MutationObserver, Raw addEventListener, console.* usage, Missing DOM stamp guards

### Return Dislike
*   **File:** `content/features/player/return-dislike.js`
*   **What it does:** Feature: Return YouTube Dislike
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Sidebar Layout
*   **File:** `content/features/player/controls/sidebar-layout.js`
*   **What it does:** SidebarLayout Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: console.* usage

### Split Scrolling
*   **File:** `content/features/player/enhancements/split-scrolling.js`
*   **What it does:** Allows the sidebar to scroll independently of the main video, using native CSS position sticky and custom scrollbars.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage

### Sponsor Block
*   **File:** `content/features/player/sponsor-block.js`
*   **What it does:** Feature: SponsorBlock Integration
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Time Display
*   **File:** `content/features/player/time-display.js`
*   **What it does:** Time Display Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Video Controls
*   **File:** `content/features/player/video-controls/video-controls.js`
*   **What it does:** Comprehensive draggable control panel for adjusting playback speed, cinematic CSS filters (brightness, etc.), and advanced audio processing (volume boost, EQ).
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Missing DOM stamp guards

### Video Filters
*   **File:** `content/features/player/video-filters/video-filters.js`
*   **What it does:** Video Filters Feature Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: console.* usage, Raw setTimeout polling

### Video Resumer
*   **File:** `content/features/player/video-resumer.js`
*   **What it does:** Feature: Smart Video Resumer
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found

### Volume Booster
*   **File:** `content/features/player/volume-booster/volume-booster.js`
*   **What it does:** Volume Booster / 10-Band Graphic Equalizer Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, console.* usage

### Wheel Controls
*   **File:** `content/features/player/wheel-controls.js`
*   **What it does:** Feature: Mouse Wheel Controls
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: File not found


---

## 🟡 Partially Built
Core logic exists, but there are unhandled edge cases, missing features, or explicitly marked `TODO`s in the source code.


---

## 🔴 Broken / Has Bugs
Features that are structurally flawed, such as lacking a `disable()` method which guarantees memory leaks and duplicated observers when the feature is toggled off, or features that no longer function correctly due to YouTube DOM changes.

### Hide Watched
*   **File:** `src/content/features/global/modifiers/hide-watched.js`
*   **What it does:** Automatically hides or dims videos on the YouTube homepage, subscriptions feed, and channel pages that you have already watched. Uses a customizable threshold (e.g., 80% watched) to determine if a video should be hidden, relying on the native YouTube progress bar overlay.
*   **Status:** Broken / Not Working. DOM observer fails to consistently match modern YouTube view models, causing the feature to ignore dynamically loaded videos.

### Mark as Watched
*   **File:** `src/content/features/global/modifiers/mark-watched.js`
*   **What it does:** Visually badges watched videos with a clear overlay, auto-marks videos as watched when they end, and adds a hover/context menu toggle to manually mark videos as watched without having to open them.
*   **Status:** Broken / Not Working. Fails to consistently apply badges to dynamically loaded videos in modern YouTube grids.

### Multi-Select Videos
*   **File:** `src/content/features/global/modifiers/multi-select.js`
*   **What it does:** Injects checkboxes on video thumbnails allowing you to hold Shift and click to select multiple videos at once. Once selected, you can perform batch actions like adding them all to a playlist, "Watch Later", or your queue simultaneously.
*   **Status:** Broken / Not Working. Checkboxes fail to render on new YouTube grid layouts and events are inconsistently captured.

---

## 🔧 Needs Improvement
Working features that suffer from architectural problems—primarily failing to extend `BaseFeature` (relying on legacy procedural code) or missing basic `try/catch` safety nets.


---

## 📋 Planned Features
*   **AI Video Summarizer & Chat**
*   **Advanced Ad-Skipper & Auto-Muter**
*   **Floating Picture-in-Picture Comments**
*   **Transcript Search & Jump**
*   **Creator Blocklist (Global Hide)**
*   **Smart Auto-Quality by Connection Speed**
*   **Custom Video Player Themes (CSS Overrides)**
*   **Multi-Video Grid View**
*   **Audio-Only Bandwidth Saver**
*   **Native Bypass Region Blocks (Proxy Integration)**

