class WatchPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/watch/];
        
        this.state = {
            sidebar: 'default', // 'default', 'compact', 'hidden'
            viewMode: 'default', // 'default', 'cinema', 'minimal', 'zen', 'focus', 'study'
            playerActionStyle: 'premium',
            enableCustomSidebar: true
        };

        this.ROOT_SELECTORS = [
            'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
            'ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
            'ytd-watch-next-secondary-results-renderer ytd-lockup-view-model',
            'ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer'
        ];

        this.injectedButtons = false;
        this._videoElement = null;
        this._featuresInitialized = false;
        this.eventListeners = [];
    }

    onActivate() {
        this.utils.log('Watch Page Active', 'WATCH_MANAGER', 'info');
        this._cleanUpLegacyStamps();
        // NOTE: _applyDOM() is NOT called here directly.
        // The base class activate() calls applySettings() immediately after onActivate(),
        // which calls setState() → _applyDOM(). Calling it here too would cause a double DOM apply.
        this._initFeatures(); // async — will call applySettings again once features load
        this._initPlayer();   // async — waits for video element
        window.YPP.ui.manager.mount('watchPageTop', this.filterBar, 'prepend');
    }

    async _initFeatures() {
        if (this._featuresInitialized || this._featuresInitializing) return;
        this._featuresInitializing = true;
        // Use pollFor instead of setTimeout — reliable across fast and slow machines
        try {
            await this.utils.pollFor(() => window.YPP?.features?.PlayerControls, 5000, 100);
            if (window.YPP?.features?.PlayerControls) {
                this.controlsHelper = new window.YPP.features.PlayerControls(this);
                this.settingsMenuHelper = new window.YPP.features.PlayerSettingsMenu(this);
            } else {
                this.utils.log('PlayerControls feature unavailable — core player features may not load', 'WATCH_MANAGER', 'error');
            }
            this.features = {
                zenMode:    window.YPP.features.ZenMode    ? new window.YPP.features.ZenMode()    : null,
                studyMode:  window.YPP.features.StudyMode  ? new window.YPP.features.StudyMode()  : null,
                focusMode:  window.YPP.features.FocusMode  ? new window.YPP.features.FocusMode()  : null,
            };
            this._featuresInitialized = true;
            this._featuresInitializing = false;
            // Re-apply settings now that mode features are loaded and can be enabled/disabled
            if (this.isActive) this.applySettings(this.settings);
        } catch (e) {
            this.utils.log('Feature init timed out', 'WATCH_MANAGER', 'warn');
            this._featuresInitializing = false;
        }
    }


    onDeactivate() {
        this._cleanupDOM();
        this._cleanupPlayer();
        this._domApplied = false; // Reset so next activation always re-applies DOM
        
        if (this.features) {
            Object.values(this.features).forEach(feature => {
                if (feature?.disable) feature.disable();
            });
        }
    }

    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        if (!this.isActive) return;

        let newSidebar = 'default';
        let newMode = 'default';

        if (this.settings.sidebarLayout) {
            newSidebar = this.settings.sidebarLayout;
        }

        // Evaluate view modes (priority order)
        // NOTE: key is 'enableFocusMode' not 'focusMode' — must match default-settings.js
        if (this.settings.studyMode) newMode = 'study';
        else if (this.settings.enableFocusMode) newMode = 'focus';
        else if (this.settings.zenMode) newMode = 'zen';
        else if (this.settings.cinemaMode) newMode = 'cinema';
        else if (this.settings.minimalMode) newMode = 'minimal';

        this.setState({
            sidebar: newSidebar,
            viewMode: newMode,
            playerActionStyle: this.settings.playerActionStyle || 'premium'
        });
        
        // Handle specific mode feature JS logic
        if (this.features) {
            if (newMode === 'zen') this.features.zenMode?.enable();
            else this.features.zenMode?.disable();
            
            if (newMode === 'study') this.features.studyMode?.enable();
            else this.features.studyMode?.disable();
            
            if (newMode === 'focus') this.features.focusMode?.enable();
            else this.features.focusMode?.disable();
        }
    }
    setState(newState) {
        let changed = false;
        for (const [key, value] of Object.entries(newState)) {
            if (this.state[key] !== value) {
                this.state[key] = value;
                changed = true;
            }
        }
        
        // Also check if enableCustomSidebar changed
        if (this.state.enableCustomSidebar !== this.settings.enableCustomSidebar) {
            this.state.enableCustomSidebar = this.settings.enableCustomSidebar;
            changed = true;
        }
        
        // Always apply on first call after activation, or when state changed
        if (this.isActive && (changed || !this._domApplied)) {
            this._domApplied = true;
            this._applyDOM();
        }
    }

    _applyDOM() {
        const body = document.body;
        
        // 1. Reset all managed classes & Inline Styles
        const classesToRemove = [
            'ypp-sidebar-spacious', 'ypp-sidebar-expanded', 'ypp-sidebar-grid', 'ypp-sidebar-hidden',
            'ypp-cinema-mode', 'ypp-minimal-mode', 'ypp-zen-mode', 'ypp-focus-mode', 'ypp-study-mode',
            'ypp-action-style-premium', 'ypp-action-style-minimal', 'ypp-action-style-default'
        ];
        body.classList.remove(...classesToRemove);

        if (this.settings.playerActionStyle) {
            body.classList.add(`ypp-action-style-${this.settings.playerActionStyle}`);
        } else {
            body.classList.add(`ypp-action-style-premium`);
        }
        
        // Clear JS-injected inline styles from 'spacious' observer when switching modes
        this._cleanUpLegacyStamps();

        // 2. Apply Sidebar
        if (this.settings.enableCustomSidebar) {
            // Custom sidebar is ON — apply chosen layout
            if (this.state.sidebar === 'compact' || this.state.sidebar === 'default') {
                body.classList.add('ypp-sidebar-compact');
            } else if (this.state.sidebar === 'spacious') {
                body.classList.add('ypp-sidebar-spacious');
            } else if (this.state.sidebar === 'expanded') {
                body.classList.add('ypp-sidebar-expanded');
            } else if (this.state.sidebar === 'grid') {
                body.classList.add('ypp-sidebar-grid');
            }
        }
        
        if (this.state.sidebar === 'hidden' || ['zen', 'focus'].includes(this.state.viewMode)) {
            body.classList.add('ypp-sidebar-hidden'); // Force hide sidebar in extreme modes
        }

        // 3. Apply View Mode
        if (this.state.viewMode !== 'default') {
            body.classList.add(`ypp-${this.state.viewMode}-mode`);
        }

        // Emit event for isolated features (like ZenMode canvas or StudyMode timer) to start/stop
        window.dispatchEvent(new CustomEvent('ypp-watch-mode-changed', { 
            detail: { mode: this.state.viewMode }
        }));

        // Cinema Mode - Auto scroll to top of player
        if (this.state.viewMode === 'cinema') {
            const player = document.querySelector('#player-container-outer') || document.querySelector('ytd-player');
            if (player) {
                setTimeout(() => {
                    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        }
    }

    _applySidebarLayout() {
        const body = document.body;
        const layout = this.settings.sidebarLayout;

        // 1. Remove all possible layout classes to start fresh
        body.classList.remove(
            'ypp-sidebar-compact', 'ypp-sidebar-spacious', 'ypp-sidebar-expanded', 'ypp-sidebar-grid', 'ypp-sidebar-hidden',
            'ypp-theater-mode-override'
        );

        // 2. If 'hidden' or invalid, exit early
        if (!layout || layout === 'hidden') {
            if (layout === 'hidden') body.classList.add('ypp-sidebar-hidden');
            return;
        }

        // 3. Apply the layout class
        body.classList.add(`ypp-sidebar-${layout}`);

        // 4. Force default YouTube view state (prevents A/B test interference)
        // If they use expanded/grid/compact, ensure we act like the default view is present
        if (['compact', 'spacious', 'expanded', 'grid'].includes(layout)) {
            body.classList.remove('ypp-sidebar-hidden');
            
            // If in theater mode and expanded/grid is selected, force sidebar to stack below player
            // Native YouTube hides the sidebar in theater mode sometimes
            const isTheater = body.hasAttribute('theater');
            if (isTheater) {
                body.classList.add('ypp-theater-mode-override');
            }
        }
    }

    _handleTheaterModeChange(e) {
        // Only run if we're dealing with one of our custom layouts
        const layout = this.settings.sidebarLayout;
        if (['compact', 'spacious', 'expanded', 'grid'].includes(layout)) {
            if (document.body.hasAttribute('theater')) {
                document.body.classList.add('ypp-theater-mode-override');
            } else {
                document.body.classList.remove('ypp-theater-mode-override');
            }
        }
    }

    _removeSidebarLayout() {
        document.body.classList.remove(
            'ypp-sidebar-compact', 'ypp-sidebar-spacious', 'ypp-sidebar-expanded', 'ypp-sidebar-grid', 'ypp-sidebar-hidden',
            'ypp-theater-mode-override'
        );
    }

    _cleanupDOM() {
        const classesToRemove = [
            // Note: 'ypp-sidebar-spacious' is the current name — 'compact' was the old name
            'ypp-sidebar-compact', 'ypp-sidebar-spacious', 'ypp-sidebar-expanded', 'ypp-sidebar-grid', 'ypp-sidebar-hidden',
            'ypp-cinema-mode', 'ypp-minimal-mode', 'ypp-zen-mode', 'ypp-focus-mode', 'ypp-study-mode', 'ypp-theater-mode-override',
            'ypp-action-style-premium', 'ypp-action-style-minimal', 'ypp-action-style-default'
        ];
        document.body.classList.remove(...classesToRemove);
    }

    _cleanUpLegacyStamps() {
        // One-time cleanup of legacy DOM stamps left over from previous extension versions
        document.querySelectorAll('[data-ypp-processed-layout]').forEach(el => {
            el.removeAttribute('data-ypp-processed-layout');
        });

        // Clean up any legacy inline styles that might have been applied by earlier code
        document.querySelectorAll(this.ROOT_SELECTORS.join(', ')).forEach(node => {
            if (node.style) {
                node.style.removeProperty('display');
                node.style.removeProperty('margin-bottom');
            }

            const dismissible = node.querySelector('#dismissible') || node;
            if (dismissible && dismissible.style) {
                dismissible.style.removeProperty('display');
                dismissible.style.removeProperty('flex-direction');
                dismissible.style.removeProperty('width');
                dismissible.style.removeProperty('align-items');
                dismissible.style.removeProperty('gap');
            }

            const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
            if (thumbnail && thumbnail.style) {
                thumbnail.style.removeProperty('display');
                thumbnail.style.removeProperty('width');
                thumbnail.style.removeProperty('height');
                thumbnail.style.removeProperty('aspect-ratio');
                thumbnail.style.removeProperty('max-width');
                thumbnail.style.removeProperty('min-width');
                thumbnail.style.removeProperty('margin-bottom');
                thumbnail.style.removeProperty('border-radius');
                thumbnail.style.removeProperty('overflow');
                thumbnail.style.removeProperty('flex');
            }

            const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
            if (details && details.style) {
                details.style.removeProperty('display');
                details.style.removeProperty('flex-direction');
                details.style.removeProperty('flex');
                details.style.removeProperty('min-width');
                details.style.removeProperty('width');
                details.style.removeProperty('padding');
                details.style.removeProperty('align-items');
                details.style.removeProperty('gap');
            }

            const title = node.querySelector('#video-title, h3');
            if (title && title.style) {
                title.style.removeProperty('-webkit-line-clamp');
                title.style.removeProperty('max-height');
                title.style.removeProperty('white-space');
                title.style.removeProperty('overflow');
            }
        });
    }

    // ==========================================
    // PLAYER BAR INTEGRATION
    // ==========================================

    async _initPlayer() {
        const Utils = this.utils;
        if (!Utils) return;

        try {
            const elements = await Utils.pollFor(() => {
                const isShorts = window.location.pathname.startsWith('/shorts');
                if (isShorts) {
                    const video = document.querySelector('ytd-reel-video-renderer[is-active] video');
                    const controls = document.querySelector('ytd-reel-video-renderer[is-active] .overlay.ytd-reel-video-renderer');
                    if (video && controls) return { video, controls, isShorts };
                } else {
                    const video = document.querySelector('video.html5-main-video');
                    const controls = document.querySelector('.ytp-right-controls');
                    if (video && controls) return { video, controls, isShorts };
                }
                return null;
            }, 10000, 500);

            if (elements) {
                const { video, controls, isShorts } = elements;
                this._videoElement = video;
                
                // Need to ensure features are initialized before injecting controls!
                await this._initFeatures();
                
                this.injectControls(video, controls, isShorts);
                this._startMonitoring();
            }
        } catch (error) {
            Utils.log('Player initialization timed out or failed', 'WATCH_MANAGER', 'debug');
        }
    }

    _startMonitoring() {
        if (!window.YPP?.sharedObserver) return;
        
        // ── FORCE LAYOUT VIA JS ──
        // YouTube's A/B tests often use inline Polymer bindings or Shadow DOM that defeat standard CSS.
        // We MUST use JS to force the inline styles for Spacious mode.
        window.YPP.sharedObserver.register('watch_layout_spacious', this.ROOT_SELECTORS.join(', '), (elements) => {
            if (!this.isActive || !this.settings.enableCustomSidebar || this.state.sidebar !== 'spacious') {
                // If not spacious or feature is disabled, we don't apply inline styles.
                return;
            }
            
            elements.forEach(node => {
                if (node.hasAttribute('data-ypp-processed-layout')) return;
                
                // Force wrapper
                node.style.setProperty('display', 'block', 'important');
                node.style.setProperty('margin-bottom', '8px', 'important');
                node.style.setProperty('width', '100%', 'important');

                // Force Container (Row)
                const dismissible = node.querySelector('#dismissible, #content, .yt-lockup-view-model-wiz') || node;
                if (dismissible) {
                    dismissible.style.setProperty('display', 'flex', 'important');
                    dismissible.style.setProperty('flex-direction', 'row', 'important');
                    dismissible.style.setProperty('width', '100%', 'important');
                    dismissible.style.setProperty('align-items', 'flex-start', 'important');
                    dismissible.style.setProperty('gap', '8px', 'important');
                }

                // Force Thumbnail
                const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image), a:has(img)');
                if (thumbnail) {
                    thumbnail.style.setProperty('display', 'block', 'important');
                    thumbnail.style.setProperty('width', '168px', 'important');
                    thumbnail.style.setProperty('min-width', '168px', 'important');
                    thumbnail.style.setProperty('max-width', '168px', 'important');
                    thumbnail.style.setProperty('height', 'auto', 'important');
                    thumbnail.style.setProperty('aspect-ratio', '16 / 9', 'important');
                    thumbnail.style.setProperty('margin-bottom', '0', 'important');
                    thumbnail.style.setProperty('margin-right', '0', 'important');
                    thumbnail.style.setProperty('border-radius', '8px', 'important');
                    thumbnail.style.setProperty('flex', 'none', 'important');
                    thumbnail.style.setProperty('overflow', 'hidden', 'important');
                    thumbnail.style.setProperty('position', 'relative', 'important');
                }

                // Force Details
                const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
                if (details) {
                    details.style.setProperty('display', 'flex', 'important');
                    details.style.setProperty('flex-direction', 'column', 'important');
                    details.style.setProperty('flex', '1', 'important');
                    details.style.setProperty('min-width', '0', 'important');
                    details.style.setProperty('padding', '0', 'important');
                }

                // Force Title
                const title = node.querySelector('#video-title, h3');
                if (title) {
                    title.style.setProperty('-webkit-line-clamp', '2', 'important');
                    title.style.setProperty('line-clamp', '2', 'important');
                    title.style.setProperty('max-height', '3.2rem', 'important');
                    title.style.setProperty('overflow', 'hidden', 'important');
                    title.style.setProperty('font-size', '1.4rem', 'important');
                    title.style.setProperty('line-height', '1.6rem', 'important');
                }
                
                // Mark as processed so we don't spam style updates unless state changes
                node.setAttribute('data-ypp-processed-layout', 'true');
            });
        });

        window.YPP.sharedObserver.register('player_shorts', 'ytd-reel-video-renderer[is-active]:not([data-ypp-processed])', (elements) => {
            if (!this.isActive) return;
            const activeShort = elements[0];
            document.querySelectorAll('.ypp-player-controls').forEach(e => e.remove());
            const video = activeShort.querySelector('video');
            const controls = activeShort.querySelector('.overlay.ytd-reel-video-renderer');
            if (video && controls) {
                this.injectControls(video, controls, true);
                activeShort.setAttribute('data-ypp-processed', 'true');
            }
        }, true);
        
        window.YPP.sharedObserver.register('player_watch', '.ytp-right-controls:not([data-ypp-processed])', (elements) => {
            if (!this.isActive || window.location.pathname.startsWith('/shorts')) return;
            const controls = elements[0];
            const video = document.querySelector('video');
            if (video && controls) {
                this.injectControls(video, controls, false);
                controls.setAttribute('data-ypp-processed', 'true');
            }
        }, true);
    }

    injectControls(video, controls, isShorts) {
        if (isShorts) {
            const activeShort = video.closest('ytd-reel-video-renderer');
            if (activeShort && activeShort.querySelector('.ypp-player-controls')) return;
        } else {
            if (document.querySelector('.ypp-player-controls')) return;
        }

        this._applyNativeButtonStyles();
        if (this.settingsMenuHelper) {
            this.settingsMenuHelper.setupSettingsObserver(video);
        }
        this._applyNativeButtonVisibility();

        const container = document.createElement('div');
        container.className = 'ypp-player-controls' + (isShorts ? ' ypp-shorts-controls' : '');

        // Use controlsHelper to create core toggles
        if (this.controlsHelper && this.settings.enableCustomSpeed !== false && (!this.settings.pb_speed || this.settings.pb_speed === 'front')) 
            container.appendChild(this.controlsHelper.createSpeedControls(video));
            
        // Button Feature Registrations (call their createButton methods)
        const addFeatureButton = (featureKey, pbKey, overrideSettingsKey) => {
            if (this.settings[overrideSettingsKey] === false) return; // Feature disabled globally
            if (this.settings[pbKey] && this.settings[pbKey] !== 'front') return; // Hidden from front bar
            
            const feature = window.YPP.featureManager && window.YPP.featureManager.getFeature(featureKey);
            if (feature && feature.createButton) {
                const btn = feature.createButton(video);
                if (btn) container.appendChild(btn);
            }
        };

        addFeatureButton('snapshotButton', 'pb_snapshot', 'enableSnapshot');
        addFeatureButton('loopButton', 'pb_loop', 'enableLoop');
        addFeatureButton('bookmarksManager', 'pb_bookmark', 'enableBookmarks');
        addFeatureButton('volumeBoost', 'pb_volume', 'enableVolumeBoost');
        addFeatureButton('videoFilters', 'pb_cinema', 'enableCinemaFilters');

        if (this.controlsHelper && document.pictureInPictureEnabled && this.settings.enablePiP !== false && (!this.settings.pb_pip || this.settings.pb_pip === 'front')) {
            container.appendChild(this.controlsHelper.createPiPButton(video));
        }

        if (isShorts) {
            controls.appendChild(container);
        } else {
            controls.insertBefore(container, controls.firstChild);
        }
        
        this.injectedButtons = true;
    }

    _applyNativeButtonStyles() {
        let style = document.getElementById('ypp-custom-player-bar-styles');
        if (!style) {
            style = document.createElement('style');
            style.id = 'ypp-custom-player-bar-styles';
            document.head.appendChild(style);
        }

        let css = '';
        const hideMap = {
            'pb_native_play': '.ytp-play-button',
            'pb_native_next': '.ytp-next-button',
            'pb_native_mute': '.ytp-mute-button',
            'pb_native_cast': '.ytp-remote-button',
            'pb_native_autoplay': '.ytp-autonav-button, .ytp-autonav-toggle-button',
            'pb_native_cc': '.ytp-subtitles-button',
            'pb_native_miniplayer': '.ytp-miniplayer-button',
            'pb_native_theater': '.ytp-size-button',
            'pb_native_fullscreen': '.ytp-fullscreen-button'
        };

        for (const [key, selector] of Object.entries(hideMap)) {
            if (this.settings[key] && this.settings[key] !== 'front') {
                css += `${selector} { display: none !important; }\n`;
            }
        }
        style.textContent = css;
    }

    _applyNativeButtonVisibility() {
        let styleNode = document.getElementById('ypp-custom-player-bar-style-vis');
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = 'ypp-custom-player-bar-style-vis';
            document.head.appendChild(styleNode);
        }

        const hiddenSelectors = [];
        if (this.settings.pb_native_play === 'hidden') hiddenSelectors.push('.ytp-play-button');
        if (this.settings.pb_native_next === 'hidden') hiddenSelectors.push('.ytp-next-button');
        if (this.settings.pb_native_mute === 'hidden') hiddenSelectors.push('.ytp-mute-button', '.ytp-volume-area');
        if (this.settings.pb_native_cast === 'hidden') hiddenSelectors.push('button[data-tooltip-target-id="ytp-remote-button"]', '.ytp-remote-button');
        if (this.settings.pb_native_autoplay === 'hidden') hiddenSelectors.push('button[data-tooltip-target-id="ytp-autonav-toggle-button"]', 'button.ytp-button[aria-label*="Autoplay"]', '.ytp-autonav-toggle-button', '.ytp-autonav-button');
        if (this.settings.pb_native_cc === 'hidden') hiddenSelectors.push('.ytp-subtitles-button');
        if (this.settings.pb_native_miniplayer === 'hidden') hiddenSelectors.push('.ytp-miniplayer-button');
        if (this.settings.pb_native_theater === 'hidden') hiddenSelectors.push('.ytp-size-button');
        if (this.settings.pb_native_fullscreen === 'hidden') hiddenSelectors.push('.ytp-fullscreen-button');

        if (hiddenSelectors.length > 0) {
            styleNode.textContent = `${hiddenSelectors.join(', ')} { display: none !important; }`;
        } else {
            styleNode.textContent = '';
        }
    }

    _cleanupPlayer() {
        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;
        this._cleanupEvents();

        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('player_shorts');
            window.YPP.sharedObserver.unregister('player_watch');
        }
        document.querySelectorAll('.ytp-right-controls[data-ypp-processed], ytd-reel-video-renderer[data-ypp-processed]').forEach(el => el.removeAttribute('data-ypp-processed'));

        this._videoElement = null;
        if (this.settingsMenuHelper) {
            this.settingsMenuHelper.cleanupSettingsObserver();
        }
        
        const styleNode = document.getElementById('ypp-custom-player-bar-styles');
        if (styleNode) styleNode.remove();
        
        const visNode = document.getElementById('ypp-custom-player-bar-style-vis');
        if (visNode) visNode.remove();
    }

    addListener(target, event, handler, options = false) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(event, handler, options);
        if (!this.eventListeners) this.eventListeners = [];
        this.eventListeners.push({ target, event, handler, options });
    }

    _cleanupEvents() {
        if (!this.eventListeners) return;
        this.eventListeners.forEach(({ target, event, handler, options }) => {
            try {
                if (target.removeEventListener) target.removeEventListener(event, handler, options);
            } catch (e) {}
        });
        this.eventListeners = [];
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.WatchPageManager = WatchPageManager;
