/**
 * Video Filters Feature Orchestrator
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFilters = class VideoFilters extends window.YPP.features.BaseFeature {
    constructor() {
        super('VideoFilters');
        this.name = 'VideoFilters';
        // ---- Cinema Filters State ----
        this.currentFilterIndex = 0;
        this.filterIntensity = 100; // 0-100%
        this.isComparing = false;   // Toggle for before/after
        this.filterAdjustments = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            hueRotate: 0,
            sepia: 0,
            grayscale: 0,
            invert: 0,
            blur: 0,
            opacity: 100,
            dehaze: 0,
            clarity: 0,
            grain: 0,
            sharpness: 0,
            temperature: 0,
            vibrance: 100,
            highlights: 0,
            shadows: 0,
            vignette: 0
        };
        this._filterOverlay = null; // CRT/VHS scanline overlay div
        this._filterPanel = null;   // The open filter panel
        this._filterBtn = null;     // Reference to filter button for active state
        this._filterPanelOutsideHandler = null;
        this._previewFilterIndex = undefined; // Transient hover-preview state
    }

    getConfigKey() { return 'enableCinemaFilters'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        try {
            window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
            this._removeFilterPanel();
            if (this._filterBtn) {
                this._filterBtn.remove();
                this._filterBtn = null;
            }
        } catch (err) {
            console.error('[YPP] VideoFilters disable error:', err);
        }
    }

    update(settings) {
        this.settings = settings;
        if (!settings.enableCinemaFilters) {
            this.disable();
        } else {
            this.run();
        }
    }

    run() {
        if (!this.settings || !this.settings.enableCinemaFilters) return;
        const video = document.querySelector('video');
        if (video) {
            this._restoreFilterState(video);
        }
    }

    createButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M17.66 7.93L12 2.27 6.34 7.93c-3.12 3.12-3.12 8.19 0 11.31C7.9 20.8 9.95 21.58 12 21.58c2.05 0 4.1-.78 5.66-2.34 3.12-3.12 3.12-8.19 0-11.31zM12 19.59c-1.6 0-3.11-.62-4.24-1.76C6.62 16.69 6 15.19 6 13.59s.62-3.11 1.76-4.24L12 5.1v14.49z"/></svg>`;
        const btn = document.createElement('button');
        btn.innerHTML = icon;
        btn.title = 'Cinema Filters';
        btn.className = 'ypp-action-btn';
        btn.onclick = (e) => {
            e.stopPropagation();
            this.toggleFilterPanel(video, btn);
        };
        this._filterBtn = btn;
        return btn;
    }

    toggleFilterPanel(video, btn) {
        if (this._filterPanel) {
            this._removeFilterPanel();
            return;
        }
        window.YPP.features.VideoFiltersUI.createFilterPanel(this, video, btn);
    }

    _removeFilterPanel() {
        if (this._filterPanel) {
            this._filterPanel.remove();
            this._filterPanel = null;
        }
        if (this._filterPanelOutsideHandler) {
            document.removeEventListener('click', this._filterPanelOutsideHandler);
            this._filterPanelOutsideHandler = null;
        }
        if (this._filterPanelResizeHandler) {
            window.removeEventListener('resize', this._filterPanelResizeHandler);
            this._filterPanelResizeHandler = null;
        }
        this._previewFilterIndex = undefined; // always reset on close
    }

    _applyComputedFilter(video) {
        if (!video) video = document.querySelector('video');
        if (!video) return;

        if (this.isComparing) {
            video.style.filter = 'none';
            video.style.opacity = '1';
            window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
            return;
        }

        const preset = window.YPP.features.VideoFiltersPresets.FILTERS[this.currentFilterIndex];
        const adj = this.filterAdjustments;
        const inst = this.filterIntensity / 100;
        const s = (v, def = 100) => def + (v - def) * inst;

        // Dehaze / Clarity are derived from contrast and brightness for pure CSS approach,
        // or we handle them via SVG filter if available. We will use simple CSS derivation for Dehaze.
        let baseContrast = adj.contrast;
        let baseBrightness = adj.brightness;
        
        if (adj.dehaze > 0) {
            baseContrast += adj.dehaze * 0.5;
            baseBrightness -= adj.dehaze * 0.1;
        }
        if (adj.clarity > 0) {
            baseContrast += adj.clarity * 0.3;
        }
        // Temperature: warm = +brightness/contrast, cool = blue hue
        if (adj.temperature !== 0) {
            const t = adj.temperature;
            if (t > 0) { // warm
                baseBrightness += t * 0.05;
                baseContrast += t * 0.02;
            } else { // cool
                baseBrightness += t * 0.03;
            }
        }
        // Bug fix: use local variables so we never mutate this.filterAdjustments
        // (Bug 7 — adj.saturate was permanently overwritten on every call)
        let localSaturate = adj.saturate;
        if (adj.vibrance !== undefined && adj.vibrance !== 100) {
            // Vibrance approximated via saturation
            localSaturate = localSaturate * (adj.vibrance / 100);
        }
        // Highlights/Shadows approximate via brightness layers (CSS limited)
        if (adj.highlights !== 0) baseBrightness += adj.highlights * 0.15;
        if (adj.shadows !== 0)    baseBrightness += adj.shadows * 0.08;

        const adjStr = [
            baseBrightness !== 100 ? `brightness(${s(baseBrightness)}%)` : '',
            baseContrast !== 100 ? `contrast(${s(baseContrast)}%)` : '',
            localSaturate !== 100 ? `saturate(${s(localSaturate)}%)` : '',
            adj.hueRotate !== 0 ? `hue-rotate(${adj.hueRotate * inst}deg)` : '',
            adj.sepia > 0 ? `sepia(${adj.sepia * inst}%)` : '',
            adj.grayscale > 0 ? `grayscale(${adj.grayscale * inst}%)` : '',
            adj.invert > 0 ? `invert(${adj.invert * inst}%)` : '',
            adj.blur > 0 ? `blur(${adj.blur * inst}px)` : '',
            adj.opacity !== 100 ? `opacity(${s(adj.opacity)}%)` : ''
        ].filter(Boolean).join(' ');

        let finalFilter = 'none';
        if (preset.css !== 'none' && adjStr) {
            finalFilter = `${preset.css} ${adjStr}`;
        } else if (preset.css !== 'none') {
            finalFilter = preset.css;
        } else if (adjStr) {
            finalFilter = adjStr;
        }

        // Apply sharpness via SVG if needed
        if (adj.sharpness > 0) {
            window.YPP.features.VideoFiltersOverlay.injectSVGSharpness(adj.sharpness);
            finalFilter += ` url(#ypp-svg-sharpness)`;
        }

        video.style.filter = finalFilter;

        // Performance fix: only rebuild the overlay when preset, grain, or vignette actually changed
        const overlayKey = `${this.currentFilterIndex}:${adj.grain}:${adj.vignette}`;
        const needsOverlay = preset.overlay || adj.grain > 0 || adj.vignette > 0 || preset.name === 'Night Vision';
        const overlayChanged = this._lastOverlayKey !== overlayKey;

        if (!needsOverlay) {
            window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
            this._lastOverlayKey = null;
        } else if (overlayChanged) {
            window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
            window.YPP.features.VideoFiltersOverlay.applyOverlay(this, preset.overlay, adj.grain);
            this._lastOverlayKey = overlayKey;
        }
    }

    _restoreFilterState(video) {
        const s = this.settings || {};
        if (s.cinemaFilterBrightness !== undefined) this.filterAdjustments.brightness  = s.cinemaFilterBrightness;
        if (s.cinemaFilterContrast !== undefined)   this.filterAdjustments.contrast    = s.cinemaFilterContrast;
        if (s.cinemaFilterSaturate !== undefined)   this.filterAdjustments.saturate    = s.cinemaFilterSaturate;
        if (s.cinemaFilterHue !== undefined)        this.filterAdjustments.hueRotate   = s.cinemaFilterHue;
        if (s.cinemaFilterSepia !== undefined)      this.filterAdjustments.sepia       = s.cinemaFilterSepia;
        if (s.cinemaFilterGrayscale !== undefined)  this.filterAdjustments.grayscale   = s.cinemaFilterGrayscale;
        if (s.cinemaFilterInvert !== undefined)     this.filterAdjustments.invert      = s.cinemaFilterInvert;
        if (s.cinemaFilterBlur !== undefined)       this.filterAdjustments.blur        = s.cinemaFilterBlur;
        if (s.cinemaFilterOpacity !== undefined)    this.filterAdjustments.opacity     = s.cinemaFilterOpacity;
        if (s.cinemaFilterDehaze !== undefined)     this.filterAdjustments.dehaze      = s.cinemaFilterDehaze;
        if (s.cinemaFilterClarity !== undefined)    this.filterAdjustments.clarity     = s.cinemaFilterClarity;
        if (s.cinemaFilterGrain !== undefined)      this.filterAdjustments.grain       = s.cinemaFilterGrain;
        if (s.cinemaFilterSharpness !== undefined)  this.filterAdjustments.sharpness   = s.cinemaFilterSharpness;
        if (s.cinemaFilterIndex !== undefined)      this.currentFilterIndex            = s.cinemaFilterIndex;
        // Restore extended adjustments (added later — guard with undefined check)
        if (s.cinemaFilterTemperature !== undefined) this.filterAdjustments.temperature = s.cinemaFilterTemperature;
        if (s.cinemaFilterVibrance !== undefined)    this.filterAdjustments.vibrance    = s.cinemaFilterVibrance;
        if (s.cinemaFilterHighlights !== undefined)  this.filterAdjustments.highlights  = s.cinemaFilterHighlights;
        if (s.cinemaFilterShadows !== undefined)     this.filterAdjustments.shadows     = s.cinemaFilterShadows;
        if (s.cinemaFilterVignette !== undefined)    this.filterAdjustments.vignette    = s.cinemaFilterVignette;

        const hasActiveFilter = this.currentFilterIndex > 0 ||
            this.filterAdjustments.brightness !== 100 || this.filterAdjustments.contrast !== 100 ||
            this.filterAdjustments.saturate !== 100 || this.filterAdjustments.hueRotate !== 0 ||
            this.filterAdjustments.sepia !== 0 || this.filterAdjustments.grayscale !== 0 ||
            this.filterAdjustments.invert !== 0 || this.filterAdjustments.blur !== 0 ||
            this.filterAdjustments.opacity !== 100 || this.filterAdjustments.dehaze !== 0 ||
            this.filterAdjustments.clarity !== 0 || this.filterAdjustments.grain !== 0 ||
            this.filterAdjustments.sharpness !== 0;

        if (hasActiveFilter && video) {
            this._applyComputedFilter(video);
        }
    }

    _showToast(video, message) {
        const toast = document.createElement('div');
        toast.className = 'ypp-toast-mini';
        toast.textContent = message;
        // Prefer movie_player (YouTube) then video parent, then body
        const parent = document.getElementById('movie_player') || video?.parentElement || document.body;
        if (parent) {
            parent.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
    }
};
