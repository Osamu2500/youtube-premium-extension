/**
 * Global Bar UI
 * Owns: Generating the custom player bar DOM, injecting it over arbitrary <video>
 * tags on external sites, and handling local playback/speed/filter state.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GlobalBarUI = class GlobalBarUI {

    constructor(filters) {
        this.activeBars = new Map(); // videoElement -> barElement
        this.filters = filters || window.YPP.features.FilterPresets?.PRESETS || [];
    }

    /** Attach a global player bar to a specific video element. */
    attachBar(video) {
        window.YPP.Utils?.log('Attaching global bar to video', 'GlobalBarUI', 'debug');

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
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-play" title="Play / Pause">
                    ${ICONS.play}
                </button>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-time" class="ypp-gpb-time" title="Current Time">0:00</div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-mute" title="Mute / Unmute">
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
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-loop" title="Toggle Loop">
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

        this.updateBarPosition(video, bar);
        document.body.appendChild(bar);
        this.activeBars.set(video, bar);

        this._bindEvents(video, bar, ICONS);
    }

    /** Remove all injected bars and clear the map. */
    removeAll() {
        this.activeBars.forEach((bar) => bar.remove());
        this.activeBars.clear();
    }

    /** Given a video element, returns true if it currently has a bar attached. */
    hasBar(video) {
        return this.activeBars.has(video);
    }

    /** Re-calculates and applies absolute positioning for all active bars. */
    repositionAll() {
        this.activeBars.forEach((bar, video) => this.updateBarPosition(video, bar));
    }

    /** Position a single bar on the left edge of the screen. */
    updateBarPosition(video, bar) {
        let activeIndex = Array.from(this.activeBars.keys()).indexOf(video);
        if (activeIndex === -1) activeIndex = this.activeBars.size;

        Object.assign(bar.style, {
            position: 'fixed',
            left: `${16 + (activeIndex * 60)}px`,
            top: '50%',
            bottom: 'auto',
            transform: 'translateY(-50%)',
            zIndex: '2147483647',
            display: 'flex',
            visibility: 'visible'
        });
    }

    // =========================================================================
    // EVENT BINDINGS
    // =========================================================================

    _bindEvents(video, bar, ICONS) {
        const playBtn       = bar.querySelector('#ypp-gpb-play');
        const muteBtn       = bar.querySelector('#ypp-gpb-mute');
        const volSlider     = bar.querySelector('#ypp-gpb-vol');
        const timeEl        = bar.querySelector('#ypp-gpb-time');
        const loopBtn       = bar.querySelector('#ypp-gpb-loop');
        const pipBtn        = bar.querySelector('#ypp-gpb-pip');
        const fullscreenBtn = bar.querySelector('#ypp-gpb-fullscreen');
        const closeBtn      = bar.querySelector('#ypp-gpb-close');
        const speedCont     = bar.querySelector('#ypp-gpb-speed-container');
        const featsCont     = bar.querySelector('#ypp-gpb-features-container');

        // ── Play/Pause ──
        const updatePlayIcon = () => {
            playBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
        };
        playBtn.onclick = (e) => { e.stopPropagation(); video.paused ? video.play() : video.pause(); };
        video.addEventListener('play', updatePlayIcon);
        video.addEventListener('pause', updatePlayIcon);
        updatePlayIcon();

        // ── Mute ──
        const updateMuteIcon = () => {
            muteBtn.innerHTML = video.muted ? ICONS.mute : ICONS.volumeHigh;
            muteBtn.classList.toggle('active', video.muted);
            volSlider.value = video.muted ? 0 : video.volume;
        };
        muteBtn.onclick = (e) => { e.stopPropagation(); video.muted = !video.muted; updateMuteIcon(); };
        video.addEventListener('volumechange', updateMuteIcon);
        updateMuteIcon();

        // ── Volume Slider ──
        volSlider.oninput = (e) => {
            e.stopPropagation();
            video.volume = parseFloat(e.target.value);
            video.muted = video.volume === 0;
            updateMuteIcon();
        };

        // ── Time Display ──
        const formatTime = (s) => {
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        };
        const updateTime = () => {
            timeEl.textContent = video.duration
                ? `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`
                : formatTime(video.currentTime);
        };
        video.addEventListener('timeupdate', updateTime);
        updateTime();

        // ── Loop ──
        const updateLoopIcon = () => {
            loopBtn.classList.toggle('active', video.loop);
            loopBtn.style.opacity = video.loop ? '1' : '0.5';
        };
        loopBtn.onclick = (e) => { e.stopPropagation(); video.loop = !video.loop; updateLoopIcon(); };
        updateLoopIcon();

        // ── Speed ──
        if (window.YPP.featureManager?.getFeature('playerControls')) {
            const playerFeature = window.YPP.featureManager.getFeature('playerControls');
            if (playerFeature._createSpeedControls) {
                speedCont.appendChild(playerFeature._createSpeedControls(video));
            }
        }

        // ── Feature Buttons (Volume / Filters) ──
        if (window.YPP.featureManager) {
            const volFeature = window.YPP.featureManager.getFeature('volumeBoost');
            if (volFeature?.createButton) featsCont.appendChild(volFeature.createButton(video));
            const filterFeature = window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature?.createButton) featsCont.appendChild(filterFeature.createButton(video));
        }

        // ── PiP ──
        pipBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                if (document.pictureInPictureElement) await document.exitPictureInPicture();
                else await video.requestPictureInPicture();
            } catch (_) {}
        };

        // ── Fullscreen ──
        fullscreenBtn.onclick = (e) => {
            e.stopPropagation();
            try {
                if (document.fullscreenElement) document.exitFullscreen();
                else video.requestFullscreen();
            } catch (_) {}
        };
        const updateFsIcon = () => {
            const isFs = document.fullscreenElement === video;
            fullscreenBtn.innerHTML = isFs
                ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
                : ICONS.fullscreen;
        };
        document.addEventListener('fullscreenchange', updateFsIcon);

        // ── Close ──
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            bar.remove();
            this.activeBars.delete(video);
            document.removeEventListener('fullscreenchange', updateFsIcon);
        };

        // ── Auto-remove when video disconnects ──
        const checkRemoval = setInterval(() => {
            if (!video.isConnected) {
                bar.remove();
                this.activeBars.delete(video);
                clearInterval(checkRemoval);
                document.removeEventListener('fullscreenchange', updateFsIcon);
                this.repositionAll();
            }
        }, 3000);
    }
};
