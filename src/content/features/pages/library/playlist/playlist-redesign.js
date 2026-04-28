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
        this.MAX_RETRIES     = 12;
        this.RETRY_DELAY     = 800;
    }

    // ─── Feature lifecycle ───────────────────────────────────────────────────

    run(settings) {
        if (this.isActive) return;
        this.isActive = true;
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
        if (this.mutObs) { this.mutObs.disconnect(); this.mutObs = null; }
        if (this.container) { this.container.remove(); this.container = null; }
        // Show native elements again
        document.querySelectorAll('.ypp-pl-hidden').forEach(el => {
            el.classList.remove('ypp-pl-hidden');
        });
    }

    _tryInit() {
        if (!this._isPlaylistPage()) return;
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

        let debounce = null;
        this.mutObs = new MutationObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(() => {
                const header = document.querySelector('ytd-playlist-header-renderer');
                const videos = document.querySelectorAll('ytd-playlist-video-renderer');
                if (header && videos.length > 0) this._build(header, videos);
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

            // Duration
            const vdur   = el.querySelector(
                'ytd-thumbnail-overlay-time-status-renderer, badge-shape, .badge-shape-wiz__text, span.ytd-thumbnail-overlay-time-status-renderer'
            )?.textContent?.trim() || '';

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

        // Hide native playlist layout (not remove — YouTube needs it for navigation)
        const nativeTargets = document.querySelectorAll(
            'ytd-browse[page-subtype="playlist"] ytd-two-column-browse-results-renderer, ' +
            'ytd-browse[page-subtype="playlist"] #header, ' +
            'ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer'
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

        // Duration breakdown
        const t125 = this._formatDur(Math.floor(totalSecs / 1.25));
        const t150 = this._formatDur(Math.floor(totalSecs / 1.5));
        const t200 = this._formatDur(Math.floor(totalSecs / 2));
        const durCard = totalSecs > 0 ? `
          <div class="ypp-pl-dur-card">
            <div class="ypp-pl-dur-label">Total Duration</div>
            <div class="ypp-pl-dur-main">${this._formatDur(totalSecs)}</div>
            <div class="ypp-pl-dur-grid">
              <div class="ypp-pl-dur-cell"><span>1.25×</span><span>${t125}</span></div>
              <div class="ypp-pl-dur-cell"><span>1.5×</span><span>${t150}</span></div>
              <div class="ypp-pl-dur-cell"><span>2×</span><span>${t200}</span></div>
              <div class="ypp-pl-dur-cell"><span>Videos</span><span>${videos.length}</span></div>
            </div>
          </div>` : '';

        const videoRows = videos.map((v, i) => this._renderVideoRow(v, i)).join('');

        return `
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

          <!-- ── Video List ── -->
          <main class="ypp-pl-main">
            <div class="ypp-pl-list-header">
              <span class="ypp-pl-list-count">${videos.length} video${videos.length !== 1 ? 's' : ''}</span>
              <div class="ypp-pl-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input id="ypp-pl-search" class="ypp-pl-search" type="text" placeholder="Filter videos…" autocomplete="off">
              </div>
            </div>
            <div class="ypp-pl-list" id="ypp-pl-list">
              ${videoRows}
            </div>
          </main>

        </div>`;
    }

    _renderVideoRow(v, i) {
        const thumbHTML = v.thumb
            ? `<img src="${this._esc(v.thumb)}" alt="${this._esc(v.title)}" class="ypp-pl-v-thumb" loading="lazy">`
            : `<div class="ypp-pl-v-thumb-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                 </svg>
               </div>`;

        const progressBar = v.progress > 0
            ? `<div class="ypp-pl-v-progress"><div style="width:${v.progress}%"></div></div>`
            : '';

        const durBadge = v.duration
            ? `<span class="ypp-pl-v-dur">${this._esc(v.duration.replace(/\s/g,''))}</span>`
            : '';

        return `
        <a class="ypp-pl-v-row" href="${this._esc(v.href)}" data-title="${this._esc(v.title.toLowerCase())}" data-index="${i}">
          <span class="ypp-pl-v-idx">${this._esc(v.index)}</span>
          <div class="ypp-pl-v-thumb-wrap">
            ${thumbHTML}
            ${durBadge}
            ${progressBar}
          </div>
          <div class="ypp-pl-v-info">
            <span class="ypp-pl-v-title">${this._esc(v.title)}</span>
            <span class="ypp-pl-v-chan">${this._esc(v.channel)}</span>
          </div>
          <button class="ypp-pl-v-more" title="More options" aria-label="More options for ${this._esc(v.title)}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5"  r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
        </a>`;
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    _wireEvents(data) {
        // Play all — click native play button
        document.getElementById('ypp-pl-play')?.addEventListener('click', () => {
            const first = data.videos[0];
            if (first?.href) window.location.href = first.href;
        });

        // Shuffle — random video
        document.getElementById('ypp-pl-shuffle')?.addEventListener('click', () => {
            const vids = data.videos.filter(v => v.href);
            if (!vids.length) return;
            const pick = vids[Math.floor(Math.random() * vids.length)];
            window.location.href = pick.href;
        });

        // Search / filter
        document.getElementById('ypp-pl-search')?.addEventListener('input', e => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.ypp-pl-v-row').forEach(row => {
                const match = !q || row.dataset.title.includes(q);
                row.style.display = match ? '' : 'none';
            });
        });

        // More options — stop native menu from propagating weirdly
        document.querySelectorAll('.ypp-pl-v-more').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                // Trigger native more-actions on the corresponding video row
                const idx = parseInt(btn.closest('.ypp-pl-v-row')?.dataset.index ?? '-1', 10);
                if (idx < 0) return;
                const nativeRow = document.querySelectorAll('ytd-playlist-video-renderer')[idx];
                const nativeMenu = nativeRow?.querySelector('button#button[aria-label], yt-icon-button#menu');
                nativeMenu?.click();
            });
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
