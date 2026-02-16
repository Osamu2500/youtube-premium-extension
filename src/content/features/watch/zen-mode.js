/**
 * Zen Mode Feature
 * Reduces distractions on the Watch Page and adds an ambient glow effect.
 * Refactored for performance: Cached DOM elements, optimized canvas operations.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ZenMode = class ZenMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this.Utils = window.YPP.Utils || {};
        
        // State
        this.isEnabled = false;
        this.zenToastShown = false;
        this.ambientActive = false;
        this.animationFrame = null;
        
        // Cached Elements
        this.canvas = null;
        this.ctx = null;
        this.videoElement = null;
        this.playerElement = null;

        // Configuration
        this.FPS = 15; // Smooth ambilight
        this.FRAME_INTERVAL = 1000 / this.FPS;
        this.CANVAS_SIZE = 10; // Low res is sufficient for ambient light

        // Bindings
        this._loop = this._loop.bind(this);
        this._handleNavigation = this._handleNavigation.bind(this);
    }

    run(settings) {
        // Listen for navigations to refresh cached elements
        window.addEventListener('yt-navigate-finish', this._handleNavigation);
        this.update(settings);
    }

    update(settings) {
        if (settings.zenMode) {
            this.enable(settings);
        } else {
            this.disable();
        }
    }

    enable(settings) {
        this.isEnabled = true;
        this.toggleZen(true);
    }

    disable() {
        this.isEnabled = false;
        this.toggleZen(false);
    }

    _handleNavigation() {
        if (this.isEnabled) {
            // Re-acquire elements after navigation
            this._clearCache();
            const isWatchPage = location.pathname === '/watch';
            
            if (isWatchPage) {
                // On watch page: apply zen mode class
                document.body.classList.add('ypp-zen-mode');
                // Auto-cinema disabled per user request
                if (this.ambientActive) {
                    this._applyAmbientMode(); // Restart/Refresh loop
                }
            } else {
                // CRITICAL: Remove zen class when leaving watch page
                document.body.classList.remove('ypp-zen-mode');
                this._removeAmbientMode();
            }
        }
    }

    _clearCache() {
        this.videoElement = null;
        this.playerElement = null;
    }

    toggleZen(enable) {
        const isWatchPage = location.pathname === '/watch';
        
        // CRITICAL FIX: Only apply zen mode class on watch pages
        // Remove class from all other pages to prevent hiding topbar everywhere
        if (enable && isWatchPage) {
            document.body.classList.add('ypp-zen-mode');
            // Auto-cinema disabled per user request - keep default view
            this._applyAmbientMode();
            
            // Show toast notification once per session
            if (!this.zenToastShown) {
                this.Utils.createToast?.('Zen Mode Enabled');
                this.zenToastShown = true;
            }
        } else {
            // Remove zen class when not on watch page or when disabling
            document.body.classList.remove('ypp-zen-mode');
            this.zenToastShown = false;
            this._removeAmbientMode();
        }
    }

    async autoCinema() {
        try {
            const btn = await this.Utils.waitForElement?.('.ytp-size-button, [aria-label="Cinema mode"]', 5000);
            if (!btn) return;

            const checkAndEnableTheater = () => {
                // Only click if not already in theater mode
                const isTheater = document.querySelector('ytd-watch-flexy[theater]');
                if (!isTheater) {
                    btn.click();
                }
            };

            // Attempt immediately and verify after brief delay
            checkAndEnableTheater();
            setTimeout(checkAndEnableTheater, 1000);
        } catch (e) {
            // Silent fail if button not found or page not ready
        }
    }

    _applyAmbientMode() {
        if (this.ambientActive) return;
        this.ambientActive = true;

        this._initCanvas();
        this.lastUpdate = 0;
        this.animationFrame = requestAnimationFrame(this._loop);
    }

    _initCanvas() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.CANVAS_SIZE;
            this.canvas.height = this.CANVAS_SIZE;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
    }

    _loop(timestamp) {
        if (!this.ambientActive) return;

        // Pause if tab hidden
        if (document.hidden) {
            this.animationFrame = requestAnimationFrame(this._loop);
            return;
        }

        // Throttle to FPS
        if (timestamp - this.lastUpdate > this.FRAME_INTERVAL) {
            this.lastUpdate = timestamp;
            this._processFrame();
        }

        this.animationFrame = requestAnimationFrame(this._loop);
    }

    _processFrame() {
        // Cache Video Element
        if (!this.videoElement || !this.videoElement.isConnected) {
            this.videoElement = document.querySelector('video');
        }

        const video = this.videoElement;
        
        if (video && !video.paused && !video.ended && video.readyState >= 2) {
            try {
                this.ctx.drawImage(video, 0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);
                // Get center pixel or average
                const frame = this.ctx.getImageData(0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);
                const [r, g, b] = this._getAverageColor(frame.data);
                this._updateGlow(`rgba(${r}, ${g}, ${b}, 0.5)`);
            } catch (e) {
                // Cross-origin issues or other canvas errors
            }
        }
    }

    _updateGlow(color) {
        // Lazy-cache player element on first update
        if (!this.playerElement || !this.playerElement.isConnected) {
            this.playerElement = document.querySelector('#ytd-player') || 
                                 document.querySelector('#player-container-outer') || 
                                 document.querySelector('.html5-video-player');
        }

        if (this.playerElement) {
            // Add marker class once (avoids repeated checks)
            if (!this.playerElement.classList.contains('ypp-zen-shadow')) {
                this.playerElement.classList.add('ypp-zen-shadow');
            }
            // Hardware-accelerated box-shadow update (GPU composited)
            this.playerElement.style.boxShadow = `0 0 150px 30px ${color}`;
        }
    }

    _removeAmbientMode() {
        this.ambientActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Clean up styles
        const player = this.playerElement || document.querySelector('#ytd-player');
        if (player) {
            player.classList.remove('ypp-zen-shadow');
            player.style.boxShadow = '';
        }
        
        // Clear references
        this.videoElement = null;
        this.playerElement = null;
    }

    _getAverageColor(data) {
        let r = 0, g = 0, b = 0, count = 0;
        const length = data.length;
        const step = 4 * 4; // Sample every 4th pixel 

        for (let i = 0; i < length; i += step) {
            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
        }

        if (count === 0) return [0, 0, 0];
        return [Math.floor(r/count), Math.floor(g/count), Math.floor(b/count)];
    }
};
