/**
 * Feature: Playlist Page Redesign (Full UI Override)
 * Completely replaces the native YouTube playlist page layout with a
 * premium glassmorphic design: sidebar info panel + scrollable video list.
 * Reads data from native YouTube DOM — no API calls needed.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.PlaylistRedesign = class PlaylistRedesign {
    constructor() {
        this.isActive        = false;
        this.container       = null;   // Our custom #ypp-pl root
        this.navHandler      = null;
        this.mutObs          = null;   // MutationObserver watching native data
        this._buildTimer     = null;
        this._retryTimer     = null;
        this._retryCount     = 0;
        this._currentCols    = '2';    // Cache column preference to prevent async thrashing
        this._menuCloseFn    = null;   // Track global click listener for memory safety
        this.MAX_RETRIES     = 12;
        this.RETRY_DELAY     = 800;
    }

    getConfigKey() { return 'playlistRedesign'; }

    // ─── Feature lifecycle ───────────────────────────────────────────────────

    run(settings) {
        if (this.isActive) return;
        this.isActive = true;

        // Pre-fetch column preference once during lifecycle startup
        try {
            chrome.storage.local.get('playlistCols', (d) => {
                if (d && d.playlistCols) this._currentCols = d.playlistCols;
            });
        } catch (e) {
            console.warn('[YPP] Failed to load column preference', e);
        }

        this._tryInit();
        this.navHandler = () => {
            this._reset();
            if (this._isPlaylistPage()) {
                setTimeout(() => this._tryInit(), 400);
            }
        };
        window.addEventListener('yt-navigate-finish',    this.navHandler);
        window.addEventListener('yt-page-data-updated',  this.navHandler);
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this._reset();
        window.removeEventListener('yt-navigate-finish',   this.navHandler);
        window.removeEventListener('yt-page-data-updated', this.navHandler);
        this.navHandler = null;
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    _isPlaylistPage() {
        return location.pathname.startsWith('/playlist') ||
               location.search.includes('list=');
    }

    _reset() {
        clearTimeout(this._buildTimer);
        clearTimeout(this._retryTimer);
        this._retryCount = 0;
        
        if (this.mutObs) { 
            this.mutObs.disconnect(); 
            this.mutObs = null; 
        }
        
        if (this._menuCloseFn) {
            document.removeEventListener('click', this._menuCloseFn);
            this._menuCloseFn = null;
        }

        if (this.container) { 
            this.container.remove(); 
            this.container = null; 
        }
        
        // Show native elements again and remove body flag
        document.querySelectorAll('.ypp-pl-hidden').forEach(el => {
            el.classList.remove('ypp-pl-hidden');
        });
        document.body.classList.remove('ypp-playlist-redesign');
    }

    _tryInit() {
        if (!this._isPlaylistPage()) return;
        // Add class immediately so CSS hide rules fire right away,
        // before we even confirm the DOM is ready.
        document.body.classList.add('ypp-playlist-redesign');
        this._retryCount = 0;
        this._attemptBuild();
    }

    _attemptBuild() {
        // Minimum data we need: header + at least one video renderer
        const header = document.querySelector('ytd-playlist-header-renderer');
        const videos = document.querySelectorAll('ytd-playlist-video-renderer');

        if (header && videos.length > 0) {
            this._build(header, videos);
            this._watchForChanges();
            return;
        }

        if (this._retryCount < this.MAX_RETRIES) {
            this._retryCount++;
            this._retryTimer = setTimeout(
                () => this._attemptBuild(),
                this.RETRY_DELAY
            );
        }
    }

    // ─── MutationObserver — rebuild if native list grows ────────────────────

    _watchForChanges() {
        const listContainer = document.querySelector(
            'ytd-browse[page-subtype="playlist"] #contents'
        );
        if (!listContainer) return;

        // Prevent attaching multiple observers if _attemptBuild succeeds multiple times
        if (this.mutObs) {
            this.mutObs.disconnect();
        }

        let debounce = null;
        this.mutObs = new MutationObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                const header = document.querySelector('ytd-playlist-header-renderer');
                const videos = document.querySelectorAll('ytd-playlist-video-renderer');
                // Only rebuild if we still have valid data
                if (header && videos.length > 0 && this.isActive) {
                    this._build(header, videos);
                }
            }, 600);
        });

        this.mutObs.observe(listContainer, { childList: true, subtree: false });
    }

    // ─── Data extraction from native YouTube DOM ─────────────────────────────

    _extractPlaylistData(header, videoEls) {
        // ── Playlist meta ──
        const title = header.querySelector(
            'h1, yt-formatted-string[id="title"], .title'
        )?.textContent?.trim() || 'Playlist';

        const ownerEl = header.querySelector(
            'ytd-channel-name a, #owner-text a, a.yt-simple-endpoint[href*="/@"]'
        );
        const owner     = ownerEl?.textContent?.trim() || '';
        const ownerHref = ownerEl?.href || '';

        const statsEl  = header.querySelector('yt-formatted-string#stats, .metadata-stats');
        const stats    = statsEl?.textContent?.trim() || '';

        // Playlist thumbnail — try immersive banner first, then first video thumb
        let coverUrl = '';
        const bannerImg = header.querySelector('yt-image img, #thumbnail img, img.yt-img-shadow');
        if (bannerImg?.src && !bannerImg.src.includes('data:')) {
            coverUrl = bannerImg.src;
        }

        // ── Videos ──
        const videos = [];
        videoEls.forEach((el, idx) => {
            // Title
            const vtitle = el.querySelector(
                'a#video-title, yt-formatted-string#video-title, h3 a'
            )?.textContent?.trim() || `Video ${idx + 1}`;

            // Watch URL
            const vhref  = el.querySelector(
                'a#video-title, a.yt-simple-endpoint[href*="watch"]'
            )?.href || '';

            // Channel
            const vchan  = el.querySelector(
                'ytd-channel-name a, #channel-name a, .ytd-channel-name a'
            )?.textContent?.trim() || '';

            // Duration — layer 1: find the badge span and read ONLY its own text
            // avoiding concatenated child markup that produces "0:320:32"
            let vdur = '';
            const timeOverlay = el.querySelector('ytd-thumbnail-overlay-time-status-renderer');
            if (timeOverlay) {
                // Try the innermost badge text span first
                const badgeSpan = timeOverlay.querySelector(
                    '.badge-shape-wiz__text, span[class*="time-status"], span'
                );
                if (badgeSpan) {
                    // Collapse whitespace from innerText (avoids hidden \n nodes)
                    const collapsed = (badgeSpan.innerText || badgeSpan.textContent || '')
                        .replace(/\s+/g, '').trim();
                    const m = collapsed.match(/(\d{1,3}:\d{2}(?::\d{2})?)/);
                    if (m) vdur = m[1];
                }
                // Layer 2: aria-label attribute (clean human-readable timestamp)
                if (!vdur) {
                    const ariaRaw = timeOverlay.getAttribute('aria-label') || '';
                    const m2 = ariaRaw.match(/(\d+:\d{2}(?::\d{2})?)/);
                    if (m2) vdur = m2[1];
                }
            }

            // Thumbnail
            let vthumb = '';
            const thumbImg = el.querySelector('ytd-thumbnail img, img#img');
            if (thumbImg?.src && !thumbImg.src.includes('data:')) {
                vthumb = thumbImg.src;
            }
            // Fallback: build from video ID
            if (!vthumb && vhref) {
                const vidMatch = vhref.match(/[?&]v=([^&]+)/);
                if (vidMatch) {
                    vthumb = `https://i.ytimg.com/vi/${vidMatch[1]}/mqdefault.jpg`;
                }
            }

            // Index number
            const vindex = el.querySelector(
                '#index-container, .index-message-wrapper, yt-formatted-string#index'
            )?.textContent?.trim() || String(idx + 1);

            // Watched progress
            const prog = el.querySelector(
                'ytd-thumbnail-overlay-resume-playback-renderer #progress'
            );
            const progressPct = prog
                ? parseInt(prog.style.width, 10) || 0
                : 0;

            videos.push({ title: vtitle, href: vhref, channel: vchan,
                          duration: vdur, thumb: vthumb,
                          index: vindex, progress: progressPct });
        });

        // ── Duration totals (from PlaylistDuration if available) ──
        let totalSecs = 0;
        videos.forEach(v => {
            if (v.duration && v.duration.includes(':')) {
                const clean = v.duration.replace(/[^0-9:]/g, '');
                const parts = clean.split(':').map(Number);
                if (parts.length === 3) totalSecs += parts[0]*3600 + parts[1]*60 + parts[2];
                else if (parts.length === 2) totalSecs += parts[0]*60 + parts[1];
            }
        });

        return { title, owner, ownerHref, stats, coverUrl, videos, totalSecs };
    }

    _formatDur(s) {
        if (!s) return '0:00:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }

    // ─── UI Build ────────────────────────────────────────────────────────────

    _build(header, videoEls) {
        const data = this._extractPlaylistData(header, videoEls);

        // Hide native playlist layout (not remove — YouTube needs it for data + navigation)
        // We hide via class so _reset() can restore them on disable/navigate-away
        const nativeTargets = document.querySelectorAll(
            'ytd-browse[page-subtype="playlist"] ytd-two-column-browse-results-renderer, ' +
            'ytd-browse[page-subtype="playlist"] #header, ' +
            'ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer, ' +
            'ytd-browse[page-subtype="playlist"] ytd-playlist-video-list-renderer, ' +
            'ytd-browse[page-subtype="playlist"] #primary > ytd-section-list-renderer, ' +
            'ytd-browse[page-subtype="playlist"] ytd-item-section-renderer'
        );
        nativeTargets.forEach(el => el.classList.add('ypp-pl-hidden'));

        // Remove old container
        document.getElementById('ypp-pl-root')?.remove();

        // Create root
        this.container = document.createElement('div');
        this.container.id = 'ypp-pl-root';
        this.container.innerHTML = this._renderHTML(data);

        // Inject after masthead / inside ytd-browse
        const browse = document.querySelector('ytd-browse[page-subtype="playlist"]');
        if (browse) {
            browse.insertBefore(this.container, browse.firstChild);
        } else {
            document.body.appendChild(this.container);
        }

        this._wireEvents(data);
    }

    // ─── HTML rendering ──────────────────────────────────────────────────────

    _renderHTML(data) {
        const { title, owner, ownerHref, stats, coverUrl, videos, totalSecs } = data;

        const coverHTML = coverUrl
            ? `<img src="${this._esc(coverUrl)}" alt="${this._esc(title)}" class="ypp-pl-cover-img" loading="lazy">`
            : `<div class="ypp-pl-cover-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <path d="M9 18V5l12-2v13"/>
                   <circle cx="6" cy="18" r="3"/>
                   <circle cx="18" cy="16" r="3"/>
                 </svg>
               </div>`;

        const ownerHTML = owner
            ? `<a class="ypp-pl-owner" href="${this._esc(ownerHref)}">${this._esc(owner)}</a>`
            : '';

        // ── Duration card with speed breakdowns ──
        const durCard = this._renderDurationCard(totalSecs, videos.length);

        // ── Video cards ──
        const videoCards = videos.map((v, i) => this._renderVideoCard(v, i)).join('');

        const bgHTML = coverUrl
            ? `<div class="ypp-pl-ambient-bg" style="background-image: url('${this._esc(coverUrl)}')"></div>
               <div class="ypp-pl-ambient-overlay"></div>`
            : '';

        return `
        ${bgHTML}
        <div class="ypp-pl-layout">

          <!-- ── Sidebar ── -->
          <aside class="ypp-pl-sidebar">
            <div class="ypp-pl-cover-wrap">
              ${coverHTML}
              <div class="ypp-pl-cover-shimmer"></div>
            </div>

            <div class="ypp-pl-meta">
              <h1 class="ypp-pl-title">${this._esc(title)}</h1>
              ${ownerHTML}
              <p class="ypp-pl-stats">${this._esc(stats)}</p>
            </div>

            <div class="ypp-pl-actions">
              <button class="ypp-pl-btn-primary" id="ypp-pl-play">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play all
              </button>
              <button class="ypp-pl-btn-secondary" id="ypp-pl-shuffle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 3 21 3 21 8"/>
                  <line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/>
                  <line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
                Shuffle
              </button>
            </div>

            ${durCard}
          </aside>

          <!-- ── Video Grid ── -->
          <main class="ypp-pl-main">

            <!-- toolbar: count + column switcher + filter -->
            <div class="ypp-pl-toolbar">
              <span class="ypp-pl-count-label" id="ypp-pl-count">
                ${videos.length} VIDEO${videos.length !== 1 ? 'S' : ''}
              </span>

              <div class="ypp-pl-col-switcher">
                <button class="ypp-col-btn" data-cols="1" title="List view">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button class="ypp-col-btn active" data-cols="2" title="Grid view">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </button>
                <button class="ypp-col-btn" data-cols="3" title="Wide grid">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="5" height="7"/>
                    <rect x="9.5" y="3" width="5" height="7"/>
                    <rect x="17" y="3" width="5" height="7"/>
                    <rect x="2" y="14" width="5" height="7"/>
                    <rect x="9.5" y="14" width="5" height="7"/>
                    <rect x="17" y="14" width="5" height="7"/>
                  </svg>
                </button>
              </div>

              <div class="ypp-pl-filter-wrap">
                <input class="ypp-pl-filter" placeholder="Filter videos…" id="ypp-pl-filter" autocomplete="off">
              </div>
            </div>

            <div class="ypp-pl-grid ypp-pl-cols-2" id="ypp-pl-grid">
              ${videoCards}
            </div>

          </main>

        </div>`;
    }

    // ── Duration card (sidebar) ────────────────────────────────────────────
    _renderDurationCard(totalSecs, videoCount) {
        if (!totalSecs) return '';
        const fmt = (s) => {
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            return h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
                : `${m}:${String(sec).padStart(2,'0')}`;
        };
        const speeds = [
            { label: '1.25×', s: Math.floor(totalSecs / 1.25) },
            { label: '1.5×',  s: Math.floor(totalSecs / 1.5)  },
            { label: '1.75×', s: Math.floor(totalSecs / 1.75) },
            { label: '2×',    s: Math.floor(totalSecs / 2)    },
        ];
        return `
        <div class="ypp-pl-duration-card">
          <div class="ypp-pl-duration-label">TOTAL DURATION</div>
          <div class="ypp-pl-duration-time">${fmt(totalSecs)}</div>
          <div class="ypp-pl-duration-grid">
            ${speeds.map(sp => `
              <div class="ypp-pl-duration-row">
                <span class="ypp-pl-duration-speed">${sp.label}</span>
                <span class="ypp-pl-duration-val">${fmt(sp.s)}</span>
              </div>`).join('')}
            <div class="ypp-pl-duration-row">
              <span class="ypp-pl-duration-speed">Videos</span>
              <span class="ypp-pl-duration-val">${videoCount}</span>
            </div>
          </div>
        </div>`;
    }

    // ── Grid card ─────────────────────────────────────────────────────────
    _renderVideoCard(v, i) {
        const thumbHTML = v.thumb
            ? `<img src="${this._esc(v.thumb)}" alt="" loading="lazy">`
            : `<div class="ypp-pl-card-thumb-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <polygon points="23 7 16 12 23 17 23 7"/>
                   <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                 </svg>
               </div>`;

        const durBadge = v.duration
            ? `<div class="ypp-pl-card-duration">${this._esc(v.duration)}</div>`
            : '';

        const progressBar = v.progress > 0
            ? `<div class="ypp-pl-card-progress"><div style="width:${v.progress}%"></div></div>`
            : '';

        return `
        <a class="ypp-pl-card" href="${this._esc(v.href)}"
           data-title="${this._esc(v.title.toLowerCase())}" data-index="${i}">
          <div class="ypp-pl-card-thumb">
            <div class="ypp-pl-card-index">${this._esc(v.index)}</div>
            ${thumbHTML}
            ${durBadge}
            ${progressBar}
          </div>
          <div class="ypp-pl-card-info">
            <div class="ypp-pl-card-title-row">
                <span class="ypp-pl-card-title" title="${this._esc(v.title)}">${this._esc(v.title)}</span>
                <button class="ypp-pl-card-menu" title="More options" data-href="${this._esc(v.href)}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5"/>
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                </button>
            </div>
            <span class="ypp-pl-card-chan">${this._esc(v.channel)}</span>
          </div>
        </a>`;
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    _wireEvents(data) {
        const root = this.container;

        // ── Play all ─────────────────────────────────────────────────────
        root.querySelector('#ypp-pl-play')?.addEventListener('click', () => {
            const first = data.videos[0];
            if (first?.href) window.location.href = first.href;
        });

        // ── Shuffle ───────────────────────────────────────────────────────
        root.querySelector('#ypp-pl-shuffle')?.addEventListener('click', () => {
            const vids = data.videos.filter(v => v.href);
            if (!vids.length) return;
            const pick = vids[Math.floor(Math.random() * vids.length)];
            window.location.href = pick.href;
        });

        // ── Column switcher ───────────────────────────────────────────────
        const grid = root.querySelector('#ypp-pl-grid');
        const setColumns = (cols) => {
            if (!grid) return;
            this._currentCols = String(cols);
            grid.className = `ypp-pl-grid ypp-pl-cols-${this._currentCols}`;
            root.querySelectorAll('.ypp-col-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.cols === this._currentCols);
            });
        };

        root.querySelectorAll('.ypp-col-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cols = btn.dataset.cols;
                setColumns(cols);
                try { chrome.storage.local.set({ playlistCols: cols }); } catch (_) {}
            });
        });

        // Apply cached column preference immediately (synchronous)
        setColumns(this._currentCols);

        // ── Filter input ──────────────────────────────────────────────────
        root.querySelector('#ypp-pl-filter')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase().trim();
            root.querySelectorAll('.ypp-pl-card').forEach(card => {
                const match = !q || (card.dataset.title || '').includes(q);
                card.style.display = match ? '' : 'none';
            });
        });

        // ── Card Context Menu ──────────────────────────────────────────────
        grid?.addEventListener('click', e => {
            const menuBtn = e.target.closest('.ypp-pl-card-menu');
            if (!menuBtn) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Remove existing
            document.querySelector('.ypp-pl-card-context-menu')?.remove();
            
            const href = menuBtn.dataset.href;
            const card = menuBtn.closest('.ypp-pl-card');
            
            const menu = document.createElement('div');
            menu.className = 'ypp-pl-card-context-menu';
            menu.innerHTML = `
                <div class="ypp-ctx-item" data-action="watch-later">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Save to Watch Later
                </div>
                <div class="ypp-ctx-item" data-action="open-new">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open in new tab
                </div>
                <div class="ypp-ctx-item ypp-ctx-danger" data-action="remove">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                    Remove from playlist
                </div>
            `;
            
            // Position context menu
            const rect = menuBtn.getBoundingClientRect();
            menu.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 4}px;
                left: ${rect.left - 160}px;
                z-index: 99999;
            `;
            
            document.body.appendChild(menu);
            
            // Wire menu actions
            menu.querySelector('[data-action="open-new"]')?.addEventListener('click', () => {
                window.open(href, '_blank');
                menu.remove();
            });
            
            menu.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
                if (card) {
                    card.style.opacity = '0.3';
                    card.style.pointerEvents = 'none';
                }
                menu.remove();
                // trigger native remove by finding native action menu if needed
            });
            
            // Close on outside click (Memory safe implementation)
            if (this._menuCloseFn) {
                document.removeEventListener('click', this._menuCloseFn);
            }
            
            this._menuCloseFn = (ev) => {
                if (!menu.contains(ev.target)) {
                    menu.remove();
                    document.removeEventListener('click', this._menuCloseFn);
                    this._menuCloseFn = null;
                }
            };
            
            // Push to end of event queue so the current click doesn't trigger close
            setTimeout(() => {
                if (document.body.contains(menu)) {
                    document.addEventListener('click', this._menuCloseFn);
                }
            }, 0);
        });
    }

    _esc(str) {
        return (str || '')
            .replace(/&/g,  '&amp;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#39;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;');
    }
};
