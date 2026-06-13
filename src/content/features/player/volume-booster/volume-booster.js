/**
 * Volume Booster / 10-Band Graphic Equalizer Orchestrator
 * Manages the Web Audio API graph for the active HTML5 video element.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VolumeBooster = class VolumeBooster extends window.YPP.features.BaseFeature {
    constructor() {
        super('VolumeBooster');
        this.name = 'VolumeBooster';
        this.settings = null;

        // Audio graph nodes
        this._audioConnected = false;
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.compressorNode = null;
        this.pannerNode = null;
        this.analyserNode = null;
        this._eqNodes = [];          // 10 BiquadFilterNodes
        
        // State
        this._compressorEnabled = true;
        this._monoEnabled = false;
        this._eqGains = new Array(10).fill(0);   // current dB per band
        this._volumeGain = 1.0;                  // 1.0 = 100%
        this._balance = 0.0;                     // -1.0 (Left) to 1.0 (Right)

        // DOM refs
        this._volumePopup = null;
        this._volumePopupOutsideHandler = null;
        this._boundVideo = null;
        this._initHandler = null;

        // 10 EQ band definitions — sub-bass → air
        this._bands = [
            { label: '60',  freq: 60,    type: 'lowshelf', color: '#ffffff' },
            { label: '170', freq: 170,   type: 'peaking',  color: '#ffffff' },
            { label: '310', freq: 310,   type: 'peaking',  color: '#ffffff' },
            { label: '600', freq: 600,   type: 'peaking',  color: '#ffffff' },
            { label: '1k',  freq: 1000,  type: 'peaking',  color: '#ffffff' },
            { label: '3k',  freq: 3000,  type: 'peaking',  color: '#ffffff' },
            { label: '6k',  freq: 6000,  type: 'peaking',  color: '#ffffff' },
            { label: '10k', freq: 10000, type: 'peaking',  color: '#ffffff' },
            { label: '14k', freq: 14000, type: 'peaking',  color: '#ffffff' },
            { label: '16k', freq: 16000, type: 'highshelf',color: '#ffffff' },
        ];

        // Presets — array index matches _bands order
        this._presets = {
            'Flat':       [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
            'Bass Boost': [ 8,  6,  4,  2,  0, -1,  0,  0,  0,  0],
            'Acoustic':   [ 4,  4,  3,  1,  1,  1,  3,  4,  3,  2],
            'Classical':  [ 4,  3,  2,  1, -1, -1,  0,  2,  3,  4],
            'Dance':      [ 8,  6,  3,  0,  0, -1, -2, -2,  0,  1],
            'Electronic': [ 6,  5,  2,  0, -2,  1,  0,  1,  4,  5],
            'Lo-Fi':      [ 3,  2,  0, -2, -4, -4, -3, -2, -1,  0],
            'Pop':        [-2, -1,  1,  3,  4,  4,  2,  1,  0, -1],
            'Rock':       [ 6,  4,  2, -1, -2, -1,  1,  3,  4,  5],
            'Vocal':      [-2, -1,  0,  2,  4,  4,  3,  2,  1,  0],
            'Cinematic':  [ 5,  3,  1, -1, -2,  1,  3,  4,  4,  3],
        };
    }

    getConfigKey() { 
        return 'enableVolumeBoost'; 
    }

    _loadSettings(settings) {
        if (!settings) return;
        if (settings.volumeLevel !== undefined) this._volumeGain = settings.volumeLevel;
        if (settings.volumeBalance !== undefined) this._balance = settings.volumeBalance;
        if (settings.volumeCompressor !== undefined) this._compressorEnabled = settings.volumeCompressor;
        if (settings.volumeMono !== undefined) this._monoEnabled = settings.volumeMono;
        if (settings.volumeEqBands) {
            try {
                const bands = JSON.parse(settings.volumeEqBands);
                if (Array.isArray(bands) && bands.length === 10) {
                    this._eqGains = bands.map(v => typeof v === 'number' ? v : 0);
                }
            } catch (e) {
                this.utils?.log?.('[YPP:VolumeBooster] Failed to parse EQ bands: ' + e.message, 'VolumeBooster', 'warn');
            }
        }
    }

    enable() {
        this._loadSettings(this.settings);
        const video = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video && this._needsAudioGraph()) this.initAudioContext(video);
    }

    disable() {
        // Clean up UI
        if (this._volumePopup) {
            this._volumePopup.remove();
            this._volumePopup = null;
            if (this._volumePopupOutsideHandler) {
                document.removeEventListener('click', this._volumePopupOutsideHandler);
                this._volumePopupOutsideHandler = null;
            }
            if (this._volumePopupEscapeHandler) {
                document.removeEventListener('keydown', this._volumePopupEscapeHandler);
                this._volumePopupEscapeHandler = null;
            }
        }
        
        // Bug fix: scope button removal to this feature instance's video context,
        // not a global querySelector that could remove buttons on other instances.
        const btn = this._boundVideo?.closest?.('body')?.querySelector?.('#ypp-volume-boost-btn[data-vb-id="' + this._id + '"]')
            || document.getElementById('ypp-volume-boost-btn');
        if (btn) btn.remove();

        // Clean up event listeners
        if (this._boundVideo && this._initHandler) {
            // Handled automatically by BaseFeature
            this._initHandler = null; // release closure reference
        }

        // Safely bypass audio effects without destroying the graph
        if (this._audioConnected) {
            // Reset Gain
            if (this.gainNode) {
                this.gainNode.gain.setTargetAtTime(1, this.ctx.currentTime, 0.05);
            }
            
            // Reset EQ
            this._eqNodes.forEach(n => { 
                if (n) n.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); 
            });
            
            // Bypass compressor safely
            if (this.compressorNode) {
                this.compressorNode.ratio.value = 1;
                this.compressorNode.threshold.value = 0;
            }
            
            // Reset Panner & Mono
            if (this.pannerNode) {
                this.pannerNode.pan.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            }
            if (this.source) {
                this.source.channelCount = 2;
                this.source.channelCountMode = 'max';
            }
        }
    }

    onUpdate() {
        this._loadSettings(this.settings);
        if (this._audioConnected) {
            this._restoreAudioState();
        }
        this.enable();
    }

    onPageChange() {
        if (!this.settings || !this.settings.enableVolumeBoost) return;
        const video = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video && this._needsAudioGraph()) this.initAudioContext(video);
    }

    _needsAudioGraph() {
        if (this._volumeGain !== 1.0) return true;
        if (this._balance !== 0.0) return true;
        if (this._monoEnabled) return true;
        if (this._eqGains && this._eqGains.some(g => g !== 0)) return true;
        return false;
    }

    /**
     * Initializes the Web Audio API context and binds it to the video element.
     * Uses lazy initialization on 'play' or 'volumechange' to respect browser autoplay policies.
     * @param {HTMLVideoElement} video 
     */
    initAudioContext(video) {
        // If we are already connected to THIS video, do nothing.
        // If video changed, we must disconnect the old and reconnect.
        if (this._audioConnected && this._boundVideo === video) return;
        
        // If we were connected to a DIFFERENT video, clean up the old bindings
        if (this._audioConnected && this._boundVideo && this._boundVideo !== video) {
            this.disable();
            this._audioConnected = false;
        }

        this._boundVideo = video;

        this._initHandler = () => {
            if (this._audioConnected) return;
            try {
                // Safely get or create AudioContext for this video
                if (video.__ypp_ctx && video.__ypp_source) {
                    this.ctx = video.__ypp_ctx;
                    this.source = video.__ypp_source;
                    // PREVENT AUDIO DOUBLING BUG: Disconnect source before rebuilding the graph
                    this.source.disconnect(); 
                } else {
                    const AC = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AC();
                    this.source = this.ctx.createMediaElementSource(video);
                    video.__ypp_ctx = this.ctx;
                    video.__ypp_source = this.source;
                }

                this._buildAudioGraph();

                this._audioConnected = true;
                this._restoreAudioState();

            } catch (e) {
                this.utils?.log?.('[YPP:VolumeBooster] Audio engine init failed: ' + e.message, 'VolumeBooster', 'warn');
                this._audioConnected = false;
            }
        };

        // Attempt immediate init if already playing, otherwise wait for interaction
        this.addListener(video, 'play', this._initHandler, { once: true });
        this.addListener(video, 'volumechange', this._initHandler, { once: true });
        if (!video.paused) this._initHandler();
    }

    /**
     * Constructs the audio processing chain.
     * Topology: source -> eqNodes -> panner -> compressor -> gain -> analyser -> destination
     */
    _buildAudioGraph() {
        // 1. Build 10 EQ band nodes
        this._eqNodes = this._bands.map((band, i) => {
            const f = this.ctx.createBiquadFilter();
            f.type = band.type;
            f.frequency.value = band.freq;
            f.gain.value = this._eqGains[i];
            if (band.type === 'peaking') f.Q.value = 1.4;
            return f;
        });

        // 2. Panner Node for Balance
        this.pannerNode = this.ctx.createStereoPanner();
        this.pannerNode.pan.value = this._balance;

        // 3. Compressor (Prevents clipping at high gain)
        this.compressorNode = this.ctx.createDynamicsCompressor();
        this._applyCompressorState();

        // 4. Master Gain
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this._volumeGain;

        // 5. Analyser for Visualization
        this.analyserNode = this.ctx.createAnalyser();
        this.analyserNode.fftSize = 128; // 64 bins, smooth enough for mini spectrum
        this.analyserNode.smoothingTimeConstant = 0.85;

        // Chain the nodes sequentially
        let node = this.source;
        this._eqNodes.forEach(eq => { 
            node.connect(eq); 
            node = eq; 
        });
        
        node.connect(this.pannerNode);
        this.pannerNode.connect(this.compressorNode);
        this.compressorNode.connect(this.gainNode);
        this.gainNode.connect(this.analyserNode);

        // Chain to AudioCompressor if it is active, otherwise go straight to destination
        const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video && video.__ypp_ext_compressor) {
            this.analyserNode.connect(video.__ypp_ext_compressor.input);
            video.__ypp_ext_compressor.output.connect(this.ctx.destination);
        } else {
            this.analyserNode.connect(this.ctx.destination);
        }
    }

    /**
     * Restores all internal audio states (gains, mono, etc.) to the graph.
     * Useful when re-enabling or after initial graph construction.
     */
    _restoreAudioState() {
        this.setVolume(this._volumeGain);
        this.setBalance(this._balance);
        this.setMono(this._monoEnabled);
        this._applyCompressorState();
        
        // Restore EQ gains safely
        this._eqNodes.forEach((n, i) => { 
            if (n) n.gain.setTargetAtTime(this._eqGains[i], this.ctx.currentTime, 0.05); 
        });
    }

    _applyCompressorState() {
        if (!this.compressorNode) return;
        if (this._compressorEnabled) {
            this.compressorNode.threshold.value = -24;
            this.compressorNode.knee.value = 10;
            this.compressorNode.ratio.value = 4;
            this.compressorNode.attack.value = 0.003;
            this.compressorNode.release.value = 0.25;
        } else {
            // Transparent bypass values
            this.compressorNode.threshold.value = 0;
            this.compressorNode.ratio.value = 1;
        }
    }

    setVolume(multiplier) {
        this._volumeGain = multiplier;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.gainNode && this.ctx) {
            // Ramp gracefully to avoid audio clipping/clicks
            this.gainNode.gain.setTargetAtTime(multiplier, this.ctx.currentTime, 0.05);
        }
    }

    setBalance(value) {
        this._balance = value;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.pannerNode && this.ctx) {
            this.pannerNode.pan.setTargetAtTime(value, this.ctx.currentTime, 0.05);
        }
    }

    setMono(enabled) {
        this._monoEnabled = enabled;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.ctx && this.source) {
            // Guard: channelCount setter may throw in some browsers on MediaElementAudioSourceNode
            try {
                this.source.channelCount = enabled ? 1 : 2;
                this.source.channelCountMode = enabled ? 'explicit' : 'max';
            } catch (e) {
                // Fallback: channelCountMode alone achieves a useful approximation
                this.source.channelCountMode = enabled ? 'explicit' : 'max';
            }
        }
    }

    _setEQBand(index, db) {
        this._eqGains[index] = db;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this._eqNodes[index] && this.ctx) {
            this._eqNodes[index].gain.setTargetAtTime(db, this.ctx.currentTime, 0.05);
        }
    }

    _applyPreset(name) {
        const gains = this._presets[name];
        if (!gains) return;
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        gains.forEach((db, i) => this._setEQBand(i, db));
    }

    createButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff">
            <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
        </svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Equalizer';
        btn.className = 'ypp-action-btn';
        btn.id = 'ypp-volume-boost-btn';
        btn.onclick = (e) => {
            e.stopPropagation();
            if (window.YPP.features.VolumeBoosterUI) {
                window.YPP.features.VolumeBoosterUI.toggleEQPanel(this, video, btn);
            }
        };
        return btn;
    }
};
