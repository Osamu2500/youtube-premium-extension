window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFiltersUI = class VideoFiltersUI {
    static createFilterPanel(ctx, video, btn) {
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
        compareBtn.className = `ypp-vcp-compare-toggle ${ctx.isComparing ? 'active' : ''}`;
        compareBtn.innerHTML = `A/B`;
        compareBtn.onclick = (e) => {
            e.stopPropagation();
            ctx.isComparing = !ctx.isComparing;
            compareBtn.className = `ypp-vcp-compare-toggle ${ctx.isComparing ? 'active' : ''}`;
            ctx._applyComputedFilter(video);
        };
        header.querySelector('#ypp-header-actions').appendChild(compareBtn);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
        Object.assign(closeBtn.style, {
            background: 'transparent', border: 'none', color: '#f1f1f1',
            cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center'
        });
        closeBtn.onclick = () => ctx._removeFilterPanel();
        header.querySelector('#ypp-header-actions').appendChild(closeBtn);
        panel.appendChild(header);

        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            padding: '8px 0', maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden',
            background: 'transparent', scrollbarWidth: 'none'
        });

        const presetsContent = this.buildPresetsTab(ctx, video, btn);
        tabContent.appendChild(presetsContent);
        
        const adjustContent = this.buildAdjustTab(ctx, video);
        tabContent.appendChild(adjustContent);

        panel.appendChild(tabContent);

        const footer = document.createElement('div');
        Object.assign(footer.style, {
            padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        });

        const activeFilterName = window.YPP.features.VideoFiltersPresets.FILTERS[ctx.currentFilterIndex]?.name || 'Normal';
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
            ctx.currentFilterIndex = 0;
            ctx.filterIntensity = 100;
            ctx.filterAdjustments = { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0, blur: 0, opacity: 100 };
            ctx._applyComputedFilter(video);
            if (btn) { btn.classList.remove('active'); btn.title = 'Cinema Filters'; }
            ctx._removeFilterPanel();
            this.createFilterPanel(ctx, video, btn);
        };

        footer.appendChild(resetBtn);
        panel.appendChild(footer);

        const container = document.getElementById('movie_player') || document.body;
        container.appendChild(panel);
        ctx._filterPanel = panel;

        const outside = (e) => {
            if (ctx._filterPanel && !ctx._filterPanel.contains(e.target) && !btn?.contains(e.target)) {
                ctx._removeFilterPanel();
            }
        };
        ctx._filterPanelOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
    }

    static buildPresetsTab(ctx, video, btn) {
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
            window.YPP.features.VideoFiltersPresets.FILTERS.forEach((filter, index) => {
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
                    const isActive = ctx.currentFilterIndex === index;
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
                        ctx.currentFilterIndex = index;
                        ctx._applyComputedFilter(video);
                        if (btn) {
                            if (index > 0) btn.classList.add('active');
                            else btn.classList.remove('active');
                        }
                        ctx._showToast(video, `✨ ${filter.name}`);
                        const pill = ctx._filterPanel && ctx._filterPanel.querySelector('#ypp-active-filter-name');
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
                        if (ctx.currentFilterIndex === index) return;
                        const savedIndex = ctx.currentFilterIndex;
                        ctx.currentFilterIndex = index;
                        ctx._applyComputedFilter(video);
                        ctx.currentFilterIndex = savedIndex; 
                    };

                    card.onmouseleave = () => {
                        ctx._applyComputedFilter(video);
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

    static buildAdjustTab(ctx, video) {
        const wrap = document.createElement('div');
        wrap.className = 'ypp-vcp-tab-content active';

        const intensitySection = document.createElement('div');
        intensitySection.className = 'ypp-intensity-section';
        intensitySection.innerHTML = `
            <div class="ypp-intensity-header">
                <span><span style="margin-right:8px;">💎</span>Global Intensity</span>
                <span id="ypp-int-val" style="color:#ffffff; font-weight:800;">${ctx.filterIntensity}%</span>
            </div>
        `;
        const intSlider = document.createElement('input');
        intSlider.type = 'range';
        intSlider.className = 'ypp-vcp-slider';
        intSlider.min = '0';
        intSlider.max = '100';
        intSlider.value = ctx.filterIntensity;
        intSlider.oninput = (e) => {
            ctx.filterIntensity = Number(e.target.value);
            intensitySection.querySelector('#ypp-int-val').textContent = ctx.filterIntensity + '%';
            ctx._applyComputedFilter(video);
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
            val.textContent = ctx.filterAdjustments[cfg.id] + cfg.unit;

            const resetBtn = document.createElement('button');
            resetBtn.className = 'ypp-vcp-slider-reset';
            resetBtn.innerHTML = '↺';
            resetBtn.title = `Reset ${cfg.label}`;
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                ctx.filterAdjustments[cfg.id] = cfg.def;
                slider.value = cfg.def;
                val.textContent = cfg.def + cfg.unit;
                ctx._applyComputedFilter(video);
            };

            valWrap.appendChild(val);
            valWrap.appendChild(resetBtn);
            labelRow.appendChild(labelWrap);
            labelRow.appendChild(valWrap);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'ypp-vcp-slider';
            slider.min = cfg.min; slider.max = cfg.max;
            slider.value = ctx.filterAdjustments[cfg.id];
            slider.oninput = (e) => {
                const v = Number(e.target.value);
                ctx.filterAdjustments[cfg.id] = v;
                val.textContent = v + cfg.unit;
                ctx._applyComputedFilter(video);
                
                val.style.transform = 'scale(1.1)';
                setTimeout(() => val.style.transform = 'scale(1)', 100);
            };

            row.appendChild(labelRow);
            row.appendChild(slider);
            wrap.appendChild(row);
        });

        return wrap;
    }
};
