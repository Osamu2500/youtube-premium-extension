/**
 * Zen Mode Feature
 * Reduces distractions on the Watch Page and adds an ambient glow effect.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ZenMode = class ZenMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.zenToastShown = false;
        this.ambientInterval = null;
        this.canvas = null;
        this.ctx = null;
    }

    /**
     * Enable Zen Mode.
     * @param {Object} settings 
     */
    enable(settings) {
        this.toggleZen(!!settings.zenMode);
    }

    /**
     * Disable Zen Mode.
     */
    disable() {
        this.toggleZen(false);
    }

    /**
     * Toggle the Zen Mode state.
     * @param {boolean} enable 
     */
    toggleZen(enable) {
        // Toggle global class
        document.body.classList.toggle(this.CONSTANTS.CSS_CLASSES.ZEN_MODE, enable);

        if (enable) {
            // Only trigger active effects if on Watch page
            if (location.pathname === '/watch') {
                this.autoCinema();
                this._applyAmbientMode();
            }

            if (!this.zenToastShown && location.pathname === '/watch') {
                this.Utils.createToast('Zen Mode Enabled');
                this.zenToastShown = true;
            }
        } else {
            this.zenToastShown = false;
            this._removeAmbientMode();
        }
    }

    /**
     * Automatically switch player to "Cinema" (Theater) mode if not already.
     */
    autoCinema() {
        try {
            const btn = document.querySelector('.ytp-size-button') || document.querySelector('[aria-label="Cinema mode"]');
            const isTheater = document.querySelector('ytd-watch-flexy[theater]');

            if (btn && !isTheater) {
                // Initial click
                btn.click();

                // Double check in case of race condition / SPA transition
                setTimeout(() => {
                    const isTheaterNow = document.querySelector('ytd-watch-flexy[theater]');
                    if (!isTheaterNow) btn.click();
                }, 1000);
            }
        } catch (e) {
            console.error('[YPP] AutoCinema error', e);
        }
    }

    /**
     * Start the ambient light effect (Ambilight).
     * Samples the video frame and casts a glow around the player.
     */
    /**
     * Start the ambient light effect (Ambilight).
     * Uses throttled requestAnimationFrame for performance.
     */
    _applyAmbientMode() {
        if (this.ambientActive) return;
        this.ambientActive = true;

        const video = document.querySelector('video');
        if (!video) return;

        // Reuse canvas if exists
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = 50;
            this.canvas.height = 50;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        let lastUpdate = 0;
        const FPS = 10; // 10fps is enough for ambient glow
        const interval = 1000 / FPS;

        const loop = (timestamp) => {
            if (!this.ambientActive) return;

            if (timestamp - lastUpdate > interval) {
                lastUpdate = timestamp;

                if (video && !video.paused && !video.ended && video.readyState >= 2) {
                    try {
                        this.ctx.drawImage(video, 0, 0, 50, 50);
                        const frame = this.ctx.getImageData(0, 0, 50, 50);
                        const [r, g, b] = this._getAverageColor(frame.data); // Keep existing simple algo

                        this._updateGlow(`rgba(${r}, ${g}, ${b}, 0.5)`);
                    } catch (e) {
                        // Fallback seldom needed, but good to have
                    }
                }
            }

            this.animationFrame = requestAnimationFrame(loop);
        };

        this.animationFrame = requestAnimationFrame(loop);
    }

    /**
     * Helper to update the player glow.
     * @param {string} color 
     */
    _updateGlow(color) {
        const player = document.querySelector('#ytd-player') ||
            document.querySelector('#player-container-outer') ||
            document.querySelector('.html5-video-player');

        if (player) {
            player.style.boxShadow = `0 0 150px 30px ${color}`;
            // Smooth transition handled by CSS class preferably, or inline:
            player.style.transition = 'box-shadow 0.3s ease-out';
        }
    }

    /**
     * Stop the ambient mode.
     */
    _removeAmbientMode() {
        this.ambientActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Clear styles
        const player = document.querySelector('#ytd-player') ||
            document.querySelector('#player-container-outer') ||
            document.querySelector('.html5-video-player');
        if (player) {
            player.style.boxShadow = '';
            player.style.transition = '';
        }
    }

    /**
     * Calculate average dominant color from pixel data.
     * @param {Uint8ClampedArray} data 
     * @returns {number[]} [r, g, b]
     */
    _getAverageColor(data) {
        let r = 0, g = 0, b = 0;
        // Sample every 10th pixel for performance
        const step = 4 * 10;
        let count = 0;

        for (let i = 0; i < data.length; i += step) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }

        if (count === 0) return [0, 0, 0];
        return [Math.floor(r / count), Math.floor(g / count), Math.floor(b / count)];
    }
};
