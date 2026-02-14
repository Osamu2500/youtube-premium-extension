window.YPP.features.AmbientMode = class AmbientMode {
    constructor() {
        this.logger = new window.YPP.Utils.Logger('AmbientMode');
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        this.isActive = false;
        this.video = null;
        this.container = null;
    }

    run(settings) {
        // Only run on watch page
        if (window.location.pathname === '/watch') {
            if (settings.ambientMode) {
                this.enable();
            } else {
                this.disable();
            }
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.logger.info('Enabling Ambient Mode');
        
        this.initDOM();
        this.injectToggleButton();
        this.startLoop();
    }

    injectToggleButton() {
        // Add a button to the player controls next to Theater mode
        this.Utils.waitForElement('.ytp-size-button').then(theaterBtn => {
            if (!theaterBtn || document.getElementById('ypp-ambient-toggle')) return;

            const btn = document.createElement('button');
            btn.id = 'ypp-ambient-toggle';
            btn.className = 'ytp-button';
            btn.title = 'Ambient Mode';
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`;
            
            btn.onclick = () => {
                this.isActive ? this.disable() : this.enable();
                // Also update settings to persist state
                // Note: We'd need a way to message back to background or storage
                chrome.storage.local.get('settings', (data) => {
                    const settings = data.settings || {};
                    settings.ambientMode = this.isActive;
                    chrome.storage.local.set({ settings });
                });
            };

            if (theaterBtn.parentNode) {
                theaterBtn.parentNode.insertBefore(btn, theaterBtn);
            }
        });
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.logger.info('Disabling Ambient Mode');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    initDOM() {
        this.video = document.querySelector('video');
        if (!this.video) return;

        // Find the player container to append the ambient canvas behind it
        const player = document.querySelector('#ytd-player') || document.querySelector('.html5-video-player');
        if (!player) return;

        // Create container for the glow
        this.container = document.createElement('div');
        this.container.id = 'ypp-ambient-container';
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            pointer-events: none;
            overflow: hidden;
            transform: translateZ(0); /* Hardware acceleration */
        `;

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'ypp-ambient-canvas';
        this.canvas.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1.5);
            width: 100%;
            height: 100%;
            filter: blur(80px) saturate(1.5) brightness(0.8);
            opacity: 0.6;
        `;
        
        this.container.appendChild(this.canvas);
        player.prepend(this.container);

        this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    }

    startLoop() {
        let lastTime = 0;
        const fpsInterval = 1000 / 30; // 30 FPS

        const loop = (timestamp) => {
            if (!this.isActive) return;

            const elapsed = timestamp - lastTime;

            if (elapsed > fpsInterval) {
                lastTime = timestamp - (elapsed % fpsInterval);

                if (this.video && !this.video.paused && !this.video.ended && this.video.readyState >= 2 && !document.hidden) {
                    // Draw video to canvas
                    if (this.ctx) {
                        this.ctx.drawImage(this.video, 0, 0, 100, 100);
                    }
                }
            }
            
            this.animationFrame = requestAnimationFrame(loop);
        };
        
        // Set canvas internal resolution low for performance
        if (this.canvas) {
            this.canvas.width = 100;
            this.canvas.height = 100;
        }

        this.animationFrame = requestAnimationFrame(loop);
    }
};
