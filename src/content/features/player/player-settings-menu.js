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

    createSettingsToggleItem(label, iconContent, settingKey, currentValue, onChange) {
        const item = document.createElement('div');
        item.className = 'ytp-menuitem ypp-custom-menuitem';
        item.setAttribute('role', 'menuitemcheckbox');
        item.setAttribute('aria-checked', String(!!currentValue));
        item.setAttribute('tabindex', '0');
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'ytp-menuitem-icon';
        iconDiv.innerHTML = iconContent || '<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><circle cx="12" cy="12" r="4"/></svg>';
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'ytp-menuitem-label';
        labelDiv.textContent = label;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'ytp-menuitem-content';
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'ytp-menuitem-toggle-checkbox';
        contentDiv.appendChild(checkboxDiv);
        
        item.appendChild(iconDiv);
        item.appendChild(labelDiv);
        item.appendChild(contentDiv);
        
        this.player.addListener(item, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isChecked = item.getAttribute('aria-checked') === 'true';
            const newValue = !isChecked;
            item.setAttribute('aria-checked', String(newValue));
            
            // Sync with extension storage
            if (window.YPP.Utils && window.YPP.Utils.saveSettings) {
                window.YPP.Utils.saveSettings({ [settingKey]: newValue });
            }
            if (onChange) onChange(newValue);
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
            { id: 'pb_native_autoplay', selector: '.ytp-autonav-button, .ytp-autonav-toggle-button', label: 'Autoplay' },
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
            panelMenu.appendChild(this.createSettingsMenuItem('Take Snapshot', icon, () => {
                const snapFeature = window.YPP.featureManager?.getFeature('snapshotButton');
                if (snapFeature) snapFeature.takeSnapshot(video);
            }));
        }
        if (this.player.settings.pb_bookmark === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Bookmark Highlight', icon, async () => {
                const bmFeature = window.YPP.featureManager?.getFeature('BookmarksManager');
                if (bmFeature) await bmFeature._captureHighlight();
            }));
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

        // New Toggle-Based Features
        if (this.player.settings.pb_autoPause === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Auto Pause', icon, 'autoPause', this.player.settings.autoPause));
        }
        if (this.player.settings.pb_autoLike === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Auto Like', icon, 'autoLike', this.player.settings.autoLike));
        }
        if (this.player.settings.pb_videoResumer === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Video Resume', icon, 'videoResumer', this.player.settings.videoResumer));
        }
        if (this.player.settings.pb_intentionalDelay === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.53-14.39zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Video Delay', icon, 'intentionalDelay', this.player.settings.intentionalDelay));
        }
        if (this.player.settings.pb_audioCompressor === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Audio Compressor', icon, 'audioCompressor', this.player.settings.audioCompressor));
        }
        if (this.player.settings.pb_durationFilter === 'back') {
            _addSeparator();
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>`;
            panelMenu.appendChild(this.createSettingsToggleItem('Duration Filter', icon, 'durationFilter', this.player.settings.durationFilter));
        }
        if (this.player.settings.pb_autoQuality === 'back') {
            _addSeparator();
            // Since autoQuality is a select, maybe we just redirect them to the popup for now, or just make it a toggle to turn it off completely?
            // Wait, we can't do a full select UI inside the native settings menu without recreating the YouTube nested menu system!
            // Let's just make it a toggle that toggles it on/off based on its current state!
            // Wait, if it's 'off', newValue could be 'hd1080'. 
            const icon = `<svg height="24" width="24" viewBox="0 0 24 24" fill="#fff"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`;
            panelMenu.appendChild(this.createSettingsMenuItem('Auto Quality', icon, () => {
                window.YPP.Utils.log('Auto Quality settings should be modified in the extension popup.', 'SETTINGS');
                const toastFeature = window.YPP.featureManager?.getFeature('ZenMode'); // or custom toast
                if (toastFeature) {
                     // Not easily accessible, let's just alert for now or ignore since they can change it in the popup.
                     alert("Please configure Auto Quality in the YouTube Premium Plus extension popup.");
                } else {
                     alert("Please configure Auto Quality in the YouTube Premium Plus extension popup.");
                }
            }));
        }
    }
};
