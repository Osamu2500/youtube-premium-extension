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
        this.filters = filters || window.YPP.features.FilterPresets.PRESETS;
    }

    /** Attach a global player bar to a specific video element. */
    attachBar(video) {
        window.YPP.Utils?.log('Attaching global bar to video', 'GlobalBarUI', 'debug');
        
        const bar = document.createElement('div');
        bar.className = 'ypp-global-player-bar ypp-glass-panel';
        
        const isInIframe = window.self !== window.top;
        if (isInIframe) bar.classList.add('ypp-gpb-iframe');
        
        bar.innerHTML = `
            <div class="ypp-gpb-controls">
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-play" title="Play/Pause">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
                </button>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-speed-container"></div>
                <div class="ypp-gpb-divider"></div>
                <div id="ypp-gpb-features-container"></div>
                <div class="ypp-gpb-divider"></div>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-pip" title="Picture-in-Picture">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>
                </button>
                <button class="ypp-gpb-btn ypp-action-btn" id="ypp-gpb-close" title="Hide Bar">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
        `;

        this.updateBarPosition(video, bar);
        document.body.appendChild(bar);
        this.activeBars.set(video, bar);

        this._bindEvents(video, bar);
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
        // Find index to stack if there are multiple videos on screen
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

    _bindEvents(video, bar) {
        const playBtn     = bar.querySelector('#ypp-gpb-play');
        const pipBtn      = bar.querySelector('#ypp-gpb-pip');
        const closeBtn    = bar.querySelector('#ypp-gpb-close');
        const speedCont   = bar.querySelector('#ypp-gpb-speed-container');
        const featsCont   = bar.querySelector('#ypp-gpb-features-container');

        // Play/Pause
        const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`;
        const pauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>`;
        
        playBtn.onclick = (e) => {
            e.stopPropagation();
            if (video.paused) video.play(); else video.pause();
        };
        video.addEventListener('play', () => playBtn.innerHTML = pauseIcon);
        video.addEventListener('pause', () => playBtn.innerHTML = playIcon);
        playBtn.innerHTML = video.paused ? playIcon : pauseIcon;

        // Speed (injecting standard speed pill)
        if (window.YPP.featureManager && window.YPP.featureManager.getFeature('playerControls')) {
            const playerFeature = window.YPP.featureManager.getFeature('playerControls');
            if (playerFeature._createSpeedControls) {
                speedCont.appendChild(playerFeature._createSpeedControls(video));
            }
        }

        // Feature Buttons (Volume / Filters)
        if (window.YPP.featureManager) {
            const volFeature = window.YPP.featureManager.getFeature('volumeBoost');
            if (volFeature && volFeature.createButton) {
                featsCont.appendChild(volFeature.createButton(video));
            }
            const filterFeature = window.YPP.featureManager.getFeature('videoFilters');
            if (filterFeature && filterFeature.createButton) {
                featsCont.appendChild(filterFeature.createButton(video));
            }
        }

        // PiP
        pipBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (err) {}
        };

        // Close
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            bar.remove();
            this.activeBars.delete(video);
        };

        // Window bindings
        // (Removed IntersectionObserver so the bar is always visible)

        const checkRemoval = setInterval(() => {
            if (!video.isConnected) {
                bar.remove();
                this.activeBars.delete(video);
                clearInterval(checkRemoval);
                this.repositionAll(); // Reposition remaining bars
            }
        }, 3000);
    }
};
