// Core dependencies
import './config/constants.js';
import './config/settings-schema.js';
import './core/error-handler.js';
import './core/element-cache.js';
import './config/utils.js';

import './core/event-bus.js';
import './core/dom-api.js';
import './core/dom-observer.js';
import './core/storage-manager.js';

// CSS Imports
import './features/global/core-styles.css';
import './features/global/layout/grid-layout.css';
import './features/player/player.css';
import './features/global/layout/header-ast.css';
import './features/global/layout/sidebar-ast.css';
import './features/pages/watch/comments.css';
import './features/pages/search/search-ast.css';
import './features/pages/library/playlist/playlist-ast.css';
import './features/pages/library/history/history-ast.css';
import './features/pages/subscriptions/subscriptions-ast.css';
import './features/pages/home/home-ast.css';
import './features/shorts/shorts-ast.css';
import './features/global/layout/header-nav.css';
import './features/pages/home/cards.css';

// Managers (Phase 4.5)
import './core/managers/hotkeys-manager.js';
import './core/managers/base-page-manager.js';
import './core/managers/global-layout-manager.js';
import './core/managers/home-page-manager.js';
import './core/managers/subs-page-manager.js';
import './core/managers/search-page-manager.js';
import './core/managers/watch-page-manager.js';
import './core/managers/thumbnail-color-manager.js';

// UI Architecture (Phase 4)
import './ui/ui-manager.js';
import './ui/components/button.js';
import './ui/components/panel.js';

// Base feature class
import './features/base-feature.js';
import './features/global/filters/base-filter-feature.js';

import './features/player/enhancements/split-scrolling.js';

// Global features
import './features/global/ui-tweaks/theme.js';
import './features/global/account-menu/index.js';
import './features/global/ui-tweaks/grid-animator.js';
// Toggles handled by GlobalLayoutManager
import './features/global/ui-tweaks/screen-filters.js';

import './features/global/behavior/watched-store.js';
import './features/global/behavior/mark-watched.js';
import './features/global/behavior/multi-select.js';
import './features/global/ui-tweaks/multi-select.css';

import './features/global/ui-tweaks/hide-watched.js';
import './features/global/ui-tweaks/hide-mixes.js';
import './features/global/ui-tweaks/hide-metrics.js';
import './features/global/behavior/keyboard-shortcuts.js';
import './features/global/filters/duration-filter.js';
import './features/global/filters/blocklist-filter.js';
import './features/global/ui-tweaks/full-video-titles.js';


// Layout features
import './features/global/layout/auto-scale-grid.js';
import './features/global/layout/header-nav.js';
import './features/global/layout/layout-manager.js';

// Home page features
import './features/pages/home/home-organizer.js';
import './features/pages/home/cinematic-mode.js';

// Shorts features
import './features/shorts/modifiers/hide-shorts.js';
import './features/shorts/modifiers/redirect-shorts.js';
import './features/shorts/modifiers/stop-looping.js';
import './features/shorts/enhancements/auto-scroll.js';
import './features/shorts/enhancements/volume-normalizer.js';

// Subscription features
import './features/pages/subscriptions/folder-storage.js';
import './features/pages/subscriptions/folder-ui.js';
import './features/pages/subscriptions/context-menu.js';
import './features/pages/subscriptions/subscription-folders.js';
import './features/pages/subscriptions/subscription-manager.js';
import './features/pages/subscriptions/subscriptions-ui/subscriptions-ui.js';
import './features/pages/subscriptions/deck-mode.js';
import './features/pages/subscriptions/index.js';
import './features/pages/subscriptions/filter-bar.js';
import './features/pages/subscriptions/channel-health.js';
import './features/pages/subscriptions/group-sidebar.js';

// Layout features
import './features/global/layout/channel-columns.js';
import './features/global/layout/feed-grid-columns.js';

// Search features
import './features/pages/search/search-view-mode.js';
import './features/pages/search/search-observer.js';
import './features/pages/search/search-filter.js';
import './features/pages/search/search-redesign.js';


// Library & History features
import './features/pages/library/history/history-tracker.js';
import './features/pages/library/history/history-redesign.js';
import './features/pages/library/playlist/playlist-redesign.js';
import './features/pages/library/playlist/duration-calculator.js';
import './features/pages/library/playlist/reverse-playlist.js';

// Watch page features
import './features/pages/watch/watch-history.js';
import './features/pages/watch/watch-time-alert.js';
import './features/pages/watch/watch-time-limit.js';
import './features/pages/watch/continue-watching.js';
import './features/pages/watch/zen-mode.js';
import './features/pages/watch/focus-mode.js';
import './features/pages/watch/study-mode.js';
import './features/pages/watch/comment-filter.js';
import './features/pages/watch/watch-redesign.js';

// Player features
import './features/player/player-controls.js';
import './features/player/controls/snapshot-button.js';
import './features/player/controls/loop-button.js';
import './features/player/player-settings-menu.js';
import './features/player/filter-presets.js';
import './features/player/global-bar-ui.js';
import './features/player/global-bar.js';
import './features/player/controls/player-tools.js';
import './features/player/automation/auto-like.js';
import './features/player/controls/bookmarks.js';
import './features/player/enhancements/intentional-delay.js';
import './features/player/enhancements/return-dislike.js';

import './features/player/enhancements/video-speed-controller.js';
import './features/player/media-effects/audio-eq.js';
import './features/player/automation/auto-transcript.js';
import './features/player/automation/stats-for-nerds.js';
import './features/player/automation/mini-player-scroll.js';
import './features/player/enhancements/vsc-audio-support.js';
import './features/player/enhancements/vsc-hide-by-default.js';
import './features/player/enhancements/vsc-force-speed.js';
import './features/player/enhancements/vsc-remember-speed.js';

import './features/player/controls/floating-player.js';
import './features/player/media-effects/video-filters/index.js';
import './features/player/media-effects/volume-booster/index.js';
import './features/player/automation/auto-quality.js';
import './features/player/enhancements/time-display.js';
import './features/player/automation/sponsor-block.js';
import './features/player/automation/ad-skipper.js';
import './features/player/media-effects/ambient-mode/ambient-mode.js';
import './features/player/media-effects/ambient-mode/audio-mode.js';
import './features/player/controls/video-controls.js';
import './features/player/controls/classic-progress-bar.js';
import './features/player/controls/wheel-controls.js';
import './features/player/media-effects/audio-compressor.js';
import './features/player/automation/video-resumer.js';
import './features/player/automation/auto-pause.js';
import './features/player/automation/auto-cinema.js';
import './features/player/automation/auto-pip.js';
import './features/player/controls/sidebar-layout.css';

// Feature Manager & Main entry
import './core/feature-manager.js';
import './main.js';
