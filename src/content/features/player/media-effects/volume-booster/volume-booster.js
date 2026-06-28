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
        this.waveShaperNode = null;
        this.widenerSplitter = null;
        this.widenerMerger = null;
        this.widenerDelay = null;
        this.widenerGain = null;
        this._eqNodes = [];          // 10 BiquadFilterNodes
        
        // State
        this._compressorEnabled = true;
        this._monoEnabled = false;
        this._eqGains = new Array(10).fill(0);   // current dB per band
        this._eqFreqs = [60, 170, 310, 600, 1000, 3000, 6000, 10000, 14000, 16000];
        this._eqQs = new Array(10).fill(1.4);

        this._volumeGain = 1.0;                  // 1.0 = 100%
        this._balance = 0.0;                     // -1.0 (Left) to 1.0 (Right)
        this._widenerEnabled = false;
        this._warmthLevel = 0;                   // 0 to 100

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
        if (settings.volumeWidener !== undefined) this._widenerEnabled = settings.volumeWidener;
        if (settings.volumeWarmth !== undefined) this._warmthLevel = settings.volumeWarmth;
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
        if (settings.volumeEqFreqs) {
            try {
                const freqs = JSON.parse(settings.volumeEqFreqs);
                if (Array.isArray(freqs) && freqs.length === 10) this._eqFreqs = freqs;
            } catch (e) {}
        }
        if (settings.volumeEqQs) {
            try {
                const qs = JSON.parse(settings.volumeEqQs);
                if (Array.isArray(qs) && qs.length === 10) this._eqQs = qs;
            } catch (e) {}
        }
    }

    async enable() {
        await super.enable();
        this._loadSettings(this.settings);
        const video = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video && this._needsAudioGraph()) this.initAudioContext(video);
    }

    async disable() {
        // Clean up UI
        if (this._volumePopup) {
            this._volumePopup.remove();
            this._volumePopup = null;
        }
        if (this._volumePopupOutsideHandler) {
            if (this.removeListener) this.removeListener(document, 'click', this._volumePopupOutsideHandler);
            else document.removeEventListener('click', this._volumePopupOutsideHandler);
            this._volumePopupOutsideHandler = null;
        }
        if (this._volumePopupEscapeHandler) {
            if (this.removeListener) this.removeListener(document, 'keydown', this._volumePopupEscapeHandler);
            else document.removeEventListener('keydown', this._volumePopupEscapeHandler);
            this._volumePopupEscapeHandler = null;
        }
        
        // Call super to run cleanupEvents and remove all tracked listeners
        await super.disable();

        if (this._resumeAudioContextBound) {
            document.removeEventListener('click', this._resumeAudioContextBound);
            document.removeEventListener('keydown', this._resumeAudioContextBound);
            document.removeEventListener('pointerdown', this._resumeAudioContextBound);
            this._resumeAudioContextBound = null;
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
            if (this.widenerGain) {
                this.widenerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
            }
            if (this.waveShaperNode) {
                this.waveShaperNode.curve = this._makeDistortionCurve(0);
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
        // Re-load from persisted settings on every page change to guarantee
        // that in-memory values always match what was saved to Chrome storage.
        this._loadSettings(this.settings);
        const video = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video) {
            if (this._audioConnected && this._boundVideo === video) {
                // Same video element reused (YouTube SPA) — just re-apply state
                this._restoreAudioState();
            } else if (this._needsAudioGraph()) {
                this.initAudioContext(video);
            }
        }
    }

    onVideoChange(videoElement) {
        // Called by FeatureManager when a new videoId is detected
        if (!this.settings || !this.settings.enableVolumeBoost) return;
        this._loadSettings(this.settings);
        const video = videoElement || document.querySelector('.html5-main-video') || document.querySelector('video');
        if (!video) return;
        if (this._audioConnected && this._boundVideo === video) {
            // Same video element: just restore the correct audio values
            this._restoreAudioState();
        } else if (this._needsAudioGraph()) {
            this.initAudioContext(video);
        }
    }

    _needsAudioGraph() {
        if (this._volumeGain !== 1.0) return true;
        if (this._balance !== 0.0) return true;
        if (this._monoEnabled) return true;
        if (this._widenerEnabled) return true;
        if (this._warmthLevel > 0) return true;
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

                if (this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }

            } catch (e) {
                this.utils?.log?.('[YPP:VolumeBooster] Audio engine init failed: ' + e.message, 'VolumeBooster', 'warn');
                this._audioConnected = false;
            }
        };

        // Attempt immediate init if already playing, otherwise wait for interaction
        this.addListener(video, 'play', this._initHandler, { once: true });
        this.addListener(video, 'volumechange', this._initHandler, { once: true });
        
        // Ensure AudioContext resumes on user interaction to fix autoplay policy violations
        if (!this._resumeAudioContextBound) {
            this._resumeAudioContextBound = () => {
                if (this.ctx && this.ctx.state === 'suspended') {
                    this.ctx.resume().catch(() => {});
                }
            };
            document.addEventListener('click', this._resumeAudioContextBound);
            document.addEventListener('keydown', this._resumeAudioContextBound);
            document.addEventListener('pointerdown', this._resumeAudioContextBound);
        }

        if (!video.paused) this._initHandler();
    }

    /**
     * Constructs the audio processing chain.
     * Topology: source -> eqNodes -> panner -> compressor -> gain -> analyser -> destination
     */
    _buildAudioGraph() {
        // AGC Gain (Loudness Normalization)
        this.agcGain = this.ctx.createGain();
        this.agcGain.gain.value = 1.0;

        // 1. Build 10 EQ band nodes
        this._eqNodes = this._bands.map((band, i) => {
            const f = this.ctx.createBiquadFilter();
            f.type = band.type;
            f.frequency.value = this._eqFreqs[i];
            f.gain.value = this._eqGains[i];
            if (band.type === 'peaking') f.Q.value = this._eqQs[i];
            return f;
        });

        // 1.5 Harmonic Saturation (Tube Warmth)
        this.waveShaperNode = this.ctx.createWaveShaper();
        this.waveShaperNode.curve = this._makeDistortionCurve(this._warmthLevel);
        this.waveShaperNode.oversample = '4x';

        // 2. Panner Node for Balance
        this.pannerNode = this.ctx.createStereoPanner();
        this.pannerNode.pan.value = this._balance;

        // 3. Multi-Band Compression (Replacing Single-Band)
        this.mbcLowFilter = this.ctx.createBiquadFilter();
        this.mbcLowFilter.type = 'lowpass';
        this.mbcLowFilter.frequency.value = 250;
        
        this.mbcMidFilterHP = this.ctx.createBiquadFilter();
        this.mbcMidFilterHP.type = 'highpass';
        this.mbcMidFilterHP.frequency.value = 250;
        this.mbcMidFilterLP = this.ctx.createBiquadFilter();
        this.mbcMidFilterLP.type = 'lowpass';
        this.mbcMidFilterLP.frequency.value = 4000;
        
        this.mbcHighFilter = this.ctx.createBiquadFilter();
        this.mbcHighFilter.type = 'highpass';
        this.mbcHighFilter.frequency.value = 4000;

        this.mbcLowComp = this.ctx.createDynamicsCompressor();
        this.mbcMidComp = this.ctx.createDynamicsCompressor();
        this.mbcHighComp = this.ctx.createDynamicsCompressor();
        
        this.mbcSumNode = this.ctx.createGain();
        this.mbcSumNode.gain.value = 1.0;

        // Fallback/Bypass route
        this.compressorNode = this.ctx.createDynamicsCompressor();
        this.mbcBypassNode = this.ctx.createGain();

        this._applyCompressorState();

        // 4. Master Gain
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = this._volumeGain;

        // 4.5 Spatial Audio (HRTF)
        this.spatialSplitter = this.ctx.createChannelSplitter(2);
        this.spatialMerger = this.ctx.createChannelMerger(2);
        
        this.spatialLeftPanner = this.ctx.createPanner();
        this.spatialLeftPanner.panningModel = 'HRTF';
        this.spatialLeftPanner.distanceModel = 'inverse';
        this.spatialLeftPanner.positionX.value = -1.2;
        this.spatialLeftPanner.positionY.value = 0.2;
        this.spatialLeftPanner.positionZ.value = -1.5;
        
        this.spatialRightPanner = this.ctx.createPanner();
        this.spatialRightPanner.panningModel = 'HRTF';
        this.spatialRightPanner.distanceModel = 'inverse';
        this.spatialRightPanner.positionX.value = 1.2;
        this.spatialRightPanner.positionY.value = 0.2;
        this.spatialRightPanner.positionZ.value = -1.5;

        this.spatialSplitter.connect(this.spatialLeftPanner, 0); 
        this.spatialSplitter.connect(this.spatialRightPanner, 1); 
        this.spatialLeftPanner.connect(this.spatialMerger, 0, 0);
        this.spatialRightPanner.connect(this.spatialMerger, 0, 1);

        this.spatialBypassGain = this.ctx.createGain();
        this.spatialBypassGain.gain.value = this._widenerEnabled ? 0 : 1;
        this.spatialEffectGain = this.ctx.createGain();
        this.spatialEffectGain.gain.value = this._widenerEnabled ? 1 : 0;

        // 5. Analyser for Visualization & AGC
        this.analyserNode = this.ctx.createAnalyser();
        this.analyserNode.fftSize = 256; 
        this.analyserNode.smoothingTimeConstant = 0.85;

        // Chain the nodes sequentially
        let node = this.source;
        node.connect(this.agcGain);
        node = this.agcGain;
        
        node.connect(this.waveShaperNode);
        node = this.waveShaperNode;

        this._eqNodes.forEach(eq => { 
            node.connect(eq); 
            node = eq; 
        });
        
        node.connect(this.pannerNode);

        // MBC Route
        this.pannerNode.connect(this.mbcLowFilter);
        this.pannerNode.connect(this.mbcMidFilterHP);
        this.mbcMidFilterHP.connect(this.mbcMidFilterLP);
        this.pannerNode.connect(this.mbcHighFilter);
        
        this.mbcLowFilter.connect(this.mbcLowComp);
        this.mbcMidFilterLP.connect(this.mbcMidComp);
        this.mbcHighFilter.connect(this.mbcHighComp);

        this.mbcLowComp.connect(this.mbcSumNode);
        this.mbcMidComp.connect(this.mbcSumNode);
        this.mbcHighComp.connect(this.mbcSumNode);

        // Bypass Route
        this.pannerNode.connect(this.compressorNode);
        this.compressorNode.connect(this.mbcBypassNode);
        
        this.mbcSumNode.connect(this.gainNode);
        this.mbcBypassNode.connect(this.gainNode);

        // Spatial Audio Route
        this.gainNode.connect(this.spatialBypassGain);
        this.gainNode.connect(this.spatialSplitter);
        
        this.spatialMerger.connect(this.spatialEffectGain);
        
        this.spatialBypassGain.connect(this.analyserNode);
        this.spatialEffectGain.connect(this.analyserNode);

        // Output
        const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video && video.__ypp_ext_compressor) {
            this.analyserNode.connect(video.__ypp_ext_compressor.input);
            video.__ypp_ext_compressor.output.connect(this.ctx.destination);
        } else {
            this.analyserNode.connect(this.ctx.destination);
        }
        
        this._startAGC();
    }

    /**
     * Restores all internal audio states (gains, mono, etc.) to the graph.
     * Useful when re-enabling or after initial graph construction.
     */
    _restoreAudioState() {
        this.setVolume(this._volumeGain);
        this.setBalance(this._balance);
        this.setMono(this._monoEnabled);
        this.setWidener(this._widenerEnabled);
        this.setWarmth(this._warmthLevel);
        this._applyCompressorState();
        
        // Restore EQ parameters safely
        this._eqNodes.forEach((n, i) => { 
            if (n) {
                n.gain.setTargetAtTime(this._eqGains[i], this.ctx.currentTime, 0.05); 
                n.frequency.setTargetAtTime(this._eqFreqs[i], this.ctx.currentTime, 0.05);
                if (this._bands[i].type === 'peaking') {
                    n.Q.setTargetAtTime(this._eqQs[i], this.ctx.currentTime, 0.05);
                }
            }
        });
    }

    _applyCompressorState() {
        if (!this.compressorNode) return;
        
        if (this._compressorEnabled) {
            // Enable Multi-Band Compression
            if (this.mbcSumNode) this.mbcSumNode.gain.value = 1;
            if (this.mbcBypassNode) this.mbcBypassNode.gain.value = 0;
            
            // Low (Punchy, controlled)
            if (this.mbcLowComp) {
                this.mbcLowComp.threshold.value = -30;
                this.mbcLowComp.ratio.value = 6;
                this.mbcLowComp.attack.value = 0.01;
                this.mbcLowComp.release.value = 0.1;
            }
            
            // Mid (Preserve vocals)
            if (this.mbcMidComp) {
                this.mbcMidComp.threshold.value = -20;
                this.mbcMidComp.ratio.value = 2.5;
                this.mbcMidComp.attack.value = 0.05;
                this.mbcMidComp.release.value = 0.2;
            }
            
            // High (Tame harshness)
            if (this.mbcHighComp) {
                this.mbcHighComp.threshold.value = -24;
                this.mbcHighComp.ratio.value = 4;
                this.mbcHighComp.attack.value = 0.02;
                this.mbcHighComp.release.value = 0.15;
            }
        } else {
            // Bypass Multi-Band
            if (this.mbcSumNode) this.mbcSumNode.gain.value = 0;
            if (this.mbcBypassNode) this.mbcBypassNode.gain.value = 1;
            
            this.compressorNode.threshold.value = 0;
            this.compressorNode.ratio.value = 1;
        }
    }

    _startAGC() {
        if (this._agcInterval) clearInterval(this._agcInterval);
        
        // Simple AGC: Measure RMS every 100ms, adjust agcGain to hit ~ -14dBFS
        const dataArray = new Float32Array(this.analyserNode.fftSize);
        const targetRMS = 0.15; // Approx -16 LUFS
        
        this._agcInterval = setInterval(() => {
            if (!this.analyserNode || !this.agcGain || (this._boundVideo && this._boundVideo.paused)) return;
            
            this.analyserNode.getFloatTimeDomainData(dataArray);
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sumSquares += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);
            
            // Very slow, cinematic volume riding
            if (rms > 0.01) {
                const currentGain = this.agcGain.gain.value;
                let desiredGain = targetRMS / rms;
                // Clamp desired gain to prevent insane boosting or cutting
                desiredGain = Math.max(0.2, Math.min(3.0, desiredGain));
                
                // Low-pass filter the gain adjustment (slow riding)
                const newGain = currentGain + (desiredGain - currentGain) * 0.05;
                this.agcGain.gain.setTargetAtTime(newGain, this.ctx.currentTime, 0.5);
            }
        }, 100);
    }

    setVolume(multiplier) {
        this._volumeGain = multiplier;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.gainNode && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
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
            if (this.ctx.state === 'suspended') this.ctx.resume();
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

    setWidener(enabled) {
        this._widenerEnabled = enabled;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.spatialBypassGain && this.spatialEffectGain && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            
            // Crossfade between normal and HRTF spatial audio
            this.spatialBypassGain.gain.setTargetAtTime(enabled ? 0 : 1, this.ctx.currentTime, 0.05);
            this.spatialEffectGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.05);
        }
    }

    setWarmth(level) {
        this._warmthLevel = level;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this.waveShaperNode && this.ctx) {
            this.waveShaperNode.curve = this._makeDistortionCurve(level);
        }
    }

    _makeDistortionCurve(amount) {
        if (amount <= 0) return new Float32Array(2);
        // Normalize 0-100 to a sensible range for the algorithm
        const k = typeof amount === 'number' ? amount * 4 : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    _setEQBand(index, db) {
        this._eqGains[index] = db;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this._eqNodes[index] && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this._eqNodes[index].gain.setTargetAtTime(db, this.ctx.currentTime, 0.05);
        }
    }

    _setEQBandFreq(index, freq) {
        this._eqFreqs[index] = freq;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this._eqNodes[index] && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            this._eqNodes[index].frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
        }
    }

    _setEQBandQ(index, q) {
        this._eqQs[index] = q;
        if (!this._audioConnected && this._needsAudioGraph()) {
            const video = this._boundVideo || document.querySelector('.html5-main-video') || document.querySelector('video');
            if (video) this.initAudioContext(video);
        }
        if (this._eqNodes[index] && this.ctx) {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            if (this._bands[index].type === 'peaking') {
                this._eqNodes[index].Q.setTargetAtTime(q, this.ctx.currentTime, 0.05);
            }
        }
    }

    _applyPreset(name) {
        const gains = this._presets[name];
        if (!gains) return;
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        gains.forEach((db, i) => {
            this._setEQBand(i, db);
            this._setEQBandFreq(i, this._bands[i].freq); // Reset freq
            this._setEQBandQ(i, 1.4); // Reset Q
        });
    }

    createButton(initialVideo) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff">
            <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
        </svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Equalizer';
        btn.className = 'ypp-action-btn';
        btn.id = 'ypp-volume-boost-btn';
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            if (window.YPP.features.VolumeBoosterUI) {
                const activeVideo = document.querySelector('.html5-main-video') || document.querySelector('video');
                window.YPP.features.VolumeBoosterUI.toggleEQPanel(this, activeVideo, btn);
            }
        });
        return btn;
    }
};
