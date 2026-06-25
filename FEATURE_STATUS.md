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
*   **File:** `src/content/features/shorts/modifiers/redirect-shorts.js`
*   **What it does:** Automatically redirects Shorts URLs (`/shorts/`) to the regular YouTube video player.
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

### Hide Watched
*   **File:** `src/content/features/global/ui-tweaks/hide-watched.js`
*   **What it does:** Automatically hides or dims videos on the YouTube homepage, subscriptions feed, and channel pages that you have already watched. Uses a customizable threshold (e.g., 80% watched) to determine if a video should be hidden.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes | Uses SharedObserver

### Mark as Watched
*   **File:** `src/content/features/global/behavior/mark-watched.js`
*   **What it does:** Visually badges watched videos with a clear overlay, auto-marks videos as watched when they end, and adds a hover/context menu toggle to manually mark videos as watched without having to open them.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes | Uses SharedObserver

### Multi-Select Videos
*   **File:** `src/content/features/global/behavior/multi-select.js`
*   **What it does:** Injects checkboxes on video thumbnails allowing you to hold Shift and click to select multiple videos at once. Once selected, you can perform batch actions like adding them all to a playlist, "Watch Later", or your queue simultaneously.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses `this.addListener`: Yes | Uses SharedObserver

### Hide Mixes
*   **File:** `src/content/features/global/ui-tweaks/hide-mixes.js`
*   **What it does:** Completely removes dynamically generated "Mix" playlists and shelves from search results, sidebar, and home feed.
*   **Status:** Stable. Properly extends BaseFeature, cleans up, and handles errors.
*   **Architecture Notes:** Extends BaseFeature: Yes | Cleans up: Yes | Stamps DOM: Yes | Uses SharedObserver

## 🔧 Needs Improvement / Architectural Violations
These features function, but contain architectural violations (leaking event listeners, raw chrome.storage, missing DOM stamps, etc.) that need to be refactored before they are considered fully stable.

### Account Menu
*   **File:** `src/content/features/global/account-menu/account-menu.js`
*   **What it does:** AccountMenu — replaces YouTube's native account dropdown with an
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Hide Metrics
*   **File:** `src/content/features/global/ui-tweaks/hide-metrics.js`
*   **What it does:** Hides view counts and likes globally by applying a CSS class to the body.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Keyboard Shortcuts
*   **File:** `src/content/features/global/behavior/keyboard-shortcuts.js`
*   **What it does:** Keyboard Shortcuts Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes



### Theme
*   **File:** `src/content/features/global/ui-tweaks/theme.js`
*   **What it does:** Theme Manager - Handles visual theming and content visibility features
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Header Nav
*   **File:** `src/content/features/global/layout/header-nav.js`
*   **What it does:** Header Navigation Manager - Creates custom navigation buttons in the header
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Layout Manager
*   **File:** `src/content/features/global/layout/layout-manager.js`
*   **What it does:** Layout Manager (Grid)
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

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
*   **File:** `src/content/features/player/media-effects/ambient-mode/ambient-mode.js`
*   **What it does:** Adds a custom massive blurred ambient lighting effect around the video player by rendering the video frame at 5fps to a canvas behind the player.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage

### Audio Mode
*   **File:** `src/content/features/player/media-effects/ambient-mode/audio-mode.js`
*   **What it does:** Audio Mode - Hide video, show audio with thumbnail overlay
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: console.* usage

### Audio Compressor
*   **File:** `src/content/features/player/media-effects/audio-compressor.js`
*   **What it does:** Feature: Audio Compressor
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Auto Like
*   **File:** `src/content/features/player/automation/auto-like.js`
*   **What it does:** Automatically likes a video once you have watched at least 50% or reached the end.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Auto Pause
*   **File:** `src/content/features/player/automation/auto-pause.js`
*   **What it does:** Auto Pause Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Auto Quality
*   **File:** `src/content/features/player/automation/auto-quality.js`
*   **What it does:** Auto Quality & Theater feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Bookmarks
*   **File:** `src/content/features/player/controls/bookmarks.js`
*   **What it does:** Bookmarks Manager
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Global Bar
*   **File:** `content/features/player/global-bar.js`
*   **What it does:** Global Player Bar — Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, Raw setTimeout polling, Missing DOM stamp guards

### Intentional Delay
*   **File:** `src/content/features/player/enhancements/intentional-delay.js`
*   **What it does:** Adds a 3-second mandatory "Take a breath" overlay before playing any video to prevent impulsive watching.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Player Tools
*   **File:** `src/content/features/player/controls/player-tools.js`
*   **What it does:** Player Tools
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Return Dislike
*   **File:** `src/content/features/player/enhancements/return-dislike.js`
*   **What it does:** Feature: Return YouTube Dislike
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Split Scrolling
*   **File:** `content/features/player/enhancements/split-scrolling.js`
*   **What it does:** Allows the sidebar to scroll independently of the main video, using native CSS position sticky and custom scrollbars.
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw chrome.storage

### Sponsor Block
*   **File:** `src/content/features/player/automation/sponsor-block.js`
*   **What it does:** Feature: SponsorBlock Integration
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Time Display
*   **File:** `src/content/features/player/enhancements/time-display.js`
*   **What it does:** Time Display Feature
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Video Controls
*   **File:** `src/content/features/player/controls/video-controls.js`
*   **What it does:** Comprehensive draggable control panel for adjusting playback speed, cinematic CSS filters (brightness, etc.), and advanced audio processing (volume boost, EQ).
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Missing DOM stamp guards

### Video Filters
*   **File:** `src/content/features/player/media-effects/video-filters/video-filters.js`
*   **What it does:** Video Filters Feature Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: console.* usage, Raw setTimeout polling

### Video Resumer
*   **File:** `src/content/features/player/automation/video-resumer.js`
*   **What it does:** Feature: Smart Video Resumer
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes

### Volume Booster
*   **File:** `src/content/features/player/media-effects/volume-booster/volume-booster.js`
*   **What it does:** Volume Booster / 10-Band Graphic Equalizer Orchestrator
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes | WARNINGS: Raw addEventListener, console.* usage

### Wheel Controls
*   **File:** `src/content/features/player/controls/wheel-controls.js`
*   **What it does:** Feature: Mouse Wheel Controls
*   **Status:** Needs Refactor. Contains architectural violations.
*   **Architecture Notes:** Extends BaseFeature: Yes


---

## 🟡 Partially Built
Core logic exists, but there are unhandled edge cases, missing features, or explicitly marked `TODO`s in the source code.


---

## 🔴 Broken / Has Bugs
Features that are structurally flawed, such as lacking a `disable()` method which guarantees memory leaks and duplicated observers when the feature is toggled off, or features that no longer function correctly due to YouTube DOM changes.

*(No broken features currently)*

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

