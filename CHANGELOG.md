# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-04-01

### Added

- **Customization Suite**: Comprehensive control over YouTube's visual design.
  - **Typography**: Change font families (Inter, System UI, Monospace) and scale font size.
  - **Layout Density**: Toggle between Compact, Comfortable, and Spacious layouts.
  - **Accent Colors**: Custom color picker to replace YouTube's default red accent globally.
  - **Card Styles**: Choose between Flat, Elevated, and Glassmorphic card designs.
  - **Animations & Motion**: Options to disable animations or use reduced motion.
  - **Interface Tuning**: Sliders for Thumbnail Border Radius and Sidebar Opacity.
- **Enhanced Cinema Filters**: Added new artistic presets including Cyberpunk, Matrix, Vaporwave, Sunset, and Glitch.
- **Granular Filter Adjustments**: Added custom sliders for Sepia, Grayscale, and Invert alongside existing Brightness, Contrast, and Saturation settings.
- **Video Player UI Redesign**: Modernized player bar, progress bar containment, and controls UI within the YouTube player.
- **CRT Display Effect**: Integrated authentic retro scanline and CRT curvature effects to the video player.

### Improved

- **Popup UI**: Fully modernized and redesigned extension popup with pill selectors, color swatches, range sliders, and real-time previews.
- **Architecture**: Migrated settings storage to a robust, scalable, and centralized schema validation system (`settings-schema.js`).
- **Dynamic Theming Engine**: Enhanced `theme.js` to parse customization settings and inject dynamic CSS custom properties (`--ypp-*`) efficiently into the DOM.
- **Filter Performance**: Merged Video Filters and Cinema Filters systems for optimal performance and unified control.

## [1.0.0] - 2026-02-15

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
