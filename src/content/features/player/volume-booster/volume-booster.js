/**
 * Volume Booster / 10-Band Graphic Equalizer Orchestrator
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VolumeBooster = class VolumeBooster {
    constructor() {
        this.name = 'VolumeBooster';
        this.settings = null;

        // Audio graph nodes
        this._audioConnected = false;
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.compressorNode = null;
        this._eqNodes = [];          // 10 BiquadFilterNodes
        this._compressorEnabled = true;

        // State
        this._eqGains = new Array(10).fill(0);   // current dB per band
        this._volumeGain = 1.0;                  // 1.0 = 100%

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
            'Vocal':      [-2, -1,  0,  2,  4,  4,  3,  2,  1,  0],
            'Cinematic':  [ 5,  3,  1, -1, -2,  1,  3,  4,  4,  3],
            'Lo-Fi':      [ 3,  2,  0, -2, -4, -4, -3, -2, -1,  0],
        };
    }

    getConfigKey() { return 'enableVolumeBoost'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        if (this._volumePopup) {
            this._volumePopup.remove();
            this._volumePopup = null;
            if (this._volumePopupOutsideHandler) {
                document.removeEventListener('click', this._volumePopupOutsideHandler);
                this._volumePopupOutsideHandler = null;
            }
        }
        if (this.gainNode) this.gainNode.gain.value = 1;
        this._eqNodes.forEach(n => { if (n) n.gain.value = 0; });
        const btn = document.getElementById('ypp-volume-boost-btn');
        if (btn) btn.remove();
        if (this._boundVideo && this._initHandler) {
            this._boundVideo.removeEventListener('play', this._initHandler);
            this._boundVideo.removeEventListener('volumechange', this._initHandler);
        }
    }

    update(settings) {
        this.settings = settings;
        if (this.settings.enableVolumeBoost) {
            if (this.gainNode && this.settings.volumeLevel) {
                this.setVolume(this.settings.volumeLevel);
            }
            this.run();
        } else {
            this.disable();
        }
    }

    run() {
        if (!this.settings || !this.settings.enableVolumeBoost) return;
        const video = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (video) this.initAudioContext(video);
    }

    initAudioContext(video) {
        if (this._audioConnected) return;
        this._boundVideo = video;

        this._initHandler = () => {
            if (this._audioConnected) return;
            try {
                const AC = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AC();
                this.source = this.ctx.createMediaElementSource(video);

                // Build 10 EQ band nodes
                this._eqNodes = this._bands.map((band, i) => {
                    const f = this.ctx.createBiquadFilter();
                    f.type = band.type;
                    f.frequency.value = band.freq;
                    f.gain.value = this._eqGains[i];
                    if (band.type === 'peaking') f.Q.value = 1.4;
                    return f;
                });

                // Compressor — prevents clipping at high gain
                this.compressorNode = this.ctx.createDynamicsCompressor();
                this.compressorNode.threshold.value = -24;
                this.compressorNode.knee.value = 10;
                this.compressorNode.ratio.value = 4;
                this.compressorNode.attack.value = 0.003;
                this.compressorNode.release.value = 0.25;

                // Master gain
                this.gainNode = this.ctx.createGain();
                this.gainNode.gain.value = this._volumeGain;

                // Chain: source → eq[0..9] → compressor → gain → destination
                let node = this.source;
                this._eqNodes.forEach(eq => { node = node.connect(eq); });
                node.connect(this.compressorNode);
                this.compressorNode.connect(this.gainNode);
                this.gainNode.connect(this.ctx.destination);

                this._audioConnected = true;
                if (this.settings?.volumeLevel) this.setVolume(this.settings.volumeLevel);
            } catch (e) {
                console.warn('[YPP:VolumeBooster] Audio engine init failed:', e);
            }
        };

        video.addEventListener('play', this._initHandler, { once: true });
        video.addEventListener('volumechange', this._initHandler, { once: true });
        if (!video.paused) this._initHandler();
    }

    setVolume(multiplier) {
        this._volumeGain = multiplier;
        if (this.gainNode) this.gainNode.gain.value = multiplier;
    }

    _setEQBand(index, db) {
        this._eqGains[index] = db;
        if (this._eqNodes[index]) this._eqNodes[index].gain.value = db;
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
            window.YPP.features.VolumeBoosterUI.toggleEQPanel(this, video, btn);
        };
        return btn;
    }
};
