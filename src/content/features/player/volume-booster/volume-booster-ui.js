window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VolumeBoosterUI = class VolumeBoosterUI {
    static toggleEQPanel(ctx, video, anchorBtn) {
        if (ctx._volumePopup) {
            ctx._volumePopup.remove();
            ctx._volumePopup = null;
            anchorBtn.classList.remove('active');
            if (ctx._volumePopupOutsideHandler) {
                document.removeEventListener('click', ctx._volumePopupOutsideHandler);
                ctx._volumePopupOutsideHandler = null;
            }
            return;
        }

        this.injectEQStyles();
        anchorBtn.classList.add('active');

        const panel = document.createElement('div');
        panel.id = 'ypp-eq-panel';

        // Check if opened from Global Bar
        if (anchorBtn.closest('.ypp-global-player-bar')) {
            panel.classList.add('ypp-panel-transparent');
            panel.style.background = 'transparent';
            panel.style.backdropFilter = 'none';
            panel.style.webkitBackdropFilter = 'none';
            panel.style.boxShadow = 'none'; // Optional: remove shadow for "fully transparent" look
        }

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
        header.querySelector('#ypp-eq-close').onclick = () => this.toggleEQPanel(ctx, video, anchorBtn);

        // ── Volume Gain Row
        const gainRow = document.createElement('div');
        gainRow.className = 'ypp-eq-gain-row';
        const gainValue = document.createElement('span');
        gainValue.className = 'ypp-eq-gain-value';
        gainValue.textContent = Math.round(ctx._volumeGain * 100) + '%';
        const gainSlider = document.createElement('input');
        gainSlider.type = 'range'; gainSlider.min = 1; gainSlider.max = 6; gainSlider.step = 0.05;
        gainSlider.value = ctx._volumeGain;
        gainSlider.className = 'ypp-eq-hslider';
        gainSlider.oninput = (e) => {
            if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
            const v = parseFloat(e.target.value);
            ctx.setVolume(v);
            gainValue.textContent = Math.round(v * 100) + '%';
            anchorBtn.classList.toggle('active', v > 1.01 || ctx._eqGains.some(g => g !== 0) || ctx._balance !== 0);
            window.dispatchEvent(new CustomEvent('ypp-setting-update', {
                detail: { volumeBoost: v > 1.01, volumeLevel: v }
            }));
            this.updateGainTrack(gainSlider);
        };
        gainRow.innerHTML = `<span class="ypp-eq-row-label">Volume Boost</span>`;
        gainRow.appendChild(gainSlider);
        gainRow.appendChild(gainValue);
        panel.appendChild(gainRow);
        this.updateGainTrack(gainSlider);

        // ── Balance Row
        const balanceRow = document.createElement('div');
        balanceRow.className = 'ypp-eq-gain-row';
        const balanceValue = document.createElement('span');
        balanceValue.className = 'ypp-eq-gain-value';
        balanceValue.textContent = ctx._balance === 0 ? 'C' : (ctx._balance < 0 ? 'L' + Math.abs(Math.round(ctx._balance * 100)) : 'R' + Math.round(ctx._balance * 100));
        const balanceSlider = document.createElement('input');
        balanceSlider.type = 'range'; balanceSlider.min = -1; balanceSlider.max = 1; balanceSlider.step = 0.05;
        balanceSlider.value = ctx._balance;
        balanceSlider.className = 'ypp-eq-hslider ypp-eq-balance-slider';
        balanceSlider.oninput = (e) => {
            if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
            const v = parseFloat(e.target.value);
            ctx.setBalance(v);
            balanceValue.textContent = v === 0 ? 'C' : (v < 0 ? 'L' + Math.abs(Math.round(v * 100)) : 'R' + Math.round(v * 100));
            anchorBtn.classList.toggle('active', ctx._volumeGain > 1.01 || ctx._eqGains.some(g => g !== 0) || v !== 0);
            this.updateBalanceTrack(balanceSlider);
        };
        balanceSlider.ondblclick = () => {
            if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
            ctx.setBalance(0);
            balanceSlider.value = 0;
            balanceValue.textContent = 'C';
            this.updateBalanceTrack(balanceSlider);
        };
        balanceRow.innerHTML = `<span class="ypp-eq-row-label">Balance</span>`;
        balanceRow.appendChild(balanceSlider);
        balanceRow.appendChild(balanceValue);
        panel.appendChild(balanceRow);
        this.updateBalanceTrack(balanceSlider);

        // ── Presets
        const presetsRow = document.createElement('div');
        presetsRow.className = 'ypp-eq-presets-row';
        let activePresetBtn = null;
        Object.keys(ctx._presets).forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'ypp-eq-preset-btn';
            btn.textContent = name;
            if (name === 'Flat') { btn.classList.add('active'); activePresetBtn = btn; }
            btn.onclick = () => {
                ctx._applyPreset(name);
                this.syncBandUI(ctx, panel, canvasEl);
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

        ctx._bands.forEach((band, i) => {
            const col = document.createElement('div');
            col.className = 'ypp-eq-band-col';

            const dbLabel = document.createElement('div');
            dbLabel.className = 'ypp-eq-band-db';
            dbLabel.style.color = band.color;
            const cur = ctx._eqGains[i];
            dbLabel.textContent = (cur >= 0 ? '+' : '') + cur;
            dbLabelEls.push(dbLabel);

            const track = document.createElement('div');
            track.className = 'ypp-eq-band-track';

            const centerLine = document.createElement('div');
            centerLine.className = 'ypp-eq-band-center';

            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = -12; slider.max = 12; slider.step = 0.5;
            slider.value = ctx._eqGains[i];
            slider.className = 'ypp-eq-vslider';
            slider.style.setProperty('--band-color', band.color);
            slider.dataset.band = i;
            slider.oninput = (e) => {
                if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
                const db = parseFloat(e.target.value);
                ctx._setEQBand(i, db);
                dbLabel.textContent = (db >= 0 ? '+' : '') + db;
                this.drawCurve(ctx, canvasEl);
                if (activePresetBtn) { activePresetBtn.classList.remove('active'); activePresetBtn = null; }
            };
            slider.ondblclick = () => {
                if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
                ctx._setEQBand(i, 0);
                slider.value = 0;
                dbLabel.textContent = '0';
                this.drawCurve(ctx, canvasEl);
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
        compBtn.className = 'ypp-eq-comp-btn' + (ctx._compressorEnabled ? ' active' : '');
        compBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            Compressor
        `;
        compBtn.onclick = () => {
            if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
            ctx._compressorEnabled = !ctx._compressorEnabled;
            compBtn.classList.toggle('active', ctx._compressorEnabled);
            if (ctx.compressorNode) {
                // Bypass by setting neutral values rather than re-routing
                ctx.compressorNode.ratio.value = ctx._compressorEnabled ? 4 : 1;
                ctx.compressorNode.threshold.value = ctx._compressorEnabled ? -24 : 0;
            }
        };

        const monoBtn = document.createElement('button');
        monoBtn.className = 'ypp-eq-comp-btn' + (ctx._monoEnabled ? ' active' : '');
        monoBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-2-10h4v6h-4z"/>
            </svg>
            Mono
        `;
        monoBtn.onclick = () => {
            if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
            ctx.setMono(!ctx._monoEnabled);
            monoBtn.classList.toggle('active', ctx._monoEnabled);
        };

        const resetBtn = document.createElement('button');
        resetBtn.className = 'ypp-eq-reset-btn';
        resetBtn.textContent = 'Reset All';
        resetBtn.onclick = () => {
            ctx._eqGains.fill(0);
            ctx._eqNodes.forEach(n => { if (n) n.gain.value = 0; });
            this.syncBandUI(ctx, panel, canvasEl);
            if (activePresetBtn) activePresetBtn.classList.remove('active');
            presetsRow.querySelector('.ypp-eq-preset-btn').classList.add('active');
            activePresetBtn = presetsRow.querySelector('.ypp-eq-preset-btn');
        };

        const hint = document.createElement('div');
        hint.className = 'ypp-eq-hint';
        hint.textContent = 'Dbl-click to center/zero';

        footer.append(compBtn, monoBtn, resetBtn, hint);
        panel.appendChild(footer);

        // Mount panel
        const moviePlayer = document.getElementById('movie_player')
            || document.querySelector('.html5-video-player')
            || document.body;
        moviePlayer.appendChild(panel);
        ctx._volumePopup = panel;

        // Visualizer Loop
        let animFrameId = null;
        const renderLoop = () => {
            if (!ctx._volumePopup) return; // Stop if closed
            if (ctx.analyserNode) {
                this.drawCurve(ctx, canvasEl, true);
            }
            animFrameId = requestAnimationFrame(renderLoop);
        };
        renderLoop();

        // Initial curve draw (if no analyser yet)
        if (!ctx.analyserNode) this.drawCurve(ctx, canvasEl);

        // Click-outside to close
        const outside = (e) => {
            if (ctx._volumePopup && !ctx._volumePopup.contains(e.target) && !anchorBtn.contains(e.target)) {
                if (animFrameId) cancelAnimationFrame(animFrameId);
                this.toggleEQPanel(ctx, video, anchorBtn);
            }
        };
        ctx._volumePopupOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    static syncBandUI(ctx, panel, canvas) {
        const sliders = panel.querySelectorAll('.ypp-eq-vslider');
        const dbLabels = panel.querySelectorAll('.ypp-eq-band-db');
        sliders.forEach((s, i) => {
            s.value = ctx._eqGains[i];
        });
        dbLabels.forEach((el, i) => {
            const db = ctx._eqGains[i];
            el.textContent = (db >= 0 ? '+' : '') + db;
        });
        if (!ctx.analyserNode) this.drawCurve(ctx, canvas);
    }

    static updateGainTrack(slider) {
        const pct = ((parseFloat(slider.value) - 1) / (6 - 1)) * 100;
        slider.style.background = `linear-gradient(90deg, rgba(255,255,255,0.85) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
    }

    static updateBalanceTrack(slider) {
        const val = parseFloat(slider.value);
        const pct = ((val + 1) / 2) * 100;
        
        if (val < 0) {
            slider.style.background = `linear-gradient(90deg, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.85) ${pct}%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.1) 50%)`;
        } else {
            slider.style.background = `linear-gradient(90deg, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.85) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
        }
    }

    static drawCurve(ctxRef, canvas, withSpectrum = false) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const logMin = Math.log10(20), logMax = Math.log10(20000);
        const dbRange = 13;

        // Draw Spectrum Analyzer
        if (withSpectrum && ctxRef.analyserNode) {
            const bufferLength = ctxRef.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            ctxRef.analyserNode.getByteFrequencyData(dataArray);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            const barWidth = (W / bufferLength) * 2.5;
            let barHeight;
            let xPos = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * H;
                ctx.fillRect(xPos, H - barHeight, barWidth - 1, barHeight);
                xPos += barWidth;
            }
        }

        // Center baseline
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

        // Vertical band markers
        ctxRef._bands.forEach(band => {
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
            ctxRef._bands.forEach((band, i) => {
                const db = ctxRef._eqGains[i];
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

    static injectEQStyles() {
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
    background: rgba(0, 0, 0, 0.15); /* Fully transparent with heavy blur */
    border: 1px solid rgba(255,255,255,0.15);
    border-top: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px;
    z-index: 99999;
    color: #fff;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.1);
    backdrop-filter: blur(64px) saturate(180%);
    -webkit-backdrop-filter: blur(64px) saturate(180%);
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
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
}
.ypp-eq-presets-row::-webkit-scrollbar { display: none; }
.ypp-eq-preset-btn {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 4px 13px;
    font-family: inherit; transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
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
