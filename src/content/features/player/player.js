/**
 * Player Enhancements Module
 * Adds useful features to the video player: Snapshot, Loop, Speed, Volume Boost, Auto Quality,
 * and a unified Cinema Filters system (presets + custom sliders + special effects).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Player = class Player extends window.YPP.features.BaseFeature {
    constructor() {
        super('Player');
        this.settings = null;
        this.isLooping = false;
        this.injectedButtons = false;
        this._boundPiP = null;
        this._videoElement = null;
        
        // Helpers
        this.controlsHelper = new window.YPP.features.PlayerControls(this);
        this.settingsMenuHelper = new window.YPP.features.PlayerSettingsMenu(this);
    }


    disable() {
        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        if (this.waitForPlayerInterval) {
            clearInterval(this.waitForPlayerInterval);
            this.waitForPlayerInterval = null;
        }

        if (this._boundPiP) {
            document.removeEventListener('visibilitychange', this._boundPiP);
            this._boundPiP = null;
        }

        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('player_shorts');
            window.YPP.sharedObserver.unregister('player_watch');
        }
        document.querySelectorAll('.ytp-right-controls[data-ypp-processed], ytd-reel-video-renderer[data-ypp-processed]').forEach(el => el.removeAttribute('data-ypp-processed'));

        this._videoElement = null;
        this.cleanupEvents();
        this.settingsMenuHelper?.cleanupSettingsObserver();
        
        const styleNode = document.getElementById('ypp-custom-player-bar-style');
        if (styleNode) styleNode.remove();
    }

    getConfigKey() { return null; }

    onUpdate() {
        const controls = document.querySelectorAll('.ypp-player-controls');
        controls.forEach(c => c.remove());
        this.injectedButtons = false;

        this.enable();
    }

    async enable() {
        const Utils = window.YPP.Utils;
        if (!Utils) return;

        // Debug logging
        if (Utils.log) {
            Utils.log('Player feature starting', 'PLAYER', 'debug');
            Utils.log(`Cinema filters enabled: ${this.settings.enableCinemaFilters}`, 'PLAYER', 'debug');
        }

        try {
            const elements = await Utils.pollFor(() => {
                const isShorts = window.location.pathname.startsWith('/shorts');
                if (isShorts) {
                    const video = document.querySelector('ytd-reel-video-renderer[is-active] video');
                    const controls = document.querySelector('ytd-reel-video-renderer[is-active] .overlay.ytd-reel-video-renderer');
                    if (video && controls) return { video, controls, isShorts };
                } else {
                    const video = document.querySelector('video');
                    const controls = document.querySelector('.ytp-right-controls');
                    if (video && controls) return { video, controls, isShorts };
                }
                return null;
            }, 10000, 500);

            if (elements) {
                const { video, controls, isShorts } = elements;
                this._videoElement = video;

                this.injectControls(video, controls, isShorts);

                if (this.settings.autoPiP) {
                    this.handleAutoPiP(video);
                }
                
                this._startMonitoring();

            } else {
                if (Utils.log) {
                    Utils.log('Player elements not found (video or controls)', 'PLAYER', 'debug');
                }
            }
        } catch (error) {
            Utils.log('Player initialization timed out or failed', 'PLAYER', 'debug');
            if (Utils.log) {
                Utils.log(`Error: ${error.message}`, 'PLAYER', 'debug');
            }
        }
    }

    _startMonitoring() {
        if (!window.YPP?.sharedObserver) return;
        
        window.YPP.sharedObserver.register('player_shorts', 'ytd-reel-video-renderer[is-active]:not([data-ypp-processed])', (elements) => {
            if (!this.isEnabled) return;
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
            if (!this.isEnabled || window.location.pathname.startsWith('/shorts')) return;
            const controls = elements[0];
            const video = document.querySelector('video');
            if (video && controls) {
                this.injectControls(video, controls, false);
                controls.setAttribute('data-ypp-processed', 'true');
            }
        }, true);
    }

    onPageChange(url) {
        if (!this.isEnabled) return;

        // Always remove stale controls when navigating
        const stale = document.querySelectorAll('.ypp-player-controls');
        stale.forEach(e => e.remove());
        document.querySelectorAll('.ytp-right-controls[data-ypp-processed], ytd-reel-video-renderer[data-ypp-processed]').forEach(el => el.removeAttribute('data-ypp-processed'));
        this.injectedButtons = false;

        this.settingsMenuHelper?.cleanupSettingsObserver();
        this._applyNativeButtonStyles();

        if (!url.includes('/watch') && !url.includes('/shorts')) {
            return;
        }
        
        // Re-inject on navigation
        this.enable();
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
            'pb_native_autoplay': '.ytp-autoplay-button',
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


    handleAutoPiP(video) {
        if (this._boundPiP) return;
        const handleVisibility = async () => {
            if (document.hidden && !video.paused) {
                if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
                    try { await video.requestPictureInPicture(); } catch(e) {}
                }
            } else if (!document.hidden && document.pictureInPictureElement) {
                try { await document.exitPictureInPicture(); } catch(e) {}
            }
        };
        this._boundPiP = handleVisibility;
        this.addListener(document, 'visibilitychange', handleVisibility);
    }

    injectControls(video, controls, isShorts) {
        if (isShorts) {
            const activeShort = video.closest('ytd-reel-video-renderer');
            if (activeShort && activeShort.querySelector('.ypp-player-controls')) return;
        } else {
            if (document.querySelector('.ypp-player-controls')) return;
        }

        this._applyNativeButtonStyles();
        this.settingsMenuHelper.setupSettingsObserver(video);
        this._applyNativeButtonVisibility();

        const container = document.createElement('div');
        container.className = 'ypp-player-controls' + (isShorts ? ' ypp-shorts-controls' : '');

        // Only append if set to "front"
        if (this.settings.enableCustomSpeed !== false && (!this.settings.pb_speed || this.settings.pb_speed === 'front')) 
            container.appendChild(this.controlsHelper.createSpeedControls(video));
            
        if (this.settings.enableSnapshot !== false && (!this.settings.pb_snapshot || this.settings.pb_snapshot === 'front')) 
            container.appendChild(this.controlsHelper.createSnapshotButton(video));
            
        if (this.settings.enableLoop !== false && (!this.settings.pb_loop || this.settings.pb_loop === 'front')) 
            container.appendChild(this.controlsHelper.createLoopButton(video));

        if (document.pictureInPictureEnabled && this.settings.enablePiP !== false && (!this.settings.pb_pip || this.settings.pb_pip === 'front')) {
            container.appendChild(this.controlsHelper.createPiPButton(video));
        }

        // Volume Booster button
        if (this.settings.enableVolumeBoost !== false && (!this.settings.pb_volume || this.settings.pb_volume === 'front')) {
            const volumeFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('volumeBoost');
            if (volumeFeature && volumeFeature.createButton) {
                container.appendChild(volumeFeature.createButton(video));
            }
        }

        // Cinema Filters
        if (this.settings.enableCinemaFilters !== false && (!this.settings.pb_cinema || this.settings.pb_cinema === 'front')) {
            const filterFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature && filterFeature.createButton) {
                container.appendChild(filterFeature.createButton(video));
            }
        }

        if (isShorts) {
            controls.appendChild(container); // Add to end of overlay
        } else {
            controls.insertBefore(container, controls.firstChild); // Add to start of right controls
        }
        
        this.injectedButtons = true;
    }

    _applyNativeButtonVisibility() {
        let styleNode = document.getElementById('ypp-custom-player-bar-style');
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = 'ypp-custom-player-bar-style';
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

};
