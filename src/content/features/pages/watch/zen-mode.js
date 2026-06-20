/**
 * Zen Mode Feature
 * Reduces distractions on the Watch Page and adds an ambient glow effect.
 * Refactored for performance: Cached DOM elements, optimized canvas operations.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ZenMode = class ZenMode extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'zenMode'; }
    constructor() {
        super('zenMode');
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this.Utils = window.YPP.Utils || {};
        
        // State
        this.isEnabled = false;
        this.zenToastShown = false;
        this.ambientActive = false;
        this.animationFrame = null;
        
        // V2 Features
        this.audioContext = null;
        this.delayNode = null;
        this.gainNode = null;
        
        // Cached Elements
        this.canvas = null;
        this.ctx = null;
        this.videoElement = null;
        this.playerElement = null;

        // Configuration
        this.FPS = 30; // Increased to 30 FPS since we removed CPU readback
        this.FRAME_INTERVAL = 1000 / this.FPS;
        this.CANVAS_SIZE = 16; // Small resolution for blur base

        // Bindings
        this._loop = this._loop.bind(this);
        this._handleNavigation = this._handleNavigation.bind(this);
    }

    enable() {
        this.toggleZen(true);
    }

    disable() {
        this.toggleZen(false);
        super.disable();
    }

    onPageChange() {
        // Re-acquire elements after navigation
        this._clearCache();
        const isWatchPage = location.pathname === '/watch';
        
        if (isWatchPage && this.isEnabled) {
            if (this.ambientActive) {
                this._applyAmbientMode(); // Restart/Refresh loop
            }
        } else {
            this._disableAudioSpatialization();
            this._removeAmbientMode();
        }
    }

    _clearCache() {
        this.videoElement = null;
        this.playerElement = null;
    }

    toggleZen(enable) {
        const isWatchPage = location.pathname === '/watch';
        this.isEnabled = enable;
        
        // WatchPageManager handles adding/removing body.ypp-zen-mode class.
        // We only handle ambient mode and audio.
        if (enable && isWatchPage) {
            this._applyAmbientMode();
            
            // Show toast notification once per session
            if (!this.zenToastShown) {
                this.Utils.createToast?.('Zen Mode Enabled (V2)');
                this.zenToastShown = true;
            }
            this._enableAudioSpatialization();
        } else {
            this.zenToastShown = false;
            this._disableAudioSpatialization();
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

            // Attempt immediately
            checkAndEnableTheater();
            
            // Re-verify after DOM settles without using setTimeout
            if (window.YPP.sharedObserver) {
                window.YPP.sharedObserver.register('zen-cinema-check', 'ytd-watch-flexy', () => {
                    checkAndEnableTheater();
                    window.YPP.sharedObserver.unregister('zen-cinema-check');
                });
            }
        } catch (e) {
            // Silent fail if button not found or page not ready
        }
    }

    async _applyAmbientMode() {
        if (this.ambientActive) return;
        this.ambientActive = true;

        this._initCanvas();
        this.lastUpdate = 0;
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('zen-mode-player', 'ytd-player, #player-container-outer, .html5-video-player', (elements) => {
                const player = elements[0];
                const video = document.querySelector('video');
                if (player && video && this.ambientActive) {
                    this.playerElement = player;
                    this.videoElement = video;
                    if (!this.animationFrame) {
                        this.animationFrame = requestAnimationFrame(this._loop);
                    }
                }
            }, true);
        } else {
            // Fallback
            this.playerElement = document.querySelector('ytd-player') || document.querySelector('.html5-video-player');
            this.videoElement = document.querySelector('video');
            if (this.playerElement && this.videoElement) {
                this.animationFrame = requestAnimationFrame(this._loop);
            }
        }
    }

    _initCanvas() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.CANVAS_SIZE;
            this.canvas.height = this.CANVAS_SIZE;
            this.canvas.id = 'ypp-zen-glow-canvas';
            this.canvas.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                filter: blur(100px);
                opacity: 0.6;
                z-index: -1;
                pointer-events: none;
                transform: scale(1.1);
                transition: opacity 0.5s ease;
            `;
            this.ctx = this.canvas.getContext('2d', { alpha: false });
        }
        
        // Ensure it's in the DOM behind the player
        if (this.playerElement && !document.getElementById('ypp-zen-glow-canvas')) {
            this.playerElement.style.position = 'relative';
            this.playerElement.style.zIndex = '0';
            this.playerElement.insertBefore(this.canvas, this.playerElement.firstChild);
        }
    }

    _loop(timestamp) {
        if (!this.ambientActive) return;

        if (!document.hidden) {
            if (timestamp - this.lastUpdate > this.FRAME_INTERVAL) {
                this.lastUpdate = timestamp;
                
                // Ensure canvas is attached
                this._initCanvas();
                
                // Cache Video Element (fallback if poller missed it or it changed)
                if (!this.videoElement || !this.videoElement.isConnected) {
                    this.videoElement = document.querySelector('video');
                }

                const video = this.videoElement;
                if (video && !video.paused && !video.ended && video.readyState >= 2 && this.ctx) {
                    try {
                        this.ctx.drawImage(video, 0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);
                    } catch (e) {}
                }
            }
        }

        this.animationFrame = requestAnimationFrame(this._loop);
    }

    _removeAmbientMode() {
        this.ambientActive = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('zen-mode-player');
        }

        // Clean up canvas
        if (this.canvas) {
            this.canvas.style.opacity = '0';
            setTimeout(() => {
                if (this.canvas && this.canvas.parentNode) {
                    this.canvas.remove();
                }
                this.canvas = null;
                this.ctx = null;
            }, 500);
        }
        
        // Clear references
        this.videoElement = null;
        this.playerElement = null;
    }

    // =========================================================================
    // ZEN MODE V2 - AUDIO SPATIALIZATION
    // =========================================================================

    _enableAudioSpatialization() {
        const video = document.querySelector('video');
        if (!video || window.YPP.zenAudioInitialized) return;
        
        try {
            window.YPP.zenAudioInitialized = true;
            window.YPP.audioContext = window.YPP.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            if (!window.YPP.audioSource) {
                window.YPP.audioSource = window.YPP.audioContext.createMediaElementSource(video);
            }
            
            this.audioContext = window.YPP.audioContext;
            
            // Create a Delay node to simulate room reflections
            this.delayNode = this.audioContext.createDelay();
            this.delayNode.delayTime.value = 0.04; // 40ms delay for small room feel
            
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0.25; // 25% wet mix
            
            // Route: Source -> Delay -> Gain -> Destination
            window.YPP.audioSource.connect(this.delayNode);
            this.delayNode.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
            
            // Re-connect original dry signal
            window.YPP.audioSource.connect(this.audioContext.destination);
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (e) {
            this.Utils?.log('Failed to init Zen Audio Spatialization', 'ZEN', 'warn');
        }
    }

    _disableAudioSpatialization() {
        if (this.delayNode && this.gainNode) {
            try {
                this.delayNode.disconnect();
                this.gainNode.disconnect();
                window.YPP.audioSource.disconnect(this.delayNode);
            } catch (e) {}
            this.delayNode = null;
            this.gainNode = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                this.audioContext.suspend();
            } catch(e) {}
        }
    }
};
