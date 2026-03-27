/**
 * Player Enhancements Module
 * Adds useful features to the video player: Snapshot, Loop, Speed, Volume Boost, Auto Quality,
 * and a unified Cinema Filters system (presets + custom sliders + special effects).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.Player = class Player {
    constructor() {
        this.settings = null;
        this.ctx = null;
        this.source = null;
        this.gainNode = null;
        this.isLooping = false;

        // ---- Cinema Filters State ----
        this.currentFilterIndex = 0;
        this.filterAdjustments = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            hueRotate: 0,
            blur: 0,
            opacity: 100
        };
        this._filterOverlay = null; // CRT/VHS scanline overlay div
        this._filterPanel = null;   // The open filter panel
        this._filterBtn = null;     // Reference to filter button for active state

        // ---- Cinema Filter Presets ----
        this.filters = [
            { name: 'Normal',        css: 'none',                                                        overlay: null },
            { name: 'Sepia',         css: 'sepia(100%)',                                                  overlay: null },
            { name: 'Noir',          css: 'grayscale(100%) contrast(130%) brightness(85%)',               overlay: null },
            { name: 'Grayscale',     css: 'grayscale(100%)',                                              overlay: null },
            { name: 'High Contrast', css: 'contrast(160%) saturate(90%)',                                 overlay: null },
            { name: 'Vivid',         css: 'saturate(200%) contrast(110%)',                                overlay: null },
            { name: 'Warm',          css: 'sepia(40%) saturate(130%) contrast(100%) brightness(105%)',    overlay: null },
            { name: 'Cool',          css: 'hue-rotate(200deg) saturate(130%) brightness(95%)',            overlay: null },
            { name: 'Night Vision',  css: 'grayscale(100%) brightness(70%) contrast(150%) hue-rotate(90deg) saturate(250%)', overlay: null },
            { name: 'Invert',        css: 'invert(100%)',                                                 overlay: null },
            { name: 'Retro',         css: 'sepia(60%) hue-rotate(330deg) saturate(150%) contrast(120%)', overlay: null },
            { name: 'Fade',          css: 'contrast(80%) brightness(110%) saturate(80%)',                 overlay: null },
            { name: 'Dreamy',        css: 'brightness(110%) contrast(90%) saturate(120%) blur(0.5px)',    overlay: null },
            { name: '📺 CRT Display',css: 'url(#ypp-crt-rgb) contrast(135%) brightness(70%) saturate(75%)', overlay: 'crt' },
            { name: '📼 VHS Tape',   css: 'contrast(90%) brightness(85%) saturate(60%) hue-rotate(5deg)',overlay: 'vhs' },
            { name: '🎞 Old Film',   css: 'sepia(70%) contrast(90%) brightness(85%) blur(0.3px)',         overlay: 'oldfilm' },
        ];

        this.injectedButtons = false;
        this._boundTimeUpdate = null;
        this._boundPiP = null;
        this._videoElement = null;
    }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        if (this.waitForPlayerInterval) {
            clearInterval(this.waitForPlayerInterval);
            this.waitForPlayerInterval = null;
        }

        if (this.gainNode) {
            this.gainNode.gain.value = 1;
        }

        const time = document.getElementById('ypp-remaining-time');
        if (time) time.remove();

        if (this._videoElement && this._boundTimeUpdate) {
            this._videoElement.removeEventListener('timeupdate', this._boundTimeUpdate);
            this._boundTimeUpdate = null;
        }

        if (this._boundPiP) {
            document.removeEventListener('visibilitychange', this._boundPiP);
            this._boundPiP = null;
        }

        this._videoElement = null;
        this._removeFilterOverlay();
        this._removeFilterPanel();
    }

    update(settings) {
        this.settings = settings;

        if (this.gainNode && settings.volumeBoost) {
            this.setVolume(settings.volumeLevel || 1);
        }

        const controls = document.querySelector('.ypp-player-controls');
        if (controls) controls.remove();
        this.injectedButtons = false;

        this.run();
    }

    async run() {
        const Utils = window.YPP.Utils;
        if (!Utils) return;

        try {
            const elements = await Utils.pollFor(() => {
                const video = document.querySelector('video');
                const controls = document.querySelector('.ytp-right-controls');
                if (video && controls && video.readyState >= 1) {
                    return { video, controls };
                }
                return null;
            }, 10000, 500);

            if (elements) {
                const { video, controls } = elements;
                this._videoElement = video;

                if (!document.querySelector('.ypp-player-controls')) {
                    this.injectControls(video, controls);
                }

                if (this.settings.enableRemainingTime) {
                    const leftControls = controls.parentElement.querySelector('.ytp-left-controls');
                    this.showRemainingTime(video, leftControls);
                }

                if (this.settings.autoQuality) {
                    this.applyAutoQuality();
                }

                if (this.settings.autoCinema) {
                    this.enforceTheaterMode(controls);
                }

                if (this.settings.autoPiP) {
                    this.handleAutoPiP(video);
                }

                // Restore saved cinema filter state
                if (this.settings.enableCinemaFilters) {
                    this._restoreFilterState();
                }
            }
        } catch (error) {
            Utils.log('Player initialization timed out or failed', 'PLAYER', 'debug');
        }
    }

    enforceTheaterMode(controls) {
        if (this.hasEnforcedTheater) return;
        const sizeBtn = controls.querySelector('.ytp-size-button');
        if (!sizeBtn) return;
        const ytdWatch = document.querySelector('ytd-watch-flexy');
        if (ytdWatch && !ytdWatch.hasAttribute('theater')) {
            sizeBtn.click();
            this.hasEnforcedTheater = true;
            document.cookie = "wide=1;domain=.youtube.com;path=/";
        } else if (ytdWatch && ytdWatch.hasAttribute('theater')) {
            this.hasEnforcedTheater = true;
        }
    }

    handleAutoPiP(video) {
        if (this._boundPiP) return;
        const handleVisibility = async () => {
            if (document.hidden && !video.paused) {
                if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
                    try { await video.requestPictureInPicture(); } catch(e) {}
                }
            } else if (!document.hidden && document.pictureInPictureElement) {
                try { await document.exitPictureInPicture(); } catch(e) {}
            }
        };
        this._boundPiP = handleVisibility;
        document.addEventListener('visibilitychange', handleVisibility);
    }

    injectControls(video, controls) {
        if (document.querySelector('.ypp-player-controls')) return;

        const container = document.createElement('div');
        container.className = 'ypp-player-controls';

        container.appendChild(this._createSnapshotButton(video));
        container.appendChild(this._createLoopButton(video));
        container.appendChild(this._createSpeedControls(video));

        if (document.pictureInPictureEnabled) {
            container.appendChild(this._createPiPButton(video));
        }

        if (this.settings.enableCinemaFilters) {
            const filterBtn = this._createFilterButton(video);
            this._filterBtn = filterBtn;
            container.appendChild(filterBtn);
        }

        controls.insertBefore(container, controls.firstChild);
        this.injectedButtons = true;
        this.initAudioContext(video);
    }

    // =========================================================================
    // CINEMA FILTERS — Unified System
    // =========================================================================

    _createFilterButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff">
            <path d="M17.66 7.93L12 2.27 6.34 7.93c-3.12 3.12-3.12 8.19 0 11.31C7.9 20.8 9.95 21.58 12 21.58c2.05 0 4.1-.78 5.66-2.34 3.12-3.12 3.12-8.19 0-11.31zM12 19.59c-1.6 0-3.11-.62-4.24-1.76C6.62 16.69 6 15.19 6 13.59s.62-3.11 1.76-4.24L12 5.1v14.49z"/>
        </svg>`;
        const btn = this.createButton(icon, 'Cinema Filters', () => this.toggleFilterPanel(video, btn));
        return btn;
    }

    toggleFilterPanel(video, btn) {
        if (this._filterPanel) {
            this._removeFilterPanel();
            return;
        }
        this._createFilterPanel(video, btn);
    }

    _removeFilterPanel() {
        if (this._filterPanel) {
            this._filterPanel.remove();
            this._filterPanel = null;
        }
    }

    _removeFilterOverlay() {
        if (this._filterOverlay) {
            this._filterOverlay.remove();
            this._filterOverlay = null;
        }
        // Also remove CRT SVG filter if it was injected (so it doesn't linger)
        const crtSvg = document.getElementById('ypp-crt-svg-defs');
        if (crtSvg) crtSvg.remove();
    }

    _createFilterPanel(video, btn) {
        const panel = document.createElement('div');
        panel.id = 'ypp-cinema-panel';
        Object.assign(panel.style, {
            position: 'absolute',
            bottom: '60px',
            right: '10px',
            background: 'rgba(15, 15, 15, 0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            zIndex: '9999',
            width: '300px',
            color: '#fff',
            fontFamily: 'Roboto, Inter, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(16px)',
            overflow: 'hidden',
            userSelect: 'none'
        });

        // --- Header ---
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
        });
        header.innerHTML = `
            <span style="font-size:13px;font-weight:600;letter-spacing:0.3px;">🎬 Cinema Filters</span>
        `;
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: '14px', lineHeight: '1', padding: '0'
        });
        closeBtn.onclick = () => this._removeFilterPanel();
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // --- Tabs ---
        const tabBar = document.createElement('div');
        Object.assign(tabBar.style, {
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)'
        });

        let activeTab = 'presets';
        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, { padding: '10px', maxHeight: '340px', overflowY: 'auto' });
        // Custom scrollbar via style
        tabContent.style.scrollbarWidth = 'thin';
        tabContent.style.scrollbarColor = 'rgba(255,255,255,0.2) transparent';

        const presetsContent = this._buildPresetsTab(video, btn);
        const adjustContent = this._buildAdjustTab(video);

        const renderTab = (tab) => {
            activeTab = tab;
            tabContent.innerHTML = '';
            if (tab === 'presets') {
                tabContent.appendChild(presetsContent);
            } else {
                tabContent.appendChild(adjustContent);
            }
            tabBtns.forEach(tb => {
                const isActive = tb.dataset.tab === tab;
                tb.style.color = isActive ? '#ff4e45' : 'rgba(255,255,255,0.45)';
                tb.style.borderBottom = isActive ? '2px solid #ff4e45' : '2px solid transparent';
                tb.style.background = 'none';
            });
        };

        const tabDefs = [
            { id: 'presets', label: '🎨 Presets' },
            { id: 'adjust',  label: '🎛️ Adjust' }
        ];
        const tabBtns = tabDefs.map(def => {
            const t = document.createElement('button');
            t.dataset.tab = def.id;
            t.textContent = def.label;
            Object.assign(t.style, {
                flex: '1', background: 'none', border: 'none', borderBottom: '2px solid transparent',
                color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: '9px 4px',
                fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', transition: 'color 0.15s'
            });
            t.onclick = () => renderTab(def.id);
            tabBar.appendChild(t);
            return t;
        });

        panel.appendChild(tabBar);
        panel.appendChild(tabContent);

        // --- Footer: Reset ---
        const footer = document.createElement('div');
        Object.assign(footer.style, {
            padding: '8px 14px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end'
        });
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset All';
        Object.assign(resetBtn.style, {
            background: 'rgba(255,78,69,0.15)', border: '1px solid rgba(255,78,69,0.4)',
            color: '#ff4e45', borderRadius: '6px', cursor: 'pointer',
            fontSize: '11px', padding: '4px 12px', fontFamily: 'inherit'
        });
        resetBtn.onclick = () => {
            this.currentFilterIndex = 0;
            this.filterAdjustments = { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, blur: 0, opacity: 100 };
            this._applyComputedFilter(video);
            if (btn) { btn.classList.remove('active'); btn.title = 'Cinema Filters'; }
            // Re-render panel
            this._removeFilterPanel();
            this._createFilterPanel(video, btn);
        };
        footer.appendChild(resetBtn);
        panel.appendChild(footer);

        const container = document.getElementById('movie_player') || document.body;
        container.appendChild(panel);
        this._filterPanel = panel;

        renderTab('presets');

        // Click-outside to close
        const outside = (e) => {
            if (this._filterPanel && !this._filterPanel.contains(e.target) && !btn?.contains(e.target)) {
                this._removeFilterPanel();
                document.removeEventListener('click', outside);
            }
        };
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    _buildPresetsTab(video, btn) {
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px'
        });

        this.filters.forEach((filter, index) => {
            const card = document.createElement('div');
            const isActive = this.currentFilterIndex === index;
            Object.assign(card.style, {
                padding: '9px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                border: isActive ? '1px solid rgba(255,78,69,0.7)' : '1px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(255,78,69,0.12)' : 'rgba(255,255,255,0.04)',
                transition: 'all 0.15s',
                fontSize: '12px',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? '#ff4e45' : 'rgba(255,255,255,0.85)',
                lineHeight: '1.3'
            });

            card.textContent = filter.name;
            card.title = filter.name;

            card.addEventListener('mouseenter', () => {
                if (!isActive) {
                    card.style.background = 'rgba(255,255,255,0.09)';
                    card.style.borderColor = 'rgba(255,255,255,0.2)';
                }
            });
            card.addEventListener('mouseleave', () => {
                if (this.currentFilterIndex !== index) {
                    card.style.background = 'rgba(255,255,255,0.04)';
                    card.style.borderColor = 'rgba(255,255,255,0.08)';
                }
            });

            card.onclick = (e) => {
                e.stopPropagation();
                this.currentFilterIndex = index;
                this._applyComputedFilter(video);

                if (btn) {
                    if (index > 0) {
                        btn.classList.add('active');
                        btn.title = `Cinema Filters: ${filter.name}`;
                    } else {
                        btn.classList.remove('active');
                        btn.title = 'Cinema Filters';
                    }
                }

                // Show mini toast
                this._showToast(video, `Filter: ${filter.name}`);

                // Re-render presets to update active state
                this._removeFilterPanel();
                this._createFilterPanel(video, btn);
            };

            wrap.appendChild(card);
        });

        return wrap;
    }

    _buildAdjustTab(video) {
        const wrap = document.createElement('div');

        const sliderConfigs = [
            { id: 'brightness', label: 'Brightness', min: 0,   max: 200, unit: '%',  default: 100 },
            { id: 'contrast',   label: 'Contrast',   min: 0,   max: 200, unit: '%',  default: 100 },
            { id: 'saturate',   label: 'Saturation', min: 0,   max: 200, unit: '%',  default: 100 },
            { id: 'hueRotate',  label: 'Hue Rotate', min: 0,   max: 360, unit: 'deg',default: 0 },
            { id: 'blur',       label: 'Blur',       min: 0,   max: 10,  unit: 'px', default: 0 },
            { id: 'opacity',    label: 'Opacity',    min: 10,  max: 100, unit: '%',  default: 100 },
        ];

        sliderConfigs.forEach(cfg => {
            const row = document.createElement('div');
            row.style.marginBottom = '10px';

            const labelRow = document.createElement('div');
            Object.assign(labelRow.style, {
                display: 'flex', justifyContent: 'space-between',
                fontSize: '11px', marginBottom: '4px',
                color: 'rgba(255,255,255,0.7)'
            });

            const labelEl = document.createElement('span');
            labelEl.textContent = cfg.label;

            const valueEl = document.createElement('span');
            valueEl.textContent = this.filterAdjustments[cfg.id] + cfg.unit;
            valueEl.style.color = 'rgba(255,255,255,0.5)';

            labelRow.appendChild(labelEl);
            labelRow.appendChild(valueEl);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = cfg.min;
            slider.max = cfg.max;
            slider.value = this.filterAdjustments[cfg.id];
            Object.assign(slider.style, {
                width: '100%',
                accentColor: '#ff4e45',
                cursor: 'pointer',
                height: '3px'
            });

            slider.oninput = (e) => {
                this.filterAdjustments[cfg.id] = Number(e.target.value);
                valueEl.textContent = e.target.value + cfg.unit;
                this._applyComputedFilter(video);
            };

            row.appendChild(labelRow);
            row.appendChild(slider);
            wrap.appendChild(row);
        });

        return wrap;
    }

    /**
     * Build and apply the combined CSS filter string from:
     * 1. Active preset (base CSS filter string)
     * 2. Custom slider adjustments (stacked on top)
     * Also manages overlay effects for CRT/VHS/Old Film
     */
    _applyComputedFilter(video) {
        if (!video) video = document.querySelector('video');
        if (!video) return;

        const preset = this.filters[this.currentFilterIndex];
        const adj = this.filterAdjustments;

        // Build adjustment filter string
        const adjStr = [
            `brightness(${adj.brightness}%)`,
            `contrast(${adj.contrast}%)`,
            `saturate(${adj.saturate}%)`,
            `hue-rotate(${adj.hueRotate}deg)`,
            adj.blur > 0 ? `blur(${adj.blur}px)` : '',
            `opacity(${adj.opacity}%)`
        ].filter(Boolean).join(' ');

        // Combine: preset first (if not 'none'), then adjustments
        const isDefault = (
            adj.brightness === 100 && adj.contrast === 100 && adj.saturate === 100 &&
            adj.hueRotate === 0 && adj.blur === 0 && adj.opacity === 100
        );

        let finalFilter;
        if (preset.css === 'none') {
            finalFilter = isDefault ? 'none' : adjStr;
        } else {
            finalFilter = isDefault ? preset.css : `${preset.css} ${adjStr}`;
        }

        video.style.filter = finalFilter;

        // Handle special overlays
        this._removeFilterOverlay();
        if (preset.overlay) {
            this._applyOverlay(preset.overlay);
        }
    }

    _applyOverlay(type) {
        const container = document.getElementById('movie_player');
        if (!container) return;

        const overlay = document.createElement('div');
        overlay.id = 'ypp-filter-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '5';

        if (type === 'crt') {
            // Inject SVG chromatic-aberration filter (RGB sub-pixel split)
            this._injectCRTSVGFilter();

            // Layer 1: Phosphor dot mesh (R/G/B sub-pixel columns, 3px cells)
            // + scanlines (1px dark line every 3px)
            // + edge vignette
            overlay.style.backgroundImage = `
                radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.85) 100%),
                repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.5) 0px,
                    rgba(0,0,0,0.5) 1px,
                    transparent 1px,
                    transparent 3px
                ),
                repeating-linear-gradient(
                    90deg,
                    rgba(255, 40,  40,  0.1) 0px,
                    rgba(255, 40,  40,  0.1) 1px,
                    rgba(40,  255, 40,  0.1) 1px,
                    rgba(40,  255, 40,  0.1) 2px,
                    rgba(40,  40,  255, 0.1) 2px,
                    rgba(40,  40,  255, 0.1) 3px,
                    transparent 3px,
                    transparent 3px
                )
            `;
            overlay.style.backgroundSize = '100% 100%, 100% 3px, 3px 100%';
            overlay.style.boxShadow = 'inset 0 0 80px rgba(0,0,0,0.6)';
            overlay.style.borderRadius = '6px';
            overlay.style.animation = 'ypp-crt-flicker 3s ease-in-out infinite';

        } else if (type === 'vhs') {
            // Heavy horizontal scan banding
            overlay.style.backgroundImage = `
                repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.22) 0px,
                    rgba(0,0,0,0.22) 2px,
                    transparent 2px,
                    transparent 5px
                )
            `;
            overlay.style.mixBlendMode = 'multiply';

            // VHS tracking noise (top-bottom drift band)
            const band = document.createElement('div');
            Object.assign(band.style, {
                position: 'absolute', left: '0', width: '100%', height: '6px',
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(1px)',
                animation: 'ypp-vhs-band 4s linear infinite',
                pointerEvents: 'none'
            });
            overlay.appendChild(band);

        } else if (type === 'oldfilm') {
            // Vignette + grain
            overlay.style.backgroundImage = `
                radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)
            `;
            overlay.style.animation = 'ypp-grain 0.1s steps(1) infinite';
        }

        container.appendChild(overlay);
        this._filterOverlay = overlay;
        this._injectOverlayCSS();
    }

    /**
     * Inject the SVG filter for CRT RGB channel separation (chromatic aberration).
     * Splits the video into R, G, B channels and offsets R by +1px and B by -1px,
     * simulating the phosphor sub-pixel layout of a real CRT display.
     */
    _injectCRTSVGFilter() {
        if (document.getElementById('ypp-crt-svg-defs')) return;
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.id = 'ypp-crt-svg-defs';
        svg.setAttribute('xmlns', svgNS);
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';

        const defs = document.createElementNS(svgNS, 'defs');
        const filter = document.createElementNS(svgNS, 'filter');
        filter.id = 'ypp-crt-rgb';
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');

        // Helper to create SVG element
        const el = (tag, attrs) => {
            const e = document.createElementNS(svgNS, tag);
            Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
            return e;
        };

        // Extract channels via color matrix, then offset R right and B left
        filter.append(
            // Red channel: shift right 1px
            el('feOffset',      { in: 'SourceGraphic', dx: '1.5', dy: '0', result: 'rShifted' }),
            el('feColorMatrix', { in: 'rShifted', type: 'matrix',
                values: '1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'rOnly' }),

            // Green channel: no shift
            el('feColorMatrix', { in: 'SourceGraphic', type: 'matrix',
                values: '0 0 0 0 0   0 1 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'gOnly' }),

            // Blue channel: shift left 1px
            el('feOffset',      { in: 'SourceGraphic', dx: '-1.5', dy: '0', result: 'bShifted' }),
            el('feColorMatrix', { in: 'bShifted', type: 'matrix',
                values: '0 0 0 0 0   0 0 0 0 0   0 0 1 0 0   0 0 0 1 0', result: 'bOnly' }),

            // Blend channels back together
            el('feBlend', { in: 'rOnly',  in2: 'gOnly', mode: 'screen', result: 'rg' }),
            el('feBlend', { in: 'rg',     in2: 'bOnly', mode: 'screen' })
        );

        defs.appendChild(filter);
        svg.appendChild(defs);
        document.body.appendChild(svg);
    }

    _injectOverlayCSS() {
        if (document.getElementById('ypp-overlay-css')) return;
        const style = document.createElement('style');
        style.id = 'ypp-overlay-css';
        style.textContent = `
            @keyframes ypp-crt-flicker {
                0%   { opacity: 1; }
                48%  { opacity: 1; }
                50%  { opacity: 0.94; }
                52%  { opacity: 1; }
                88%  { opacity: 1; }
                90%  { opacity: 0.97; }
                92%  { opacity: 1; }
            }
            @keyframes ypp-vhs-band {
                0%   { top: -8px; }
                100% { top: 102%; }
            }
            @keyframes ypp-grain {
                0%  { background-position: 0% 0%; }
                10% { background-position: -5% -5%; }
                20% { background-position: -10% 5%; }
                30% { background-position: 5% -10%; }
                40% { background-position: -5% 15%; }
                50% { background-position: -10% 5%; }
                60% { background-position: 15% 0%; }
                70% { background-position: 0% 10%; }
                80% { background-position: -15% 0%; }
                90% { background-position: 10% 5%; }
                100%{ background-position: 5% 0%; }
            }
        `;
        document.head.appendChild(style);
    }

    _restoreFilterState() {
        const s = this.settings;
        // Restore adjustment sliders from settings if we saved them
        if (s.cinemaFilterBrightness !== undefined) this.filterAdjustments.brightness = s.cinemaFilterBrightness;
        if (s.cinemaFilterContrast !== undefined)   this.filterAdjustments.contrast   = s.cinemaFilterContrast;
        if (s.cinemaFilterSaturate !== undefined)   this.filterAdjustments.saturate   = s.cinemaFilterSaturate;
        if (s.cinemaFilterHue !== undefined)        this.filterAdjustments.hueRotate  = s.cinemaFilterHue;
        if (s.cinemaFilterBlur !== undefined)       this.filterAdjustments.blur       = s.cinemaFilterBlur;
        if (s.cinemaFilterOpacity !== undefined)    this.filterAdjustments.opacity    = s.cinemaFilterOpacity;
        if (s.cinemaFilterIndex !== undefined)      this.currentFilterIndex           = s.cinemaFilterIndex;

        // Only re-apply if there's a non-default state
        const hasActiveFilter = this.currentFilterIndex > 0 ||
            this.filterAdjustments.brightness !== 100 || this.filterAdjustments.contrast !== 100 ||
            this.filterAdjustments.saturate !== 100 || this.filterAdjustments.hueRotate !== 0 ||
            this.filterAdjustments.blur !== 0 || this.filterAdjustments.opacity !== 100;

        if (hasActiveFilter && this._videoElement) {
            this._applyComputedFilter(this._videoElement);
        }
    }

    _showToast(video, message) {
        const toast = document.createElement('div');
        toast.className = 'ypp-toast-mini';
        toast.textContent = message;
        const parent = video.parentElement || document.getElementById('movie_player');
        if (parent) {
            parent.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
    }

    // =========================================================================
    // Button Creators
    // =========================================================================

    _createSnapshotButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM9 9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/><path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l.59-.65L9.88 4h4.24l1.24 1.35.59.65H20v12zM12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0-8c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>`;
        return this.createButton(icon, 'Take Snapshot', () => this.takeSnapshot(video));
    }

    _createLoopButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v6z"/></svg>`;
        const btn = this.createButton(icon, 'Loop Video', () => this.toggleLoop(video, btn));
        if (this.settings.loop || video.loop) {
            btn.classList.add('active');
            video.loop = true;
        }
        return btn;
    }

    _createSpeedControls(video) {
        const container = document.createElement('div');
        container.className = 'ypp-speed-controls';
        ['1', '1.5', '2', '3'].forEach(rate => {
            const btn = document.createElement('button');
            btn.className = 'ypp-speed-btn';
            btn.textContent = rate + 'x';
            btn.dataset.speed = rate;
            if (video.playbackRate == rate) btn.classList.add('active');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                video.playbackRate = parseFloat(rate);
                this.updateSpeedButtons(container, rate);
            });
            container.appendChild(btn);
        });
        return container;
    }

    _createPiPButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
        const btn = this.createButton(icon, 'Picture-in-Picture', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await video.requestPictureInPicture();
                }
            } catch (e) {
                console.error('[YPP:PLAYER] PiP failed', e);
            }
        });
        video.addEventListener('enterpictureinpicture', () => btn.classList.add('active'));
        video.addEventListener('leavepictureinpicture', () => btn.classList.remove('active'));
        return btn;
    }

    createButton(svgContent, title, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = svgContent;
        btn.title = title;
        btn.className = 'ypp-action-btn';
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
        return btn;
    }

    // =========================================================================
    // Actions
    // =========================================================================

    takeSnapshot(video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `youtube-snapshot-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            alert('Cannot save snapshot (Content might be DRM protected)');
        }
    }

    toggleLoop(video, btn) {
        video.loop = !video.loop;
        btn.classList.toggle('active', video.loop);
    }

    initAudioContext(video) {
        if (this.ctx || !this.settings.volumeBoost) return;
        const init = () => {
            if (this.ctx) return;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContext();
                this.source = this.ctx.createMediaElementSource(video);
                this.compressorNode = this.ctx.createDynamicsCompressor();
                this.compressorNode.threshold.value = -1;
                this.compressorNode.knee.value = 10;
                this.compressorNode.ratio.value = 20;
                this.compressorNode.attack.value = 0.005;
                this.compressorNode.release.value = 0.05;
                this.gainNode = this.ctx.createGain();
                this.source.connect(this.gainNode);
                this.gainNode.connect(this.compressorNode);
                this.compressorNode.connect(this.ctx.destination);
                this.setVolume(this.settings.volumeLevel || 1);
            } catch (e) {}
        };
        video.addEventListener('play', init, { once: true });
        video.addEventListener('volumechange', init, { once: true });
    }

    setVolume(multiplier) {
        if (this.gainNode) {
            this.gainNode.gain.value = multiplier;
        }
    }

    updateSpeedButtons(container, activeSpeed) {
        container.querySelectorAll('.ypp-speed-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.speed === activeSpeed);
        });
    }

    applyAutoQuality() {
        const player = document.getElementById('movie_player');
        if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
        const available = player.getAvailableQualityLevels();
        const preferred = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
        const best = preferred.find(q => available.includes(q));
        if (best && typeof player.setPlaybackQualityRange === 'function') {
            const current = player.getPlaybackQuality();
            if (current !== best) {
                player.setPlaybackQualityRange(best);
            }
        }
    }

    showRemainingTime(video, leftControls) {
        if (!leftControls) return;
        let remainingEl = document.getElementById('ypp-remaining-time');
        if (!remainingEl) {
            remainingEl = document.createElement('span');
            remainingEl.id = 'ypp-remaining-time';
            Object.assign(remainingEl.style, {
                marginLeft: '10px', opacity: '0.7',
                fontSize: '12px', fontFamily: 'Roboto, sans-serif'
            });
            leftControls.appendChild(remainingEl);
        }
        const update = () => {
            if (!video || !video.duration || !isFinite(video.duration) || isNaN(video.currentTime)) {
                remainingEl.textContent = ''; return;
            }
            const left = video.duration - video.currentTime;
            if (left <= 0) { remainingEl.textContent = ''; return; }
            const format = (s) => {
                const m = Math.floor(s / 60);
                const sec = Math.floor(s % 60);
                return `${m}:${sec.toString().padStart(2, '0')}`;
            };
            remainingEl.textContent = `(-${format(left)})`;
        };
        if (this._boundTimeUpdate) {
            video.removeEventListener('timeupdate', this._boundTimeUpdate);
        }
        this._boundTimeUpdate = update;
        video.addEventListener('timeupdate', update);
    }
};
