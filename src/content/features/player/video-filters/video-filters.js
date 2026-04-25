/**
 * Video Filters Feature Orchestrator
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFilters = class VideoFilters {
    constructor() {
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
            opacity: 100
        };
        this._filterOverlay = null; // CRT/VHS scanline overlay div
        this._filterPanel = null;   // The open filter panel
        this._filterBtn = null;     // Reference to filter button for active state
        this._filterPanelOutsideHandler = null;
    }

    getConfigKey() { return 'enableCinemaFilters'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
        this._removeFilterPanel();
        if (this._filterBtn) {
            this._filterBtn.remove();
            this._filterBtn = null;
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

        const adjStr = [
            adj.brightness !== 100 ? `brightness(${s(adj.brightness)}%)` : '',
            adj.contrast !== 100 ? `contrast(${s(adj.contrast)}%)` : '',
            adj.saturate !== 100 ? `saturate(${s(adj.saturate)}%)` : '',
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

        video.style.filter = finalFilter;

        window.YPP.features.VideoFiltersOverlay.removeOverlay(this);
        if (preset.overlay) {
            window.YPP.features.VideoFiltersOverlay.applyOverlay(this, preset.overlay);
        }
    }

    _restoreFilterState(video) {
        const s = this.settings || {};
        if (s.cinemaFilterBrightness !== undefined) this.filterAdjustments.brightness = s.cinemaFilterBrightness;
        if (s.cinemaFilterContrast !== undefined)   this.filterAdjustments.contrast   = s.cinemaFilterContrast;
        if (s.cinemaFilterSaturate !== undefined)   this.filterAdjustments.saturate   = s.cinemaFilterSaturate;
        if (s.cinemaFilterHue !== undefined)        this.filterAdjustments.hueRotate  = s.cinemaFilterHue;
        if (s.cinemaFilterSepia !== undefined)      this.filterAdjustments.sepia      = s.cinemaFilterSepia;
        if (s.cinemaFilterGrayscale !== undefined)  this.filterAdjustments.grayscale  = s.cinemaFilterGrayscale;
        if (s.cinemaFilterInvert !== undefined)     this.filterAdjustments.invert     = s.cinemaFilterInvert;
        if (s.cinemaFilterBlur !== undefined)       this.filterAdjustments.blur       = s.cinemaFilterBlur;
        if (s.cinemaFilterOpacity !== undefined)    this.filterAdjustments.opacity    = s.cinemaFilterOpacity;
        if (s.cinemaFilterIndex !== undefined)      this.currentFilterIndex           = s.cinemaFilterIndex;

        const hasActiveFilter = this.currentFilterIndex > 0 ||
            this.filterAdjustments.brightness !== 100 || this.filterAdjustments.contrast !== 100 ||
            this.filterAdjustments.saturate !== 100 || this.filterAdjustments.hueRotate !== 0 ||
            this.filterAdjustments.sepia !== 0 || this.filterAdjustments.grayscale !== 0 ||
            this.filterAdjustments.invert !== 0 || this.filterAdjustments.blur !== 0 ||
            this.filterAdjustments.opacity !== 100;

        if (hasActiveFilter && video) {
            this._applyComputedFilter(video);
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
};
