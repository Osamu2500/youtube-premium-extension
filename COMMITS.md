# Commit History & Change Tracker

This file documents every single commit and the detailed changes made in each, ensuring a granular history of architectural, visual, and performance modifications.

## [2026-06-07] [Commit: 0217396] - Feature Status Tracker Audit
### Refactored
- Automatically parsed and rewrote `FEATURE_STATUS.md` to accurately reflect the architectural compliance of all features based on deep-audit checklists (checking for raw `addEventListener`, `MutationObserver`, `chrome.storage`, and missing DOM stamps). Many features were moved from 'Stable' to 'Needs Refactor / Unstable'.


## [2026-06-07] [Commit: c918cee] - Cleanup Temporary Files
### Removed
- Deleted legacy temporary files and folders (`cinematic temp/`, `scratch_native_css.css`, `scratch_native_js.js`, `structure.txt`) from the project root to keep the workspace clean.


## [2026-06-07] [Commit: 7baa0c6] - Shorts Fixes & Deep Architecture Audit
### Added
- **Shorts Player Bar:** Injected the custom player control bar (volume booster, filters, pip, screenshot, speed, loop) directly into the Shorts player.
- **Shorts Auto-Scroll:** Implemented functionality to auto-scroll to the next short when the current video finishes.

### Fixed
- **Shorts UI Black Bars:** Reverted an edge-to-edge layout that was causing black bars and layout breaking on desktop shorts; applied rounded borders for a cleaner look.
- **Cinematic Mode Leaks (`styles.css`):** Scoped default card overrides with `:not(.cinematic-home)` to prevent them from breaking the cinematic hero layout.
- **Scrollbar Loss:** Replaced global `overflow: hidden !important` with `overflow-x: hidden` to fix disappearing vertical scrollbars.
- **Memory Leaks:** Replaced raw `addEventListener` calls with `this.addListener()` in `mark-watched.js`, `shorts-tools.js`, and `redirect-shorts.js` for clean event teardown.

### Refactored & Optimized
- **O(N²) Thrashing Bug (`mark-watched.js`):** Implemented `data-ypp-processed` DOM stamping to ensure the script operates at O(1) time and avoids massive CPU spikes when scrolling the homepage.
- **Storage Abstraction:** Migrated `mark-watched.js` from `chrome.storage.local` to the standard `window.YPP.StorageManager`.
- **Animation Performance (`styles.css`):** Migrated `.ytp-chrome-bottom` transitions from layout-triggering properties (`width`, `bottom`) to GPU-accelerated ones (`transform`, `opacity`).
- **Control Bar Architecture (`player.js`):** Overhauled `player.js` to natively detect and render within either the standard watch player or the active Shorts player dynamically.
