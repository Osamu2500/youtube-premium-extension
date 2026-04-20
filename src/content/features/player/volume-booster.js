/**
 * Volume Booster Feature
 * Allows pushing volume up to 600% with a compressor to prevent clipping.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VolumeBooster = class VolumeBooster {
    constructor() {
        this.name = 'VolumeBooster';
        this.settings = null;
        this._audioConnected = false;
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.compressorNode = null;
        this._bassFilter = null;
        this._trebleFilter = null;
        this._volumePopup = null;
        this._volumePopupOutsideHandler = null;
        this._boundVideo = null;
        this._initHandler = null;
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
        
        // Reset gain and filters if disabled
        if (this.gainNode) this.gainNode.gain.value = 1;
        if (this._bassFilter) this._bassFilter.gain.value = 0;
        if (this._trebleFilter) this._trebleFilter.gain.value = 0;
        
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
        const video = document.querySelector('video');
        if (video) {
            this.initAudioContext(video);
        }
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

                // Gain node — 1.0 = native, up to 6.0 = 600%
                this.gainNode = this.ctx.createGain();
                this.gainNode.gain.value = 1.0;

                // Compressor — prevents clipping at high gain
                this.compressorNode = this.ctx.createDynamicsCompressor();
                this.compressorNode.threshold.value = -24;
                this.compressorNode.knee.value = 10;
                this.compressorNode.ratio.value = 4;
                this.compressorNode.attack.value = 0.003;
                this.compressorNode.release.value = 0.25;

                // Bass shelf
                this._bassFilter = this.ctx.createBiquadFilter();
                this._bassFilter.type = 'lowshelf';
                this._bassFilter.frequency.value = 250;
                this._bassFilter.gain.value = 0;

                // Treble shelf
                this._trebleFilter = this.ctx.createBiquadFilter();
                this._trebleFilter.type = 'highshelf';
                this._trebleFilter.frequency.value = 4000;
                this._trebleFilter.gain.value = 0;

                // Chain: source → bass → treble → compressor → gain → output
                this.source
                    .connect(this._bassFilter)
                    .connect(this._trebleFilter)
                    .connect(this.compressorNode)
                    .connect(this.gainNode)
                    .connect(this.ctx.destination);

                this._audioConnected = true;
                
                // apply volume from settings if we have it
                if (this.settings && this.settings.volumeBoost && this.settings.volumeLevel) {
                    this.setVolume(this.settings.volumeLevel || 1);
                }
            } catch (e) {
                console.warn('[YPP:VolumeBooster] Audio engine init failed:', e);
            }
        };

        video.addEventListener('play', this._initHandler, { once: true });
        video.addEventListener('volumechange', this._initHandler, { once: true });
        // Try immediately if already playing
        if (!video.paused) this._initHandler();
    }

    setVolume(multiplier) {
        if (this.gainNode) {
            this.gainNode.gain.value = multiplier;
        }
    }

    createButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Volume Booster';
        btn.className = 'ypp-action-btn';
        btn.onclick = (e) => {
            e.stopPropagation();
            this._toggleVolumePopup(video, btn);
        };
        btn.id = 'ypp-volume-boost-btn';
        return btn;
    }

    _toggleVolumePopup(video, anchorBtn) {
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

        anchorBtn.classList.add('active');

        const popup = document.createElement('div');
        popup.id = 'ypp-volume-popup';
        Object.assign(popup.style, {
            position: 'absolute',
            bottom: '56px',
            right: '16px',
            width: '360px',
            background: 'rgba(25, 25, 30, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            zIndex: '99999',
            color: '#fff',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: '12px',
            animation: 'ypp-panel-glass-in 0.3s cubic-bezier(0.2, 0, 0, 1) forwards'
        });

        // ── Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
            fontSize: '15px', fontWeight: '500', marginBottom: '8px'
        });
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                Volume Booster
            </div>`;
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        Object.assign(closeBtn.style, {
            background: 'none', border: 'none', color: '#f1f1f1',
            cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0'
        });
        closeBtn.onclick = () => this._toggleVolumePopup(video, anchorBtn);
        header.appendChild(closeBtn);
        popup.appendChild(header);

        const makeSlider = (label, min, max, step, value, unit, onChange) => {
            const section = document.createElement('div');
            Object.assign(section.style, {
                padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px'
            });
            const labelRow = document.createElement('div');
            Object.assign(labelRow.style, {
                display: 'flex', justifyContent: 'space-between', fontSize: '11px',
                color: 'rgba(255,255,255,0.6)'
            });
            const lbl = document.createElement('span');
            lbl.textContent = label;
            const val = document.createElement('span');
            val.textContent = value + unit;
            val.style.color = '#c4b5fd';
            val.style.fontWeight = '700';
            labelRow.append(lbl, val);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = min; slider.max = max; slider.step = step; slider.value = value;
            slider.className = 'ypp-vcp-slider'; 
            slider.oninput = (e) => {
                const v = parseFloat(e.target.value);
                const pct = (v - min) / (max - min) * 100;
                slider.style.setProperty('--pct', `${pct}%`);
                val.textContent = onChange(v) + unit;
            };
            const initPct = (value - min) / (max - min) * 100;
            slider.style.setProperty('--pct', `${initPct}%`);
            slider.ondblclick = () => {
                const resetVal = parseFloat(slider.getAttribute('data-default') || value);
                slider.value = resetVal;
                val.textContent = onChange(resetVal) + unit;
                const pct = (resetVal - min) / (max - min) * 100;
                slider.style.setProperty('--pct', `${pct}%`);
            };
            slider.setAttribute('data-default', value);
            section.append(labelRow, slider);
            return section;
        };

        // ── Volume Gain slider: 100% → 600%
        const currentGain = this.gainNode ? this.gainNode.gain.value : 1;
        popup.appendChild(makeSlider('Volume Boost', 1, 6, 0.05, currentGain, '%', (v) => {
            this.initAudioContext(video);
            if (this.gainNode) this.gainNode.gain.value = v;
            const pct = Math.round(v * 100);
            anchorBtn.classList.toggle('active', v > 1.01);
            anchorBtn.title = v > 1.01 ? `Volume: ${pct}%` : 'Volume Booster';
            
            // Dispatch custom event to notify background/settings manager to save
            const evt = new CustomEvent('ypp-setting-update', { 
                detail: { volumeBoost: true, volumeLevel: v } 
            });
            window.dispatchEvent(evt);
            
            return pct;
        }));

        // ── Bass slider: ±12 dB
        const currentBass = this._bassFilter ? this._bassFilter.gain.value : 0;
        popup.appendChild(makeSlider('Bass', -12, 12, 1, currentBass, ' dB', (v) => {
            this.initAudioContext(video);
            if (this._bassFilter) this._bassFilter.gain.value = v;
            return (v >= 0 ? '+' : '') + v;
        }));

        // ── Treble slider: ±12 dB
        const currentTreble = this._trebleFilter ? this._trebleFilter.gain.value : 0;
        popup.appendChild(makeSlider('Treble', -12, 12, 1, currentTreble, ' dB', (v) => {
            this.initAudioContext(video);
            if (this._trebleFilter) this._trebleFilter.gain.value = v;
            return (v >= 0 ? '+' : '') + v;
        }));

        // ── Hint
        const hint = document.createElement('div');
        hint.textContent = 'Compressor active — audio stays clear at high volumes';
        Object.assign(hint.style, {
            fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '0 16px', marginTop: '4px'
        });
        popup.appendChild(hint);

        // ── Reset button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        Object.assign(resetBtn.style, {
            background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
            color: '#c4b5fd', borderRadius: '8px', cursor: 'pointer',
            fontSize: '12px', fontWeight: '600',
            textAlign: 'center', padding: '10px', width: 'calc(100% - 32px)', margin: '8px 16px 0',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease'
        });
        resetBtn.onmouseenter = () => { resetBtn.style.background = 'rgba(167,139,250,0.2)'; };
        resetBtn.onmouseleave = () => { resetBtn.style.background = 'rgba(167,139,250,0.12)'; };
        resetBtn.onclick = () => {
            if (this.gainNode) this.gainNode.gain.value = 1;
            if (this._bassFilter) this._bassFilter.gain.value = 0;
            if (this._trebleFilter) this._trebleFilter.gain.value = 0;
            anchorBtn.classList.remove('active');
            anchorBtn.title = 'Volume Booster';
            this._toggleVolumePopup(video, anchorBtn);
            
            const evt = new CustomEvent('ypp-setting-update', { 
                detail: { volumeBoost: false, volumeLevel: 1 } 
            });
            window.dispatchEvent(evt);
        };
        popup.appendChild(resetBtn);

        const moviePlayer = document.getElementById('movie_player') || document.body;
        moviePlayer.appendChild(popup);
        this._volumePopup = popup;

        const outside = (e) => {
            if (this._volumePopup && !this._volumePopup.contains(e.target) && !anchorBtn.contains(e.target)) {
                this._toggleVolumePopup(video, anchorBtn);
            }
        };
        this._volumePopupOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
    }
};
