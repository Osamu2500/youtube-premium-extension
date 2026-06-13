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


    handleNativePiPVisibility(video) {
        // Native PiP events are handled natively, but we might want to track state here later.
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
            
        if (this.settings.enableSnapshot !== false && (!this.settings.pb_snapshot || this.settings.pb_snapshot === 'front')) {
            const snapFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('snapshotButton');
            if (snapFeature && snapFeature.createButton) {
                container.appendChild(snapFeature.createButton(video));
            }
        }
            
        if (this.settings.enableLoop !== false && (!this.settings.pb_loop || this.settings.pb_loop === 'front')) {
            const loopFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('loopButton');
            if (loopFeature && loopFeature.createButton) {
                container.appendChild(loopFeature.createButton(video));
            }
        }

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

        // New Toggle-Based Features
        if (this.settings.pb_autoPause === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Auto Pause', 'autoPause', this.settings.autoPause));
        }
        if (this.settings.pb_autoLike === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Auto Like', 'autoLike', this.settings.autoLike));
        }
        if (this.settings.pb_videoResumer === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Video Resume', 'videoResumer', this.settings.videoResumer));
        }
        if (this.settings.pb_intentionalDelay === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.53-14.39zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Video Delay', 'intentionalDelay', this.settings.intentionalDelay));
        }
        if (this.settings.pb_audioCompressor === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Audio Compressor', 'audioCompressor', this.settings.audioCompressor));
        }
        if (this.settings.pb_durationFilter === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>`;
            container.appendChild(this.controlsHelper.createGenericToggleButton(icon, 'Duration Filter', 'durationFilter', this.settings.durationFilter));
        }
        if (this.settings.pb_autoQuality === 'front') {
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
            container.appendChild(this.controlsHelper.createButton(icon, 'Auto Quality (configure in popup)', () => {
                alert("Please configure Auto Quality in the YouTube Premium Plus extension popup.");
            }));
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
