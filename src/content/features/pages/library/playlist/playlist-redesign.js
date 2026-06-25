/**
 * Feature: Playlist Page Redesign (Full UI Override)
 * Completely replaces the native YouTube playlist page layout with a
 * premium glassmorphic design: sidebar info panel + scrollable video list.
 * Reads data from native YouTube DOM — no API calls needed.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.PlaylistRedesign = class PlaylistRedesign extends window.YPP.features.BaseFeature {
    constructor() {
        super('PlaylistRedesign');
        this.isActive        = false;
        this.container       = null;   // Our custom #ypp-pl root
        this.navHandler      = null;
        this._buildTimer     = null;
        this._retryTimer     = null;
        this._retryCount     = 0;
        this._initId         = 0;      // Prevent race conditions with SPA navigation
        this._currentCols    = '3';    // Cache column preference to prevent async thrashing
        this._menuCloseFn    = null;   // Track global click listener for memory safety
        this.MAX_RETRIES     = 12;
        this.RETRY_DELAY     = 800;
        
        this.SELECTORS = {
            TITLE: 'h1, yt-formatted-string[id="title"], .title',
            OWNER: 'ytd-channel-name a, #owner-text a, a.yt-simple-endpoint[href*="/@"]',
            STATS: 'yt-formatted-string#stats, .metadata-stats',
            BANNER_IMG: 'yt-image img, #thumbnail img, .yt-core-image, img.yt-img-shadow',
            VIDEO_TITLE: 'a#video-title, yt-formatted-string#video-title, h3 a',
            VIDEO_URL: 'a#video-title, a#thumbnail, a.yt-simple-endpoint[href*="/watch"]',
            VIDEO_CHANNEL: 'ytd-channel-name a, #channel-name a, .ytd-channel-name a',
            THUMB_IMG: 'ytd-thumbnail img, yt-image img, .yt-core-image, img#img',
            INDEX: '#index-container, .index-message-wrapper, yt-formatted-string#index',
            TIME_OVERLAY: 'ytd-thumbnail-overlay-time-status-renderer, badge-shape, span.ytd-thumbnail-overlay-time-status-renderer',
            BADGE_SPAN: '#text, .badge-shape-wiz__text'
        };
    }

    getConfigKey() { return 'playlistRedesign'; }

    // ─── Feature lifecycle ───────────────────────────────────────────────────

    async enable() {
        // Pre-fetch column preference once during lifecycle startup
        try {
            window.YPP.StorageManager.get('playlistCols').then((val) => {
                if (val) this._currentCols = val;
            });
        } catch (e) {
            this.utils.log('Failed to load column preference: ' + e.message, 'PLAYLIST_REDESIGN', 'warn');
        }

        if (this._isPlaylistPage()) {
            this._tryInit();
        }
    }

    onPageChange() {
        this._reset();
        if (this.isEnabled && this._isPlaylistPage()) {
            this._tryInit();
        }
    }

    disable() {
        this._reset();
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    _isPlaylistPage() {
        return location.pathname.startsWith('/playlist');
    }

    _getActiveBrowse() {
        // Find the active ytd-browse (YouTube hides cached pages via the 'hidden' attribute)
        let browses = Array.from(document.querySelectorAll('ytd-browse[page-subtype="playlist"]'));
        if (!browses.length) {
            browses = Array.from(document.querySelectorAll('ytd-browse')).filter(b => 
                b.querySelector('ytd-playlist-header-renderer, yt-playlist-header-view-model, #header')
            );
        }
        return browses.find(el => !el.hasAttribute('hidden')) || browses[0];
    }

    _reset() {
        this._initId++; // Invalidate any pending initializations
        clearTimeout(this._buildTimer);
        clearTimeout(this._retryTimer);
        this._retryCount = 0;
        
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('playlist-redesign-scanner');
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

    async _tryInit() {
        if (!this._isPlaylistPage()) return;
        
        const currentInitId = ++this._initId;

        // Wait up to 10 seconds for the native playlist DOM to load
        // Do NOT add body class yet — only apply it once we have confirmed data,
        // preventing the native layout from being hidden on a page where we can't render.
        const ITEM_SEL = 'ytd-playlist-video-renderer, yt-lockup-view-model';
        const isReady = await window.YPP.Utils.pollFor(() => {
            const browse = this._getActiveBrowse();
            if (!browse) return false;
            const header = browse.querySelector('ytd-playlist-header-renderer, yt-playlist-header-view-model, #header');
            return header && browse.querySelectorAll(ITEM_SEL).length > 0;
        }, 10000);

        // Check isEnabled (BaseFeature flag) — feature may have been disabled while waiting
        // Check currentInitId to prevent race conditions during SPA navigation
        if (isReady && this.isEnabled && this._initId === currentInitId && this._isPlaylistPage()) {
            document.body.classList.add('ypp-playlist-redesign');
            const browse = this._getActiveBrowse();
            if (!browse) return;
            const header = browse.querySelector('ytd-playlist-header-renderer, yt-playlist-header-view-model, #header');
            const videos = browse.querySelectorAll(ITEM_SEL);
            this._build(browse, header, videos);
            this._watchForChanges(browse);
        }
    }

    // ─── MutationObserver — rebuild if native list grows ────────────────────

    _watchForChanges(browse) {
        const listContainer = browse.querySelector('#contents');
        if (!listContainer) return;

        if (window.YPP?.sharedObserver) {
            const ITEM_SEL = 'ytd-playlist-video-renderer, yt-lockup-view-model';
            const debouncedBuild = this.utils.debounce(() => {
                const activeBrowse = this._getActiveBrowse();
                if (!activeBrowse) return;
                const header = activeBrowse.querySelector('ytd-playlist-header-renderer, yt-playlist-header-view-model, #header');
                const videos = activeBrowse.querySelectorAll(ITEM_SEL);
                // Only rebuild if we still have valid data
                if (header && videos.length > 0 && this.isEnabled) {
                    this._build(activeBrowse, header, videos);
                }
            }, 600);
            window.YPP.sharedObserver.register('playlist-redesign-scanner', ITEM_SEL, debouncedBuild, false);
        }
    }

    // ─── Data extraction from native YouTube DOM ─────────────────────────────

    _extractPlaylistData(header, videoEls) {
        // ── Playlist meta ──
        const title = header.querySelector(this.SELECTORS.TITLE)?.textContent?.trim() || 'Playlist';

        const ownerEl = header.querySelector(this.SELECTORS.OWNER);
        const owner     = ownerEl?.textContent?.trim() || '';
        const ownerHref = ownerEl?.href || '';

        const statsEl  = header.querySelector(this.SELECTORS.STATS);
        const stats    = statsEl?.textContent?.trim() || '';

        // Playlist thumbnail — try immersive banner first, then first video thumb
        let coverUrl = '';
        const bannerImg = header.querySelector(this.SELECTORS.BANNER_IMG);
        if (bannerImg?.src && !bannerImg.src.includes('data:')) {
            coverUrl = bannerImg.src;
        }

        // ── Videos ──
        const videos = [];
        videoEls.forEach((videoElement, idx) => {
            // Title
            const videoTitle = videoElement.querySelector(this.SELECTORS.VIDEO_TITLE)?.textContent?.trim() || `Video ${idx + 1}`;

            // Watch URL
            const videoUrl  = videoElement.querySelector(this.SELECTORS.VIDEO_URL)?.href || '';

            // Channel
            const videoChannel  = videoElement.querySelector(this.SELECTORS.VIDEO_CHANNEL)?.textContent?.trim() || '';

            // Duration — layer 1: find the badge span and read ONLY its own text
            // avoiding concatenated child markup that produces "0:320:32"
            let videoDuration = '';
            const timeOverlay = videoElement.querySelector(this.SELECTORS.TIME_OVERLAY);
            if (timeOverlay) {
                // Try the innermost badge text span first
                const badgeSpan = timeOverlay.querySelector(this.SELECTORS.BADGE_SPAN);
                if (badgeSpan) {
                    // Collapse whitespace from innerText (avoids hidden \n nodes)
                    const collapsed = (badgeSpan.innerText || badgeSpan.textContent || '')
                        .replace(/\s+/g, '').trim();
                    const m = collapsed.match(/(\d{1,3}:\d{2}(?::\d{2})?)/);
                    if (m) videoDuration = m[1];
                }
                // Layer 2: aria-label attribute (clean human-readable timestamp)
                if (!videoDuration) {
                    const ariaRaw = timeOverlay.getAttribute('aria-label') || '';
                    const m2 = ariaRaw.match(/(\d+:\d{2}(?::\d{2})?)/);
                    if (m2) videoDuration = m2[1];
                }
            }

            // Thumbnail
            let videoThumb = '';
            const thumbImg = videoElement.querySelector(this.SELECTORS.THUMB_IMG);
            if (thumbImg?.src && !thumbImg.src.includes('data:')) {
                videoThumb = thumbImg.src;
            }
            // Fallback: build from video ID
            if (!videoThumb && videoUrl) {
                const vidMatch = videoUrl.match(/[?&]v=([^&]+)/);
                if (vidMatch) {
                    videoThumb = `https://i.ytimg.com/vi/${vidMatch[1]}/mqdefault.jpg`;
                }
            }

            // Index number
            const videoIndex = videoElement.querySelector(this.SELECTORS.INDEX)?.textContent?.trim() || String(idx + 1);

            // Watched progress — try multiple selectors for old and new YouTube DOM
            let progressPct = 0;
            const progressSelectors = [
                'ytd-thumbnail-overlay-resume-playback-renderer #progress',
                'ytd-thumbnail-overlay-resume-playback-renderer',
                '[overlay-style="DEFAULT"] #progress',
                '#progress[style*="width"]'
            ];
            for (const psel of progressSelectors) {
                const prog = videoElement.querySelector(psel);
                if (prog) {
                    const w = parseInt(prog.style.width, 10);
                    if (!isNaN(w) && w > 0) { progressPct = w; break; }
                    // If element exists but no style width, it's still partially watched
                    if (prog.tagName === 'YTD-THUMBNAIL-OVERLAY-RESUME-PLAYBACK-RENDERER') {
                        progressPct = 50; // Unknown amount, treat as watched
                        break;
                    }
                }
            }

            videos.push({ title: videoTitle, href: videoUrl, channel: videoChannel,
                          duration: videoDuration, thumb: videoThumb,
                          index: videoIndex, progress: progressPct });
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

    _build(browse, header, videoEls) {
        const data = this._extractPlaylistData(header, videoEls);

        const PLAYLIST = window.YPP.CONSTANTS?.SELECTORS?.PLAYLIST || {};
        
        // Hide native playlist layout (not remove — YouTube needs it for data + navigation)
        if (header) {
            header.classList.add('ypp-pl-hidden');
            const headerParent = header.closest('ytd-playlist-header-renderer, #header');
            if (headerParent) headerParent.classList.add('ypp-pl-hidden');
        }
        
        if (videoEls && videoEls.length > 0) {
            // Hide the list container holding the native videos
            const listContainer = videoEls[0].closest('ytd-playlist-video-list-renderer, ytd-item-section-renderer, ytd-section-list-renderer, ytd-rich-grid-renderer');
            if (listContainer) listContainer.classList.add('ypp-pl-hidden');
            
            // Also hide the two-column wrapper if it exists so it doesn't occupy space
            const twoColumn = videoEls[0].closest('ytd-two-column-browse-results-renderer');
            if (twoColumn) twoColumn.classList.add('ypp-pl-hidden');
        }

        // Clean up old event listeners before removing old container
        this.cleanupEvents();

        // Remove old container
        document.getElementById('ypp-pl-root')?.remove();

        // Create root
        this.container = document.createElement('div');
        this.container.id = 'ypp-pl-root';
        this.container.innerHTML = this._renderHTML(data);

        // Inject after masthead / inside ytd-browse
        if (browse) {
            browse.insertBefore(this.container, browse.firstChild);
        } else {
            document.body.appendChild(this.container);
        }

        this._wireEvents(browse, data);
    }

    // ─── HTML rendering ──────────────────────────────────────────────────────

    _renderHTML(data) {
        const { coverUrl } = data;
        
        const bgHTML = coverUrl
            ? `<div class="ypp-pl-ambient-bg" style="background-image: url('${this._esc(coverUrl)}')"></div>
               <div class="ypp-pl-ambient-overlay"></div>`
            : '';

        return `
        ${bgHTML}
        <div class="ypp-pl-layout">
          ${this._renderSidebar(data)}
          ${this._renderMain(data)}
        </div>`;
    }
    
    _renderSidebar(data) {
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

        const durCard = this._renderDurationCard(totalSecs, videos.length);
        
        return `
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

            <div class="ypp-pl-actions-main">
              <button class="ypp-pl-btn-play" id="ypp-pl-play">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>
                Play all
              </button>
              <button class="ypp-pl-btn-shuffle" id="ypp-pl-shuffle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
                  <polyline points="16 3 21 3 21 8"/>
                  <line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/>
                  <line x1="15" y1="15" x2="21" y2="21"/>
                </svg>
                Shuffle
              </button>
            </div>

            <div class="ypp-pl-tools-grid">
              <button class="ypp-pl-btn-tool" id="ypp-pl-save" title="Save playlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                <span>Save</span>
              </button>
              <button class="ypp-pl-btn-tool" id="ypp-pl-share" title="Share">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span>Share</span>
              </button>
              <button class="ypp-pl-btn-tool ypp-pl-btn-danger" id="ypp-pl-remove-watched" title="Remove Watched Videos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M9 6V4h6v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                <span>Clean</span>
              </button>
              <button class="ypp-pl-btn-tool" id="ypp-pl-menu" title="Menu">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                <span>More</span>
              </button>
            </div>

            ${durCard}
          </aside>`;
    }
    
    _renderMain(data) {
        const { videos } = data;
        const videoCards = videos.map((v, i) => this._renderVideoCard(v, i)).join('');

        return `
          <!-- ── Video Grid ── -->
          <main class="ypp-pl-main">
            <!-- toolbar: count + column switcher + filter -->
            <div class="ypp-pl-toolbar">
              <span class="ypp-pl-count-label" id="ypp-pl-count">
                ${videos.length} VIDEO${videos.length !== 1 ? 'S' : ''}
              </span>

              <div class="ypp-pl-col-switcher">
                <button class="ypp-col-btn ${this._currentCols === 1 ? 'active' : ''}" data-cols="1" title="List view">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <button class="ypp-col-btn ${this._currentCols === 3 ? 'active' : ''}" data-cols="3" title="3 Column grid">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="5" height="7"/>
                    <rect x="9.5" y="3" width="5" height="7"/>
                    <rect x="17" y="3" width="5" height="7"/>
                    <rect x="2" y="14" width="5" height="7"/>
                    <rect x="9.5" y="14" width="5" height="7"/>
                    <rect x="17" y="14" width="5" height="7"/>
                  </svg>
                </button>
                <button class="ypp-col-btn ${this._currentCols === 4 ? 'active' : ''}" data-cols="4" title="4 Column grid">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="3.5" height="7"/>
                    <rect x="7.5" y="3" width="3.5" height="7"/>
                    <rect x="13" y="3" width="3.5" height="7"/>
                    <rect x="18.5" y="3" width="3.5" height="7"/>
                    <rect x="2" y="14" width="3.5" height="7"/>
                    <rect x="7.5" y="14" width="3.5" height="7"/>
                    <rect x="13" y="14" width="3.5" height="7"/>
                    <rect x="18.5" y="14" width="3.5" height="7"/>
                  </svg>
                </button>
                <button class="ypp-col-btn ${this._currentCols === 5 ? 'active' : ''}" data-cols="5" title="5 Column grid">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="1" y="3" width="3" height="7"/>
                    <rect x="5.5" y="3" width="3" height="7"/>
                    <rect x="10" y="3" width="3" height="7"/>
                    <rect x="14.5" y="3" width="3" height="7"/>
                    <rect x="19" y="3" width="3" height="7"/>
                    <rect x="1" y="14" width="3" height="7"/>
                    <rect x="5.5" y="14" width="3" height="7"/>
                    <rect x="10" y="14" width="3" height="7"/>
                    <rect x="14.5" y="14" width="3" height="7"/>
                    <rect x="19" y="14" width="3" height="7"/>
                  </svg>
                </button>
              </div>

              <div class="ypp-pl-filter-wrap">
                <input class="ypp-pl-filter" placeholder="Filter videos…" id="ypp-pl-filter" autocomplete="off">
              </div>
            </div>

            <div class="ypp-pl-grid ypp-pl-cols-${this._currentCols}" id="ypp-pl-grid">
              ${videoCards}
            </div>
          </main>`;
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
           data-title="${this._esc(v.title.toLowerCase())}" data-index="${i}" data-progress="${v.progress}">
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

    _wireEvents(browse, data) {
        const root = this.container;

        // ── Play all ─────────────────────────────────────────────────────
        this.addListener(root.querySelector('#ypp-pl-play'), 'click', () => {
            const first = data.videos[0];
            if (first?.href) window.location.href = first.href;
        });

        // ── Shuffle ───────────────────────────────────────────────────────
        this.addListener(root.querySelector('#ypp-pl-shuffle'), 'click', () => {
            const vids = data.videos.filter(v => v.href);
            if (!vids.length) return;
            const pick = vids[Math.floor(Math.random() * vids.length)];
            window.location.href = pick.href;
        });

        // ── Secondary Actions (Save, Share, Menu) ─────────────────────────
        
        const _clickNativeButtonAt = (customBtn, nativeBtn) => {
            if (!nativeBtn || !customBtn) return;
            // Move native button to custom button's position temporarily so YouTube's popup anchors correctly
            const rect = customBtn.getBoundingClientRect();
            const originalCss = nativeBtn.style.cssText;
            nativeBtn.style.position = 'fixed';
            nativeBtn.style.left = rect.left + 'px';
            nativeBtn.style.top = rect.top + 'px';
            nativeBtn.style.width = rect.width + 'px';
            nativeBtn.style.height = rect.height + 'px';
            nativeBtn.style.zIndex = '999999';
            nativeBtn.style.opacity = '0';
            
            nativeBtn.click();
            
            setTimeout(() => {
                nativeBtn.style.cssText = originalCss;
            }, 300);
        };

        const saveBtn = root.querySelector('#ypp-pl-save');
        this.addListener(saveBtn, 'click', () => {
            const btns = Array.from(document.querySelectorAll('ytd-playlist-header-renderer button'));
            const nativeSave = btns.find(b => {
                const label = (b.getAttribute('aria-label') || b.title || b.textContent || '').toLowerCase();
                return label.includes('save') && !label.includes('watch later');
            });
            _clickNativeButtonAt(saveBtn, nativeSave);
        });

        const shareBtn = root.querySelector('#ypp-pl-share');
        this.addListener(shareBtn, 'click', () => {
            const btns = Array.from(document.querySelectorAll('ytd-playlist-header-renderer button'));
            const nativeShare = btns.find(b => {
                const label = (b.getAttribute('aria-label') || b.title || b.textContent || '').toLowerCase();
                return label.includes('share') || label.includes('partager');
            });
            _clickNativeButtonAt(shareBtn, nativeShare);
        });

        const menuBtn = root.querySelector('#ypp-pl-menu');
        this.addListener(menuBtn, 'click', () => {
            // Find the 3-dots menu which is usually inside a ytd-menu-renderer
            const nativeMenuBtn = document.querySelector('ytd-playlist-header-renderer ytd-menu-renderer button');
            _clickNativeButtonAt(menuBtn, nativeMenuBtn);
        });

        // ── Remove Watched Videos ──────────────────────────────────────────
        this.addListener(root.querySelector('#ypp-pl-remove-watched'), 'click', async (e) => {
            const btn = e.currentTarget;
            
            // Build watched list: check our custom cards AND also scan native DOM for
            // progress bars that may not have been picked up during initial build
            const ITEM_SEL = 'ytd-playlist-video-renderer, yt-lockup-view-model';
            const nativeItems = browse ? Array.from(browse.querySelectorAll(ITEM_SEL)) : [];
            const threshold = this.settings?.hideWatchedThreshold ?? 10; // Default: any progress counts
            
            // Find which native item indices have progress
            const watchedIndices = new Set();
            nativeItems.forEach((item, idx) => {
                const progressSelectors = [
                    'ytd-thumbnail-overlay-resume-playback-renderer #progress',
                    'ytd-thumbnail-overlay-resume-playback-renderer',
                    '[overlay-style="DEFAULT"] #progress',
                    '#progress[style*="width"]'
                ];
                for (const psel of progressSelectors) {
                    const prog = item.querySelector(psel);
                    if (prog) {
                        const w = parseInt(prog.style.width, 10);
                        if (!isNaN(w) && w >= threshold) { watchedIndices.add(idx); break; }
                        if (prog.tagName === 'YTD-THUMBNAIL-OVERLAY-RESUME-PLAYBACK-RENDERER') {
                            watchedIndices.add(idx); break;
                        }
                    }
                }
            });
            
            // Also include cards that already have progress data from the build phase
            const watchedCards = Array.from(root.querySelectorAll('.ypp-pl-card[data-progress]'))
                .filter(c => parseInt(c.dataset.progress, 10) >= threshold);
            watchedCards.forEach(c => watchedIndices.add(parseInt(c.dataset.index, 10)));
            
            // Convert to sorted descending array (remove from end first to preserve indices)
            const sortedIndices = Array.from(watchedIndices).sort((a, b) => b - a);

            if (!sortedIndices.length) {
                btn.innerHTML = '<span>No watched videos found</span>';
                setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg><span>Clean</span>'; }, 2000);
                return;
            }

            btn.disabled = true;
            btn.textContent = `Removing 0 / ${sortedIndices.length}…`;

            let removed = 0;
            for (const idx of sortedIndices) {
                // Abort if user navigated away or feature was disabled during async loop
                if (!this.isEnabled || !document.body.classList.contains('ypp-playlist-redesign')) {
                    break;
                }

                const success = await this._removeNativeVideo(idx);
                if (success) {
                    // Find and remove our custom card by index
                    const card = root.querySelector(`.ypp-pl-card[data-index="${idx}"]`);
                    if (card) {
                        card.style.transition = 'opacity 0.3s, transform 0.3s';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';
                        setTimeout(() => card.remove(), 320);
                    }
                    removed++;
                    btn.textContent = `Removing ${removed} / ${sortedIndices.length}…`;
                }
                // Gap between each removal so YouTube can process
                await new Promise(r => setTimeout(r, 900));
            }

            btn.disabled = false;
            btn.textContent = removed > 0 ? `✓ Removed ${removed} video${removed !== 1 ? 's' : ''}` : 'None removed';
            
            if (removed > 0) {
                this._updateStatsAfterRemoval();
            }

            setTimeout(() => {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg><span>Clean</span>';
            }, 3000);
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
            this.addListener(btn, 'click', () => {
                const cols = btn.dataset.cols;
                setColumns(cols);
                try { window.YPP.StorageManager.set('playlistCols', cols); } catch (_) {}
            });
        });

        // Apply cached column preference immediately (synchronous)
        setColumns(this._currentCols);

        // ── Filter input ──────────────────────────────────────────────────
        this.addListener(root.querySelector('#ypp-pl-filter'), 'input', e => {
            const q = e.target.value.toLowerCase().trim();
            root.querySelectorAll('.ypp-pl-card').forEach(card => {
                const match = !q || (card.dataset.title || '').includes(q);
                card.style.display = match ? '' : 'none';
            });
        });

        // ── Card Context Menu ──────────────────────────────────────────────
        this.addListener(grid, 'click', e => {
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
            this.addListener(menu.querySelector('[data-action="open-new"]'), 'click', () => {
                window.open(href, '_blank');
                menu.remove();
            });
            
            this.addListener(menu.querySelector('[data-action="watch-later"]'), 'click', () => {
                if (card) {
                    const idx = parseInt(card.dataset.index, 10);
                    const nativeVideos = document.querySelectorAll('ytd-playlist-video-renderer');
                    const nativeVideo = nativeVideos[idx];
                    
                    if (nativeVideo) {
                        const menuBtn = nativeVideo.querySelector('ytd-menu-renderer button');
                        if (menuBtn) {
                            menuBtn.click();
                            setTimeout(() => {
                                const items = document.querySelectorAll('ytd-menu-popup-renderer ytd-menu-service-item-renderer');
                                for (const item of items) {
                                    const text = (item.textContent || '').toLowerCase();
                                    if (text.includes('watch later')) {
                                        item.click();
                                        break;
                                    }
                                }
                                // Ensure popup closes
                                document.body.click();
                            }, 100);
                        }
                    }
                }
                menu.remove();
            });
            
            this.addListener(menu.querySelector('[data-action="remove"]'), 'click', () => {
                if (card) {
                    const idx = parseInt(card.dataset.index, 10);
                    this._removeNativeVideo(idx).then(success => {
                        if (success) {
                            card.style.transition = 'opacity 0.3s, transform 0.3s';
                            card.style.opacity = '0';
                            card.style.transform = 'scale(0.95)';
                            setTimeout(() => {
                                card.remove();
                                this._updateStatsAfterRemoval();
                            }, 320);
                        } else {
                            card.style.opacity = '';
                            card.style.pointerEvents = '';
                        }
                    });
                    card.style.opacity = '0.4';
                    card.style.pointerEvents = 'none';
                }
                menu.remove();
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
                    this.addListener(document, 'click', this._menuCloseFn);
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

    /**
     * Clicks a native video's three-dot menu and selects "Remove from playlist".
     * Returns a Promise<boolean> — true if the item was found and clicked.
     */
    _removeNativeVideo(nativeIndex) {
        return new Promise(resolve => {
            const ITEM_SEL = 'ytd-playlist-video-renderer, yt-lockup-view-model';
            const nativeVideos = document.querySelectorAll(ITEM_SEL);
            const nativeVideo  = nativeVideos[nativeIndex];
            if (!nativeVideo) return resolve(false);

            // Try multiple action menu selectors (new yt-button-shape + old ytd-menu-renderer)
            const MENU_SELECTORS = [
                'ytd-menu-renderer yt-button-shape button',
                'ytd-menu-renderer button',
                'yt-button-shape button[aria-label="Action menu"]',
                'button[aria-label="Action menu"]',
                '[aria-label="More actions"]',
                'yt-icon-button button',
                'yt-button-shape button' // very generic fallback
            ];
            
            let menuBtn = null;
            for (const sel of MENU_SELECTORS) {
                // To avoid clicking the wrong button (like 'play all'), make sure it's inside the action menu container
                const btn = nativeVideo.querySelector(`ytd-menu-renderer ${sel}, .ytd-menu-renderer ${sel}, ${sel}`);
                if (btn && (btn.getAttribute('aria-label') || '').toLowerCase().includes('action')) {
                    menuBtn = btn;
                    break;
                } else if (btn && !menuBtn) {
                    // Save first match as fallback
                    menuBtn = btn;
                }
            }
            
            if (!menuBtn) return resolve(false);

            // Trigger the menu open
            document.body.click(); // Close any open popup first
            setTimeout(() => {
                menuBtn.click();
                
                // Poll for the popup
                this.utils.pollFor(() => {
                    const popup = document.querySelector(
                        'ytd-menu-popup-renderer, tp-yt-iron-dropdown[aria-expanded="true"], .yt-core-popup'
                    );
                    if (popup) {
                        const items = popup.querySelectorAll(
                            'ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, [role="menuitem"], .yt-core-attributed-string'
                        );
                        for (const item of items) {
                            const text = (item.textContent || '').toLowerCase();
                            // Match 'remove from playlist', 'remove from watch later', 'delete', etc.
                            if (text.includes('remove from') || text.includes('delete from') || text.includes('remove from watch later')) {
                                return item;
                            }
                        }
                    }
                    return null;
                }, 2500, 80).then(item => {
                    if (item) {
                        // For yt-core-attributed-string, we might need to click the parent wrapper
                        const clickTarget = item.closest('[role="menuitem"]') || item.closest('ytd-menu-service-item-renderer') || item;
                        clickTarget.click();
                        setTimeout(() => document.body.click(), 50);
                        resolve(true);
                    } else {
                        // As a last resort: try native three-dot button via keyboard shortcut approach
                        document.body.click();
                        resolve(false);
                    }
                }).catch(() => {
                    document.body.click();
                    resolve(false);
                });
            }, 80);
        });
    }

    // ── Playlist Data Updates ──────────────────────────────────────────────
    _updateStatsAfterRemoval() {
        const root = this.container;
        if (!root) return;
        
        const cards = root.querySelectorAll('.ypp-pl-card');
        
        // 1. Update total videos count text safely across languages
        const statsEl = root.querySelector('.ypp-pl-stats');
        if (statsEl) {
            statsEl.textContent = statsEl.textContent.replace(/\d+/, cards.length);
        }
        
        // 2. Update duration card's video count
        const durRows = root.querySelectorAll('.ypp-pl-duration-row');
        for (const row of durRows) {
            const label = row.querySelector('.ypp-pl-duration-speed');
            if (label && label.textContent === 'Videos') {
                const val = row.querySelector('.ypp-pl-duration-val');
                if (val) val.textContent = cards.length;
            }
        }
        
        // 3. Re-calculate indices & duration safely
        let i = 1;
        let totalSecs = 0;
        
        cards.forEach(card => {
            // Update UI Index
            const indexEl = card.querySelector('.ypp-pl-card-index');
            if (indexEl) indexEl.textContent = i;
            
            // Re-assign dataset index so future removes map correctly to remaining native elements
            card.dataset.index = (i - 1);
            
            // Calculate total time
            const durEl = card.querySelector('.ypp-pl-card-duration');
            if (durEl) {
                const cleanStr = durEl.textContent.replace(/[^0-9:]/g, '');
                const parts = cleanStr.split(':').map(n => parseInt(n, 10));
                if (parts.length === 3) {
                    totalSecs += parts[0] * 3600 + parts[1] * 60 + parts[2];
                } else if (parts.length === 2) {
                    totalSecs += parts[0] * 60 + parts[1];
                } else if (parts.length === 1 && !isNaN(parts[0])) {
                    totalSecs += parts[0];
                }
            }
            
            i++;
        });
        
        // 4. Update duration card's time and speeds
        if (totalSecs >= 0) {
            const fmt = (s) => {
                const h = Math.floor(s / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = s % 60;
                return h > 0
                    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
                    : `${m}:${String(sec).padStart(2,'0')}`;
            };
            
            const timeEl = root.querySelector('.ypp-pl-duration-time');
            if (timeEl) timeEl.textContent = fmt(totalSecs);
            
            const speedUpdates = [
                { label: '1.25×', s: Math.floor(totalSecs / 1.25) },
                { label: '1.5×',  s: Math.floor(totalSecs / 1.5)  },
                { label: '1.75×', s: Math.floor(totalSecs / 1.75) },
                { label: '2×',    s: Math.floor(totalSecs / 2)    },
            ];
            
            for (const row of durRows) {
                const labelEl = row.querySelector('.ypp-pl-duration-speed');
                if (!labelEl) continue;
                const label = labelEl.textContent;
                const update = speedUpdates.find(u => u.label === label);
                if (update) {
                    const val = row.querySelector('.ypp-pl-duration-val');
                    if (val) val.textContent = fmt(update.s);
                }
            }
        }
    }
};
