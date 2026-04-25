/**
 * Volume Booster / 10-Band Graphic Equalizer
 * Processes audio through a Web Audio API chain with:
 *  - 10 BiquadFilter nodes (full frequency spectrum)
 *  - A master gain node (100%–600% volume boost)
 *  - A DynamicsCompressor (optional, prevents clipping)
 *  - A live frequency-response curve drawn on <canvas>
 *  - 5 built-in presets (Flat, Bass Boost, Vocal, Cinematic, Lo-Fi)
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

    // =========================================================================
    // PUBLIC API (unchanged from v1 — used by player.js)
    // =========================================================================

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

    // =========================================================================
    // AUDIO ENGINE
    // =========================================================================

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

    // =========================================================================
    // BUTTON (called by player.js)
    // =========================================================================

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
            this._toggleEQPanel(video, btn);
        };
        return btn;
    }

    // =========================================================================
    // EQ PANEL UI
    // =========================================================================

    _toggleEQPanel(video, anchorBtn) {
        if (this._volumePopup) {
            this._volumePopup.remove();
            this._volumePopup = null;
            anchorBtn.classList.remove('active');
            if (this._volumePopupOutsideHandler) {
                document.removeEventListener('click', this._volumePopupOutsideHandler);
                this._volumePopupOutsideHandler = null;
            }
            return;
        }

        this._injectEQStyles();
        anchorBtn.classList.add('active');

        const panel = document.createElement('div');
        panel.id = 'ypp-eq-panel';

        // ── Header
        const header = document.createElement('div');
        header.className = 'ypp-eq-header';
        header.innerHTML = `
            <div class="ypp-eq-title-group">
                <div class="ypp-eq-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                        <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
                    </svg>
                </div>
                <div>
                    <div class="ypp-eq-title">Equalizer</div>
                    <div class="ypp-eq-subtitle">10-Band · Pro Audio Engine</div>
                </div>
            </div>
            <button class="ypp-eq-close-btn" id="ypp-eq-close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        `;
        panel.appendChild(header);
        header.querySelector('#ypp-eq-close').onclick = () => this._toggleEQPanel(video, anchorBtn);

        // ── Volume Gain Row
        const gainRow = document.createElement('div');
        gainRow.className = 'ypp-eq-gain-row';
        const gainValue = document.createElement('span');
        gainValue.className = 'ypp-eq-gain-value';
        gainValue.textContent = Math.round(this._volumeGain * 100) + '%';
        const gainSlider = document.createElement('input');
        gainSlider.type = 'range'; gainSlider.min = 1; gainSlider.max = 6; gainSlider.step = 0.05;
        gainSlider.value = this._volumeGain;
        gainSlider.className = 'ypp-eq-hslider';
        gainSlider.oninput = (e) => {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            const v = parseFloat(e.target.value);
            this.setVolume(v);
            gainValue.textContent = Math.round(v * 100) + '%';
            anchorBtn.classList.toggle('active', v > 1.01 || this._eqGains.some(g => g !== 0));
            window.dispatchEvent(new CustomEvent('ypp-setting-update', {
                detail: { volumeBoost: v > 1.01, volumeLevel: v }
            }));
            this._updateGainTrack(gainSlider);
        };
        gainRow.innerHTML = `<span class="ypp-eq-row-label">Volume Boost</span>`;
        gainRow.appendChild(gainSlider);
        gainRow.appendChild(gainValue);
        panel.appendChild(gainRow);
        this._updateGainTrack(gainSlider);

        // ── Presets
        const presetsRow = document.createElement('div');
        presetsRow.className = 'ypp-eq-presets-row';
        let activePresetBtn = null;
        Object.keys(this._presets).forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'ypp-eq-preset-btn';
            btn.textContent = name;
            if (name === 'Flat') { btn.classList.add('active'); activePresetBtn = btn; }
            btn.onclick = () => {
                this._applyPreset(name);
                this._syncBandUI(panel, canvasEl);
                if (activePresetBtn) activePresetBtn.classList.remove('active');
                btn.classList.add('active');
                activePresetBtn = btn;
            };
            presetsRow.appendChild(btn);
        });
        panel.appendChild(presetsRow);

        // ── Canvas Curve
        const canvasEl = document.createElement('canvas');
        canvasEl.width = 444; canvasEl.height = 72;
        canvasEl.className = 'ypp-eq-canvas';
        panel.appendChild(canvasEl);

        // ── 10-Band Vertical EQ Faders
        const bandsSection = document.createElement('div');
        bandsSection.className = 'ypp-eq-bands';
        const sliderEls = [];
        const dbLabelEls = [];

        this._bands.forEach((band, i) => {
            const col = document.createElement('div');
            col.className = 'ypp-eq-band-col';

            const dbLabel = document.createElement('div');
            dbLabel.className = 'ypp-eq-band-db';
            dbLabel.style.color = band.color;
            const cur = this._eqGains[i];
            dbLabel.textContent = (cur >= 0 ? '+' : '') + cur;
            dbLabelEls.push(dbLabel);

            const track = document.createElement('div');
            track.className = 'ypp-eq-band-track';

            const centerLine = document.createElement('div');
            centerLine.className = 'ypp-eq-band-center';

            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = -12; slider.max = 12; slider.step = 0.5;
            slider.value = this._eqGains[i];
            slider.className = 'ypp-eq-vslider';
            slider.style.setProperty('--band-color', band.color);
            slider.dataset.band = i;
            slider.oninput = (e) => {
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
                const db = parseFloat(e.target.value);
                this._setEQBand(i, db);
                dbLabel.textContent = (db >= 0 ? '+' : '') + db;
                this._drawCurve(canvasEl);
                if (activePresetBtn) { activePresetBtn.classList.remove('active'); activePresetBtn = null; }
            };
            slider.ondblclick = () => {
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
                this._setEQBand(i, 0);
                slider.value = 0;
                dbLabel.textContent = '0';
                this._drawCurve(canvasEl);
            };
            sliderEls.push(slider);

            const freqLabel = document.createElement('div');
            freqLabel.className = 'ypp-eq-band-freq';
            freqLabel.textContent = band.label;

            track.append(centerLine, slider);
            col.append(dbLabel, track, freqLabel);
            bandsSection.appendChild(col);
        });
        panel.appendChild(bandsSection);

        // ── Footer: Compressor toggle + Reset
        const footer = document.createElement('div');
        footer.className = 'ypp-eq-footer';

        const compBtn = document.createElement('button');
        compBtn.className = 'ypp-eq-comp-btn' + (this._compressorEnabled ? ' active' : '');
        compBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            Compressor
        `;
        compBtn.onclick = () => {
            if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            this._compressorEnabled = !this._compressorEnabled;
            compBtn.classList.toggle('active', this._compressorEnabled);
            if (this.compressorNode) {
                // Bypass by setting neutral values rather than re-routing
                this.compressorNode.ratio.value = this._compressorEnabled ? 4 : 1;
                this.compressorNode.threshold.value = this._compressorEnabled ? -24 : 0;
            }
        };

        const resetBtn = document.createElement('button');
        resetBtn.className = 'ypp-eq-reset-btn';
        resetBtn.textContent = 'Reset All';
        resetBtn.onclick = () => {
            this._eqGains.fill(0);
            this._eqNodes.forEach(n => { if (n) n.gain.value = 0; });
            this._syncBandUI(panel, canvasEl);
            if (activePresetBtn) activePresetBtn.classList.remove('active');
            presetsRow.querySelector('.ypp-eq-preset-btn').classList.add('active');
            activePresetBtn = presetsRow.querySelector('.ypp-eq-preset-btn');
        };

        const hint = document.createElement('div');
        hint.className = 'ypp-eq-hint';
        hint.textContent = 'Dbl-click band to zero';

        footer.append(compBtn, resetBtn, hint);
        panel.appendChild(footer);

        // Mount panel
        const moviePlayer = document.getElementById('movie_player')
            || document.querySelector('.html5-video-player')
            || document.body;
        moviePlayer.appendChild(panel);
        this._volumePopup = panel;

        // Initial curve draw
        this._drawCurve(canvasEl);

        // Click-outside to close (one-time)
        const outside = (e) => {
            if (this._volumePopup && !this._volumePopup.contains(e.target) && !anchorBtn.contains(e.target)) {
                this._toggleEQPanel(video, anchorBtn);
            }
        };
        this._volumePopupOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /** Sync all band sliders + dB labels to current _eqGains and redraw curve */
    _syncBandUI(panel, canvas) {
        const sliders = panel.querySelectorAll('.ypp-eq-vslider');
        const dbLabels = panel.querySelectorAll('.ypp-eq-band-db');
        sliders.forEach((s, i) => {
            s.value = this._eqGains[i];
        });
        dbLabels.forEach((el, i) => {
            const db = this._eqGains[i];
            el.textContent = (db >= 0 ? '+' : '') + db;
        });
        this._drawCurve(canvas);
    }

    /** Update the CSS fill track gradient on the horizontal gain slider */
    _updateGainTrack(slider) {
        const pct = ((parseFloat(slider.value) - 1) / (6 - 1)) * 100;
        slider.style.background = `linear-gradient(90deg, rgba(255,255,255,0.85) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
    }

    /**
     * Draw an approximate frequency-response curve using a Gaussian
     * approximation of each peaking/shelf EQ band.
     */
    _drawCurve(canvas) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const logMin = Math.log10(20), logMax = Math.log10(20000);
        const dbRange = 13;

        // Center baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

        // Vertical band markers
        this._bands.forEach(band => {
            const x = ((Math.log10(band.freq) - logMin) / (logMax - logMin)) * W;
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 5]);
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            ctx.setLineDash([]);
        });

        // Compute gain at each pixel using summed Gaussian approximation
        const gainAt = (freq) => {
            let total = 0;
            this._bands.forEach((band, i) => {
                const db = this._eqGains[i];
                if (db === 0) return;
                const bw = band.type === 'peaking' ? 0.85 : 1.6;
                const logDist = Math.log2(freq / band.freq) / bw;
                total += db * Math.exp(-logDist * logDist * 2.2);
            });
            return Math.max(-dbRange, Math.min(dbRange, total));
        };

        const pts = [];
        for (let x = 0; x <= W; x++) {
            const logFreq = logMin + (x / W) * (logMax - logMin);
            const db = gainAt(Math.pow(10, logFreq));
            pts.push([x, H / 2 - (db / dbRange) * (H / 2 - 5)]);
        }

        // Fill under curve
        const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
        fillGrad.addColorStop(0, 'rgba(255, 255, 255, 0.20)');
        fillGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        fillGrad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.lineTo(W, H / 2);
        ctx.closePath();
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Curve line (monochrome glass)
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.forEach(([x, y]) => ctx.lineTo(x, y));
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    /**
     * Inject scoped CSS for the EQ panel — only once per page.
     * Keeps styles contained to avoid conflicts with YouTube's own CSS.
     */
    _injectEQStyles() {
        if (document.getElementById('ypp-eq-styles')) return;
        const style = document.createElement('style');
        style.id = 'ypp-eq-styles';
        style.textContent = `
/* ── EQ Panel ── */
#ypp-eq-panel {
    position: absolute;
    bottom: 72px;
    right: 16px;
    width: 480px;
    background: rgba(10, 10, 18, 0.94);
    border: 1px solid rgba(255,255,255,0.10);
    border-top: 1px solid rgba(255,255,255,0.18);
    border-radius: 20px;
    z-index: 99999;
    color: #fff;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.5),
                inset 0 1px 0 rgba(255,255,255,0.06);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    user-select: none;
    overflow: hidden;
    animation: ypp-eq-in 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}
@keyframes ypp-eq-in {
    from { opacity:0; transform:translateY(12px) scale(0.96); }
    to   { opacity:1; transform:translateY(0)   scale(1);    }
}

/* Header */
.ypp-eq-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px 13px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
}
.ypp-eq-title-group { display:flex; align-items:center; gap:10px; }
.ypp-eq-icon {
    width: 32px; height: 32px; border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
}
.ypp-eq-title { font-size:14px; font-weight:700; letter-spacing:-0.3px; }
.ypp-eq-subtitle { font-size:10px; color:rgba(255,255,255,0.38); font-weight:500; margin-top:1px; }
.ypp-eq-close-btn {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.7); border-radius: 50%; width:28px; height:28px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition: background 0.2s, color 0.2s;
}
.ypp-eq-close-btn:hover { background: rgba(255,255,255,0.14); color:#fff; }

/* Gain Row */
.ypp-eq-gain-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-eq-row-label {
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45);
    text-transform: uppercase; letter-spacing: 0.6px; min-width: 72px;
}
.ypp-eq-gain-value {
    font-size: 12px; font-weight: 800; color: #ffffff;
    min-width: 40px; text-align: right;
}

/* Horizontal slider */
.ypp-eq-hslider {
    -webkit-appearance: none; appearance: none; flex: 1;
    height: 4px; border-radius: 4px; outline: none; cursor: pointer;
    border: none; transition: height 0.15s ease;
}
.ypp-eq-hslider:hover { height: 6px; }
.ypp-eq-hslider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: #fff; border: 2.5px solid #fff; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.2);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
}
.ypp-eq-hslider::-webkit-slider-thumb:hover {
    transform: scale(1.35);
    box-shadow: 0 2px 12px rgba(0,0,0,0.6), 0 0 0 5px rgba(255,255,255,0.3), 0 0 16px rgba(255,255,255,0.4);
}

/* Presets */
.ypp-eq-presets-row {
    display: flex; gap: 6px; padding: 9px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
}
.ypp-eq-preset-btn {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 4px 13px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-preset-btn:hover {
    background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.3); color: #fff;
}
.ypp-eq-preset-btn.active {
    background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5);
    color: #ffffff; box-shadow: 0 0 12px rgba(255,255,255,0.15);
}

/* Canvas */
.ypp-eq-canvas {
    display: block; width: calc(100% - 36px); height: 72px;
    margin: 0 18px 2px; border-radius: 10px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
}

/* Band columns */
.ypp-eq-bands {
    display: flex; gap: 0; padding: 6px 14px 12px;
    justify-content: space-between;
}
.ypp-eq-band-col {
    display: flex; flex-direction: column; align-items: center;
    gap: 3px; flex: 1; padding: 0 2px;
}
.ypp-eq-band-db {
    font-size: 9px; font-weight: 800; min-height: 13px; line-height: 1;
}
.ypp-eq-band-track {
    position: relative; height: 80px; width: 100%;
    display: flex; align-items: center; justify-content: center;
}
.ypp-eq-band-center {
    position: absolute; width: 100%; height: 1px;
    background: rgba(255,255,255,0.1); top: 50%; left: 0;
    pointer-events: none;
}
.ypp-eq-band-freq {
    font-size: 9px; color: rgba(255,255,255,0.38); font-weight:600;
}

/* Vertical slider (rotated horizontal) */
.ypp-eq-vslider {
    -webkit-appearance: none; appearance: none;
    width: 80px;
    height: 3px; border-radius: 3px; outline: none; cursor: pointer;
    background: rgba(255,255,255,0.1); border: none;
    transform: rotate(-90deg);
    transform-origin: center;
    position: absolute;
    transition: height 0.1s ease;
}
.ypp-eq-vslider:hover { height: 5px; }
.ypp-eq-vslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--band-color, #ffffff);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255,255,255,0.3);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.ypp-eq-vslider::-webkit-slider-thumb:hover { transform: scale(1.45); }

/* Footer */
.ypp-eq-footer {
    display: flex; align-items: center; gap: 8px;
    padding: 0 18px 14px;
}
.ypp-eq-comp-btn {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.55); border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 5px 13px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-comp-btn.active {
    background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4);
    color: #ffffff; box-shadow: 0 0 10px rgba(255,255,255,0.15);
}
.ypp-eq-comp-btn:hover { background: rgba(255,255,255,0.1); }
.ypp-eq-reset-btn {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.22);
    color: #ffffff; border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 5px 14px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-reset-btn:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.4); }
.ypp-eq-hint {
    font-size: 9px; color: rgba(255,255,255,0.22); margin-left: auto;
}
        `;
        document.head.appendChild(style);
    }
};
