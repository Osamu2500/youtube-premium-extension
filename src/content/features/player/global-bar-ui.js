/**
 * Global Bar UI
 * Owns: Generating the custom player bar DOM, injecting it over arbitrary <video>
 * tags on external sites, and handling local playback/speed/filter state.
 * Refactored to 1:N architecture (one bar controls ALL tracked videos on the page).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GlobalBarUI = class GlobalBarUI {

    constructor(filters) {
        this.trackedVideos = new Set();
        this.filters = filters || window.YPP.features.FilterPresets?.PRESETS || [];
        this.settings = {};
        
        this.barElement = null;
        this._abortController = null;
        this._boundUpdateUIState = this.updateUIState.bind(this);
    }

    updateSettings(settings) {
        this.settings = settings;
        this.updatePosition();
    }

    /** Add a video to the tracked set and create the bar if needed. */
    trackVideo(video) {
        if (this.trackedVideos.has(video)) return;
        
        window.YPP.Utils?.log('Tracking new video for global bar', 'GlobalBarUI', 'debug');
        
        this.trackedVideos.add(video);

        // Auto-remove when video disconnects
        const disconnectObserver = new MutationObserver(() => {
            if (!video.isConnected) {
                disconnectObserver.disconnect();
                this._untrackVideo(video);
            }
        });
        const observeTarget = video.parentElement || document.body;
        disconnectObserver.observe(observeTarget, { childList: true, subtree: true });
        video._yppDisconnectObserver = disconnectObserver;

        // Bind events
        video.addEventListener('play', this._boundUpdateUIState);
        video.addEventListener('pause', this._boundUpdateUIState);
        video.addEventListener('volumechange', this._boundUpdateUIState);
        video.addEventListener('ratechange', this._boundUpdateUIState);
        video.addEventListener('timeupdate', this._boundUpdateUIState);

        if (!this.barElement) {
            this.createBar();
        } else {
            this.updateUIState();
        }
    }

    _untrackVideo(video) {
        this.trackedVideos.delete(video);
        
        if (video._yppDisconnectObserver) {
            video._yppDisconnectObserver.disconnect();
            delete video._yppDisconnectObserver;
        }

        video.removeEventListener('play', this._boundUpdateUIState);
        video.removeEventListener('pause', this._boundUpdateUIState);
        video.removeEventListener('volumechange', this._boundUpdateUIState);
        video.removeEventListener('ratechange', this._boundUpdateUIState);
        video.removeEventListener('timeupdate', this._boundUpdateUIState);

        if (this.trackedVideos.size === 0) {
            this.removeBar();
        } else {
            this.updateUIState();
        }
    }

    hasVideo(video) {
        return this.trackedVideos.has(video);
    }

    /** Create the singular global player bar DOM */
    createBar() {
        if (this.barElement) return;

        window.YPP.Utils?.log('Creating singular global player bar', 'GlobalBarUI', 'debug');

        const bar = document.createElement('div');
        bar.className = 'ypp-global-player-bar ypp-glass-panel';

        const isInIframe = window.self !== window.top;
        if (isInIframe) bar.classList.add('ypp-gpb-iframe');

        // SVG icons
        const ICONS = {
            play:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
            pause:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
            mute:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
            volumeHigh: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
            loop:       `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
            pip:        `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>`,
            fullscreen: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
            close:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
        };

        bar.innerHTML = `
            <div class="ypp-gpb-controls">
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-play" title="Play / Pause All">
                    ${ICONS.play}
                </button>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-time" class="ypp-gpb-time" title="Current Time">0:00</div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-mute" title="Mute / Unmute All">
                    ${ICONS.volumeHigh}
                </button>
                <div id="ypp-gpb-vol-wrap" class="ypp-gpb-vol-wrap" title="Volume">
                    <input type="range" id="ypp-gpb-vol" min="0" max="1" step="0.02" value="1" class="ypp-gpb-vol-slider">
                </div>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-speed-container"></div>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-features-container"></div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-loop" title="Toggle Loop All">
                    ${ICONS.loop}
                </button>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-pip" title="Picture-in-Picture">
                    ${ICONS.pip}
                </button>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-fullscreen" title="Fullscreen">
                    ${ICONS.fullscreen}
                </button>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-close" title="Hide Bar">
                    ${ICONS.close}
                </button>
            </div>
        `;

        this.barElement = bar;
        this.ICONS = ICONS;
        this.updatePosition();
        
        let targetContainer = document.body;
        try {
            if (window.top && window.top.document && window.top.document.body) {
                targetContainer = window.top.document.body;
            }
        } catch (e) {
            window.YPP.Utils?.log('Cross-origin iframe detected, anchoring to local body.', 'GlobalBarUI', 'debug');
        }
        
        // Use Popover API to escape ALL CSS containment (transforms, overflow: hidden)
        if ('popover' in bar) {
            bar.popover = "manual";
        }
        
        targetContainer.appendChild(bar);
        
        if ('popover' in bar) {
            try { bar.showPopover(); } catch (e) {}
        }

        this._abortController = new AbortController();
        this._bindEvents(this._abortController.signal);
        
        // Initial state sync
        this.updateUIState();
    }

    /** Remove the global bar and clear tracked videos. */
    removeAll() {
        this.trackedVideos.forEach(v => this._untrackVideo(v));
        this.removeBar();
    }
    
    removeBar() {
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
        if (this.barElement) {
            this.barElement.remove();
            this.barElement = null;
        }
    }

    /** Position the singular bar. */
    updatePosition() {
        if (!this.barElement) return;

        const pos = this.settings.globalPlayerBarPosition || 'right';
        const bar = this.barElement;
        
        bar.classList.remove('ypp-bar-pos-right', 'ypp-bar-pos-left', 'ypp-bar-pos-top');
        bar.classList.add(`ypp-bar-pos-${pos}`);

        if (pos === 'top') {
            Object.assign(bar.style, {
                position: 'fixed',
                top: '16px',
                bottom: 'auto',
                left: '50%',
                right: 'auto',
                zIndex: '2147483647',
                display: 'flex',
                visibility: 'visible',
                transform: ''
            });
        } else if (pos === 'left') {
            Object.assign(bar.style, {
                position: 'fixed',
                left: '16px',
                right: 'auto',
                top: '50%',
                bottom: 'auto',
                zIndex: '2147483647',
                display: 'flex',
                visibility: 'visible',
                transform: ''
            });
        } else {
            Object.assign(bar.style, {
                position: 'fixed',
                right: '16px',
                left: 'auto',
                top: '50%',
                bottom: 'auto',
                zIndex: '2147483647',
                display: 'flex',
                visibility: 'visible',
                transform: ''
            });
        }
    }

    // =========================================================================
    // UI SYNC
    // =========================================================================

    /** 
     * Get the "primary" video to reflect in the UI and apply targeted actions (Play/PiP).
     * Prefers the video taking up the most vertical space in the viewport.
     * If none are visible, returns the first tracked video.
     */
    _getPrimaryVideo() {
        if (this.trackedVideos.size === 0) return null;
        
        let bestVideo = null;
        let maxVisibleHeight = 0;
        
        for (const v of this.trackedVideos) {
            const rect = v.getBoundingClientRect();
            // Visible height logic:
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(window.innerHeight || document.documentElement.clientHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            
            if (visibleHeight > maxVisibleHeight) {
                maxVisibleHeight = visibleHeight;
                bestVideo = v;
            }
        }
        
        return bestVideo || this.trackedVideos.values().next().value;
    }

    /** Updates the bar's UI to reflect the primary video's state. */
    updateUIState() {
        if (!this.barElement) return;
        
        const primary = this._getPrimaryVideo();
        if (!primary) return;

        // Volume is synced across all, but we check if all are muted
        let isAllMuted = true;
        for (const v of this.trackedVideos) {
            if (!v.muted && v.volume > 0) isAllMuted = false;
        }

        // Play/Pause reflects primary video
        const playBtn = this.barElement.querySelector('#ypp-gpb-play');
        if (playBtn) {
            playBtn.innerHTML = !primary.paused ? this.ICONS.pause : this.ICONS.play;
        }

        // Mute & Volume
        const muteBtn = this.barElement.querySelector('#ypp-gpb-mute');
        const volSlider = this.barElement.querySelector('#ypp-gpb-vol');
        if (muteBtn && volSlider) {
            muteBtn.innerHTML = isAllMuted ? this.ICONS.mute : this.ICONS.volumeHigh;
            muteBtn.classList.toggle('active', isAllMuted);
            // Use primary video's volume for the slider
            volSlider.value = primary.muted ? 0 : primary.volume;
        }

        // Time
        const timeEl = this.barElement.querySelector('#ypp-gpb-time');
        if (timeEl) {
            const formatTime = (s) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60).toString().padStart(2, '0');
                return `${m}:${sec}`;
            };
            timeEl.textContent = primary.duration
                ? `${formatTime(primary.currentTime)} / ${formatTime(primary.duration)}`
                : formatTime(primary.currentTime);
        }

        // Loop reflects primary video
        const loopBtn = this.barElement.querySelector('#ypp-gpb-loop');
        if (loopBtn) {
            loopBtn.classList.toggle('active', primary.loop);
            loopBtn.style.opacity = primary.loop ? '1' : '0.5';
        }

        // Speed
        const speedInput = this.barElement.querySelector('.ypp-gpb-speed-input');
        if (speedInput && document.activeElement !== speedInput) {
            speedInput.value = primary.playbackRate.toFixed(1);
        }

        // Fullscreen
        const fullscreenBtn = this.barElement.querySelector('#ypp-gpb-fullscreen');
        if (fullscreenBtn) {
            let isFs = false;
            for (const v of this.trackedVideos) {
                if (document.fullscreenElement === v) {
                    isFs = true;
                    break;
                }
            }
            fullscreenBtn.innerHTML = isFs
                ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
                : this.ICONS.fullscreen;
        }
    }

    // =========================================================================
    // EVENT BINDINGS
    // =========================================================================

    _bindEvents(signal) {
        const opts = { signal };
        const bar = this.barElement;

        const playBtn       = bar.querySelector('#ypp-gpb-play');
        const muteBtn       = bar.querySelector('#ypp-gpb-mute');
        const volSlider     = bar.querySelector('#ypp-gpb-vol');
        const loopBtn       = bar.querySelector('#ypp-gpb-loop');
        const pipBtn        = bar.querySelector('#ypp-gpb-pip');
        const fullscreenBtn = bar.querySelector('#ypp-gpb-fullscreen');
        const closeBtn      = bar.querySelector('#ypp-gpb-close');
        const speedCont     = bar.querySelector('#ypp-gpb-speed-container');
        const featsCont     = bar.querySelector('#ypp-gpb-features-container');

        // ── Play/Pause ──
        playBtn.onclick = (e) => { 
            e.stopPropagation(); 
            const primary = this._getPrimaryVideo();
            if (!primary) return;
            
            if (primary.paused) {
                primary.play().catch(err => window.YPP.Utils?.log('Play prevented: ' + err.message, 'GlobalBarUI', 'debug'));
            } else {
                primary.pause();
            }
            this.updateUIState();
        };

        // ── Mute ──
        muteBtn.onclick = (e) => { 
            e.stopPropagation();
            let isAllMuted = true;
            for (const v of this.trackedVideos) {
                if (!v.muted && v.volume > 0) isAllMuted = false;
            }
            // Toggle state for all
            for (const v of this.trackedVideos) {
                v.muted = !isAllMuted;
            }
            this.updateUIState();
        };

        // ── Volume Slider ──
        volSlider.oninput = (e) => {
            e.stopPropagation();
            const val = parseFloat(e.target.value);
            for (const v of this.trackedVideos) {
                v.volume = val;
                v.muted = val === 0;
            }
            this.updateUIState();
        };

        // ── Loop ──
        loopBtn.onclick = (e) => { 
            e.stopPropagation(); 
            const primary = this._getPrimaryVideo();
            if (!primary) return;
            
            primary.loop = !primary.loop;
            this.updateUIState();
        };

        // ── Speed ──
        const speedInput = document.createElement('input');
        speedInput.type = 'number';
        speedInput.className = 'ypp-gpb-speed-input';
        speedInput.min = '0.1';
        speedInput.max = '16.0';
        speedInput.step = '0.1';
        speedInput.title = 'Playback Speed';
        speedInput.style.cssText = `
            width: 44px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            border-radius: 6px;
            text-align: center;
            font-size: 12px;
            padding: 2px;
            font-family: inherit;
            outline: none;
        `;
        
        speedInput.oninput = (e) => {
            e.stopPropagation();
            let val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0.1 && val <= 16.0) {
                for (const v of this.trackedVideos) {
                    v.playbackRate = val;
                }
            }
        };
        speedInput.onkeydown = (e) => e.stopPropagation();
        speedCont.appendChild(speedInput);

        // ── Feature Buttons (Volume / Filters) ──
        if (window.YPP.featureManager) {
            // In 1:N mode, the volume booster and filter UI should probably be adapted,
            // but we'll try to let them attach to the primary video or we attach them to the bar itself.
            // For now, pass a dummy object or the first video.
            // A proper fix requires updating the sub-modules to also support 1:N.
            // Here we just pass the primary video so at least ONE video gets boosted/filtered.
            const primary = this._getPrimaryVideo();
            
            const volFeature = window.YPP.featureManager.getFeature('volumeBoost');
            if (volFeature?.createButton && primary) {
                featsCont.appendChild(volFeature.createButton(primary));
            }
            
            const filterFeature = window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature?.createButton && primary) {
                featsCont.appendChild(filterFeature.createButton(primary));
            }
        }

        // ── PiP ──
        pipBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    const primary = this._getPrimaryVideo();
                    if (primary) await primary.requestPictureInPicture();
                }
            } catch (_) {}
        };

        // ── Fullscreen ──
        fullscreenBtn.onclick = (e) => {
            e.stopPropagation();
            try {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    const primary = this._getPrimaryVideo();
                    if (primary) primary.requestFullscreen();
                }
            } catch (_) {}
        };
        document.addEventListener('fullscreenchange', () => this.updateUIState(), { signal });

        // ── Close ──
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            // Disconnect all tracked videos so they don't recreate the bar
            this.trackedVideos.forEach(v => this._untrackVideo(v));
            this.removeBar();
        };
    }
};
