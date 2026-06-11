window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Player Settings Menu Helper
 * Handles injecting custom options into the native YouTube player settings menu.
 */
window.YPP.features.PlayerSettingsMenu = class PlayerSettingsMenu {
    constructor(playerFeature) {
        this.player = playerFeature;
        this.controls = new window.YPP.features.PlayerControls(playerFeature);
        this.domObserver = window.YPP.sharedObserver;
    }

    setupSettingsObserver(video) {
        // Use sharedObserver instead of a raw MutationObserver
        // YouTube creates the .ytp-panel-menu dynamically when settings is clicked
        this.domObserver.register('player-settings-menu', '.ytp-settings-menu .ytp-panel-menu', (elements) => {
            const settingsMenu = document.querySelector('.ytp-settings-menu');
            if (settingsMenu) {
                this.injectSettingsMenuItems(settingsMenu, video);
            }
        }, true);
    }

    cleanupSettingsObserver() {
        if (this.domObserver) {
            this.domObserver.unregister('player-settings-menu');
        }
    }

    createSettingsMenuItem(label, iconContent, onClick) {
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
        
        this.player.addListener(item, 'click', (e) => {
            // Click natively, then optionally close settings menu
            onClick(e);
            const closeBtn = document.querySelector('.ytp-settings-button');
            if (closeBtn) closeBtn.click();
        });
        
        return item;
    }

    injectSettingsMenuItems(menuElement, video) {
        // Find the main panel menu
        const panelMenu = menuElement.querySelector('.ytp-panel:not([style*="display: none"]) .ytp-panel-menu');
        if (!panelMenu) return;

        // Prevent infinite injection
        if (panelMenu.querySelector('.ypp-custom-menuitem')) return;
        
        // Don't inject if it's a submenu (like Quality or Speed)
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
            if (this.player.settings[item.id] === 'back') {
                const targetBtn = document.querySelector(item.selector);
                if (targetBtn) {
                    _addSeparator();
                    const iconSvg = targetBtn.querySelector('svg')?.outerHTML || '';
                    panelMenu.appendChild(this.createSettingsMenuItem(item.label, iconSvg, () => targetBtn.click()));
                }
            }
        }

        // Custom Extension Items
        if (this.player.settings.pb_speed === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M5 4l15 8-15 8V4z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Custom Speed', icon, () => {
                const rates = [1, 1.5, 2, 3];
                const current = video.playbackRate;
                let nextIdx = rates.indexOf(current) + 1;
                if (nextIdx >= rates.length) nextIdx = 0;
                video.playbackRate = rates[nextIdx];
            }));
        }
        if (this.player.settings.pb_snapshot === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Take Snapshot', icon, () => this.controls.takeSnapshot(video)));
        }
        if (this.player.settings.pb_loop === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Loop Video', icon, () => { video.loop = !video.loop; }));
        }
        if (this.player.settings.pb_pip === 'back' && document.pictureInPictureEnabled) {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Picture-in-Picture', icon, async () => {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            }));
        }
        if (this.player.settings.enableVolumeBoost && this.player.settings.pb_volume === 'back') {
            _addSeparator();
            const volumeFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('volumeBoost');
            if (volumeFeature) {
                const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/></svg>`;
                panelMenu.appendChild(this.createSettingsMenuItem('Volume Booster', icon, (e) => {
                    if (window.YPP.features.VolumeBoosterUI) {
                        window.YPP.features.VolumeBoosterUI.toggleEQPanel(volumeFeature, video, e.target);
                    }
                }));
            }
        }
        if (this.player.settings.enableCinemaFilters && this.player.settings.pb_cinema === 'back') {
            _addSeparator();
            const filterFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature) {
                const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>`;
                panelMenu.appendChild(this.createSettingsMenuItem('Cinema Filters', icon, (e) => {
                    if (window.YPP.features.VideoFiltersUI) {
                        window.YPP.features.VideoFiltersUI.togglePanel(filterFeature, video, e.target);
                    }
                }));
            }
        }
    }
};
