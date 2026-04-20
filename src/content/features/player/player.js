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
        this.compressorNode = null;
        this._bassFilter = null;
        this._trebleFilter = null;
        this._audioConnected = false;
        this._volumePopup = null;
        this.isLooping = false;

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
        this._volumePopupOutsideHandler = null;
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

        // Debug logging
        if (Utils.log) {
            Utils.log('Player feature starting', 'PLAYER', 'debug');
            Utils.log(`Cinema filters enabled: ${this.settings.enableCinemaFilters}`, 'PLAYER', 'debug');
        }

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
                    const timeDisplay = document.querySelector('.ytp-time-display') ||
                                       Array.from(document.querySelectorAll('.ytp-left-controls span')).find(el => el.textContent.includes('/'))?.parentElement;
                    
                    if (timeDisplay) {
                        this.showRemainingTime(video, timeDisplay);
                    } else {
                         window.YPP.Utils?.log('Time display not found for injection', 'PLAYER', 'debug');
                         // Try injection into left-controls as safe fallback
                         const leftControls = document.querySelector('.ytp-left-controls');
                         if (leftControls) this.showRemainingTime(video, leftControls);
                    }
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
                    if (Utils.log) {
                        Utils.log(`Restored filter index: ${this.settings.cinemaFilterIndex}`, 'PLAYER', 'debug');
                    }
                }
            } else {
                if (Utils.log) {
                    Utils.log('Player elements not found (video or controls)', 'PLAYER', 'debug');
                }
            }
        } catch (error) {
            Utils.log('Player initialization timed out or failed', 'PLAYER', 'debug');
            if (Utils.log) {
                Utils.log(`Error: ${error.message}`, 'PLAYER', 'debug');
            }
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

        // Volume Booster button
        container.appendChild(this._createVolumeBoosterButton(video));

        if (this.settings.enableCinemaFilters) {
            const filterBtn = this._createFilterButton(video);
            this._filterBtn = filterBtn;
            container.appendChild(filterBtn);
            // Debug logging
            if (window.YPP?.Utils?.log) {
                window.YPP.Utils.log('Cinema filters button created and added', 'PLAYER', 'debug');
            }
        } else {
            // Debug logging
            if (window.YPP?.Utils?.log) {
                window.YPP.Utils.log('Cinema filters disabled in settings', 'PLAYER', 'debug');
            }
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
        // Clean up outside click handler
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
        // Also remove CRT SVG filter if it was injected (so it doesn't linger)
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
            background: 'rgba(25, 25, 30, 0.55)',
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

        // --- Header (Native YT Style) ---
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '15px',
            fontWeight: '500'
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
            background: 'transparent',
            border: 'none',
            color: '#f1f1f1',
            cursor: 'pointer',
            padding: '0',
            display: 'flex',
            alignItems: 'center'
        });
        closeBtn.onclick = () => this._removeFilterPanel();
        header.querySelector('#ypp-header-actions').appendChild(closeBtn);
        panel.appendChild(header);

        const tabContent = document.createElement('div');
        Object.assign(tabContent.style, {
            padding: '8px 0',
            maxHeight: '380px',
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'transparent',
            scrollbarWidth: 'none'
        });

        const presetsContent = this._buildPresetsTab(video, btn);
        tabContent.appendChild(presetsContent);
        
        // Add intensity section to bottom natively
        const adjustContent = this._buildAdjustTab(video);
        tabContent.appendChild(adjustContent);

        panel.appendChild(tabContent);

        // --- Footer: Stats + Reset ---
        const footer = document.createElement('div');
        Object.assign(footer.style, {
            padding: '12px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        // Active filter pill
        const activeFilterName = this.filters[this.currentFilterIndex]?.name || 'Normal';
        const activePill = document.createElement('div');
        activePill.id = 'ypp-active-filter-name';
        Object.assign(activePill.style, {
            fontSize: '13px',
            color: '#aaaaaa'
        });
        activePill.textContent = activeFilterName;
        footer.appendChild(activePill);
        
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = `<span>Reset</span>`;
        Object.assign(resetBtn.style, {
            background: 'transparent',
            border: 'none',
            color: '#3ea6ff', // YT link blue
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            padding: '0'
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

        renderTab('presets');

        // Click-outside to close
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

        // ── Search Bar
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

            // Group filters by category
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
                    
                    // Dynamic LUT Preview Gradient (enhanced)
                    let gradient = 'linear-gradient(135deg, #555, #2a2a2a)';
                    if (filter.name === 'Normal')                                  gradient = 'linear-gradient(135deg, #f5f5f5, #aaa)';
                    else if (filter.name === 'Sepia')                              gradient = 'linear-gradient(135deg, #8B6436, #3b2712)';
                    else if (filter.name === 'Grayscale' || filter.name === 'Noir' || filter.name === 'B&W Cinematic') gradient = 'linear-gradient(135deg, #666, #111)';
                    else if (filter.name.includes('High Contrast'))               gradient = 'linear-gradient(135deg, #fff, #000)';
                    else if (filter.name.includes('Vivid') || filter.name.includes('Anime')) gradient = 'linear-gradient(135deg, #ff6b6b, #ffd93d)';
                    else if (filter.name.includes('Warm') || filter.name.includes('Retro'))  gradient = 'linear-gradient(135deg, #f4a261, #e76f51)';
                    else if (filter.name.includes('Cool') || filter.name.includes('Winter')) gradient = 'linear-gradient(135deg, #a8d8ea, #4a90d9)';
                    else if (filter.name.includes('Teal'))                        gradient = 'linear-gradient(135deg, #20b2aa, #ff8c00)';
                    else if (filter.name.includes('Cyber') || filter.name.includes('Neon'))  gradient = 'linear-gradient(135deg, #ff00ff, #00ffff)';
                    else if (filter.name.includes('Golden') || filter.name.includes('Sunset')) gradient = 'linear-gradient(135deg, #f9c74f, #f3722c)';
                    else if (filter.name.includes('Blue Hour'))                   gradient = 'linear-gradient(135deg, #4361ee, #7209b7)';
                    else if (filter.name.includes('Spring') || filter.name.includes('Summer')) gradient = 'linear-gradient(135deg, #95d5b2, #52b788)';
                    else if (filter.name.includes('Autumn'))                      gradient = 'linear-gradient(135deg, #c77dff, #e07a5f)';
                    else if (filter.name.includes('Vaporwave'))                   gradient = 'linear-gradient(135deg, #ff71ce, #b967ff, #01cdfe)';
                    else if (filter.name.includes('Synthwave') || filter.name.includes('80s')) gradient = 'linear-gradient(135deg, #f72585, #7209b7)';
                    else if (filter.name.includes('HDR'))                         gradient = 'linear-gradient(135deg, #fff176, #42a5f5)';
                    else if (filter.name.includes('Cinematic'))                   gradient = 'linear-gradient(135deg, #1a1a2e, #e94560)';
                    else if (filter.name.includes('Horror') || filter.name.includes('Gothic')) gradient = 'linear-gradient(135deg, #3d0000, #1a0000)';
                    else if (filter.name.includes('Fantasy') || filter.name.includes('Dreamy')) gradient = 'linear-gradient(135deg, #c77dff, #48cae4)';
                    else if (filter.name.includes('Pastel') || filter.name.includes('Muted'))   gradient = 'linear-gradient(135deg, #ffd6ff, #c8b6ff)';
                    else if (filter.name.includes('Sci-Fi'))                      gradient = 'linear-gradient(135deg, #023e8a, #00b4d8)';
                    else if (filter.name.includes('CRT'))                         gradient = 'linear-gradient(135deg, #003300, #00ff00)';
                    else if (filter.name.includes('VHS'))                         gradient = 'linear-gradient(135deg, #2d0036, #ff0080)';
                    else if (filter.name.includes('Film') || filter.name.includes('Lomo'))      gradient = 'linear-gradient(135deg, #6d4c41, #bcaaa4)';
                    else if (filter.name.includes('Invert'))                      gradient = 'linear-gradient(135deg, #1e3799, #e55039)';
                    else if (filter.name.includes('Polaroid'))                    gradient = 'linear-gradient(135deg, #fff9c4, #fff)';
                    else if (filter.name.includes('Documentary'))                 gradient = 'linear-gradient(135deg, #78909c, #37474f)';

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
                        // Update footer pill
                        const pill = this._filterPanel && this._filterPanel.querySelector('#ypp-active-filter-name');
                        if (pill) pill.textContent = filter.name;

                        // Local active state update
                        Array.from(listContainer.querySelectorAll('.ypp-filter-card')).forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        card.innerHTML = `
                            <div class="ypp-filter-lut-preview" style="background: ${gradient}"></div>
                            <span style="flex: 1;">${filter.name}</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#f1f1f1"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                        `;
                    };

                    // Live Hover Preview
                    card.onmouseenter = () => {
                        if (this.currentFilterIndex === index) return;
                        
                        // Temporarily swap index for preview
                        const savedIndex = this.currentFilterIndex;
                        this.currentFilterIndex = index;
                        this._applyComputedFilter(video);
                        this.currentFilterIndex = savedIndex; // Swap back for state, but video stays filtered until mouseout
                    };

                    card.onmouseleave = () => {
                        this._applyComputedFilter(video); // Reset to truly active index
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

        // ── Intensity Slider
        const intensitySection = document.createElement('div');
        intensitySection.className = 'ypp-intensity-section';
        intensitySection.innerHTML = `
            <div class="ypp-intensity-header">
                <span><span style="margin-right:8px;">💎</span>Global Intensity</span>
                <span id="ypp-int-val" style="color:#c4b5fd; font-weight:800;">${this.filterIntensity}%</span>
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
                
                // Pulse value on change
                val.style.transform = 'scale(1.1)';
                setTimeout(() => val.style.transform = 'scale(1)', 100);
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

        // Bypassing for Before/After comparison
        if (this.isComparing) {
            video.style.filter = 'none';
            video.style.opacity = '1';
            this._removeFilterOverlay();
            return;
        }

        const preset = this.filters[this.currentFilterIndex];

        const adj = this.filterAdjustments;
        const inst = this.filterIntensity / 100;

        // Scale formula: default + (value - default) * intensity
        const s = (v, def = 100) => def + (v - def) * inst;

        // Build adjustment filter string with intensity scaling
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

        // Combine: preset first, then adjustments
        let finalFilter = 'none';
        if (preset.css !== 'none' && adjStr) {
            finalFilter = `${preset.css} ${adjStr}`;
        } else if (preset.css !== 'none') {
            finalFilter = preset.css;
        } else if (adjStr) {
            finalFilter = adjStr;
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
        if (s.cinemaFilterSepia !== undefined)      this.filterAdjustments.sepia      = s.cinemaFilterSepia;
        if (s.cinemaFilterGrayscale !== undefined)  this.filterAdjustments.grayscale  = s.cinemaFilterGrayscale;
        if (s.cinemaFilterInvert !== undefined)     this.filterAdjustments.invert     = s.cinemaFilterInvert;
        if (s.cinemaFilterBlur !== undefined)       this.filterAdjustments.blur       = s.cinemaFilterBlur;
        if (s.cinemaFilterOpacity !== undefined)    this.filterAdjustments.opacity    = s.cinemaFilterOpacity;
        if (s.cinemaFilterIndex !== undefined)      this.currentFilterIndex           = s.cinemaFilterIndex;

        // Only re-apply if there's a non-default state
        const hasActiveFilter = this.currentFilterIndex > 0 ||
            this.filterAdjustments.brightness !== 100 || this.filterAdjustments.contrast !== 100 ||
            this.filterAdjustments.saturate !== 100 || this.filterAdjustments.hueRotate !== 0 ||
            this.filterAdjustments.sepia !== 0 || this.filterAdjustments.grayscale !== 0 ||
            this.filterAdjustments.invert !== 0 || this.filterAdjustments.blur !== 0 ||
            this.filterAdjustments.opacity !== 100;

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
        if (this._audioConnected) return;
        const init = () => {
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
            } catch (e) {
                console.warn('[YPP:Player] Audio engine init failed:', e);
            }
        };
        video.addEventListener('play', init, { once: true });
        video.addEventListener('volumechange', init, { once: true });
        // Also try immediately if already playing
        if (!video.paused) init();
    }

    setVolume(multiplier) {
        if (this.gainNode) {
            this.gainNode.gain.value = multiplier;
        }
    }

    // =========================================================================
    // VOLUME BOOSTER BUTTON + POPUP
    // =========================================================================

    _createVolumeBoosterButton(video) {
        const icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        const btn = this.createButton(icon, 'Volume Booster', (e) => {
            e.stopPropagation();
            this._toggleVolumePopup(video, btn);
        });
        btn.id = 'ypp-volume-boost-btn';
        return btn;
    }

    _toggleVolumePopup(video, anchorBtn) {
        if (this._volumePopup) {
            this._volumePopup.remove();
            this._volumePopup = null;
            anchorBtn.classList.remove('active');
            // Clean up outside click handler
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

        // ── Helper: create native styled slider
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
        };
        popup.appendChild(resetBtn);

        // Mount
        const moviePlayer = document.getElementById('movie_player') || document.body;
        moviePlayer.appendChild(popup);
        this._volumePopup = popup;

        // Click-outside close
        const outside = (e) => {
            if (this._volumePopup && !this._volumePopup.contains(e.target) && !anchorBtn.contains(e.target)) {
                this._toggleVolumePopup(video, anchorBtn);
            }
        };
        this._volumePopupOutsideHandler = outside;
        setTimeout(() => document.addEventListener('click', outside), 0);
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

    showRemainingTime(video, container) {
        if (!container) return;

        // Cleanup old structures
        const oldDashboard = document.getElementById('ypp-time-dashboard');
        if (oldDashboard) oldDashboard.remove();
        const inlineMetrics = document.getElementById('ypp-native-time-metrics');
        if (inlineMetrics) inlineMetrics.remove();
        const oldDedicated = document.getElementById('ypp-dedicated-time-metrics');
        if (oldDedicated) oldDedicated.remove();

        const timeDisplay = container.classList.contains('ytp-time-display') 
            ? container 
            : container.querySelector('.ytp-time-display');

        const durationNode = timeDisplay ? timeDisplay.querySelector('.ytp-time-duration') : null;

        if (!timeDisplay || !durationNode) return;

        // Ensure single injection
        let timeRemainingNode = document.querySelector('.ypp-time-remaining');
        let sepNode = document.querySelector('.ypp-time-separator-appended');

        if (!timeRemainingNode) {
            sepNode = document.createElement('span');
            sepNode.className = 'ytp-time-separator ypp-time-separator-appended';
            sepNode.textContent = ' · ';
            
            timeRemainingNode = document.createElement('span');
            timeRemainingNode.className = 'ypp-time-remaining';
            timeRemainingNode.style.cssText = 'font-size:inherit;font-family:inherit;color:inherit;opacity:inherit;letter-spacing:inherit;';

            // Insert AFTER duration, before anything else
            durationNode.insertAdjacentElement('afterend', sepNode);
            sepNode.insertAdjacentElement('afterend', timeRemainingNode);
        }

        const format = (s) => {
            if (s === undefined || s === null || isNaN(s) || s < 0) return '0:00';
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = Math.floor(s % 60);
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
            }
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        const update = () => {
            if (!video || !video.duration || !isFinite(video.duration) || isNaN(video.currentTime)) {
                return;
            }

            // Guard against the node being detached (e.g. on yt-navigate-finish)
            if (!document.contains(timeRemainingNode)) {
                if (document.contains(timeDisplay) && document.contains(durationNode)) {
                    durationNode.insertAdjacentElement('afterend', sepNode);
                    sepNode.insertAdjacentElement('afterend', timeRemainingNode);
                } else {
                    return; // Container is truly gone
                }
            }

            const speed = video.playbackRate || 1;
            const duration = video.duration;
            const currentTime = video.currentTime;
            
            const rawLeft = Math.max(0, duration - currentTime);
            const adjustedLeft = rawLeft / speed;
            
            // Hide if no time remaining
            if (rawLeft <= 0) {
                timeRemainingNode.style.display = 'none';
                sepNode.style.display = 'none';
                return;
            }

            timeRemainingNode.style.display = '';
            sepNode.style.display = '';

            if (Math.abs(speed - 1) <= 0.01) {
                // 1x speed - Native remaining time
                timeRemainingNode.textContent = `-${format(rawLeft)}`;
            } else {
                // Speed changed - Show adjusted time + saved/extra
                if (speed > 1) {
                    const totalSaved = duration - (duration / speed);
                    timeRemainingNode.textContent = `-${format(adjustedLeft)} · ${format(totalSaved)} saved`;
                } else {
                    const totalExtra = (duration / speed) - duration;
                    timeRemainingNode.textContent = `-${format(adjustedLeft)} · ${format(totalExtra)} extra`;
                }
            }
        };

        if (this._boundTimeUpdate) {
            video.removeEventListener('timeupdate', this._boundTimeUpdate);
            video.removeEventListener('ratechange', this._boundTimeUpdate);
        }
        
        this._boundTimeUpdate = update;
        video.addEventListener('timeupdate', update);
        video.addEventListener('ratechange', update);
        update(); 
    }
};
