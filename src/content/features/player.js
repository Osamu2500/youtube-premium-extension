/**
 * Player Enhancements Module
 * Adds useful features to the video player: Snapshot, Loop, Speed, Volume Boost, and Auto Quality.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Player = class Player {
    constructor() {
        this.settings = null;
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.isLooping = false;
        this.waitForPlayerInterval = null;
        this.injectedButtons = false;
        this._boundTimeUpdate = null;
    }

    /**
     * Enable player features.
     * @param {Object} settings 
     */
    enable(settings) {
        this.settings = settings;
        this.run();
    }

    /**
     * Disable player features and cleanup.
     */
    disable() {
        // Remove controls
        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        if (this.waitForPlayerInterval) {
            clearInterval(this.waitForPlayerInterval);
            this.waitForPlayerInterval = null;
        }

        // Reset volume gain if active
        if (this.gainNode) {
            this.gainNode.gain.value = 1;
        }

        // Remove time display
        const time = document.getElementById('ypp-remaining-time');
        if (time) time.remove();

        // Remove listeners
        const video = document.querySelector('video');
        if (video && this._boundTimeUpdate) {
            video.removeEventListener('timeupdate', this._boundTimeUpdate);
        }
    }

    /**
     * Update settings and refresh controls.
     * @param {Object} settings 
     */
    update(settings) {
        this.settings = settings;

        // Update volume if boost enabled
        if (this.gainNode && settings.volumeBoost) {
            this.setVolume(settings.volumeLevel || 1);
        }

        // Re-inject controls if needed (simplest way to apply settings changes)
        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        this.run();
    }

    /**
     * Start the feature loop to detect player.
     */
    run() {
        if (this.waitForPlayerInterval) clearInterval(this.waitForPlayerInterval);

        this.waitForPlayerInterval = setInterval(() => {
            const video = document.querySelector('video');
            const controls = document.querySelector('.ytp-right-controls');

            if (video && controls) {
                // Feature 1: Control Buttons
                if (!document.querySelector('.ypp-player-controls')) {
                    this.injectControls(video, controls);
                }

                // Feature 2: Volume Boost (Lazy Init)
                if (this.settings.volumeBoost && !this.ctx) {
                    // Logic handled in initAudioContext triggered by play
                }

                // Feature 3: Remaining Time
                if (this.settings.enableRemainingTime) {
                    const leftControls = controls.parentElement.querySelector('.ytp-left-controls');
                    this.showRemainingTime(video, leftControls);
                }

                // Feature 4: Auto Quality
                if (this.settings.autoQuality) {
                    this.applyAutoQuality();
                }
            }
        }, 1000);
    }

    /**
     * Inject custom buttons into the player.
     * @param {HTMLVideoElement} video 
     * @param {HTMLElement} controls 
     */
    injectControls(video, controls) {
        if (document.querySelector('.ypp-player-controls')) return;

        const container = document.createElement('div');
        container.className = 'ypp-player-controls';

        // 1. Snapshot
        container.appendChild(this._createSnapshotButton(video));

        // 2. Loop
        container.appendChild(this._createLoopButton(video));

        // 3. Speed Controls
        container.appendChild(this._createSpeedControls(video));

        // Insert at the beginning of right controls
        controls.insertBefore(container, controls.firstChild);
        this.injectedButtons = true;

        // Prepare audio context
        this.initAudioContext(video);
    }

    _createSnapshotButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 11.5V13H9v2.5L5.5 12 9 8.5V11h6V8.5l3.5 3.5-3.5 3.5z" fill-rule="evenodd" fill="none"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
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
                e.stopPropagation(); // Prevent player click pause
                video.playbackRate = parseFloat(rate);
                this.updateSpeedButtons(container, rate);
            });
            container.appendChild(btn);
        });
        return container;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        btn.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering player events
            onClick(e);
        };
        return btn;
    }

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
            console.error('[YPP:PLAYER] Snapshot failed', e);
            alert('Cannot save snapshot (Content might be DRM protected)');
        }
    }

    toggleLoop(video, btn) {
        video.loop = !video.loop;
        btn.classList.toggle('active', video.loop);
    }

    initAudioContext(video) {
        if (this.ctx || !this.settings.volumeBoost) return;

        const init = () => {
            if (this.ctx) return;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                this.source = this.ctx.createMediaElementSource(video);
                this.gainNode = this.ctx.createGain();

                this.source.connect(this.gainNode);
                this.gainNode.connect(this.ctx.destination);

                this.setVolume(this.settings.volumeLevel || 1);
            } catch (e) {
                // Expected for CORS restricted sources or already connected nodes
                // console.warn('[YPP:PLAYER] Audio Context init skipped'); 
            }
        };

        // Initialize on user interaction to comply with browser autoplay policies
        video.addEventListener('play', init, { once: true });
        video.addEventListener('volumechange', init, { once: true });
    }

    setVolume(multiplier) {
        if (this.gainNode) {
            this.gainNode.gain.value = multiplier;
        }
    }

    updateSpeedButtons(container, activeSpeed) {
        container.querySelectorAll('.ypp-speed-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.speed === activeSpeed);
        });
    }

    applyAutoQuality() {
        const player = document.getElementById('movie_player');
        // Check for function existence to avoid errors
        if (player && typeof player.setPlaybackQualityRange === 'function') {
            player.setPlaybackQualityRange('hd1080');
        }
    }

    showRemainingTime(video, leftControls) {
        if (!leftControls) return;

        let remainingEl = document.getElementById('ypp-remaining-time');
        if (!remainingEl) {
            remainingEl = document.createElement('span');
            remainingEl.id = 'ypp-remaining-time';
            // Inline styles for isolation
            Object.assign(remainingEl.style, {
                marginLeft: '10px',
                opacity: '0.7',
                fontSize: '12px',
                fontFamily: 'Roboto, sans-serif'
            });
            leftControls.appendChild(remainingEl);
        }

        const update = () => {
            if (!video.duration || !isFinite(video.duration)) {
                remainingEl.textContent = '';
                return;
            }
            const left = video.duration - video.currentTime;

            const format = (s) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m}:${sec.toString().padStart(2, '0')}`;
            };

            remainingEl.textContent = `(-${format(left)})`;
        };

        // Clean up old listener if exists
        if (this._boundTimeUpdate) {
            video.removeEventListener('timeupdate', this._boundTimeUpdate);
        }
        this._boundTimeUpdate = update;
        video.addEventListener('timeupdate', update);
    }
};
