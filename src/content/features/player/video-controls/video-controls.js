window.YPP.features.VideoControls = class VideoControls extends window.YPP.features.BaseFeature {
    constructor() {
        super('VideoControls');
        this.panel = null;
        this.isPanelVisible = false;
    }

    getConfigKey() {
        return 'videoControlsEnabled';
    }

    async enable() {
        await super.enable();
        this.utils?.log('Running Video Controls', 'VideoControls');
        
        // Inject styles
        this.utils?.injectCSS('src/content/features/player/video-controls/video-controls.css', 'ypp-video-controls-css');

        this.injectToggle();
    }

    async disable() {
        await super.disable();
        
        // Remove Toggle
        const toggle = document.getElementById('ypp-vcp-toggle');
        if (toggle) toggle.remove();

        // Remove Panel
        if (this.panel) {
            this.panel.remove();
            this.panel = null;
        }

        // Remove CSS
        this.utils?.removeStyle('ypp-video-controls-css');
    }

    async injectToggle() {
        if (!this.utils) return;

        try {
            // Wait for player controls
            const controls = await this.utils.pollFor(() => document.querySelector('.ytp-right-controls'), 10000, 500);
            if (!this.isEnabled || !controls) return;
            if (controls.querySelector('#ypp-vcp-toggle')) return;

            const btn = document.createElement('button');
            btn.id = 'ypp-vcp-toggle';
            btn.className = 'ytp-button';
            btn.title = 'Video Controls';
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>`;
            
            btn.onclick = () => this.togglePanel();
            
            // Insert before settings button
            const settingsBtn = controls.querySelector('.ytp-settings-button');
            controls.insertBefore(btn, settingsBtn);
        } catch (error) {
            this.utils?.log('Timeout waiting for .ytp-right-controls', 'VideoControls', 'warn');
        }
    }

    togglePanel() {
        if (!this.panel) {
            this.createPanel();
        }
        
        this.isPanelVisible = !this.isPanelVisible;
        this.panel.classList.toggle('visible', this.isPanelVisible);
    }

    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'ypp-video-control-panel';
        
        this.panel.innerHTML = `
            <div class="ypp-vcp-header" id="ypp-vcp-drag">
                <div class="ypp-vcp-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                    Controls
                </div>
                <button class="ypp-vcp-close">&times;</button>
            </div>
            
            <div class="ypp-vcp-section">
                <div class="ypp-vcp-label">Playback Speed</div>
                <div class="ypp-slider-container">
                    <input type="range" min="0.25" max="4" step="0.05" value="1" class="ypp-slider" id="ypp-speed-slider">
                    <span class="ypp-value-display" id="ypp-speed-val">1.0x</span>
                </div>
            </div>

            <div class="ypp-vcp-section">
                <div class="ypp-vcp-label">Brightness</div>
                <div class="ypp-slider-container">
                    <input type="range" min="0" max="200" step="5" value="100" class="ypp-slider" id="ypp-bright-slider">
                    <span class="ypp-value-display" id="ypp-bright-val">100%</span>
                </div>
            </div>

            <div class="ypp-vcp-section">
                <div class="ypp-vcp-label">Contrast</div>
                <div class="ypp-slider-container">
                    <input type="range" min="0" max="200" step="5" value="100" class="ypp-slider" id="ypp-contrast-slider">
                    <span class="ypp-value-display" id="ypp-contrast-val">100%</span>
                </div>
            </div>

            <div class="ypp-vcp-section">
                <div class="ypp-vcp-actions">
                    <button class="ypp-action-btn" id="ypp-loop-btn">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                        Loop
                    </button>
                    <button class="ypp-action-btn" id="ypp-flip-btn">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/></svg>
                        Flip
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 8px;">
                 <button class="ypp-action-btn" id="ypp-reset-btn" style="width: 100%;">Reset All</button>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.restorePosition();
        this.setupListeners();
        this.makeDraggable();
    }

    setupListeners() {
        const video = document.querySelector('video');
        if (!video) return;

        // Speed
        const speedSlider = this.panel.querySelector('#ypp-speed-slider');
        const speedVal = this.panel.querySelector('#ypp-speed-val');
        
        this.addListener(speedSlider, 'input', (e) => {
            const val = parseFloat(e.target.value);
            video.playbackRate = val;
            speedVal.textContent = val + 'x';
        });

        // Filters (Brightness/Contrast)
        const updateFilters = () => {
            const b = this.panel.querySelector('#ypp-bright-slider').value;
            const c = this.panel.querySelector('#ypp-contrast-slider').value;
            const flipBtn = this.panel.querySelector('#ypp-flip-btn');
            const flip = flipBtn && flipBtn.classList.contains('active');
            
            let filter = `brightness(${b}%) contrast(${c}%)`;
            let transform = flip ? 'scaleX(-1)' : 'none';
            
            video.style.filter = filter;
            video.style.transform = transform;
            
            this.panel.querySelector('#ypp-bright-val').textContent = b + '%';
            this.panel.querySelector('#ypp-contrast-val').textContent = c + '%';
        };

        const brightSlider = this.panel.querySelector('#ypp-bright-slider');
        const contrastSlider = this.panel.querySelector('#ypp-contrast-slider');

        this.addListener(brightSlider, 'input', updateFilters);
        this.addListener(contrastSlider, 'input', updateFilters);

        // Double-click to reset
        this.addListener(speedSlider, 'dblclick', () => {
            speedSlider.value = 1;
            video.playbackRate = 1;
            speedVal.textContent = '1.0x';
        });

        this.addListener(brightSlider, 'dblclick', () => {
            brightSlider.value = 100;
            updateFilters();
        });

        this.addListener(contrastSlider, 'dblclick', () => {
            contrastSlider.value = 100;
            updateFilters();
        });

        // Flip
        const flipBtn = this.panel.querySelector('#ypp-flip-btn');
        this.addListener(flipBtn, 'click', (e) => {
            e.currentTarget.classList.toggle('active');
            updateFilters();
        });

        // Loop
        const loopBtn = this.panel.querySelector('#ypp-loop-btn');
        this.addListener(loopBtn, 'click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            video.loop = btn.classList.contains('active');
        });

        // Reset
        const resetBtn = this.panel.querySelector('#ypp-reset-btn');
        this.addListener(resetBtn, 'click', () => {
             video.playbackRate = 1;
             video.style.filter = '';
             video.style.transform = '';
             video.loop = false;
             
             // Reset UI
             speedSlider.value = 1;
             speedVal.textContent = '1.0x';
             
             brightSlider.value = 100;
             this.panel.querySelector('#ypp-bright-val').textContent = '100%';
             
             contrastSlider.value = 100;
             this.panel.querySelector('#ypp-contrast-val').textContent = '100%';
             
             loopBtn.classList.remove('active');
             flipBtn.classList.remove('active');
        });

        // Close
        const closeBtn = this.panel.querySelector('.ypp-vcp-close');
        this.addListener(closeBtn, 'click', () => this.togglePanel());
    }

    makeDraggable() {
        const header = this.panel.querySelector('#ypp-vcp-drag');
        // We attach these to the instance so we can remove them if needed, 
        // though document.onmousemove is global, which is a bit fragile if multiple features do this.
        // Better to use addEventListener on document and track it.
        
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            isDragging = true;
            this.panel.classList.add('dragging');
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.panel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            // Remove right/bottom positioning to allow free movement
            this.panel.style.right = 'auto';
            this.panel.style.bottom = 'auto';
            this.panel.style.left = initialLeft + 'px';
            this.panel.style.top = initialTop + 'px';
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            this.panel.style.left = (initialLeft + dx) + 'px';
            this.panel.style.top = (initialTop + dy) + 'px';
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                this.panel.classList.remove('dragging');
                
                // Save position
                const left = this.panel.style.left;
                const top = this.panel.style.top;
                localStorage.setItem('ypp-vcp-pos', JSON.stringify({ left, top }));
            }
        };

        this.addListener(header, 'mousedown', onMouseDown);
        this.addListener(document, 'mousemove', onMouseMove);
        this.addListener(document, 'mouseup', onMouseUp);
    }
    
    restorePosition() {
        const saved = localStorage.getItem('ypp-vcp-pos');
        if (saved) {
            try {
                const pos = JSON.parse(saved);
                if (pos.left && pos.top) {
                    this.panel.style.left = pos.left;
                    this.panel.style.top = pos.top;
                    // Reset default positioning
                    this.panel.style.right = 'auto';
                }
            } catch (e) {
                // Ignore invalid data
            }
        }
    }
};
