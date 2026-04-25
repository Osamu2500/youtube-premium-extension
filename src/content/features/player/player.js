/**
 * Player Enhancements Module
 * Adds useful features to the video player: Snapshot, Loop, Speed, Volume Boost, Auto Quality,
 * and a unified Cinema Filters system (presets + custom sliders + special effects).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Player = class Player {
    constructor() {
        this.settings = null;
        this.isLooping = false;
        this.injectedButtons = false;
        this._boundPiP = null;
        this._videoElement = null;
    }

    enable(settings) {
        this.settings = settings;
        this.run();
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

        this._videoElement = null;
    }

    update(settings) {
        this.settings = settings;

        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        this.run();
    }

    async run() {
        const Utils = window.YPP.Utils;
        if (!Utils) return;

        // Debug logging
        if (Utils.log) {
            Utils.log('Player feature starting', 'PLAYER', 'debug');
            Utils.log(`Cinema filters enabled: ${this.settings.enableCinemaFilters}`, 'PLAYER', 'debug');
        }

        try {
            const elements = await Utils.pollFor(() => {
                const video = document.querySelector('video');
                const controls = document.querySelector('.ytp-right-controls');
                if (video && controls && video.readyState >= 1) {
                    return { video, controls };
                }
                return null;
            }, 10000, 500);

            if (elements) {
                const { video, controls } = elements;
                this._videoElement = video;

                if (!document.querySelector('.ypp-player-controls')) {
                    this.injectControls(video, controls);
                }

                if (this.settings.autoPiP) {
                    this.handleAutoPiP(video);
                }

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
        document.addEventListener('visibilitychange', handleVisibility);
    }

    injectControls(video, controls) {
        if (document.querySelector('.ypp-player-controls')) return;

        const container = document.createElement('div');
        container.className = 'ypp-player-controls';

        container.appendChild(this._createSpeedControls(video));
        container.appendChild(this._createSnapshotButton(video));
        container.appendChild(this._createLoopButton(video));

        if (document.pictureInPictureEnabled) {
            container.appendChild(this._createPiPButton(video));
        }

        // Volume Booster button
        if (this.settings.enableVolumeBoost) {
            const volumeFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('volumeBoost');
            if (volumeFeature && volumeFeature.createButton) {
                container.appendChild(volumeFeature.createButton(video));
            }
        }

        if (this.settings.enableCinemaFilters) {
            const filterFeature = window.YPP.featureManager && window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature && filterFeature.createButton) {
                container.appendChild(filterFeature.createButton(video));
            }
        }

        controls.insertBefore(container, controls.firstChild);
        this.injectedButtons = true;
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
            if (video.playbackRate == rate) btn.classList.add('active');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
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
                console.error('[YPP:PLAYER] PiP failed', e);
            }
        });
        video.addEventListener('enterpictureinpicture', () => btn.classList.add('active'));
        video.addEventListener('leavepictureinpicture', () => btn.classList.remove('active'));
        return btn;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
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
