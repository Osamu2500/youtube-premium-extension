import './video-controls.css';

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
        this._midFilter = null;
        this._trebleFilter = null;
        this._pannerNode = null;
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

            // Mid peaking filter
            this._midFilter = this._audioCtx.createBiquadFilter();
            this._midFilter.type = 'peaking';
            this._midFilter.frequency.value = 1000;
            this._midFilter.Q.value = 1;
            this._midFilter.gain.value = 0;

            // Treble shelf filter
            this._trebleFilter = this._audioCtx.createBiquadFilter();
            this._trebleFilter.type = 'highshelf';
            this._trebleFilter.frequency.value = 4000;
            this._trebleFilter.gain.value = 0;

            // Stereo Panner
            this._pannerNode = this._audioCtx.createStereoPanner();
            this._pannerNode.pan.value = 0;

            // Chain: source → bass → mid → treble → panner → compressor → gain → output
            this._sourceNode
                .connect(this._bassFilter)
                .connect(this._midFilter)
                .connect(this._trebleFilter)
                .connect(this._pannerNode)
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
            if (this._midFilter) this._midFilter.disconnect();
            if (this._trebleFilter) this._trebleFilter.disconnect();
            if (this._pannerNode) this._pannerNode.disconnect();
            if (this._compressor) this._compressor.disconnect();
            if (this._gainNode) this._gainNode.disconnect();
            if (this._audioCtx) this._audioCtx.close();
        } catch (_) {}
        this._audioCtx = null;
        this._gainNode = null;
        this._compressor = null;
        this._pannerNode = null;
        this._bassFilter = null;
        this._midFilter = null;
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
                    Control Center
                </div>
                <button class="ypp-vcp-close">&times;</button>
            </div>
            
            <div class="ypp-vcp-tabs">
                <button class="ypp-vcp-tab active" data-tab="video">🎬 Video</button>
                <button class="ypp-vcp-tab" data-tab="audio">🎧 Audio</button>
            </div>
            
            <!-- 🎬 VIDEO TAB -->
            <div class="ypp-vcp-tab-content active" id="ypp-tab-video">
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Playback Speed</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0.25" max="4" step="0.05" value="1" class="ypp-slider" id="ypp-speed-slider">
                        <span class="ypp-value-display" id="ypp-speed-val">1.0x</span>
                    </div>
                </div>

                <div class="ypp-vcp-divider"></div>
                <div class="ypp-vcp-section-title">Cinematic Filters</div>

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
                    <div class="ypp-vcp-label">Saturation</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0" max="300" step="5" value="100" class="ypp-slider ypp-slider-accent" id="ypp-sat-slider">
                        <span class="ypp-value-display" id="ypp-sat-val">100%</span>
                    </div>
                </div>
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Hue Shift</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-180" max="180" step="5" value="0" class="ypp-slider ypp-slider-accent" id="ypp-hue-slider">
                        <span class="ypp-value-display" id="ypp-hue-val">0°</span>
                    </div>
                </div>

                <div class="ypp-vcp-actions" style="margin-top: 12px;">
                    <button class="ypp-action-btn" id="ypp-sepia-btn">Sepia</button>
                    <button class="ypp-action-btn" id="ypp-gray-btn">Grayscale</button>
                    <button class="ypp-action-btn" id="ypp-flip-btn">Flip</button>
                    <button class="ypp-action-btn" id="ypp-loop-btn">Loop</button>
                </div>
            </div>

            <!-- 🎧 AUDIO TAB -->
            <div class="ypp-vcp-tab-content" id="ypp-tab-audio">
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label-row">
                        <span class="ypp-vcp-label ypp-label-accent">Volume Booster</span>
                        <span class="ypp-badge" id="ypp-boost-badge">OFF</span>
                    </div>
                    <div class="ypp-slider-container">
                        <input type="range" min="1" max="5" step="0.05" value="1" class="ypp-slider ypp-slider-accent" id="ypp-volume-slider">
                        <span class="ypp-value-display" id="ypp-volume-val">100%</span>
                    </div>
                </div>
                
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Stereo Pan</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-1" max="1" step="0.1" value="0" class="ypp-slider" id="ypp-pan-slider">
                        <span class="ypp-value-display" id="ypp-pan-val">C</span>
                    </div>
                </div>

                <div class="ypp-vcp-divider"></div>
                
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label-row">
                        <span class="ypp-vcp-section-title" style="margin:0;">Pro Equalizer</span>
                        <button class="ypp-pill-toggle" id="ypp-enhancer-toggle" aria-pressed="false">OFF</button>
                    </div>
                    <div class="ypp-enhancer-body" id="ypp-enhancer-body">
                        <div class="ypp-vcp-sub-label">Bass</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-bass-slider">
                            <span class="ypp-value-display" id="ypp-bass-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-sub-label">Mid (Vocals)</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-mid-slider">
                            <span class="ypp-value-display" id="ypp-mid-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-sub-label">Treble</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-treble-slider">
                            <span class="ypp-value-display" id="ypp-treble-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-hint" style="margin-top:8px;">Studio compressor active. Prevents peaking at high volumes.</div>
                    </div>
                </div>
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

        // ── Tabs Switching ──────────────────────────────────────────────────
        const tabs = this.panel.querySelectorAll('.ypp-vcp-tab');
        const contents = this.panel.querySelectorAll('.ypp-vcp-tab-content');
        
        tabs.forEach(tab => {
            this.addListener(tab, 'click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetId = `ypp-tab-${tab.dataset.tab}`;
                this.panel.querySelector('#' + targetId).classList.add('active');
            });
        });

        // ── Video Controls ──────────────────────────────────────────────────
        const speedSlider = this.panel.querySelector('#ypp-speed-slider');
        const speedVal = this.panel.querySelector('#ypp-speed-val');
        
        this.addListener(speedSlider, 'input', (e) => {
            const val = parseFloat(e.target.value);
            video.playbackRate = val;
            speedVal.textContent = val + 'x';
        });

        const brightSlider = this.panel.querySelector('#ypp-bright-slider');
        const contrastSlider = this.panel.querySelector('#ypp-contrast-slider');
        const satSlider = this.panel.querySelector('#ypp-sat-slider');
        const hueSlider = this.panel.querySelector('#ypp-hue-slider');
        const sepiaBtn = this.panel.querySelector('#ypp-sepia-btn');
        const grayBtn = this.panel.querySelector('#ypp-gray-btn');
        const flipBtn = this.panel.querySelector('#ypp-flip-btn');
        const loopBtn = this.panel.querySelector('#ypp-loop-btn');

        const updateFilters = () => {
            const b = brightSlider.value;
            const c = contrastSlider.value;
            const s = satSlider.value;
            const h = hueSlider.value;
            
            const sepia = sepiaBtn.classList.contains('active') ? 'sepia(100%)' : '';
            const gray = grayBtn.classList.contains('active') ? 'grayscale(100%)' : '';
            const flip = flipBtn.classList.contains('active');
            
            let filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) ${sepia} ${gray}`.trim();
            let transform = flip ? 'scaleX(-1)' : 'none';
            
            video.style.filter = filter;
            video.style.transform = transform;
            
            this.panel.querySelector('#ypp-bright-val').textContent = b + '%';
            this.panel.querySelector('#ypp-contrast-val').textContent = c + '%';
            this.panel.querySelector('#ypp-sat-val').textContent = s + '%';
            this.panel.querySelector('#ypp-hue-val').textContent = h + '°';
            
            updateSliderFill(brightSlider, b, 200);
            updateSliderFill(contrastSlider, c, 200);
            updateSliderFill(satSlider, s, 300);
            updateSliderFill(hueSlider, parseInt(h) + 180, 360);
        };

        const updateSliderFill = (slider, val, max) => {
            slider.style.setProperty('--pct', ((val / max) * 100) + '%');
        };

        [brightSlider, contrastSlider, satSlider, hueSlider].forEach(slider => {
            this.addListener(slider, 'input', updateFilters);
        });

        // Toggles
        [sepiaBtn, grayBtn, flipBtn].forEach(btn => {
            this.addListener(btn, 'click', (e) => {
                e.currentTarget.classList.toggle('active');
                updateFilters();
            });
        });

        this.addListener(loopBtn, 'click', (e) => {
            e.currentTarget.classList.toggle('active');
            video.loop = e.currentTarget.classList.contains('active');
        });

        // Double-click to reset sliders
        this.addListener(speedSlider, 'dblclick', () => { speedSlider.value = 1; video.playbackRate = 1; speedVal.textContent = '1.0x'; });
        this.addListener(brightSlider, 'dblclick', () => { brightSlider.value = 100; updateFilters(); });
        this.addListener(contrastSlider, 'dblclick', () => { contrastSlider.value = 100; updateFilters(); });
        this.addListener(satSlider, 'dblclick', () => { satSlider.value = 100; updateFilters(); });
        this.addListener(hueSlider, 'dblclick', () => { hueSlider.value = 0; updateFilters(); });

        // ── Audio Controls ──────────────────────────────────────────────────
        const volumeSlider = this.panel.querySelector('#ypp-volume-slider');
        const volumeVal    = this.panel.querySelector('#ypp-volume-val');
        const boostBadge   = this.panel.querySelector('#ypp-boost-badge');

        const panSlider = this.panel.querySelector('#ypp-pan-slider');
        const panVal = this.panel.querySelector('#ypp-pan-val');

        const enhancerToggle = this.panel.querySelector('#ypp-enhancer-toggle');
        const enhancerBody   = this.panel.querySelector('#ypp-enhancer-body');
        const bassSlider     = this.panel.querySelector('#ypp-bass-slider');
        const bassVal        = this.panel.querySelector('#ypp-bass-val');
        const midSlider      = this.panel.querySelector('#ypp-mid-slider');
        const midVal         = this.panel.querySelector('#ypp-mid-val');
        const trebleSlider   = this.panel.querySelector('#ypp-treble-slider');
        const trebleVal      = this.panel.querySelector('#ypp-treble-val');

        let enhancerOn = false;
        enhancerBody.style.display = 'none';

        const ensureAudio = () => {
            if (!this._audioConnected) this._setupAudio(video);
        };

        // Volume
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

        // Stereo Pan
        this.addListener(panSlider, 'input', (e) => {
            const val = parseFloat(e.target.value);
            ensureAudio();
            if (this._pannerNode) this._pannerNode.pan.value = val;
            
            let label = 'C';
            if (val < 0) label = `L ${Math.abs(Math.round(val * 100))}%`;
            if (val > 0) label = `R ${Math.round(val * 100)}%`;
            panVal.textContent = label;
            panSlider.style.setProperty('--pct', ((val + 1) / 2 * 100) + '%');
        });

        this.addListener(panSlider, 'dblclick', () => {
            panSlider.value = 0;
            if (this._pannerNode) this._pannerNode.pan.value = 0;
            panVal.textContent = 'C';
            panSlider.style.setProperty('--pct', '50%');
        });

        // EQ Enhancer
        this.addListener(enhancerToggle, 'click', () => {
            enhancerOn = !enhancerOn;
            enhancerToggle.textContent = enhancerOn ? 'ON' : 'OFF';
            enhancerToggle.setAttribute('aria-pressed', String(enhancerOn));
            enhancerToggle.classList.toggle('on', enhancerOn);
            enhancerBody.style.display = enhancerOn ? 'flex' : 'none';

            if (enhancerOn) {
                ensureAudio();
                if (this._bassFilter)   this._bassFilter.gain.value   = parseFloat(bassSlider.value);
                if (this._midFilter)    this._midFilter.gain.value    = parseFloat(midSlider.value);
                if (this._trebleFilter) this._trebleFilter.gain.value = parseFloat(trebleSlider.value);
                if (this._compressor)   this._compressor.ratio.value  = 4;
            } else {
                if (this._bassFilter)   this._bassFilter.gain.value   = 0;
                if (this._midFilter)    this._midFilter.gain.value    = 0;
                if (this._trebleFilter) this._trebleFilter.gain.value = 0;
                if (this._compressor)   this._compressor.ratio.value  = 1;
            }
        });

        const bindEQ = (slider, display, filterNode) => {
            this.addListener(slider, 'input', (e) => {
                const db = parseInt(e.target.value);
                if (filterNode && enhancerOn) filterNode.gain.value = db;
                display.textContent = (db > 0 ? '+' : '') + db + ' dB';
                slider.style.setProperty('--pct', ((db + 12) / 24 * 100) + '%');
            });
            this.addListener(slider, 'dblclick', () => {
                slider.value = 0;
                if (filterNode && enhancerOn) filterNode.gain.value = 0;
                display.textContent = '0 dB';
                slider.style.setProperty('--pct', '50%');
            });
        };

        // Delay binding to wait for audio init if needed, but slider just triggers values
        // We capture `this._bassFilter` getter dynamically by passing a wrapper function or just direct
        this.addListener(bassSlider, 'input', (e) => {
            const db = parseInt(e.target.value);
            if (this._bassFilter && enhancerOn) this._bassFilter.gain.value = db;
            bassVal.textContent = (db > 0 ? '+' : '') + db + ' dB';
            bassSlider.style.setProperty('--pct', ((db + 12) / 24 * 100) + '%');
        });
        this.addListener(bassSlider, 'dblclick', () => { bassSlider.value = 0; bassSlider.dispatchEvent(new Event('input')); });

        this.addListener(midSlider, 'input', (e) => {
            const db = parseInt(e.target.value);
            if (this._midFilter && enhancerOn) this._midFilter.gain.value = db;
            midVal.textContent = (db > 0 ? '+' : '') + db + ' dB';
            midSlider.style.setProperty('--pct', ((db + 12) / 24 * 100) + '%');
        });
        this.addListener(midSlider, 'dblclick', () => { midSlider.value = 0; midSlider.dispatchEvent(new Event('input')); });

        this.addListener(trebleSlider, 'input', (e) => {
            const db = parseInt(e.target.value);
            if (this._trebleFilter && enhancerOn) this._trebleFilter.gain.value = db;
            trebleVal.textContent = (db > 0 ? '+' : '') + db + ' dB';
            trebleSlider.style.setProperty('--pct', ((db + 12) / 24 * 100) + '%');
        });
        this.addListener(trebleSlider, 'dblclick', () => { trebleSlider.value = 0; trebleSlider.dispatchEvent(new Event('input')); });

        // ── Reset All ───────────────────────────────────────────────────────
        const resetBtn = this.panel.querySelector('#ypp-reset-btn');
        this.addListener(resetBtn, 'click', () => {
             video.playbackRate = 1;
             video.style.filter = '';
             video.style.transform = '';
             video.loop = false;
             
             // Reset UI Speed
             speedSlider.value = 1;
             speedVal.textContent = '1.0x';
             
             // Reset Cinematic UI
             brightSlider.value = 100;
             this.panel.querySelector('#ypp-bright-val').textContent = '100%';
             brightSlider.style.setProperty('--pct', '50%');
             
             contrastSlider.value = 100;
             this.panel.querySelector('#ypp-contrast-val').textContent = '100%';
             contrastSlider.style.setProperty('--pct', '50%');

             satSlider.value = 100;
             this.panel.querySelector('#ypp-sat-val').textContent = '100%';
             satSlider.style.setProperty('--pct', '33%');

             hueSlider.value = 0;
             this.panel.querySelector('#ypp-hue-val').textContent = '0°';
             hueSlider.style.setProperty('--pct', '50%');
             
             sepiaBtn.classList.remove('active');
             grayBtn.classList.remove('active');
             loopBtn.classList.remove('active');
             flipBtn.classList.remove('active');

             // Reset volume booster
             volumeSlider.value = 1;
             volumeVal.textContent = '100%';
             volumeSlider.style.setProperty('--pct', '0%');
             boostBadge.textContent = 'OFF';
             boostBadge.classList.remove('active');
             if (this._gainNode) this._gainNode.gain.value = 1;

             // Reset pan
             panSlider.value = 0;
             panVal.textContent = 'C';
             panSlider.style.setProperty('--pct', '50%');
             if (this._pannerNode) this._pannerNode.pan.value = 0;

             // Reset enhancer
             enhancerOn = false;
             enhancerToggle.textContent = 'OFF';
             enhancerToggle.setAttribute('aria-pressed', 'false');
             enhancerToggle.classList.remove('on');
             enhancerBody.style.display = 'none';

             bassSlider.value = 0; bassVal.textContent = '0 dB'; bassSlider.style.setProperty('--pct', '50%');
             midSlider.value = 0; midVal.textContent = '0 dB'; midSlider.style.setProperty('--pct', '50%');
             trebleSlider.value = 0; trebleVal.textContent = '0 dB'; trebleSlider.style.setProperty('--pct', '50%');
             
             if (this._bassFilter)   this._bassFilter.gain.value   = 0;
             if (this._midFilter)    this._midFilter.gain.value    = 0;
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
