window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFiltersUI = class VideoFiltersUI {
    static createFilterPanel(ctx, video, btn) {
        const panel = document.createElement('div');
        panel.id = 'ypp-cinema-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            bottom: '80px',
            right: '80px',
            background: 'rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderTop: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '20px',
            zIndex: '2147483646',
            width: '440px',
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
        const isGlobalBar = !!(btn?.closest?.('.ypp-global-player-bar'));
        if (isGlobalBar) {
            panel.classList.add('ypp-panel-transparent');
            Object.assign(panel.style, {
                background: 'rgba(8, 8, 18, 0.62)',
                backdropFilter: 'blur(24px) saturate(160%)',
                WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                width: '440px'
                // bottom/right reset not needed — position switches to absolute in portal
            });
        }

        this._injectStyle('ypp-glass-anim', `
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
                display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px 20px; 
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
                box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.35);
                animation: ypp-card-active-glow 2.5s ease-in-out infinite;
            }
            @keyframes ypp-card-active-glow {
                0%, 100% { box-shadow: 0 6px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.35); }
                50%       { box-shadow: 0 6px 20px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.65), 0 0 12px rgba(255,255,255,0.12); }
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
        `);

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

        // Tab content — uses opacity crossfade instead of instant show/hide
        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            padding: '0', maxHeight: isGlobalBar ? '480px' : '520px', overflowY: 'auto', overflowX: 'hidden',
            background: 'transparent', scrollbarWidth: 'none', position: 'relative'
        });

        const presetsContent = this.buildPresetsTab(ctx, video, btn);
        const adjustContent  = this.buildAdjustTab(ctx, video);

        // Fade wrappers so switching feels smooth
        const fadeWrap = (el) => {
            el.style.cssText += ';transition:opacity 0.18s ease;';
            return el;
        };
        fadeWrap(presetsContent);
        fadeWrap(adjustContent);
        adjustContent.style.display   = 'none';
        adjustContent.style.opacity   = '0';
        presetsContent.style.opacity  = '1';

        let tabTransitionTimeout;
        const switchTab = (show, hide, activeBtn, inactiveBtn) => {
            if (activeBtn.classList.contains('active')) return;
            inactiveBtn.classList.remove('active');
            activeBtn.classList.add('active');
            hide.style.opacity = '0';
            clearTimeout(tabTransitionTimeout);
            tabTransitionTimeout = setTimeout(() => {
                hide.style.display = 'none';
                show.style.display = 'block';
                // Trigger reflow before fading in
                void show.offsetWidth;
                show.style.opacity = '1';
            }, 180);
        };

        tabFiltersBtn.onclick = () => switchTab(presetsContent, adjustContent, tabFiltersBtn, tabAdjustBtn);
        tabAdjustBtn.onclick  = () => switchTab(adjustContent, presetsContent, tabAdjustBtn, tabFiltersBtn);

        tabContent.appendChild(presetsContent);
        tabContent.appendChild(adjustContent);
        panel.appendChild(tabContent);

        // -- FOOTER --
        const footer = document.createElement('div');
        Object.assign(footer.style, {
            padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        });

        const activeFilterName = window.YPP?.features?.VideoFiltersPresets?.FILTERS?.[ctx.currentFilterIndex]?.name || 'Normal';
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
            ctx.filterAdjustments = { 
                brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, sepia: 0, grayscale: 0, invert: 0, blur: 0, opacity: 100, 
                dehaze: 0, clarity: 0, grain: 0, sharpness: 0,
                temperature: 0, vibrance: 100, highlights: 0, shadows: 0, vignette: 0
            };
            ctx._applyComputedFilter(video);
            if (btn) { btn.classList.remove('active'); btn.title = 'Cinema Filters'; }
            ctx._removeFilterPanel();
            this.createFilterPanel(ctx, video, btn);
        };

        footer.appendChild(resetBtn);
        panel.appendChild(footer);

        // Mount into the shared top-layer dialog portal — escapes all CSS containment.
        if (isGlobalBar) {
            const dlg = window.YPP.Utils.getPopupPortal();
            panel.style.pointerEvents = 'auto';
            // position:absolute inside inset:0 dialog maps 1:1 to viewport coords
            panel.style.position = 'absolute';
            panel.style.overflow = 'visible';
            panel.style.clip     = 'auto';
            panel.style.clipPath = 'none';
            // Override the default translateY entrance — use scale-from-center instead
            panel.style.animation = 'ypp-panel-scale-in 0.22s cubic-bezier(0.2, 0, 0, 1) forwards';
            dlg.appendChild(panel);

            // Inject scale-in keyframe once
            this._injectStyle('ypp-scale-anim', '@keyframes ypp-panel-scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}');

            // Position now (estimate), then reposition after first layout (actual scrollHeight)
            const reposition = () => window.YPP.Utils?.positionPopupBesideVideo(panel, btn, video, 440);
            reposition();
            requestAnimationFrame(reposition);

            // Keep popup correctly placed when user resizes the window
            const onResize = () => {
                if (ctx._filterPanel) { reposition(); }
                else if (ctx._filterPanelResizeHandler) { 
                    window.removeEventListener('resize', ctx._filterPanelResizeHandler); 
                }
            };
            ctx._filterPanelResizeHandler = onResize;
            window.addEventListener('resize', onResize);
        } else {
            document.body.appendChild(panel);
        }
        ctx._filterPanel = panel;

        const outside = (e) => {
            if (ctx._filterPanel && !ctx._filterPanel.contains(e.target) && !btn?.contains(e.target)) {
                ctx._removeFilterPanel();
            }
        };
        ctx._filterPanelOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);

        // Escape key closes the panel
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && ctx._filterPanel) {
                e.stopPropagation();
                ctx._removeFilterPanel();
            }
        };
        ctx._filterPanelKeydownHandler = onKeyDown;
        document.addEventListener('keydown', onKeyDown);
        
        // Piggyback cleanup on the existing outside handler removal
        const origRemove = ctx._removeFilterPanel.bind(ctx);
        ctx._removeFilterPanel = function() {
            if (ctx._filterPanelKeydownHandler) {
                document.removeEventListener('keydown', ctx._filterPanelKeydownHandler);
                ctx._filterPanelKeydownHandler = null;
            }
            if (ctx._filterPanelOutsideHandler) {
                document.removeEventListener('click', ctx._filterPanelOutsideHandler);
                ctx._filterPanelOutsideHandler = null;
            }
            if (ctx._filterPanelResizeHandler) {
                window.removeEventListener('resize', ctx._filterPanelResizeHandler);
                ctx._filterPanelResizeHandler = null;
            }
            ctx._removeFilterPanel = origRemove; // restore
            origRemove();
        };
    }

    static buildPresetsTab(ctx, video, btn) {
        const wrap = document.createElement('div');

        // ── Favorites (localStorage)
        const FAV_KEY  = 'ypp-fav-filters';
        const loadFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } };
        const saveFavs = (arr) => {
            try {
                localStorage.setItem(FAV_KEY, JSON.stringify(arr));
            } catch (e) {
                console.warn('YPP: Failed to save favorite filters', e);
            }
        };
        const toggleFav = (idx) => {
            const f = loadFavs(), pos = f.indexOf(idx);
            pos === -1 ? f.push(idx) : f.splice(pos, 1);
            saveFavs(f);
        };

        // ── Search bar
        const searchWrap = document.createElement('div');
        searchWrap.className = 'ypp-vcp-search-wrap';
        Object.assign(searchWrap.style, { margin: '16px', marginBottom: '8px' });
        searchWrap.innerHTML = `
            <span class="ypp-vcp-search-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></span>
            <input type="text" class="ypp-vcp-search-input" placeholder="Search presets (e.g. Night Vision)...">
        `;
        const searchInput = searchWrap.querySelector('input');
        wrap.appendChild(searchWrap);

        const listContainer = document.createElement('div');
        wrap.appendChild(listContainer);

        const starFilled  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
        const starOutline = `<svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zm-10 6.93l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.81 4.38.38-3.32 2.88 1 4.28L12 16.17z"/></svg>`;

        // ── Build a single filter card
        const buildCard = (filter, index) => {
            const card = document.createElement('div');
            const isActive = ctx.currentFilterIndex === index;
            const isFav    = loadFavs().includes(index);
            card.className = `ypp-filter-card ${isActive ? 'active' : ''}`;
            const cssFilter = filter.css === 'none' ? 'grayscale(0%)' : filter.css;
            card.innerHTML = `
                <div class="ypp-filter-lut-preview" style="filter:${cssFilter}"></div>
                <span style="font-size:13px;font-weight:600;color:${isActive ? '#fff' : 'rgba(255,255,255,0.8)'};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${filter.name}</span>
                ${isActive ? '<div class="ypp-card-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>' : ''}
                <button class="ypp-star-btn" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}" data-fav="${isFav}">${isFav ? starFilled : starOutline}</button>
            `;
            const starBtn = card.querySelector('.ypp-star-btn');
            starBtn.onclick = (e) => {
                e.stopPropagation();
                toggleFav(index);
                const nowFav = loadFavs().includes(index);
                starBtn.innerHTML  = nowFav ? starFilled : starOutline;
                starBtn.dataset.fav = nowFav;
                starBtn.title = nowFav ? 'Remove from Favorites' : 'Add to Favorites';
                renderFilteredList(searchInput.value);
            };
            card.onclick = (e) => {
                if (e.target.closest('.ypp-star-btn')) return;
                e.stopPropagation();
                // Clear preview state FIRST — prevents mouseleave from reverting this commit
                ctx._previewFilterIndex = undefined;
                ctx.currentFilterIndex = index;
                ctx._applyComputedFilter(video);
                if (btn) { index > 0 ? btn.classList.add('active') : btn.classList.remove('active'); }
                ctx._showToast(video, `✨ ${filter.name}`);
                const pill = ctx._filterPanel?.querySelector('#ypp-active-filter-name');
                if (pill) pill.textContent = filter.name;
                listContainer.querySelectorAll('.ypp-filter-card').forEach(c => {
                    c.classList.remove('active');
                    const sp = c.querySelector('span'); if (sp) sp.style.color = 'rgba(255,255,255,0.8)';
                    const chk = c.querySelector('.ypp-card-check'); if (chk) chk.remove();
                });
                card.classList.add('active');
                const sp = card.querySelector('span'); if (sp) sp.style.color = '#fff';
                if (!card.querySelector('.ypp-card-check')) {
                    starBtn.insertAdjacentHTML('beforebegin', '<div class="ypp-card-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>');
                }
            };
            card.onmouseenter = () => {
                if (ctx.currentFilterIndex === index) return;
                ctx._previewFilterIndex = ctx.currentFilterIndex;
                ctx.currentFilterIndex = index;
                ctx._applyComputedFilter(video);
            };
            card.onmouseleave = () => {
                if (ctx._previewFilterIndex === undefined) return;
                ctx.currentFilterIndex = ctx._previewFilterIndex;
                ctx._previewFilterIndex = undefined;
                ctx._applyComputedFilter(video);
            };
            return card;
        };

        // ── Build a <details> category block
        const buildCategory = (cat, items, open = false) => {
            const details = document.createElement('details');
            details.className = 'ypp-filter-cat-details';
            if (open) details.open = true;
            const summary = document.createElement('summary');
            summary.innerHTML = cat === '⭐ Favorites'
                ? `<span style="display:flex;align-items:center;gap:8px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>${cat}</span>`
                : cat;
            details.appendChild(summary);
            const grid = document.createElement('div');
            grid.className = 'ypp-filter-card-grid';
            items.forEach(({ filter, index }) => grid.appendChild(buildCard(filter, index)));
            details.appendChild(grid);
            return details;
        };

        // ── Main render
        const renderFilteredList = (query = '') => {
            listContainer.innerHTML = '';
            const q = query.toLowerCase();
            const FILTERS = window.YPP?.features?.VideoFiltersPresets?.FILTERS || [];
            const favs = loadFavs();

            // Favorites at top — always open, only shown without search
            if (!query && favs.length > 0) {
                const favItems = favs.filter(i => FILTERS[i]).map(i => ({ filter: FILTERS[i], index: i }));
                if (favItems.length) listContainer.appendChild(buildCategory('⭐ Favorites', favItems, true));
            }

            // Category groups — closed by default; open only when searching
            const groups = {};
            FILTERS.forEach((filter, index) => {
                if (q && !filter.name.toLowerCase().includes(q) && !filter.category.toLowerCase().includes(q)) return;
                const cat = filter.category || 'Other';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push({ filter, index });
            });
            Object.keys(groups).forEach(cat => {
                listContainer.appendChild(buildCategory(cat, groups[cat], !!query));
            });

            if (query && Object.keys(groups).length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:40px 20px;text-align:center;color:rgba(255,255,255,0.3);font-size:13px;font-style:italic;';
                empty.textContent = 'No filters matching your search...';
                listContainer.appendChild(empty);
            }
        };

        searchInput.oninput = (e) => renderFilteredList(e.target.value);
        renderFilteredList();

        // Star button styles (once)
        this._injectStyle('ypp-star-btn-style', `
            .ypp-star-btn{background:transparent;border:none;cursor:pointer;padding:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:50%;width:22px;height:22px;opacity:0;transition:opacity 0.15s,transform 0.15s;transform:scale(0.85);}
            .ypp-filter-card:hover .ypp-star-btn,.ypp-star-btn[data-fav="true"]{opacity:1;transform:scale(1);}
            .ypp-star-btn:hover{background:rgba(255,215,0,0.12);transform:scale(1.15)!important;}
            .ypp-card-check{background:#fff;color:#000;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        `);

        return wrap;
    }


    static buildAdjustTab(ctx, video) {
        const wrap = document.createElement('div');
        Object.assign(wrap.style, { padding: '8px 0' });

        const intensitySection = document.createElement('div');
        intensitySection.className = 'ypp-intensity-section';
        Object.assign(intensitySection.style, {
            padding: '12px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)'
        });
        const intHeader = document.createElement('div');
        Object.assign(intHeader.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '10px'
        });
        intHeader.innerHTML = `
            <span style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.7);display:flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                Global Intensity
            </span>
            <span id="ypp-int-val" style="color:#ffffff;font-weight:800;font-size:13px;background:rgba(255,255,255,0.1);padding:2px 10px;border-radius:20px;">${ctx.filterIntensity}%</span>
        `;
        intensitySection.appendChild(intHeader);
        const intSlider = document.createElement('input');
        intSlider.type = 'range';
        intSlider.className = 'ypp-vcp-slider';
        intSlider.min = '0';
        intSlider.max = '100';
        intSlider.value = ctx.filterIntensity !== undefined ? ctx.filterIntensity : 100;
        intSlider.style.cssText = 'width:100%;-webkit-appearance:none;height:4px;border-radius:4px;background:rgba(255,255,255,0.15);outline:none;cursor:pointer;';
        intSlider.oninput = (e) => {
            ctx.filterIntensity = Number(e.target.value);
            intensitySection.querySelector('#ypp-int-val').textContent = ctx.filterIntensity + '%';
            ctx._applyComputedFilter(video);
        };
        intensitySection.appendChild(intSlider);
        wrap.appendChild(intensitySection);

        // Core Adjustments — SVG icons, no emojis
        const SVG = {
            brightness: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0zM7.05 18.36l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0z"/></svg>`,
            contrast:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z"/></svg>`,
            saturate:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
            hueRotate:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
            dehaze:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
            clarity:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
            sharpness:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>`,
            grain:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM11 7h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2zm-4-8h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm8-8h2v2h-2zm0 4h2v2h-2zm0 4h2v2h-2z"/></svg>`,
            sepia:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5S15.01 22 17.5 22s4.5-2.01 4.5-4.5S19.99 13 17.5 13zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"/></svg>`,
            grayscale:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>`,
            invert:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 1L1 11l10 10L21 11 11 1zm0 17.17L3.83 11 11 3.83V18.17z"/></svg>`,
            blur:       `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 13c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm0 4c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm0-8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-3 5.5c-.28 0-.5.22-.5.5s.22.5.5.5.5-.22.5-.5-.22-.5-.5-.5zM12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-7c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm0-4c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm0 8c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm3-6c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>`,
            opacity:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
            temperature:`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-3 7c-1.65 0-3-1.35-3-3 0-1.3.84-2.4 2-2.82V5c0-.55.45-1 1-1s1 .45 1 1v9.18c1.16.42 2 1.52 2 2.82 0 1.65-1.35 3-3 3z"/></svg>`,
            vibrance:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`,
            highlights: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`,
            shadows:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 21h20L12 3zm0 3.99L19.53 19H4.47L12 6.99z"/></svg>`,
            vignette:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`
        };
        const configs = [
            { id: 'brightness',  label: 'Brightness',  svgKey: 'brightness',  min: 0,   max: 200, def: 100, unit: '%' },
            { id: 'contrast',    label: 'Contrast',    svgKey: 'contrast',    min: 0,   max: 200, def: 100, unit: '%' },
            { id: 'saturate',    label: 'Saturation',  svgKey: 'saturate',    min: 0,   max: 300, def: 100, unit: '%' },
            { id: 'temperature', label: 'Temperature', svgKey: 'temperature', min: -100,max: 100, def: 0,   unit: 'K' },
            { id: 'vibrance',    label: 'Vibrance',    svgKey: 'vibrance',    min: 0,   max: 200, def: 100, unit: '%' },
            { id: 'highlights',  label: 'Highlights',  svgKey: 'highlights',  min: -100,max: 100, def: 0,   unit: '%' },
            { id: 'shadows',     label: 'Shadows',     svgKey: 'shadows',     min: -100,max: 100, def: 0,   unit: '%' },
            { id: 'hueRotate',   label: 'Hue Rotate',  svgKey: 'hueRotate',   min: 0,   max: 360, def: 0,   unit: '°' },
            { id: 'dehaze',      label: 'Dehaze',      svgKey: 'dehaze',      min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'clarity',     label: 'Clarity',     svgKey: 'clarity',     min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'sharpness',   label: 'Sharpness',   svgKey: 'sharpness',   min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'vignette',    label: 'Vignette',    svgKey: 'vignette',    min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'grain',       label: 'Film Grain',  svgKey: 'grain',       min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'sepia',       label: 'Sepia',       svgKey: 'sepia',       min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'grayscale',   label: 'Grayscale',   svgKey: 'grayscale',   min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'invert',      label: 'Invert',      svgKey: 'invert',      min: 0,   max: 100, def: 0,   unit: '%' },
            { id: 'blur',        label: 'Blur',        svgKey: 'blur',        min: 0,   max: 20,  def: 0,   unit: 'px' },
            { id: 'opacity',     label: 'Opacity',     svgKey: 'opacity',     min: 0,   max: 100, def: 100, unit: '%' }
        ];
        // Ensure new adjustment keys are initialized
        ['temperature','vibrance','highlights','shadows','vignette'].forEach(k => {
            if (ctx.filterAdjustments[k] === undefined) {
                ctx.filterAdjustments[k] = (k === 'vibrance') ? 100 : 0;
            }
        });

        const grid = document.createElement('div');
        grid.className = 'ypp-adjust-grid';

        configs.forEach(cfg => {
            const card = document.createElement('div');
            card.className = 'ypp-adjust-card';

            const headerRow = document.createElement('div');
            headerRow.className = 'ypp-adjust-card-header';

            const title = document.createElement('div');
            title.className = 'ypp-adjust-card-title';
            title.innerHTML = `<span style="opacity:0.7;display:flex;">${SVG[cfg.svgKey] || ''}</span><span>${cfg.label}</span>`;

            const valWrap = document.createElement('div');
            valWrap.style.display = 'flex';
            valWrap.style.alignItems = 'center';
            valWrap.style.gap = '6px';

            const currentValue = ctx.filterAdjustments[cfg.id] !== undefined ? ctx.filterAdjustments[cfg.id] : cfg.def;

            const val = document.createElement('div');
            val.className = 'ypp-adjust-card-val';
            val.textContent = currentValue + cfg.unit;

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
            slider.value = currentValue;
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

    static _injectStyle(id, css) {
        if (!document.getElementById(id)) {
            const s = document.createElement('style');
            s.id = id;
            s.textContent = css;
            (document.head || document.documentElement).appendChild(s);
        }
    }
};
