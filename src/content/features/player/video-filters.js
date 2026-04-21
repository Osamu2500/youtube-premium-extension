/**
 * Video Filters Feature
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

        // ---- Cinema Filter Presets ----
        this.filters = [
            { category: 'Classic', name: 'Normal',        css: 'none',                                                        overlay: null },
            { category: 'Classic', name: 'Sepia',         css: 'sepia(100%)',                                                  overlay: null },
            { category: 'Classic', name: 'Grayscale',     css: 'grayscale(100%)',                                              overlay: null },
            { category: 'Classic', name: 'High Contrast', css: 'contrast(160%) saturate(90%)',                                 overlay: null },
            { category: 'Classic', name: 'Vivid',         css: 'saturate(200%) contrast(110%)',                                overlay: null },
            { category: 'Classic', name: 'Warm',          css: 'sepia(40%) saturate(130%) contrast(100%) brightness(105%)',    overlay: null },
            { category: 'Classic', name: 'Cool',          css: 'hue-rotate(200deg) saturate(130%) brightness(95%)',            overlay: null },
            { category: 'Classic', name: 'Invert',        css: 'invert(100%)',                                                 overlay: null },

            { category: 'Cinematic', name: 'Cinematic',     css: 'contrast(115%) saturate(110%) brightness(95%) hue-rotate(350deg)', overlay: null },
            { category: 'Cinematic', name: 'Noir',          css: 'grayscale(100%) contrast(130%) brightness(85%)',               overlay: null },
            { category: 'Cinematic', name: 'B&W Cinematic', css: 'grayscale(100%) contrast(140%) brightness(90%)', overlay: null },
            { category: 'Cinematic', name: 'Teal & Orange', css: 'hue-rotate(180deg) saturate(130%) contrast(115%) brightness(100%)', overlay: null },
            { category: 'Cinematic', name: 'Documentary',   css: 'contrast(120%) saturate(90%) brightness(100%)', overlay: null },
            { category: 'Cinematic', name: 'HDR',           css: 'contrast(140%) saturate(120%) brightness(110%)', overlay: null },

            { category: 'Retro & Analog', name: 'Retro',         css: 'sepia(60%) hue-rotate(330deg) saturate(150%) contrast(120%)', overlay: null },
            { category: 'Retro & Analog', name: '📺 CRT Display',css: 'url(#ypp-crt-rgb) contrast(135%) brightness(110%) saturate(85%)', overlay: 'crt' },
            { category: 'Retro & Analog', name: '📼 VHS Tape',   css: 'contrast(90%) brightness(85%) saturate(60%) hue-rotate(5deg)',overlay: 'vhs' },
            { category: 'Retro & Analog', name: '🎞 Old Film',   css: 'sepia(70%) contrast(90%) brightness(85%) blur(0.3px)',         overlay: 'oldfilm' },
            { category: 'Retro & Analog', name: 'Film Grain',    css: 'contrast(110%) brightness(100%) saturate(100%)', overlay: 'oldfilm' },
            { category: 'Retro & Analog', name: '90s TV',        css: 'contrast(85%) brightness(90%) saturate(75%) hue-rotate(5deg)', overlay: 'crt' },
            { category: 'Retro & Analog', name: 'Polaroid',      css: 'sepia(20%) contrast(105%) brightness(108%) saturate(110%)', overlay: null },

            { category: 'Artistic', name: 'Cyberpunk',     css: 'hue-rotate(180deg) saturate(180%) contrast(120%) brightness(110%)', overlay: null },
            { category: 'Artistic', name: 'Vaporwave',     css: 'hue-rotate(280deg) saturate(160%) contrast(110%) brightness(105%)', overlay: null },
            { category: 'Artistic', name: '80s Synthwave', css: 'hue-rotate(300deg) saturate(180%) contrast(130%) brightness(100%)', overlay: null },
            { category: 'Artistic', name: 'Neon Noir',     css: 'hue-rotate(280deg) saturate(200%) contrast(140%) brightness(85%)', overlay: null },
            { category: 'Artistic', name: 'Sci-Fi',        css: 'hue-rotate(220deg) saturate(140%) contrast(125%) brightness(90%)', overlay: null },
            { category: 'Artistic', name: 'Anime',         css: 'saturate(180%) contrast(115%) brightness(110%)', overlay: null },
            { category: 'Artistic', name: 'Comic Book',    css: 'contrast(200%) saturate(150%) brightness(110%)', overlay: null },
            { category: 'Artistic', name: 'Lomo',          css: 'saturate(150%) contrast(110%) brightness(95%) vignette(0.5)', overlay: null },

            { category: 'Atmospheric', name: 'Golden Hour',   css: 'sepia(30%) hue-rotate(30deg) saturate(130%) brightness(110%) contrast(105%)', overlay: null },
            { category: 'Atmospheric', name: 'Blue Hour',     css: 'hue-rotate(210deg) saturate(120%) brightness(95%) contrast(110%)', overlay: null },
            { category: 'Atmospheric', name: 'Summer',        css: 'sepia(15%) hue-rotate(40deg) saturate(140%) brightness(110%)', overlay: null },
            { category: 'Atmospheric', name: 'Winter',        css: 'hue-rotate(200deg) saturate(80%) brightness(105%) contrast(110%)', overlay: null },
            { category: 'Atmospheric', name: 'Autumn',        css: 'sepia(40%) hue-rotate(30deg) saturate(130%) brightness(100%)', overlay: null },
            { category: 'Atmospheric', name: 'Spring',        css: 'hue-rotate(100deg) saturate(150%) brightness(108%) contrast(105%)', overlay: null },
            { category: 'Atmospheric', name: 'Sunset',        css: 'sepia(30%) hue-rotate(330deg) saturate(150%) contrast(110%) brightness(105%)', overlay: null },

            { category: 'Mood', name: 'Dreamy',        css: 'brightness(110%) contrast(90%) saturate(120%) blur(0.5px)',    overlay: null },
            { category: 'Mood', name: 'Muted',         css: 'saturate(70%) contrast(90%) brightness(105%)', overlay: null },
            { category: 'Mood', name: 'Pastel',        css: 'saturate(60%) brightness(115%) contrast(85%)', overlay: null },
            { category: 'Mood', name: 'Soft Focus',    css: 'brightness(105%) contrast(95%) saturate(90%) blur(0.8px)', overlay: null },
            { category: 'Mood', name: 'Horror',        css: 'contrast(130%) brightness(80%) saturate(70%) hue-rotate(10deg)', overlay: null },
            { category: 'Mood', name: 'Fantasy',       css: 'saturate(140%) brightness(105%) contrast(110%) hue-rotate(300deg)', overlay: null },
            { category: 'Mood', name: 'Gothic',        css: 'contrast(125%) brightness(85%) saturate(60%) hue-rotate(340deg)', overlay: null },
        ];
        this._filterPanelOutsideHandler = null;
    }

    getConfigKey() { return 'enableCinemaFilters'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        this._removeFilterOverlay();
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
        this._createFilterPanel(video, btn);
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

    _removeFilterOverlay() {
        if (this._filterOverlay) {
            this._filterOverlay.remove();
            this._filterOverlay = null;
        }
        const crtSvg = document.getElementById('ypp-crt-svg-defs');
        if (crtSvg) crtSvg.remove();
    }

    _createFilterPanel(video, btn) {
        const panel = document.createElement('div');
        panel.id = 'ypp-cinema-panel';
        Object.assign(panel.style, {
            position: 'absolute',
            bottom: '56px',
            right: '16px',
            background: 'rgba(20, 20, 20, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            zIndex: '99999',
            width: '360px',
            color: '#fff',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            overflow: 'hidden',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            animation: 'ypp-panel-glass-in 0.3s cubic-bezier(0.2, 0, 0, 1) forwards'
        });

        if (!document.getElementById('ypp-glass-anim')) {
            const s = document.createElement('style');
            s.id = 'ypp-glass-anim';
            s.textContent = `
                @keyframes ypp-panel-glass-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `;
            document.head.appendChild(s);
        }

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '15px', fontWeight: '500'
        });

        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-right: auto;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                </svg>
                Filters
            </div>
            <div id="ypp-header-actions" style="display: flex; align-items: center; gap: 12px;"></div>
        `;

        const compareBtn = document.createElement('div');
        compareBtn.className = `ypp-vcp-compare-toggle ${this.isComparing ? 'active' : ''}`;
        compareBtn.innerHTML = `A/B`;
        compareBtn.onclick = (e) => {
            e.stopPropagation();
            this.isComparing = !this.isComparing;
            compareBtn.className = `ypp-vcp-compare-toggle ${this.isComparing ? 'active' : ''}`;
            this._applyComputedFilter(video);
        };
        header.querySelector('#ypp-header-actions').appendChild(compareBtn);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        Object.assign(closeBtn.style, {
            background: 'transparent', border: 'none', color: '#f1f1f1',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center'
        });
        closeBtn.onclick = () => this._removeFilterPanel();
        header.querySelector('#ypp-header-actions').appendChild(closeBtn);
        panel.appendChild(header);

        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            padding: '8px 0', maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden',
            background: 'transparent', scrollbarWidth: 'none'
        });

        const presetsContent = this._buildPresetsTab(video, btn);
        tabContent.appendChild(presetsContent);
        
        const adjustContent = this._buildAdjustTab(video);
        tabContent.appendChild(adjustContent);

        panel.appendChild(tabContent);

        const footer = document.createElement('div');
        Object.assign(footer.style, {
            padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        });

        const activeFilterName = this.filters[this.currentFilterIndex]?.name || 'Normal';
        const activePill = document.createElement('div');
        activePill.id = 'ypp-active-filter-name';
        Object.assign(activePill.style, { fontSize: '13px', color: '#aaaaaa' });
        activePill.textContent = activeFilterName;
        footer.appendChild(activePill);
        
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = `<span>Reset</span>`;
        Object.assign(resetBtn.style, {
            background: 'transparent', border: 'none', color: '#ffffff',
            cursor: 'pointer', fontSize: '13px', fontWeight: '500', padding: '0'
        });
        resetBtn.onmouseenter = () => { resetBtn.style.textDecoration = 'underline'; };
        resetBtn.onmouseleave = () => { resetBtn.style.textDecoration = 'none'; };
        resetBtn.onclick = () => {
            this.currentFilterIndex = 0;
            this.filterIntensity = 100;
            this.filterAdjustments = { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0, blur: 0, opacity: 100 };
            this._applyComputedFilter(video);
            if (btn) { btn.classList.remove('active'); btn.title = 'Cinema Filters'; }
            this._removeFilterPanel();
            this._createFilterPanel(video, btn);
        };

        footer.appendChild(resetBtn);
        panel.appendChild(footer);

        const container = document.getElementById('movie_player') || document.body;
        container.appendChild(panel);
        this._filterPanel = panel;

        const outside = (e) => {
            if (this._filterPanel && !this._filterPanel.contains(e.target) && !btn?.contains(e.target)) {
                this._removeFilterPanel();
            }
        };
        this._filterPanelOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    _buildPresetsTab(video, btn) {
        const wrap = document.createElement('div');
        wrap.className = 'ypp-vcp-tab-content active';

        const searchWrap = document.createElement('div');
        searchWrap.className = 'ypp-vcp-search-wrap';
        searchWrap.innerHTML = `
            <span class="ypp-vcp-search-icon">🔍</span>
            <input type="text" class="ypp-vcp-search-input" placeholder="Search presets (e.g. Noir, Retro, 90s)...">
        `;
        const searchInput = searchWrap.querySelector('input');
        searchWrap.appendChild(searchInput);
        wrap.appendChild(searchWrap);

        const listContainer = document.createElement('div');
        wrap.appendChild(listContainer);

        const renderFilteredList = (query = '') => {
            listContainer.innerHTML = '';
            const normalizedQuery = query.toLowerCase();
            const groups = {};
            this.filters.forEach((filter, index) => {
                if (query && !filter.name.toLowerCase().includes(normalizedQuery) && !filter.category.toLowerCase().includes(normalizedQuery)) {
                    return;
                }
                const cat = filter.category || 'Other';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push({ filter, index });
            });

            Object.keys(groups).forEach(cat => {
                const header = document.createElement('div');
                header.className = 'ypp-vcp-cat-header';
                header.textContent = cat;
                listContainer.appendChild(header);

                const grid = document.createElement('div');
                grid.className = 'ypp-filter-card-grid';
                
                groups[cat].forEach(({ filter, index }) => {
                    const card = document.createElement('div');
                    const isActive = this.currentFilterIndex === index;
                    card.className = `ypp-filter-card ${isActive ? 'active' : ''}`;
                    
                    let gradient = 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02))';
                    if (filter.name === 'Normal') gradient = 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.05))';

                    card.innerHTML = `
                        <div class="ypp-filter-lut-preview" style="background: ${gradient}"></div>
                        <span style="flex: 1;">${filter.name}</span>
                        ${isActive ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#f1f1f1"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>' : ''}
                    `;
                    
                    card.onclick = (e) => {
                        e.stopPropagation();
                        this.currentFilterIndex = index;
                        this._applyComputedFilter(video);
                        if (btn) {
                            if (index > 0) btn.classList.add('active');
                            else btn.classList.remove('active');
                        }
                        this._showToast(video, `✨ ${filter.name}`);
                        const pill = this._filterPanel && this._filterPanel.querySelector('#ypp-active-filter-name');
                        if (pill) pill.textContent = filter.name;

                        Array.from(listContainer.querySelectorAll('.ypp-filter-card')).forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        card.innerHTML = `
                            <div class="ypp-filter-lut-preview" style="background: ${gradient}"></div>
                            <span style="flex: 1;">${filter.name}</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f1f1f1"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        `;
                    };

                    card.onmouseenter = () => {
                        if (this.currentFilterIndex === index) return;
                        const savedIndex = this.currentFilterIndex;
                        this.currentFilterIndex = index;
                        this._applyComputedFilter(video);
                        this.currentFilterIndex = savedIndex; 
                    };

                    card.onmouseleave = () => {
                        this._applyComputedFilter(video);
                    };

                    grid.appendChild(card);
                });
                listContainer.appendChild(grid);
            });

            if (Object.keys(groups).length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding: 40px 20px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; font-style: italic;';
                empty.textContent = 'No filters matching your search...';
                listContainer.appendChild(empty);
            }
        };

        searchInput.oninput = (e) => renderFilteredList(e.target.value);
        renderFilteredList();

        return wrap;
    }

    _buildAdjustTab(video) {
        const wrap = document.createElement('div');
        wrap.className = 'ypp-vcp-tab-content active';

        const intensitySection = document.createElement('div');
        intensitySection.className = 'ypp-intensity-section';
        intensitySection.innerHTML = `
            <div class="ypp-intensity-header">
                <span><span style="margin-right:8px;">💎</span>Global Intensity</span>
                <span id="ypp-int-val" style="color:#ffffff; font-weight:800;">${this.filterIntensity}%</span>
            </div>
        `;
        const intSlider = document.createElement('input');
        intSlider.type = 'range';
        intSlider.className = 'ypp-vcp-slider';
        intSlider.min = '0';
        intSlider.max = '100';
        intSlider.value = this.filterIntensity;
        intSlider.oninput = (e) => {
            this.filterIntensity = Number(e.target.value);
            intensitySection.querySelector('#ypp-int-val').textContent = this.filterIntensity + '%';
            this._applyComputedFilter(video);
        };
        intensitySection.appendChild(intSlider);
        wrap.appendChild(intensitySection);

        const configs = [
            { id: 'brightness', label: 'Brightness', icon: '☀️', min: 0, max: 200, def: 100, unit: '%' },
            { id: 'contrast',   label: 'Contrast',   icon: '🌓', min: 0, max: 200, def: 100, unit: '%' },
            { id: 'saturate',   label: 'Saturation', icon: '🌈', min: 0, max: 300, def: 100, unit: '%' },
            { id: 'hueRotate',  label: 'Hue Rotate', icon: '🎨', min: 0, max: 360, def: 0,   unit: '°' },
            { id: 'sepia',      label: 'Sepia',      icon: '🕰️', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'grayscale',  label: 'Grayscale',  icon: '🌑', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'invert',     label: 'Invert',     icon: '🔄', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'blur',       label: 'Blur',       icon: '🌀', min: 0, max: 20,  def: 0,   unit: 'px' },
            { id: 'opacity',    label: 'Opacity',    icon: '👁️', min: 0, max: 100, def: 100, unit: '%' }
        ];

        configs.forEach(cfg => {
            const row = document.createElement('div');
            row.className = 'ypp-vcp-slider-row';

            const labelRow = document.createElement('div');
            labelRow.className = 'ypp-vcp-slider-label-row';

            const labelWrap = document.createElement('div');
            labelWrap.style.display = 'flex';
            labelWrap.style.alignItems = 'center';
            labelWrap.style.gap = '8px';
            labelWrap.innerHTML = `<span style="font-size:14px;">${cfg.icon}</span><span style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.8);">${cfg.label}</span>`;

            const valWrap = document.createElement('div');
            valWrap.style.display = 'flex';
            valWrap.style.alignItems = 'center';
            valWrap.style.gap = '8px';

            const val = document.createElement('span');
            val.className = 'ypp-vcp-slider-value';
            val.textContent = this.filterAdjustments[cfg.id] + cfg.unit;

            const resetBtn = document.createElement('button');
            resetBtn.className = 'ypp-vcp-slider-reset';
            resetBtn.innerHTML = '↺';
            resetBtn.title = `Reset ${cfg.label}`;
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                this.filterAdjustments[cfg.id] = cfg.def;
                slider.value = cfg.def;
                val.textContent = cfg.def + cfg.unit;
                this._applyComputedFilter(video);
            };

            valWrap.appendChild(val);
            valWrap.appendChild(resetBtn);
            labelRow.appendChild(labelWrap);
            labelRow.appendChild(valWrap);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'ypp-vcp-slider';
            slider.min = cfg.min; slider.max = cfg.max;
            slider.value = this.filterAdjustments[cfg.id];
            slider.oninput = (e) => {
                const v = Number(e.target.value);
                this.filterAdjustments[cfg.id] = v;
                val.textContent = v + cfg.unit;
                this._applyComputedFilter(video);
                
                val.style.transform = 'scale(1.1)';
                setTimeout(() => val.style.transform = 'scale(1)', 100);
            };

            row.appendChild(labelRow);
            row.appendChild(slider);
            wrap.appendChild(row);
        });

        return wrap;
    }

    _applyComputedFilter(video) {
        if (!video) video = document.querySelector('video');
        if (!video) return;

        if (this.isComparing) {
            video.style.filter = 'none';
            video.style.opacity = '1';
            this._removeFilterOverlay();
            return;
        }

        const preset = this.filters[this.currentFilterIndex];
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
            this._injectCRTSVGFilter();
            overlay.style.backgroundImage = `
                radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.4) 100%),
                repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.15) 0px,
                    rgba(0,0,0,0.15) 1px,
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
            const band = document.createElement('div');
            Object.assign(band.style, {
                position: 'absolute', left: '0', width: '100%', height: '6px',
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(1px)',
                animation: 'ypp-vhs-band 4s linear infinite',
                pointerEvents: 'none'
            });
            overlay.appendChild(band);

        } else if (type === 'oldfilm') {
            overlay.style.backgroundImage = `
                radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)
            `;
            overlay.style.animation = 'ypp-grain 0.1s steps(1) infinite';
        }

        container.appendChild(overlay);
        this._filterOverlay = overlay;
        this._injectOverlayCSS();
    }

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

        const el = (tag, attrs) => {
            const e = document.createElementNS(svgNS, tag);
            Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
            return e;
        };

        filter.append(
            el('feOffset',      { in: 'SourceGraphic', dx: '1.5', dy: '0', result: 'rShifted' }),
            el('feColorMatrix', { in: 'rShifted', type: 'matrix',
                values: '1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'rOnly' }),
            el('feColorMatrix', { in: 'SourceGraphic', type: 'matrix',
                values: '0 0 0 0 0   0 1 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'gOnly' }),
            el('feOffset',      { in: 'SourceGraphic', dx: '-1.5', dy: '0', result: 'bShifted' }),
            el('feColorMatrix', { in: 'bShifted', type: 'matrix',
                values: '0 0 0 0 0   0 0 0 0 0   0 0 1 0 0   0 0 0 1 0', result: 'bOnly' }),
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
