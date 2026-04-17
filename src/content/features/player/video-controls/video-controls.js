window.YPP.features.VideoControls = class VideoControls extends window.YPP.features.BaseFeature {
    constructor() {
        super('VideoControls');
        this.panel = null;
        this.isPanelVisible = false;

        // Audio processing chain
        this._audioCtx = null;
        this._gainNode = null;
        this._compressor = null;
        this._bassFilter = null;
        this._trebleFilter = null;
        this._sourceNode = null;
        this._audioConnected = false;
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

        // Clean up audio chain
        this._teardownAudio();

        // Remove CSS
        this.utils?.removeStyle('ypp-video-controls-css');
    }

    // ─── Audio Engine ──────────────────────────────────────────────────────────

    _setupAudio(video) {
        if (this._audioConnected) return;
        try {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();

            // Source: the video element
            this._sourceNode = this._audioCtx.createMediaElementSource(video);

            // Gain node – volume boost (1.0 = native, up to 5.0 = 500%)
            this._gainNode = this._audioCtx.createGain();
            this._gainNode.gain.value = 1.0;

            // DynamicsCompressor – prevents clipping / distortion at high gain
            this._compressor = this._audioCtx.createDynamicsCompressor();
            this._compressor.threshold.value = -24;  // dB: start compressing
            this._compressor.knee.value = 10;
            this._compressor.ratio.value = 4;
            this._compressor.attack.value = 0.003;
            this._compressor.release.value = 0.25;

            // Bass shelf filter
            this._bassFilter = this._audioCtx.createBiquadFilter();
            this._bassFilter.type = 'lowshelf';
            this._bassFilter.frequency.value = 250;
            this._bassFilter.gain.value = 0;

            // Treble shelf filter
            this._trebleFilter = this._audioCtx.createBiquadFilter();
            this._trebleFilter.type = 'highshelf';
            this._trebleFilter.frequency.value = 4000;
            this._trebleFilter.gain.value = 0;

            // Chain: source → bass → treble → compressor → gain → output
            this._sourceNode
                .connect(this._bassFilter)
                .connect(this._trebleFilter)
                .connect(this._compressor)
                .connect(this._gainNode)
                .connect(this._audioCtx.destination);

            this._audioConnected = true;
            this.utils?.log('Audio engine started', 'VideoControls');
        } catch (err) {
            this.utils?.log('Failed to set up audio engine: ' + err.message, 'VideoControls', 'warn');
        }
    }

    _teardownAudio() {
        try {
            if (this._sourceNode) this._sourceNode.disconnect();
            if (this._bassFilter) this._bassFilter.disconnect();
            if (this._trebleFilter) this._trebleFilter.disconnect();
            if (this._compressor) this._compressor.disconnect();
            if (this._gainNode) this._gainNode.disconnect();
            if (this._audioCtx) this._audioCtx.close();
        } catch (_) {}
        this._audioCtx = null;
        this._gainNode = null;
        this._compressor = null;
        this._bassFilter = null;
        this._trebleFilter = null;
        this._sourceNode = null;
        this._audioConnected = false;
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
            this.utils?.log('Timeout waiting for .ytp-right-controls', 'VideoControls', 'debug');
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

            <!-- ── Volume Booster ─────────────────────────────────────────── -->
            <div class="ypp-vcp-divider"></div>
            <div class="ypp-vcp-section">
                <div class="ypp-vcp-label-row">
                    <span class="ypp-vcp-label ypp-label-accent">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        Volume Booster
                    </span>
                    <span class="ypp-badge" id="ypp-boost-badge">OFF</span>
                </div>
                <div class="ypp-slider-container">
                    <input type="range" min="1" max="5" step="0.05" value="1" class="ypp-slider ypp-slider-accent" id="ypp-volume-slider">
                    <span class="ypp-value-display" id="ypp-volume-val">100%</span>
                </div>
                <div class="ypp-vcp-hint">Boost beyond native 100% — up to 500%</div>
            </div>

            <!-- ── Audio Enhancer ─────────────────────────────────────────── -->
            <div class="ypp-vcp-section">
                <div class="ypp-vcp-label-row">
                    <span class="ypp-vcp-label ypp-label-accent">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 3v9.28a4 4 0 1 0 2 3.47V11h4V9h-4V3h-2zM12 19a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
                        Audio Enhancer
                    </span>
                    <button class="ypp-pill-toggle" id="ypp-enhancer-toggle" aria-pressed="false">OFF</button>
                </div>
                <div class="ypp-enhancer-body" id="ypp-enhancer-body">
                    <div class="ypp-vcp-sub-label">Bass Boost</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-bass-slider">
                        <span class="ypp-value-display" id="ypp-bass-val">0 dB</span>
                    </div>
                    <div class="ypp-vcp-sub-label">Treble Boost</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-treble-slider">
                        <span class="ypp-value-display" id="ypp-treble-val">0 dB</span>
                    </div>
                    <div class="ypp-vcp-hint">Compressor active — audio stays clear at high volumes</div>
                </div>
            </div>

            <div class="ypp-vcp-divider"></div>
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

        // ── Volume Booster ──────────────────────────────────────────────────
        const volumeSlider = this.panel.querySelector('#ypp-volume-slider');
        const volumeVal    = this.panel.querySelector('#ypp-volume-val');
        const boostBadge   = this.panel.querySelector('#ypp-boost-badge');

        const ensureAudio = () => {
            if (!this._audioConnected) this._setupAudio(video);
        };

        this.addListener(volumeSlider, 'input', (e) => {
            const gain = parseFloat(e.target.value);
            ensureAudio();
            if (this._gainNode) this._gainNode.gain.value = gain;
            volumeVal.textContent = Math.round(gain * 100) + '%';
            volumeSlider.style.setProperty('--pct', ((gain - 1) / 4 * 100) + '%');
            const boosting = gain > 1.01;
            boostBadge.textContent = boosting ? Math.round(gain * 100) + '%' : 'OFF';
            boostBadge.classList.toggle('active', boosting);
        });

        this.addListener(volumeSlider, 'dblclick', () => {
            volumeSlider.value = 1;
            if (this._gainNode) this._gainNode.gain.value = 1;
            volumeVal.textContent = '100%';
            boostBadge.textContent = 'OFF';
            boostBadge.classList.remove('active');
            volumeSlider.style.setProperty('--pct', '0%');
        });

        // ── Audio Enhancer ──────────────────────────────────────────────────
        const enhancerToggle = this.panel.querySelector('#ypp-enhancer-toggle');
        const enhancerBody   = this.panel.querySelector('#ypp-enhancer-body');
        const bassSlider     = this.panel.querySelector('#ypp-bass-slider');
        const bassVal        = this.panel.querySelector('#ypp-bass-val');
        const trebleSlider   = this.panel.querySelector('#ypp-treble-slider');
        const trebleVal      = this.panel.querySelector('#ypp-treble-val');

        let enhancerOn = false;

        enhancerBody.style.display = 'none';

        this.addListener(enhancerToggle, 'click', () => {
            enhancerOn = !enhancerOn;
            enhancerToggle.textContent = enhancerOn ? 'ON' : 'OFF';
            enhancerToggle.setAttribute('aria-pressed', String(enhancerOn));
            enhancerToggle.classList.toggle('on', enhancerOn);
            enhancerBody.style.display = enhancerOn ? 'flex' : 'none';

            if (enhancerOn) {
                ensureAudio();
                // Apply current slider values
                if (this._bassFilter)   this._bassFilter.gain.value   = parseFloat(bassSlider.value);
                if (this._trebleFilter) this._trebleFilter.gain.value = parseFloat(trebleSlider.value);
                if (this._compressor)   this._compressor.ratio.value  = 4;
            } else {
                // Bypass enhancer (zero EQ, relax compressor)
                if (this._bassFilter)   this._bassFilter.gain.value   = 0;
                if (this._trebleFilter) this._trebleFilter.gain.value = 0;
                if (this._compressor)   this._compressor.ratio.value  = 1;
            }
        });

        this.addListener(bassSlider, 'input', (e) => {
            const db = parseInt(e.target.value);
            if (this._bassFilter && enhancerOn) this._bassFilter.gain.value = db;
            bassVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        });

        this.addListener(trebleSlider, 'input', (e) => {
            const db = parseInt(e.target.value);
            if (this._trebleFilter && enhancerOn) this._trebleFilter.gain.value = db;
            trebleVal.textContent = (db >= 0 ? '+' : '') + db + ' dB';
        });

        // ── Reset All ───────────────────────────────────────────────────────
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

             // Reset volume booster
             volumeSlider.value = 1;
             volumeVal.textContent = '100%';
             volumeSlider.style.setProperty('--pct', '0%');
             boostBadge.textContent = 'OFF';
             boostBadge.classList.remove('active');
             if (this._gainNode) this._gainNode.gain.value = 1;

             // Reset enhancer
             enhancerOn = false;
             enhancerToggle.textContent = 'OFF';
             enhancerToggle.setAttribute('aria-pressed', 'false');
             enhancerToggle.classList.remove('on');
             enhancerBody.style.display = 'none';
             bassSlider.value = 0;
             bassVal.textContent = '0 dB';
             trebleSlider.value = 0;
             trebleVal.textContent = '0 dB';
             if (this._bassFilter)   this._bassFilter.gain.value   = 0;
             if (this._trebleFilter) this._trebleFilter.gain.value = 0;
             if (this._compressor)   this._compressor.ratio.value  = 1;
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
