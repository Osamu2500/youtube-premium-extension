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
            background: 'rgba(0, 0, 0, 0.15)', // Transparent translucent
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '20px',
            zIndex: '99999',
            width: '720px', // Expanded width for 4-grid
            color: '#fff',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(64px) saturate(180%)',
            WebkitBackdropFilter: 'blur(64px) saturate(180%)',
            overflow: 'hidden',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            animation: 'ypp-panel-glass-in 0.3s cubic-bezier(0.2, 0, 0, 1) forwards'
        });
        
        // Check if opened from Global Bar
        if (btn.closest('.ypp-global-player-bar')) {
            panel.classList.add('ypp-panel-transparent');
            Object.assign(panel.style, {
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                boxShadow: 'none',
                border: 'none'
            });
        }

        if (!document.getElementById('ypp-glass-anim')) {
            const s = document.createElement('style');
            s.id = 'ypp-glass-anim';
            s.textContent = `
                @keyframes ypp-panel-glass-in {
                    from { opacity: 0; transform: translateY(12px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .ypp-cinema-tab-btn {
                    flex: 1; padding: 14px; background: transparent; border: none; color: rgba(255,255,255,0.5);
                    font-size: 15px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                }
                .ypp-cinema-tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
                .ypp-cinema-tab-btn.active { color: #fff; border-bottom: 2px solid #fff; }
                .ypp-filter-cat-details summary {
                    list-style: none; padding: 12px 20px; cursor: pointer; font-size: 14px; font-weight: 600;
                    background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.9);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex; align-items: center; justify-content: space-between;
                }
                .ypp-filter-cat-details summary::-webkit-details-marker { display: none; }
                .ypp-filter-cat-details summary:hover { background: rgba(255,255,255,0.08); color: #fff; }
                .ypp-filter-cat-details summary::after { content: '▼'; font-size: 10px; opacity: 0.5; transition: transform 0.2s; }
                .ypp-filter-cat-details[open] summary::after { transform: rotate(180deg); }
                
                .ypp-filter-card-grid { 
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px 20px; 
                }
                .ypp-filter-card {
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: row;
                    align-items: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.2,0,0,1);
                    text-align: left; position: relative; gap: 10px; overflow: hidden;
                }
                .ypp-filter-card:hover {
                    background: rgba(255,255,255,0.08); transform: translateY(-2px);
                    border-color: rgba(255,255,255,0.2);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }
                .ypp-filter-card.active {
                    background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.5);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
                }
                .ypp-filter-lut-preview {
                    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
                    background: linear-gradient(135deg, #ff4b4b, #4b6fff, #4bff8b);
                    border: 1px solid rgba(255,255,255,0.2);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    transition: all 0.3s;
                }
                .ypp-filter-card:hover .ypp-filter-lut-preview {
                    transform: scale(1.05); border-color: rgba(255,255,255,0.4);
                }
                
                .ypp-adjust-grid {
                    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 20px;
                }
                .ypp-adjust-card {
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
                }
                .ypp-adjust-card-header {
                    display: flex; justify-content: space-between; align-items: center;
                }
                .ypp-adjust-card-title {
                    display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9);
                }
                .ypp-adjust-card-val {
                    font-size: 13px; font-weight: 700; color: #fff; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 12px;
                }
                
                .ypp-vcp-slider {
                    -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px;
                    background: rgba(255,255,255,0.1); outline: none; margin: 8px 0;
                }
                .ypp-vcp-slider::-webkit-slider-thumb {
                    -webkit-appearance: none; appearance: none; width: 16px; height: 16px;
                    border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    transition: transform 0.1s;
                }
                .ypp-vcp-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

            `;
            document.head.appendChild(s);
        }

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex', alignItems: 'center', padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '16px', fontWeight: '600'
        });

        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-right: auto;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                </svg>
                Cinematic Filters
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

        // -- TABS --
        const tabsWrap = document.createElement('div');
        tabsWrap.style.display = 'flex';
        tabsWrap.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        
        const tabFiltersBtn = document.createElement('button');
        tabFiltersBtn.className = 'ypp-cinema-tab-btn active';
        tabFiltersBtn.textContent = 'Presets';
        
        const tabAdjustBtn = document.createElement('button');
        tabAdjustBtn.className = 'ypp-cinema-tab-btn';
        tabAdjustBtn.textContent = 'Adjustments';

        tabsWrap.appendChild(tabFiltersBtn);
        tabsWrap.appendChild(tabAdjustBtn);
        panel.appendChild(tabsWrap);

        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            padding: '0', maxHeight: '520px', overflowY: 'auto', overflowX: 'hidden',
            background: 'transparent', scrollbarWidth: 'none'
        });

        const presetsContent = this.buildPresetsTab(ctx, video, btn);
        const adjustContent = this.buildAdjustTab(ctx, video);
        adjustContent.style.display = 'none';

        tabFiltersBtn.onclick = () => {
            tabFiltersBtn.classList.add('active');
            tabAdjustBtn.classList.remove('active');
            presetsContent.style.display = 'block';
            adjustContent.style.display = 'none';
        };

        tabAdjustBtn.onclick = () => {
            tabAdjustBtn.classList.add('active');
            tabFiltersBtn.classList.remove('active');
            adjustContent.style.display = 'block';
            presetsContent.style.display = 'none';
        };

        tabContent.appendChild(presetsContent);
        tabContent.appendChild(adjustContent);
        panel.appendChild(tabContent);

        // -- FOOTER --
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
        resetBtn.innerHTML = `<span>Reset All</span>`;
        Object.assign(resetBtn.style, {
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '16px',
            cursor: 'pointer', fontSize: '12px', fontWeight: '500', padding: '6px 12px'
        });
        resetBtn.onmouseenter = () => { resetBtn.style.background = 'rgba(255,255,255,0.2)'; };
        resetBtn.onmouseleave = () => { resetBtn.style.background = 'rgba(255,255,255,0.1)'; };
        resetBtn.onclick = () => {
            ctx.currentFilterIndex = 0;
            ctx.filterIntensity = 100;
            ctx.filterAdjustments = { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0, blur: 0, opacity: 100, dehaze: 0, clarity: 0, grain: 0, sharpness: 0 };
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
        
        const searchWrap = document.createElement('div');
        searchWrap.className = 'ypp-vcp-search-wrap';
        Object.assign(searchWrap.style, { margin: '16px', marginBottom: '8px' });
        searchWrap.innerHTML = `
            <span class="ypp-vcp-search-icon">🔍</span>
            <input type="text" class="ypp-vcp-search-input" placeholder="Search presets (e.g. Night Vision)...">
        `;
        const searchInput = searchWrap.querySelector('input');
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

            Object.keys(groups).forEach((cat, catIdx) => {
                const details = document.createElement('details');
                details.className = 'ypp-filter-cat-details';
                if (catIdx === 0 || query) details.open = true; // Auto open first category or if searching

                const summary = document.createElement('summary');
                summary.textContent = cat;
                details.appendChild(summary);

                const grid = document.createElement('div');
                grid.className = 'ypp-filter-card-grid';
                
                groups[cat].forEach(({ filter, index }) => {
                    const card = document.createElement('div');
                    const isActive = ctx.currentFilterIndex === index;
                    card.className = `ypp-filter-card ${isActive ? 'active' : ''}`;
                    
                    let cssFilter = filter.css;
                    if (cssFilter === 'none') cssFilter = 'grayscale(0%)'; // dummy to keep validity
                    
                    card.innerHTML = `
                        <div class="ypp-filter-lut-preview" style="filter: ${cssFilter}"></div>
                        <span style="font-size: 13px; font-weight: 600; color: ${isActive ? '#fff' : 'rgba(255,255,255,0.8)'}; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${filter.name}</span>
                        ${isActive ? '<div style="background:#fff; color:#000; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>' : ''}
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

                        Array.from(listContainer.querySelectorAll('.ypp-filter-card')).forEach(c => {
                            c.classList.remove('active');
                            c.querySelector('span').style.color = 'rgba(255,255,255,0.8)';
                            const check = c.querySelector('div[style*="border-radius"]');
                            if (check && check.className !== 'ypp-filter-lut-preview') check.remove();
                        });
                        card.classList.add('active');
                        card.querySelector('span').style.color = '#fff';
                        card.insertAdjacentHTML('beforeend', '<div style="background:#fff; color:#000; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>');
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
                details.appendChild(grid);
                listContainer.appendChild(details);
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
        Object.assign(wrap.style, { padding: '8px 0' });

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

        // Core Adjustments
        const configs = [
            { id: 'brightness', label: 'Brightness', icon: '☀️', min: 0, max: 200, def: 100, unit: '%' },
            { id: 'contrast',   label: 'Contrast',   icon: '🌓', min: 0, max: 200, def: 100, unit: '%' },
            { id: 'saturate',   label: 'Saturation', icon: '🌈', min: 0, max: 300, def: 100, unit: '%' },
            { id: 'hueRotate',  label: 'Hue Rotate', icon: '🎨', min: 0, max: 360, def: 0,   unit: '°' },
            { id: 'dehaze',     label: 'Dehaze',     icon: '🌫️', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'clarity',    label: 'Clarity',    icon: '🔍', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'sharpness',  label: 'Sharpness',  icon: '🔪', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'grain',      label: 'Film Grain', icon: '🎞️', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'sepia',      label: 'Sepia',      icon: '🕰️', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'grayscale',  label: 'Grayscale',  icon: '🌑', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'invert',     label: 'Invert',     icon: '🔄', min: 0, max: 100, def: 0,   unit: '%' },
            { id: 'blur',       label: 'Blur',       icon: '🌀', min: 0, max: 20,  def: 0,   unit: 'px' },
            { id: 'opacity',    label: 'Opacity',    icon: '👁️', min: 0, max: 100, def: 100, unit: '%' }
        ];

        const grid = document.createElement('div');
        grid.className = 'ypp-adjust-grid';

        configs.forEach(cfg => {
            const card = document.createElement('div');
            card.className = 'ypp-adjust-card';

            const headerRow = document.createElement('div');
            headerRow.className = 'ypp-adjust-card-header';

            const title = document.createElement('div');
            title.className = 'ypp-adjust-card-title';
            title.innerHTML = `<span>${cfg.icon}</span> <span>${cfg.label}</span>`;

            const valWrap = document.createElement('div');
            valWrap.style.display = 'flex';
            valWrap.style.alignItems = 'center';
            valWrap.style.gap = '6px';

            const val = document.createElement('div');
            val.className = 'ypp-adjust-card-val';
            val.textContent = (ctx.filterAdjustments[cfg.id] || cfg.def) + cfg.unit;

            const resetBtn = document.createElement('button');
            resetBtn.innerHTML = '↺';
            Object.assign(resetBtn.style, {
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '14px', padding: '0 4px'
            });
            resetBtn.title = `Reset ${cfg.label}`;
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                ctx.filterAdjustments[cfg.id] = cfg.def;
                slider.value = cfg.def;
                val.textContent = cfg.def + cfg.unit;
                ctx._applyComputedFilter(video);
            };
            resetBtn.onmouseenter = () => resetBtn.style.color = '#fff';
            resetBtn.onmouseleave = () => resetBtn.style.color = 'rgba(255,255,255,0.5)';

            valWrap.appendChild(val);
            valWrap.appendChild(resetBtn);
            headerRow.appendChild(title);
            headerRow.appendChild(valWrap);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'ypp-vcp-slider';
            slider.min = cfg.min; slider.max = cfg.max;
            slider.value = ctx.filterAdjustments[cfg.id] || cfg.def;
            slider.oninput = (e) => {
                const v = Number(e.target.value);
                ctx.filterAdjustments[cfg.id] = v;
                val.textContent = v + cfg.unit;
                ctx._applyComputedFilter(video);
            };

            card.appendChild(headerRow);
            card.appendChild(slider);
            grid.appendChild(card);
        });

        wrap.appendChild(grid);
        return wrap;
    }
};
