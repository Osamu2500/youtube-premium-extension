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
import './features/global/modifiers/grid-animator.js';
import './features/global/modifiers/toggles/base-toggle-feature.js';
import './features/global/modifiers/toggles/clean-mix-urls.js';
import './features/global/modifiers/toggles/hide-comments.js';
import './features/global/modifiers/toggles/hide-sidebar.js';
import './features/global/modifiers/toggles/hide-endscreens.js';
import './features/global/modifiers/toggles/hide-cards.js';
import './features/global/modifiers/toggles/hide-merch.js';
import './features/global/modifiers/toggles/hide-promos.js';
import './features/global/modifiers/toggles/hide-annotations.js';
import './features/global/modifiers/toggles/hide-related.js';
import './features/global/modifiers/toggles/hide-feed.js';
import './features/global/modifiers/toggles/hide-trending.js';
import './features/global/modifiers/toggles/aggressive-shorts-block.js';
import './features/global/modifiers/toggles/hide-voice-search.js';
import './features/global/modifiers/toggles/hide-playlists.js';
import './features/global/modifiers/toggles/hide-podcasts.js';
import './features/global/modifiers/toggles/hide-mixes.js';
import './features/global/modifiers/toggles/hide-posts.js';
import './features/global/modifiers/toggles/hide-explore-topics.js';
import './features/global/modifiers/toggles/hide-livechat.js';
import './features/global/modifiers/toggles/hide-fundraiser.js';
import './features/global/modifiers/hide-metrics.js';
import './features/global/modifiers/full-video-titles.js';
import './features/global/modifiers/square-corners.js';
import './features/global/modifiers/toggles/animations.js';
import './features/global/modifiers/toggles/hide-scrollbar.js';
import './features/global/modifiers/toggles/custom-scrollbar.js';
import './features/global/modifiers/toggles/grayscale-thumbs.js';
import './features/global/modifiers/screen-filters.js';

import './features/global/modifiers/watched-store.js';
import './features/global/modifiers/mark-watched.js';
import './features/global/modifiers/multi-select.js';
import './features/global/modifiers/multi-select.css';
import './features/global/modifiers/hide-thumbnails.js';
import './features/global/modifiers/redirect-home.js';
import './features/global/modifiers/hide-watched.js';
import './features/global/modifiers/keyboard-shortcuts.js';
import './features/global/modifiers/duration-filter.js';
import './features/global/modifiers/blocklist-filter.js';


// Layout features
import './features/global/layout/layout-manager.js';
import './features/global/layout/auto-scale-grid.js';
import './features/global/layout/header-nav.js';

// Home page features
import './features/pages/home/home-organizer.js';
import './features/pages/home/cinematic-mode.js';

// Shorts features
import './features/shorts/modifiers/hide-shorts.js';
import './features/shorts/modifiers/redirect-shorts.js';
import './features/shorts/modifiers/stop-looping.js';
import './features/shorts/enhancements/auto-scroll.js';
import './features/shorts/enhancements/volume-normalizer.js';
import './features/shorts/ui/hide-interaction-bar.js';

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
import './features/pages/search/clean-search.js';
import './features/pages/search/hide-search-shelves.js';
import './features/pages/search/hide-channel-cards.js';


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
import './features/pages/watch/distraction-free-base.js';
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
import './features/player/player.js';
import './features/player/filter-presets.js';
import './features/player/global-bar-ui.js';
import './features/player/global-bar.js';
import './features/player/controls/player-tools.js';
import './features/player/automation/auto-like.js';
import './features/player/controls/bookmarks.js';
import './features/player/enhancements/intentional-delay.js';
import './features/player/enhancements/return-dislike.js';
import './features/player/enhancements/video-speed-controller.js';
import './features/player/enhancements/audio-eq.js';
import './features/player/automation/auto-transcript.js';
import './features/player/automation/stats-for-nerds.js';
import './features/player/automation/mini-player-scroll.js';
import './features/player/enhancements/vsc-audio-support.js';
import './features/player/enhancements/vsc-hide-by-default.js';
import './features/player/enhancements/vsc-force-speed.js';
import './features/player/enhancements/vsc-remember-speed.js';

import './features/player/controls/floating-player.js';
import './features/player/video-filters/index.js';
import './features/player/volume-booster/index.js';
import './features/player/automation/auto-quality.js';
import './features/player/enhancements/time-display.js';
import './features/player/automation/sponsor-block.js';
import './features/player/automation/ad-skipper.js';
import './features/player/ambient-mode/ambient-mode.js';
import './features/player/ambient-mode/audio-mode.js';
import './features/player/video-controls/video-controls.js';
import './features/player/video-controls/classic-progress-bar.js';
import './features/player/controls/wheel-controls.js';
import './features/player/enhancements/audio-compressor.js';
import './features/player/automation/video-resumer.js';
import './features/player/automation/auto-pause.js';
import './features/player/automation/auto-cinema.js';
import './features/player/automation/auto-pip.js';
import './features/player/controls/sidebar-layout.js';

// Feature Manager & Main entry
import './core/feature-manager.js';
import './main.js';
