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

        this._cleanupSettingsObserver();
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
        this._setupSettingsObserver(video);
        this._applyNativeButtonVisibility();

        const container = document.createElement('div');
        container.className = 'ypp-player-controls' + (isShorts ? ' ypp-shorts-controls' : '');

        // Only append if set to "front"
        if (this.settings.enableCustomSpeed !== false && (!this.settings.pb_speed || this.settings.pb_speed === 'front')) 
            container.appendChild(this._createSpeedControls(video));
            
        if (this.settings.enableSnapshot !== false && (!this.settings.pb_snapshot || this.settings.pb_snapshot === 'front')) 
            container.appendChild(this._createSnapshotButton(video));
            
        if (this.settings.enableLoop !== false && (!this.settings.pb_loop || this.settings.pb_loop === 'front')) 
            container.appendChild(this._createLoopButton(video));

        if (document.pictureInPictureEnabled && this.settings.enablePiP !== false && (!this.settings.pb_pip || this.settings.pb_pip === 'front')) {
            container.appendChild(this._createPiPButton(video));
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

    _setupSettingsObserver(video) {
        this._cleanupSettingsObserver();
        
        const settingsMenu = document.querySelector('.ytp-settings-menu');
        if (!settingsMenu) return;

        // Watch for the menu to open and panels to render
        this._settingsObserver = new MutationObserver(() => {
            if (settingsMenu.style.display !== 'none') {
                this._injectSettingsMenuItems(settingsMenu, video);
            }
        });

        this._settingsObserver.observe(settingsMenu, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    }

    _cleanupSettingsObserver() {
        if (this._settingsObserver) {
            this._settingsObserver.disconnect();
            this._settingsObserver = null;
        }
    }

    _createSettingsMenuItem(label, iconContent, onClick) {
        const item = document.createElement('div');
        item.className = 'ytp-menuitem ypp-custom-menuitem';
        item.setAttribute('role', 'menuitem');
        item.setAttribute('tabindex', '0');
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'ytp-menuitem-icon';
        iconDiv.innerHTML = iconContent || '<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="4"/></svg>';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'ytp-menuitem-label';
        labelDiv.textContent = label;
        
        item.appendChild(iconDiv);
        item.appendChild(labelDiv);
        
        this.addListener(item, 'click', (e) => {
            // Click natively, then optionally close settings menu
            onClick(e);
            const closeBtn = document.querySelector('.ytp-settings-button');
            if (closeBtn) closeBtn.click();
        });
        
        return item;
    }

    _injectSettingsMenuItems(menuElement, video) {
        // Find the main panel menu
        const panelMenu = menuElement.querySelector('.ytp-panel:not([style*="display: none"]) .ytp-panel-menu');
        if (!panelMenu) return;

        // Prevent infinite injection
        if (panelMenu.querySelector('.ypp-custom-menuitem')) return;
        
        // Don't inject if it's a submenu (like Quality or Speed)
        // Usually the root panel has a specific class or we can check if it contains standard items
        if (!panelMenu.querySelector('.ytp-menuitem-label') || 
            panelMenu.closest('.ytp-panel').style.display === 'none') {
            return;
        }
        
        // Wait, root menu has a div with no header. Submenus have a header (.ytp-panel-header)
        const isSubMenu = !!panelMenu.closest('.ytp-panel').querySelector('.ytp-panel-header');
        if (isSubMenu) return;

        // Add separator if we are going to add items
        let addedAny = false;
        const _addSeparator = () => {
            if (addedAny) return;
            const sep = document.createElement('div');
            sep.className = 'ypp-custom-menuitem ypp-menuitem-separator';
            sep.style.cssText = 'height: 1px; background-color: rgba(255,255,255,0.2); margin: 6px 0;';
            panelMenu.appendChild(sep);
            addedAny = true;
        };

        // Ghost Clicks for Native Items
        const nativeBackItems = [
            { id: 'pb_native_play', selector: '.ytp-play-button', label: 'Play/Pause' },
            { id: 'pb_native_next', selector: '.ytp-next-button', label: 'Next Video' },
            { id: 'pb_native_mute', selector: '.ytp-mute-button', label: 'Mute/Unmute' },
            { id: 'pb_native_cast', selector: '.ytp-remote-button', label: 'Cast to TV' },
            { id: 'pb_native_autoplay', selector: '.ytp-autoplay-button', label: 'Autoplay' },
            { id: 'pb_native_cc', selector: '.ytp-subtitles-button', label: 'Subtitles/CC' },
            { id: 'pb_native_miniplayer', selector: '.ytp-miniplayer-button', label: 'Miniplayer' },
            { id: 'pb_native_theater', selector: '.ytp-size-button', label: 'Theater Mode' },
            { id: 'pb_native_fullscreen', selector: '.ytp-fullscreen-button', label: 'Fullscreen' }
        ];

        for (const item of nativeBackItems) {
            if (this.settings[item.id] === 'back') {
                const targetBtn = document.querySelector(item.selector);
                if (targetBtn) {
                    _addSeparator();
                    // We extract the inner SVG from the native button to use as the menu icon
                    const iconSvg = targetBtn.querySelector('svg')?.outerHTML || '';
                    panelMenu.appendChild(this._createSettingsMenuItem(item.label, iconSvg, () => targetBtn.click()));
                }
            }
        }

        // Custom Extension Items
        if (this.settings.pb_speed === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M5 4l15 8-15 8V4z"/></svg>`;
            panelMenu.appendChild(this._createSettingsMenuItem('Custom Speed', icon, () => {
                // To show speed controls, we can just change playback rate to next step, or open a generic panel.
                // Let's just cycle speeds for simplicity.
                const rates = [1, 1.5, 2, 3];
                const current = video.playbackRate;
                let nextIdx = rates.indexOf(current) + 1;
                if (nextIdx >= rates.length) nextIdx = 0;
                video.playbackRate = rates[nextIdx];
            }));
        }
        if (this.settings.pb_snapshot === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
            panelMenu.appendChild(this._createSettingsMenuItem('Take Snapshot', icon, () => this.takeSnapshot(video)));
        }
        if (this.settings.pb_loop === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
            panelMenu.appendChild(this._createSettingsMenuItem('Loop Video', icon, () => { video.loop = !video.loop; }));
        }
        if (this.settings.pb_pip === 'back' && document.pictureInPictureEnabled) {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
            panelMenu.appendChild(this._createSettingsMenuItem('Picture-in-Picture', icon, async () => {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            }));
        }
        if (this.settings.enableVolumeBoost && this.settings.pb_volume === 'back') {
            _addSeparator();
            const volumeFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('volumeBoost');
            if (volumeFeature) {
                const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/></svg>`;
                panelMenu.appendChild(this._createSettingsMenuItem('Volume Booster', icon, (e) => {
                    if (window.YPP.features.VolumeBoosterUI) {
                        window.YPP.features.VolumeBoosterUI.toggleEQPanel(volumeFeature, video, e.target);
                    }
                }));
            }
        }
        if (this.settings.enableCinemaFilters && this.settings.pb_cinema === 'back') {
            _addSeparator();
            const filterFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature) {
                const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`;
                panelMenu.appendChild(this._createSettingsMenuItem('Cinema Filters', icon, (e) => {
                    if (window.YPP.features.VideoFiltersUI) {
                        window.YPP.features.VideoFiltersUI.togglePanel(filterFeature, video, e.target);
                    }
                }));
            }
        }
    }


    // =========================================================================
    // Button Creators
    // =========================================================================
    // =========================================================================
    // Button Creators
    // =========================================================================

    _createSnapshotButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
        return this.createButton(icon, 'Take Snapshot', () => this.takeSnapshot(video));
    }

    _createLoopButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
        const btn = this.createButton(icon, 'Loop Video', () => this.toggleLoop(video, btn));
        if (this.settings.loop || video.loop) {
            btn.classList.add('active');
            video.loop = true;
        }
        return btn;
    }

    _createSpeedControls(video) {
        const container = document.createElement('div');
        container.className = 'ypp-speed-controls';
        ['1', '1.5', '2', '3'].forEach(rate => {
            const btn = document.createElement('button');
            btn.className = 'ypp-speed-btn';
            btn.textContent = rate + 'x';
            btn.dataset.speed = rate;
            if (video.playbackRate === parseFloat(rate)) btn.classList.add('active');
            this.addListener(btn, 'click', (e) => {
                video.playbackRate = parseFloat(rate);
                this.updateSpeedButtons(container, rate);
            });
            container.appendChild(btn);
        });
        return container;
    }

    _createPiPButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
        const btn = this.createButton(icon, 'Picture-in-Picture', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (e) {
                this.utils?.log?.('[YPP:PLAYER] PiP failed: ' + e.message, 'PLAYER', 'error');
            }
        });
        this.addListener(video, 'enterpictureinpicture', () => btn.classList.add('active'));
        this.addListener(video, 'leavepictureinpicture', () => btn.classList.remove('active'));
        return btn;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            onClick(e);
        });
        return btn;
    }

    // =========================================================================
    // Actions
    // =========================================================================

    takeSnapshot(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `youtube-snapshot-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            alert('Cannot save snapshot (Content might be DRM protected)');
        }
    }

    toggleLoop(video, btn) {
        video.loop = !video.loop;
        btn.classList.toggle('active', video.loop);
    }


    updateSpeedButtons(container, activeSpeed) {
        container.querySelectorAll('.ypp-speed-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.speed === activeSpeed);
        });
    }


};
