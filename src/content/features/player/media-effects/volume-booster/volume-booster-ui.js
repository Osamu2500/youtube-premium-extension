import anime from 'animejs/lib/anime.es.js';

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VolumeBoosterUI = class VolumeBoosterUI {
  static saveVolumeSettings(ctx) {
    // Bug fix: Use a safe inline debounce so this works on external sites
    // where window.YPP.Utils.debounce may not be defined.
    if (!this.debouncedSave) {
      const debounce =
        window.YPP?.Utils?.debounce ||
        ((fn, ms) => {
          let t;
          return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
          };
        });
      this.debouncedSave = debounce((ctxArg) => {
        if (!window.YPP?.MainApp?.saveSettings) return;
        window.YPP.MainApp.saveSettings({
          volumeLevel: ctxArg._volumeGain,
          volumeBalance: ctxArg._balance,
          volumeCompressor: ctxArg._compressorEnabled,
          volumeMono: ctxArg._monoEnabled,
          volumeWidener: ctxArg._widenerEnabled,
          volumeWarmth: ctxArg._warmthLevel,
          volumeEqBands: JSON.stringify(ctxArg._eqGains),
          volumeEqFreqs: JSON.stringify(ctxArg._eqFreqs),
          volumeEqQs: JSON.stringify(ctxArg._eqQs),
        });
      }, 300);
    }
    this.debouncedSave(ctx);
  }

  static toggleEQPanel(ctx, video, anchorBtn) {
    // ALWAYS fetch the active video, overriding any stale reference from UI closures
    video = document.querySelector('.html5-main-video') || document.querySelector('video');

    if (ctx._isSafeToBoost && !ctx._isSafeToBoost(video)) {
        if (window.YPP?.Utils?.createToast) {
            window.YPP.Utils.createToast("Audio Booster unavailable: Browser Cross-Origin security restricts audio manipulation on this video.");
        } else {
            alert("Audio Booster unavailable: Browser Cross-Origin security restricts audio manipulation on this video.");
        }
        // Ensure the button isn't stuck looking active
        anchorBtn.classList.remove('active');
        return;
    }

    if (ctx._volumePopup) {
      if (ctx._volumeAnimCancel) {
        ctx._volumeAnimCancel();
        ctx._volumeAnimCancel = null;
      }
      ctx._volumePopup.remove();
      ctx._volumePopup = null;
      anchorBtn.classList.remove('active');
      if (ctx._volumePopupOutsideHandler) {
        if (ctx.removeListener)
          ctx.removeListener(document, 'click', ctx._volumePopupOutsideHandler);
        else document.removeEventListener('click', ctx._volumePopupOutsideHandler);
        ctx._volumePopupOutsideHandler = null;
      }
      if (ctx._volumePopupEscapeHandler) {
        if (ctx.removeListener)
          ctx.removeListener(document, 'keydown', ctx._volumePopupEscapeHandler);
        else document.removeEventListener('keydown', ctx._volumePopupEscapeHandler);
        ctx._volumePopupEscapeHandler = null;
      }
      return;
    }

    this.injectEQStyles();
    anchorBtn.classList.add('active');

    const panel = document.createElement('div');
    panel.id = 'ypp-eq-panel';

    // Check if opened from Global Bar
    const isGlobalBar = !!anchorBtn.closest('.ypp-global-player-bar');
    if (isGlobalBar) {
      panel.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)';

      // Position it next to the global bar
      const bar = anchorBtn.closest('.ypp-global-player-bar');
      panel.style.bottom = 'auto';
      const panelHeight = 400; // approx height
      const topPx = Math.max(16, (window.innerHeight - panelHeight) / 2);

      if (bar.classList.contains('ypp-bar-pos-right')) {
        panel.style.right = '76px';
        panel.style.left = 'auto';
        panel.style.top = topPx + 'px';
      } else if (bar.classList.contains('ypp-bar-pos-left')) {
        panel.style.left = '76px';
        panel.style.right = 'auto';
        panel.style.top = topPx + 'px';
      } else if (bar.classList.contains('ypp-bar-pos-top')) {
        panel.style.top = '76px';
        panel.style.left = 'calc(50% - 215px)'; // approx half of 430px
        panel.style.right = 'auto';
      }
    }

    // ── Header
    const header = document.createElement('div');
    header.className = 'ypp-eq-header';
    header.innerHTML = `
            <div class="ypp-eq-title-group">
                <div class="ypp-eq-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                        <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
                    </svg>
                </div>
                <div>
                    <div class="ypp-eq-title">Equalizer</div>
                    <div class="ypp-eq-subtitle">10-Band · Pro Audio Engine</div>
                </div>
            </div>
            <button class="ypp-eq-close-btn" id="ypp-eq-close">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
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
    gainSlider.type = 'range';
    gainSlider.min = 1;
    gainSlider.max = 6;
    gainSlider.step = 0.05;
    gainSlider.value = ctx._volumeGain;
    gainSlider.className = 'ypp-eq-hslider';
    gainSlider.oninput = (e) => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      const v = parseFloat(e.target.value);
      ctx.setVolume(v);
      gainValue.textContent = Math.round(v * 100) + '%';
      anchorBtn.classList.toggle(
        'active',
        v > 1.01 || ctx._eqGains.some((g) => g !== 0) || ctx._balance !== 0
      );
      VolumeBoosterUI.saveVolumeSettings(ctx);
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
    balanceValue.textContent =
      ctx._balance === 0
        ? 'C'
        : ctx._balance < 0
          ? 'L' + Math.abs(Math.round(ctx._balance * 100))
          : 'R' + Math.round(ctx._balance * 100);
    const balanceSlider = document.createElement('input');
    balanceSlider.type = 'range';
    balanceSlider.min = -1;
    balanceSlider.max = 1;
    balanceSlider.step = 0.05;
    balanceSlider.value = ctx._balance;
    balanceSlider.className = 'ypp-eq-hslider ypp-eq-balance-slider';
    balanceSlider.oninput = (e) => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      const v = parseFloat(e.target.value);
      ctx.setBalance(v);
      balanceValue.textContent =
        v === 0 ? 'C' : v < 0 ? 'L' + Math.abs(Math.round(v * 100)) : 'R' + Math.round(v * 100);
      anchorBtn.classList.toggle(
        'active',
        ctx._volumeGain > 1.01 || ctx._eqGains.some((g) => g !== 0) || v !== 0
      );
      this.updateBalanceTrack(balanceSlider);
      VolumeBoosterUI.saveVolumeSettings(ctx);
    };
    balanceSlider.ondblclick = () => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      ctx.setBalance(0);
      balanceSlider.value = 0;
      balanceValue.textContent = 'C';
      this.updateBalanceTrack(balanceSlider);
      VolumeBoosterUI.saveVolumeSettings(ctx);
    };
    balanceRow.innerHTML = `<span class="ypp-eq-row-label">Balance</span>`;
    balanceRow.appendChild(balanceSlider);
    balanceRow.appendChild(balanceValue);
    panel.appendChild(balanceRow);
    this.updateBalanceTrack(balanceSlider);

    // ── EQ/Dynamics/Spatial Tabs ──
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;border-bottom:1px solid rgba(255,255,255,0.08);';
    const mkTab = (label, active) => {
      const t = document.createElement('button');
      t.textContent = label;
      const pad = isGlobalBar ? '6px' : '8px';
      const fs = isGlobalBar ? '10px' : '11px';
      t.style.cssText = `flex:1;padding:${pad};background:transparent;border:none;color:${active ? '#fff' : 'rgba(255,255,255,0.45)'};font-size:${fs};font-weight:600;cursor:pointer;border-bottom:2px solid ${active ? 'rgba(255,255,255,0.7)' : 'transparent'};transition:all 0.2s;font-family:inherit;`;
      t.onmouseenter = () => {
        if (!t.classList.contains('active')) t.style.color = 'rgba(255,255,255,0.75)';
      };
      t.onmouseleave = () => {
        if (!t.classList.contains('active')) t.style.color = 'rgba(255,255,255,0.45)';
      };
      if (active) t.classList.add('active');
      return t;
    };
    const tabEQ = mkTab('Equalizer', true);
    const tabDyn = mkTab('Dynamics', false);
    const tabSpa = mkTab('Spatial', false);
    tabBar.append(tabEQ, tabDyn, tabSpa);
    panel.appendChild(tabBar);

    // ── Presets ──
    const presetsRow = document.createElement('div');
    presetsRow.className = 'ypp-eq-presets-row';
    let activePresetBtn = null;
    Object.keys(ctx._presets).forEach((name) => {
      const btn = document.createElement('button');
      btn.className = 'ypp-eq-preset-btn';
      btn.textContent = name;
      if (name === 'Flat') {
        btn.classList.add('active');
        activePresetBtn = btn;
      }
      btn.onclick = () => {
        ctx._applyPreset(name);
        this.syncBandUI(ctx, panel, canvasEl);
        if (activePresetBtn) activePresetBtn.classList.remove('active');
        btn.classList.add('active');
        activePresetBtn = btn;
        VolumeBoosterUI.saveVolumeSettings(ctx);
      };
      presetsRow.appendChild(btn);
    });
    panel.appendChild(presetsRow);

    // ── Interactive Parametric EQ Canvas
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 340;
    canvasEl.height = 140; // Taller for interactive dragging
    canvasEl.className = 'ypp-eq-canvas';
    canvasEl.style.cssText =
      'cursor: crosshair; touch-action: none; margin: 10px 16px 10px; border-radius: 10px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); width: calc(100% - 32px);';

    let draggingBand = -1;
    const logMin = Math.log10(20),
      logMax = Math.log10(20000);

    const getBandFromMouse = (e) => {
      const rect = canvasEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let closest = -1,
        minD = 24;
      ctx._bands.forEach((band, i) => {
        const bx =
          ((Math.log10(ctx._eqFreqs[i] || band.freq) - logMin) / (logMax - logMin)) *
          canvasEl.width;
        const by = canvasEl.height / 2 - (ctx._eqGains[i] / 13) * (canvasEl.height / 2 - 10);
        const d = Math.hypot(bx - x, by - y);
        if (d < minD) {
          minD = d;
          closest = i;
        }
      });
      return closest;
    };

    const updateFromMouse = (e, idx) => {
      if (idx < 0) return;
      const rect = canvasEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(canvasEl.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(canvasEl.height, e.clientY - rect.top));

      // Gain (-12 to +12)
      const db = ((canvasEl.height / 2 - y) / (canvasEl.height / 2 - 10)) * 13;
      ctx._setEQBand(idx, Math.max(-12, Math.min(12, Math.round(db * 2) / 2)));

      // Freq
      const logFreq = logMin + (x / canvasEl.width) * (logMax - logMin);
      const freq = Math.pow(10, logFreq);
      ctx._setEQBandFreq(idx, Math.max(20, Math.min(20000, freq)));

      this.drawCurve(ctx, canvasEl);
      if (activePresetBtn) {
        activePresetBtn.classList.remove('active');
        activePresetBtn = null;
      }
    };

    canvasEl.onpointerdown = (e) => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      canvasEl.setPointerCapture(e.pointerId);
      draggingBand = getBandFromMouse(e);
      if (draggingBand >= 0) updateFromMouse(e, draggingBand);
    };
    canvasEl.onpointermove = (e) => {
      if (draggingBand >= 0) {
        updateFromMouse(e, draggingBand);
      } else {
        canvasEl.style.cursor = getBandFromMouse(e) >= 0 ? 'grab' : 'crosshair';
      }
    };
    canvasEl.onpointerup = (e) => {
      canvasEl.releasePointerCapture(e.pointerId);
      if (draggingBand >= 0) VolumeBoosterUI.saveVolumeSettings(ctx);
      draggingBand = -1;
    };
    canvasEl.ondblclick = (e) => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      const idx = getBandFromMouse(e);
      if (idx >= 0) {
        ctx._setEQBand(idx, 0);
        this.drawCurve(ctx, canvasEl);
        VolumeBoosterUI.saveVolumeSettings(ctx);
      }
    };
    canvasEl.onwheel = (e) => {
      e.preventDefault();
      const idx = getBandFromMouse(e);
      if (idx >= 0 && ctx._bands[idx].type === 'peaking') {
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        const newQ = Math.max(0.1, Math.min(10, (ctx._eqQs[idx] || 1.4) + delta));
        ctx._setEQBandQ(idx, newQ);
        this.drawCurve(ctx, canvasEl);
        VolumeBoosterUI.saveVolumeSettings(ctx);
      }
    };

    // ── Footer: tabbed content panels ──
    // --- EQ content wrapper (bands + canvas)
    const eqContentWrap = document.createElement('div');
    eqContentWrap.id = 'ypp-eq-tab-eq';
    eqContentWrap.appendChild(canvasEl);
    panel.appendChild(eqContentWrap);

    // --- Dynamics tab panel
    const dynPanel = document.createElement('div');
    dynPanel.id = 'ypp-eq-tab-dyn';
    dynPanel.style.display = 'none';
    dynPanel.style.cssText = 'padding:12px 16px;display:none;';
    const mkDynRow = (label, min, max, step, val, unit, onChange) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;';
      const lbl = document.createElement('span');
      lbl.style.cssText =
        'font-size:9px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;min-width:76px;';
      lbl.textContent = label;
      const valEl = document.createElement('span');
      valEl.style.cssText =
        'font-size:11px;font-weight:800;color:#fff;min-width:36px;text-align:right;';
      valEl.textContent = val + unit;
      const sl = document.createElement('input');
      sl.type = 'range';
      sl.min = min;
      sl.max = max;
      sl.step = step;
      sl.value = val;
      sl.className = 'ypp-eq-hslider';
      sl.style.flex = '1';
      sl.oninput = (e) => {
        valEl.textContent = e.target.value + unit;
        onChange(parseFloat(e.target.value));
      };
      row.append(lbl, sl, valEl);
      return row;
    };
    if (ctx.compressorNode) {
      dynPanel.appendChild(
        mkDynRow('Threshold', -60, 0, 1, -24, 'dB', (v) => {
          ctx.compressorNode.threshold.value = v;
        })
      );
      dynPanel.appendChild(
        mkDynRow('Ratio', 1, 20, 0.5, 4, ':1', (v) => {
          ctx.compressorNode.ratio.value = v;
        })
      );
      dynPanel.appendChild(
        mkDynRow('Attack', 0, 1, 0.01, 0.003, 's', (v) => {
          ctx.compressorNode.attack.value = v;
        })
      );
      dynPanel.appendChild(
        mkDynRow('Release', 0, 1, 0.01, 0.25, 's', (v) => {
          ctx.compressorNode.release.value = v;
        })
      );
      dynPanel.appendChild(
        mkDynRow('Knee', 0, 40, 1, 30, 'dB', (v) => {
          ctx.compressorNode.knee.value = v;
        })
      );
      dynPanel.appendChild(
        mkDynRow('Tube Warmth', 0, 100, 1, ctx._warmthLevel || 0, '%', (v) => {
          if (ctx.setWarmth) ctx.setWarmth(v);
          VolumeBoosterUI.saveVolumeSettings(ctx);
        })
      );
    } else {
      dynPanel.innerHTML =
        '<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;">Compressor unavailable — audio not initialised yet.</div>';
    }
    panel.appendChild(dynPanel);

    // --- Spatial tab panel
    const spaPanel = document.createElement('div');
    spaPanel.id = 'ypp-eq-tab-spa';
    spaPanel.style.cssText = 'padding:12px 16px;display:none;';
    const stereoRow = mkDynRow(
      'Stereo Width',
      0,
      100,
      1,
      ctx._widenerEnabled ? 100 : 0,
      '%',
      (v) => {
        if (ctx.setWidener) {
          ctx.setWidener(v > 50);
          VolumeBoosterUI.saveVolumeSettings(ctx);
        }
      }
    );
    spaPanel.appendChild(stereoRow);
    const monoRow2 = mkDynRow('Mono Mix', 0, 100, 1, 0, '%', (v) => {
      if (ctx.setMono) {
        ctx.setMono(v > 50);
        VolumeBoosterUI.saveVolumeSettings(ctx);
      }
    });
    spaPanel.appendChild(monoRow2);
    panel.appendChild(spaPanel);

    // --- Tab switching
    const tabPanels = [eqContentWrap, dynPanel, spaPanel];
    const tabs = [tabEQ, tabDyn, tabSpa];
    tabs.forEach((tab, i) => {
      tab.onclick = () => {
        tabs.forEach((t, j) => {
          const active = i === j;
          t.classList.toggle('active', active);
          t.style.color = active ? '#fff' : 'rgba(255,255,255,0.45)';
          t.style.borderBottom = `2px solid ${active ? 'rgba(255,255,255,0.7)' : 'transparent'}`;
          tabPanels[j].style.display = active ? '' : 'none';
        });
      };
    });

    // ── Original Footer: Compressor toggle + Reset + Hint ──
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
      VolumeBoosterUI.saveVolumeSettings(ctx);
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
      VolumeBoosterUI.saveVolumeSettings(ctx);
    };

    const resetBtn = document.createElement('button');
    resetBtn.className = 'ypp-eq-reset-btn';
    resetBtn.textContent = 'Reset All';
    resetBtn.onclick = () => {
      if (ctx.ctx && ctx.ctx.state === 'suspended') ctx.ctx.resume();
      for (let i = 0; i < 10; i++) {
        ctx._setEQBand(i, 0);
      }
      this.syncBandUI(ctx, panel, canvasEl);
      if (activePresetBtn) activePresetBtn.classList.remove('active');
      const flatPreset = presetsRow.querySelector('.ypp-eq-preset-btn');
      if (flatPreset) flatPreset.classList.add('active');
      activePresetBtn = flatPreset;
      VolumeBoosterUI.saveVolumeSettings(ctx);
    };

    const hint = document.createElement('div');
    hint.className = 'ypp-eq-hint';
    hint.textContent = 'Dbl-click to center/zero';

    footer.append(compBtn, monoBtn, resetBtn, hint);
    panel.appendChild(footer);

    // Mount into the shared top-layer dialog portal — escapes all CSS containment.
    if (isGlobalBar) {
      const dlg = window.YPP.Utils.getPopupPortal();
      panel.style.pointerEvents = 'auto';
      panel.style.position = 'absolute';
      panel.style.overflow = 'hidden'; // clip to border-radius — prevents empty bottom area
      panel.style.clipPath = 'none';
      dlg.appendChild(panel);

      // Popup positioned in bottom-right by default via CSS.
    } else {
      document.body.appendChild(panel);
    }
    ctx._volumePopup = panel;

    anime({
      targets: panel.querySelectorAll('.ypp-eq-band-col'),
      translateY: [20, 0],
      opacity: [0, 1],
      delay: anime.stagger(30, { start: 150 }),
      easing: 'spring(1, 80, 10, 0)',
      duration: 600,
    });

    // Visualizer & Blur Loop
    let animFrameId = null;
    ctx._volumeAnimCancel = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = null;
    };

    const renderLoop = (timestamp) => {
      if (!ctx._volumePopup) return; // Stop if closed
      if (ctx.analyserNode) {
        this.drawCurve(ctx, canvasEl, true);
      }
      animFrameId = requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);

    // Initial curve draw (if no analyser yet)
    if (!ctx.analyserNode) this.drawCurve(ctx, canvasEl);

    // Click-outside to close
    const outside = (e) => {
      if (
        ctx._volumePopup &&
        !ctx._volumePopup.contains(e.target) &&
        !anchorBtn.contains(e.target)
      ) {
        this.toggleEQPanel(ctx, video, anchorBtn);
      }
    };
    ctx._volumePopupOutsideHandler = outside;
    setTimeout(
      () =>
        ctx.addListener
          ? ctx.addListener(document, 'click', outside)
          : document.addEventListener('click', outside),
      0
    );

    // Escape key closes the EQ panel
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && ctx._volumePopup) {
        // DO NOT stop propagation here; allow YouTube to handle the ESC key natively
        // (e.g. to exit fullscreen) to prevent the "ESC button toggle issue"
        this.toggleEQPanel(ctx, video, anchorBtn);
      }
    };
    ctx._volumePopupEscapeHandler = onKeyDown;
    if (ctx.addListener) ctx.addListener(document, 'keydown', onKeyDown);
    else document.addEventListener('keydown', onKeyDown);
  }

  static syncBandUI(ctx, panel, canvas) {
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
    const W = canvas.width,
      H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const logMin = Math.log10(20),
      logMax = Math.log10(20000);
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
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Vertical band markers
    ctxRef._bands.forEach((band, i) => {
      const freq = ctxRef._eqFreqs ? ctxRef._eqFreqs[i] || band.freq : band.freq;
      const x = ((Math.log10(freq) - logMin) / (logMax - logMin)) * W;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Compute gain at each pixel using summed Gaussian approximation
    const gainAt = (freq) => {
      let total = 0;
      ctxRef._bands.forEach((band, i) => {
        const db = ctxRef._eqGains[i];
        if (db === 0) return;
        const bFreq = ctxRef._eqFreqs ? ctxRef._eqFreqs[i] || band.freq : band.freq;
        const Q = ctxRef._eqQs ? ctxRef._eqQs[i] || 1.4 : 1.4;
        const bw = band.type === 'peaking' ? 1.5 / Q : 1.6;
        const logDist = Math.log2(freq / bFreq) / bw;
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

    // Draw interactive nodes
    ctxRef._bands.forEach((band, i) => {
      const freq = ctxRef._eqFreqs ? ctxRef._eqFreqs[i] || band.freq : band.freq;
      const db = ctxRef._eqGains[i];
      const x = ((Math.log10(freq) - logMin) / (logMax - logMin)) * W;
      const y = H / 2 - (db / dbRange) * (H / 2 - 10);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = band.color || '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
    });
  }

  static injectEQStyles() {
    if (document.getElementById('ypp-eq-styles')) return;
    const style = document.createElement('style');
    style.id = 'ypp-eq-styles';
    style.textContent = `
/* ── EQ Panel ── */
#ypp-eq-panel {
    position: fixed;
    bottom: 80px;
    right: 16px;
    width: 430px;
    background: rgba(0, 0, 0, 0.15); /* Fully transparent with heavy blur */
    border: 1px solid rgba(255,255,255,0.15);
    border-top: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px;
    z-index: 2147483646;
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
    from { opacity:0; transform:translateY(12px) scale(calc(0.96 * var(--ypp-auto-scale, 1))); }
    to   { opacity:1; transform:translateY(0)   scale(var(--ypp-auto-scale, 1));    }
}

/* Header */
.ypp-eq-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px 11px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
}
.ypp-eq-title-group { display:flex; align-items:center; gap:8px; }
.ypp-eq-icon {
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
}
.ypp-eq-title { font-size:13px; font-weight:700; letter-spacing:-0.2px; }
.ypp-eq-subtitle { font-size:9px; color:rgba(255,255,255,0.38); font-weight:500; margin-top:1px; }
.ypp-eq-close-btn {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.7); border-radius: 50%; width:24px; height:24px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition: background 0.2s, color 0.2s;
}
.ypp-eq-close-btn:hover { background: rgba(255,255,255,0.14); color:#fff; }

/* Gain Row */
.ypp-eq-gain-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-eq-row-label {
    font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.45);
    text-transform: uppercase; letter-spacing: 0.6px; min-width: 68px;
}
.ypp-eq-gain-value {
    font-size: 11px; font-weight: 800; color: #ffffff;
    min-width: 36px; text-align: right;
}

/* Horizontal slider */
.ypp-eq-hslider {
    -webkit-appearance: none; appearance: none; flex: 1;
    height: 4px; border-radius: 4px; outline: none; cursor: pointer;
    border: none; transition: height 0.15s ease;
}
.ypp-eq-hslider:hover { height: 6px; }
.ypp-eq-hslider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
    background: #fff; border: 2.5px solid #fff; cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.2);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
}
.ypp-eq-hslider::-webkit-slider-thumb:hover {
    transform: scale(1.35);
    box-shadow: 0 2px 12px rgba(0,0,0,0.6), 0 0 0 4px rgba(255,255,255,0.3), 0 0 12px rgba(255,255,255,0.4);
}

/* Presets */
.ypp-eq-presets-row {
    display: flex; gap: 5px; padding: 8px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
}
.ypp-eq-presets-row::-webkit-scrollbar { display: none; }
.ypp-eq-preset-btn {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 16px; cursor: pointer;
    font-size: 10px; font-weight: 600; padding: 4px 10px;
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
    display: block; width: calc(100% - 32px); height: 90px;
    margin: 0 16px 2px; border-radius: 10px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
}

/* Band columns */
.ypp-eq-bands {
    display: flex; gap: 0; padding: 5px 12px 10px;
    justify-content: space-between;
}
.ypp-eq-band-col {
    display: flex; flex-direction: column; align-items: center;
    gap: 3px; flex: 1; padding: 0 2px;
}
.ypp-eq-band-db {
    font-size: 9px; font-weight: 800; min-height: 12px; line-height: 1;
}
.ypp-eq-band-track {
    position: relative; height: 110px; width: 100%;
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
    width: 70px;
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
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--band-color, #ffffff);
    cursor: pointer;
    box-shadow: 0 0 8px rgba(255,255,255,0.3);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.ypp-eq-vslider::-webkit-slider-thumb:hover { transform: scale(1.45); }

/* Footer */
.ypp-eq-footer {
    display: flex; align-items: center; gap: 6px;
    padding: 0 16px 12px;
}
.ypp-eq-comp-btn {
    display: flex; align-items: center; gap: 4px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.55); border-radius: 16px; cursor: pointer;
    font-size: 10px; font-weight: 600; padding: 4px 10px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-comp-btn.active {
    background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4);
    color: #ffffff; box-shadow: 0 0 10px rgba(255,255,255,0.15);
}
.ypp-eq-comp-btn:hover { background: rgba(255,255,255,0.1); }
.ypp-eq-reset-btn {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.22);
    color: #ffffff; border-radius: 16px; cursor: pointer;
    font-size: 10px; font-weight: 600; padding: 4px 10px;
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
