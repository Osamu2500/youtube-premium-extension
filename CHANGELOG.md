# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-15

### Added

- **Premium UI**: Complete Glassmorphism redesign for Popup and Content.
- **Zen Mode**: Distraction-free watching with Theater Mode auto-switch and Ambient Glow.
- **Search Redesign**: 4x4 Grid layout for search results, hiding Shorts and "People also watched".
- **Focus Mode**: Global toggle to hide comments, suggestions, and end screens.
- **Player Enhancements**:
  - Auto-Quality (1080p+).
  - Custom Playback Speed.
  - Snapshot Tool.
  - Loop Button.
  - Picture-in-Picture.
- **Navigation**: Custom header buttons (Trending, Subscriptions, etc.) replacing the Sidebar.
- **Theme Engine**: Multiple themes (Ocean, Sunset, Midnight, etc.) with persistent storage.

### Changed

- Refactored entire codebase to modular architecture (`src/content/features/`).
- Optimized `styles.css` with CSS variables for theming and Z-index layering.
- Improved `FeatureManager` for reliable feature toggling and error handling.
