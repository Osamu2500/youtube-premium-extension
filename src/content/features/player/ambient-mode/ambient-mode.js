window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AmbientMode = class AmbientMode extends window.YPP.features.BaseFeature {
    constructor() {
        super('AmbientMode');
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        this.video = null;
        this.container = null;
        this.toggleBtn = null;
        this._playerVisible = true;  // IntersectionObserver sets this
        this._intersectionObserver = null;
        this._visibilityHandler = this._onVisibilityChange.bind(this);
    }

    getConfigKey() {
        return 'ambientMode';
    }

    async enable() {
        // Only run on watch page
        if (!this.utils.isWatchPage()) return;
        
        await super.enable();
        
        this.initDOM();
        this.injectToggleButton();
        this.startLoop();
    }

    async disable() {
        await super.disable();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }

        document.removeEventListener('visibilitychange', this._visibilityHandler);

        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        
        if (this.toggleBtn) {
            this.toggleBtn.remove();
            this.toggleBtn = null;
        }
    }

    async onUpdate() {
        // Handle live updates from the popup sliders
        if (this.isEnabled && this.canvas && this.container) {
            const intensity = this.settings?.ambientIntensity ?? 0.6;
            const blurAmount = this.settings?.ambientBlur ?? 120;
            
            this.container.style.opacity = intensity;
            
            const scaledBlur = Math.max(1, Math.round(blurAmount / 20));
            if (this.ctx) {
                this.ctx.filter = `blur(${scaledBlur}px) saturate(2.0) brightness(0.85)`;
            }
        }
    }

    async injectToggleButton() {
        try {
            if (!this.utils.pollFor) return;

            // Wait for controls to be ready
            const theaterBtn = await this.utils.pollFor(() => document.querySelector('.ytp-size-button'), 10000, 250);
            
            if (theaterBtn && !document.getElementById('ypp-ambient-toggle')) {
                const btn = document.createElement('button');
                btn.id = 'ypp-ambient-toggle';
                btn.className = 'ytp-button' + (this.isEnabled ? ' ypp-ambient-active' : '');
                btn.title = 'Ambient Mode';
                btn.setAttribute('aria-label', 'Ambient Mode');
                btn.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`;
                
                // Use the BaseFeature event listener system for automatic cleanup
                this.addListener(btn, 'click', async () => {
                    const willEnable = !this.isEnabled;
                    
                    if (willEnable) {
                        await this.enable();
                        this.isEnabled = true;
                        btn.classList.add('ypp-ambient-active');
                    } else {
                        await this.disable();
                        this.isEnabled = false;
                        btn.classList.remove('ypp-ambient-active');
                    }
                    
                    // Save state to storage
                    try {
                        const settings = await this.utils.loadSettings();
                        const newSettings = { ...settings, ambientMode: willEnable };
                        await this.utils.saveSettings(newSettings);
                    } catch (error) {
                        this.utils.log?.('Failed to save ambient mode state: ' + error.message, 'AMBIENT', 'error');
                    }
                });

                if (theaterBtn.parentNode) {
                    theaterBtn.parentNode.insertBefore(btn, theaterBtn);
                    this.toggleBtn = btn;
                }
            }
        } catch (error) {
            this.utils.log?.('Failed to inject toggle button: ' + error.message, 'AMBIENT', 'error');
        }
    }

    initDOM() {
        this.video = document.querySelector('video');
        if (!this.video) return;

        // Find the watch page container to append the ambient canvas behind EVERYTHING
        const watchContainer = document.querySelector('ytd-watch-flexy');
        if (!watchContainer) return;

        // Create container for the massive glow
        this.container = document.createElement('div');
        this.container.id = 'ypp-massive-ambient-container';
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150vh; /* Bleed way down the page */
            z-index: -1; /* Behind all content */
            pointer-events: none;
            overflow: hidden;
            transform: translateZ(0); /* Hardware acceleration */
            opacity: ${this.settings?.ambientIntensity || 0.6};
            transition: opacity 0.5s ease;
        `;

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'ypp-massive-ambient-canvas';
        
        const blurAmount = this.settings?.ambientBlur || 120;
        
        this.canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%) scale(1.2);
            width: 100vw;
            height: 100vh;
            image-rendering: auto; /* Allow native bilinear stretching */
            mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
        `;
        
        this.container.appendChild(this.canvas);
        
        // Ensure ytd-watch-flexy doesn't clip our absolute child, and has relative positioning
        watchContainer.style.position = 'relative';
        
        // Insert at the very beginning of watch container
        watchContainer.insertBefore(this.container, watchContainer.firstChild);

        this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
        // Set the internal context blur based on settings, scaled for a 100x100 canvas.
        // A blur of 120px on a 1920px screen is ~6% of the width. 
        // 6% of our 100px canvas is 6px.
        const originalBlur = this.settings?.ambientBlur || 120;
        const scaledBlur = Math.max(1, Math.round(originalBlur / 20));
        this.ctx.filter = `blur(${scaledBlur}px) saturate(2.0) brightness(0.85)`;
    }

    startLoop() {
        let lastTime = 0;
        const fpsInterval = 1000 / 5; // 5 FPS — low enough to stay cheap, enough for smooth glow

        // Pause loop when player is off-screen (IntersectionObserver)
        if (this.video) {
            this._intersectionObserver = new IntersectionObserver(
                ([entry]) => { this._playerVisible = entry.isIntersecting; },
                { threshold: 0.05 }
            );
            this._intersectionObserver.observe(this.video);
        }

        // Pause loop when browser tab is hidden
        document.addEventListener('visibilitychange', this._visibilityHandler);

        const loop = (timestamp) => {
            if (!this.isEnabled) return;

            const elapsed = timestamp - lastTime;

            if (elapsed > fpsInterval) {
                lastTime = timestamp - (elapsed % fpsInterval);

                const shouldDraw =
                    this.video &&
                    !this.video.paused &&
                    !this.video.ended &&
                    this.video.readyState >= 2 &&
                    !document.hidden &&       // tab-level pause
                    this._playerVisible;      // viewport-level pause

                if (shouldDraw && this.ctx) {
                    this.ctx.drawImage(this.video, 0, 0, 16, 16);
                }
            }
            
            this.animationFrame = requestAnimationFrame(loop);
        };
        
        // Set canvas internal resolution extremely low for performance
        if (this.canvas) {
            this.canvas.width = 16;
            this.canvas.height = 16;
        }

        this.animationFrame = requestAnimationFrame(loop);
    }
    /** Called by visibilitychange — no-op if loop isn't running */
    _onVisibilityChange() {
        // Loop already guards document.hidden; just log for debug purposes
        this.utils?.log?.(
            `Tab visibility: ${document.hidden ? 'hidden (paused)' : 'visible (resumed)'}`,
            'AMBIENT', 'debug'
        );
    }
};
