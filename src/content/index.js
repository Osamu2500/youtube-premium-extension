// Core dependencies
import './config/constants.js';
import './config/settings-schema.js';
import './core/error-handler.js';
import './core/element-cache.js';
import './config/utils.js';

import './core/event-bus.js';
import './core/dom-api.js';
import './core/dom-observer.js';

// UI Architecture (Phase 4)
import './ui/ui-manager.js';
import './ui/components/button.js';
import './ui/components/panel.js';

// Base feature class
import './features/base-feature.js';

import './features/player/enhancements/split-scrolling.js';

// Global features
import './features/global/modifiers/theme.js';
import './features/global/modifiers/account-menu/index.js';
import './features/global/modifiers/content-control.js';
import './features/global/modifiers/hide-playlists-podcasts.js';
import './features/global/modifiers/hide-metrics.js';
import './features/global/modifiers/night-mode.js';
import './features/global/modifiers/data-api.js';
import './features/global/modifiers/mark-watched.js';
import './features/global/modifiers/multi-select.js';
import './features/global/modifiers/hide-thumbnails.js';
import './features/global/modifiers/redirect-home.js';
import './features/global/modifiers/hide-watched.js';
import './features/global/modifiers/keyboard-shortcuts.js';
import './features/global/modifiers/stats/stats-visualizer.js';

// Layout features
import './features/global/layout/layout-manager.js';
import './features/global/layout/header-nav.js';
import './features/global/layout/sidebar.js';

// Home page features
import './features/pages/home/home-organizer.js';
import './features/pages/home/shorts-tools.js';
import './features/pages/home/redirect-shorts.js';
import './features/pages/home/cinematic-mode.js';

// Subscription features
import './features/pages/subscriptions/folder-storage.js';
import './features/pages/subscriptions/folder-ui.js';
import './features/pages/subscriptions/context-menu.js';
import './features/pages/subscriptions/subscription-folders.js';
import './features/pages/subscriptions/subscription-manager.js';
import './features/pages/subscriptions/subscriptions-ui/subscriptions-ui.js';
import './features/pages/subscriptions/deck-mode.js';
import './features/pages/subscriptions/index.js';

// Search features
import './features/pages/search/search-view-mode.js';
import './features/pages/search/search-observer.js';
import './features/pages/search/search-filter.js';
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
import './features/pages/watch/watch-redesign.js';

// Player features
import './features/player/player.js';
import './features/player/filter-presets.js';
import './features/player/global-bar-ui.js';
import './features/player/global-bar.js';
import './features/player/controls/player-tools.js';
import './features/player/automation/auto-like.js';
import './features/player/enhancements/intentional-delay.js';
import './features/player/enhancements/return-dislike.js';
import './features/player/controls/mini-player.js';
import './features/player/video-filters/index.js';
import './features/player/volume-booster/index.js';
import './features/player/automation/auto-quality.js';
import './features/player/enhancements/time-display.js';
import './features/player/automation/sponsor-block.js';
import './features/player/automation/hide-sponsorblock-icons.js';
import './features/player/ambient-mode/ambient-mode.js';
import './features/player/ambient-mode/audio-mode.js';
import './features/player/video-controls/video-controls.js';
import './features/player/controls/wheel-controls.js';
import './features/player/enhancements/audio-compressor.js';
import './features/player/automation/video-resumer.js';
import './features/player/automation/auto-pause.js';
import './features/player/controls/sidebar-layout.js';

// Feature Manager & Main entry
import './core/feature-manager.js';
import './main.js';
