// Core dependencies
import './constants.js';
import './settings-schema.js';
import './utils.js';

// Core architecture
import './core/event-bus.js';
import './core/dom-api.js';
import './core/dom-observer.js';

// UI Architecture (Phase 4)
import './ui/ui-manager.js';
import './ui/components/button.js';
import './ui/components/panel.js';

// Base feature class
import './features/base-feature.js';

// Global features
import './features/core/global/theme.js';
import './features/core/global/content-control.js';
import './features/core/global/night-mode.js';
import './features/core/global/data-api.js';
import './features/core/global/mark-watched.js';
import './features/core/global/hide-watched.js';
import './features/core/global/keyboard-shortcuts.js';
import './features/core/global/stats/stats-visualizer.js';

// Layout features
import './features/core/layout/layout-manager.js';
import './features/core/layout/header-nav.js';
import './features/core/layout/sidebar.js';

// Home page features
import './features/pages/home/home-organizer.js';
import './features/pages/home/shorts-tools.js';

// Subscription features
import './features/pages/subscriptions/subscription-folders.js';
import './features/pages/subscriptions/subscription-manager.js';
import './features/pages/subscriptions/subscriptions-ui.js';
import './features/pages/subscriptions/index.js';

// Search features
import './features/pages/search/search-redesign.js';
import './features/pages/search/advanced-filter.js';

// Library & History features
import './features/pages/library/history/history-tracker.js';
import './features/pages/library/history/history-redesign.js';
import './features/pages/library/playlist/playlist-redesign.js';
import './features/pages/library/playlist/duration-calculator.js';
import './features/pages/library/playlist/reverse-playlist.js';

// Watch page features
import './features/pages/watch/watch-history.js';
import './features/pages/watch/continue-watching.js';
import './features/pages/watch/zen-mode.js';
import './features/pages/watch/focus-mode.js';
import './features/pages/watch/study-mode.js';
import './features/pages/watch/comment-filter.js';

// Player features
import './features/player/player.js';
import './features/player/global-bar.js';
import './features/player/player-tools.js';
import './features/player/return-dislike.js';
import './features/player/mini-player.js';
import './features/player/video-filters.js';
import './features/player/volume-booster.js';
import './features/player/auto-quality.js';
import './features/player/time-display.js';
import './features/player/sponsor-block.js';
import './features/player/ambient-mode/ambient-mode.js';
import './features/player/ambient-mode/audio-mode.js';
import './features/player/video-controls/video-controls.js';
import './features/player/wheel-controls.js';
import './features/player/audio-compressor.js';
import './features/player/video-resumer.js';

// Feature Manager & Main entry
import './feature-manager.js';
import './main.js';
