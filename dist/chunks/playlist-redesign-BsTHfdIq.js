window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.PlaylistRedesign=class extends window.YPP.features.BaseFeature{constructor(){super("PlaylistRedesign"),this.isActive=!1,this.container=null,this.navHandler=null,this._buildTimer=null,this._retryTimer=null,this._retryCount=0,this._currentCols="2",this._menuCloseFn=null,this.MAX_RETRIES=12,this.RETRY_DELAY=800,this.SELECTORS={TITLE:'h1, yt-formatted-string[id="title"], .title',OWNER:'ytd-channel-name a, #owner-text a, a.yt-simple-endpoint[href*="/@"]',STATS:"yt-formatted-string#stats, .metadata-stats",BANNER_IMG:"yt-image img, #thumbnail img, img.yt-img-shadow",VIDEO_TITLE:"a#video-title, yt-formatted-string#video-title, h3 a",VIDEO_URL:'a#video-title, a.yt-simple-endpoint[href*="watch"]',VIDEO_CHANNEL:"ytd-channel-name a, #channel-name a, .ytd-channel-name a",TIME_OVERLAY:"ytd-thumbnail-overlay-time-status-renderer",BADGE_SPAN:'.badge-shape-wiz__text, span[class*="time-status"], span',THUMB_IMG:"ytd-thumbnail img, img#img",INDEX:"#index-container, .index-message-wrapper, yt-formatted-string#index"}}getConfigKey(){return"playlistRedesign"}async enable(){try{chrome.storage.local.get("playlistCols",e=>{e&&e.playlistCols&&(this._currentCols=e.playlistCols)})}catch(e){console.warn("[YPP] Failed to load column preference",e)}this._isPlaylistPage()&&this._tryInit()}onPageChange(){this._reset(),this.isEnabled&&this._isPlaylistPage()&&this._tryInit()}disable(){this._reset()}_isPlaylistPage(){return location.pathname.startsWith("/playlist")||location.search.includes("list=")}_reset(){var e;clearTimeout(this._buildTimer),clearTimeout(this._retryTimer),this._retryCount=0,(e=window.YPP)!=null&&e.sharedObserver&&window.YPP.sharedObserver.unregister("playlist-redesign-scanner"),this._menuCloseFn&&(document.removeEventListener("click",this._menuCloseFn),this._menuCloseFn=null),this.container&&(this.container.remove(),this.container=null),document.querySelectorAll(".ypp-pl-hidden").forEach(t=>{t.classList.remove("ypp-pl-hidden")}),document.body.classList.remove("ypp-playlist-redesign")}async _tryInit(){if(!this._isPlaylistPage())return;if(await window.YPP.Utils.waitFor(()=>document.querySelector("ytd-playlist-header-renderer")&&document.querySelectorAll("ytd-playlist-video-renderer").length>0,1e4)&&this.isEnabled){document.body.classList.add("ypp-playlist-redesign");const t=document.querySelector("ytd-playlist-header-renderer"),n=document.querySelectorAll("ytd-playlist-video-renderer");this._build(t,n),this._watchForChanges()}}_watchForChanges(){var t;if(document.querySelector('ytd-browse[page-subtype="playlist"] #contents')&&(t=window.YPP)!=null&&t.sharedObserver){let n=null;window.YPP.sharedObserver.register("playlist-redesign-scanner","ytd-playlist-video-renderer",()=>{clearTimeout(n),n=setTimeout(()=>{const r=document.querySelector("ytd-playlist-header-renderer"),o=document.querySelectorAll("ytd-playlist-video-renderer");r&&o.length>0&&this.isEnabled&&this._build(r,o)},600)},!1)}}_extractPlaylistData(e,t){var i,c,l,a;const n=((c=(i=e.querySelector(this.SELECTORS.TITLE))==null?void 0:i.textContent)==null?void 0:c.trim())||"Playlist",r=e.querySelector(this.SELECTORS.OWNER),o=((l=r==null?void 0:r.textContent)==null?void 0:l.trim())||"",d=(r==null?void 0:r.href)||"",p=e.querySelector(this.SELECTORS.STATS),h=((a=p==null?void 0:p.textContent)==null?void 0:a.trim())||"";let m="";const v=e.querySelector(this.SELECTORS.BANNER_IMG);v!=null&&v.src&&!v.src.includes("data:")&&(m=v.src);const f=[];t.forEach((y,b)=>{var P,q,R,M,A,O,B,I,V;const u=((q=(P=y.querySelector(this.SELECTORS.VIDEO_TITLE))==null?void 0:P.textContent)==null?void 0:q.trim())||`Video ${b+1}`,S=((R=y.querySelector(this.SELECTORS.VIDEO_URL))==null?void 0:R.href)||"",L=((A=(M=y.querySelector(this.SELECTORS.VIDEO_CHANNEL))==null?void 0:M.textContent)==null?void 0:A.trim())||"";let g="";const C=y.querySelector(this.SELECTORS.TIME_OVERLAY);if(C){const _=C.querySelector(this.SELECTORS.BADGE_SPAN);if(_){const T=(_.innerText||_.textContent||"").replace(/\s+/g,"").trim().match(/(\d{1,3}:\d{2}(?::\d{2})?)/);T&&(g=T[1])}if(!g){const T=(C.getAttribute("aria-label")||"").match(/(\d+:\d{2}(?::\d{2})?)/);T&&(g=T[1])}}let x="";const w=y.querySelector(this.SELECTORS.THUMB_IMG);if(w!=null&&w.src&&!w.src.includes("data:")&&(x=w.src),!x&&S){const _=S.match(/[?&]v=([^&]+)/);_&&(x=`https://i.ytimg.com/vi/${_[1]}/mqdefault.jpg`)}const $=((B=(O=y.querySelector(this.SELECTORS.INDEX))==null?void 0:O.textContent)==null?void 0:B.trim())||String(b+1),E=y.querySelector(((V=(I=window.YPP.CONSTANTS)==null?void 0:I.SELECTORS)==null?void 0:V.WATCHED_OVERLAY)||"ytd-thumbnail-overlay-resume-playback-renderer #progress"),k=E&&parseInt(E.style.width,10)||0;f.push({title:u,href:S,channel:L,duration:g,thumb:x,index:$,progress:k})});let s=0;return f.forEach(y=>{if(y.duration&&y.duration.includes(":")){const u=y.duration.replace(/[^0-9:]/g,"").split(":").map(Number);u.length===3?s+=u[0]*3600+u[1]*60+u[2]:u.length===2&&(s+=u[0]*60+u[1])}}),{title:n,owner:o,ownerHref:d,stats:h,coverUrl:m,videos:f,totalSecs:s}}_formatDur(e){if(!e)return"0:00:00";const t=Math.floor(e/3600),n=Math.floor(e%3600/60),r=e%60;return`${String(t).padStart(2,"0")}:${String(n).padStart(2,"0")}:${String(r).padStart(2,"0")}`}_build(e,t){var p,h,m;const n=this._extractPlaylistData(e,t),r=((h=(p=window.YPP.CONSTANTS)==null?void 0:p.SELECTORS)==null?void 0:h.PLAYLIST)||{};document.querySelectorAll(`
            ${r.TWO_COLUMN||'ytd-browse[page-subtype="playlist"] ytd-two-column-browse-results-renderer'},
            ${r.BROWSE||'ytd-browse[page-subtype="playlist"]'} #header,
            ${r.BROWSE||'ytd-browse[page-subtype="playlist"]'} ${r.HEADER||"ytd-playlist-header-renderer"},
            ${r.BROWSE||'ytd-browse[page-subtype="playlist"]'} ${r.VIDEO_LIST_RENDERER||"ytd-playlist-video-list-renderer"},
            ${r.SECTION_LIST||'ytd-browse[page-subtype="playlist"] #primary > ytd-section-list-renderer'},
            ${r.ITEM_SECTION||'ytd-browse[page-subtype="playlist"] ytd-item-section-renderer'}
        `).forEach(v=>v.classList.add("ypp-pl-hidden")),(m=document.getElementById("ypp-pl-root"))==null||m.remove(),this.container=document.createElement("div"),this.container.id="ypp-pl-root",this.container.innerHTML=this._renderHTML(n);const d=document.querySelector('ytd-browse[page-subtype="playlist"]');d?d.insertBefore(this.container,d.firstChild):document.body.appendChild(this.container),this._wireEvents(n)}_renderHTML(e){const{coverUrl:t}=e;return`
        ${t?`<div class="ypp-pl-ambient-bg" style="background-image: url('${this._esc(t)}')"></div>
               <div class="ypp-pl-ambient-overlay"></div>`:""}
        <div class="ypp-pl-layout">
          ${this._renderSidebar(e)}
          ${this._renderMain(e)}
        </div>`}_renderSidebar(e){const{title:t,owner:n,ownerHref:r,stats:o,coverUrl:d,videos:p,totalSecs:h}=e,m=d?`<img src="${this._esc(d)}" alt="${this._esc(t)}" class="ypp-pl-cover-img" loading="lazy">`:`<div class="ypp-pl-cover-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <path d="M9 18V5l12-2v13"/>
                   <circle cx="6" cy="18" r="3"/>
                   <circle cx="18" cy="16" r="3"/>
                 </svg>
               </div>`,v=n?`<a class="ypp-pl-owner" href="${this._esc(r)}">${this._esc(n)}</a>`:"",f=this._renderDurationCard(h,p.length);return`
          <!-- ── Sidebar ── -->
          <aside class="ypp-pl-sidebar">
            <div class="ypp-pl-cover-wrap">
              ${m}
              <div class="ypp-pl-cover-shimmer"></div>
            </div>

            <div class="ypp-pl-meta">
              <h1 class="ypp-pl-title">${this._esc(t)}</h1>
              ${v}
              <p class="ypp-pl-stats">${this._esc(o)}</p>
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

            <div class="ypp-pl-actions-secondary">
              <button class="ypp-pl-btn-icon" id="ypp-pl-save" title="Save playlist">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
              <button class="ypp-pl-btn-icon" id="ypp-pl-share" title="Share">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button class="ypp-pl-btn-icon" id="ypp-pl-menu" title="Menu">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
              </button>
            </div>

            <button class="ypp-pl-btn-remove-watched" id="ypp-pl-remove-watched">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M9 6V4h6v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Remove Watched Videos
            </button>

            ${f}
          </aside>`}_renderMain(e){const{videos:t}=e,n=t.map((r,o)=>this._renderVideoCard(r,o)).join("");return`
          <!-- ── Video Grid ── -->
          <main class="ypp-pl-main">
            <!-- toolbar: count + column switcher + filter -->
            <div class="ypp-pl-toolbar">
              <span class="ypp-pl-count-label" id="ypp-pl-count">
                ${t.length} VIDEO${t.length!==1?"S":""}
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
              ${n}
            </div>
          </main>`}_renderDurationCard(e,t){if(!e)return"";const n=o=>{const d=Math.floor(o/3600),p=Math.floor(o%3600/60),h=o%60;return d>0?`${d}:${String(p).padStart(2,"0")}:${String(h).padStart(2,"0")}`:`${p}:${String(h).padStart(2,"0")}`},r=[{label:"1.25×",s:Math.floor(e/1.25)},{label:"1.5×",s:Math.floor(e/1.5)},{label:"1.75×",s:Math.floor(e/1.75)},{label:"2×",s:Math.floor(e/2)}];return`
        <div class="ypp-pl-duration-card">
          <div class="ypp-pl-duration-label">TOTAL DURATION</div>
          <div class="ypp-pl-duration-time">${n(e)}</div>
          <div class="ypp-pl-duration-grid">
            ${r.map(o=>`
              <div class="ypp-pl-duration-row">
                <span class="ypp-pl-duration-speed">${o.label}</span>
                <span class="ypp-pl-duration-val">${n(o.s)}</span>
              </div>`).join("")}
            <div class="ypp-pl-duration-row">
              <span class="ypp-pl-duration-speed">Videos</span>
              <span class="ypp-pl-duration-val">${t}</span>
            </div>
          </div>
        </div>`}_renderVideoCard(e,t){const n=e.thumb?`<img src="${this._esc(e.thumb)}" alt="" loading="lazy">`:`<div class="ypp-pl-card-thumb-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <polygon points="23 7 16 12 23 17 23 7"/>
                   <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                 </svg>
               </div>`,r=e.duration?`<div class="ypp-pl-card-duration">${this._esc(e.duration)}</div>`:"",o=e.progress>0?`<div class="ypp-pl-card-progress"><div style="width:${e.progress}%"></div></div>`:"";return`
        <a class="ypp-pl-card" href="${this._esc(e.href)}"
           data-title="${this._esc(e.title.toLowerCase())}" data-index="${t}" data-progress="${e.progress}">
          <div class="ypp-pl-card-thumb">
            <div class="ypp-pl-card-index">${this._esc(e.index)}</div>
            ${n}
            ${r}
            ${o}
          </div>
          <div class="ypp-pl-card-info">
            <div class="ypp-pl-card-title-row">
                <span class="ypp-pl-card-title" title="${this._esc(e.title)}">${this._esc(e.title)}</span>
                <button class="ypp-pl-card-menu" title="More options" data-href="${this._esc(e.href)}">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5"/>
                        <circle cx="12" cy="12" r="1.5"/>
                        <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                </button>
            </div>
            <span class="ypp-pl-card-chan">${this._esc(e.channel)}</span>
          </div>
        </a>`}_wireEvents(e){var o,d,p,h,m,v,f;const t=this.container;(o=t.querySelector("#ypp-pl-play"))==null||o.addEventListener("click",()=>{const s=e.videos[0];s!=null&&s.href&&(window.location.href=s.href)}),(d=t.querySelector("#ypp-pl-shuffle"))==null||d.addEventListener("click",()=>{const s=e.videos.filter(c=>c.href);if(!s.length)return;const i=s[Math.floor(Math.random()*s.length)];window.location.href=i.href}),(p=t.querySelector("#ypp-pl-save"))==null||p.addEventListener("click",()=>{const i=Array.from(document.querySelectorAll("ytd-playlist-header-renderer ytd-toggle-button-renderer button, ytd-playlist-header-renderer ytd-button-renderer button")).find(c=>(c.getAttribute("aria-label")||c.title||"").toLowerCase().includes("save"));i&&i.click()}),(h=t.querySelector("#ypp-pl-share"))==null||h.addEventListener("click",()=>{const i=Array.from(document.querySelectorAll("ytd-playlist-header-renderer ytd-button-renderer button")).find(c=>(c.getAttribute("aria-label")||c.title||"").toLowerCase().includes("share"));i&&i.click()}),(m=t.querySelector("#ypp-pl-menu"))==null||m.addEventListener("click",()=>{const s=document.querySelector("ytd-playlist-header-renderer ytd-menu-renderer button");s&&s.click()}),(v=t.querySelector("#ypp-pl-remove-watched"))==null||v.addEventListener("click",async s=>{const i=s.currentTarget,c=Array.from(t.querySelectorAll(".ypp-pl-card[data-progress]")).filter(a=>parseInt(a.dataset.progress,10)>0);if(!c.length){i.textContent="No watched videos found",setTimeout(()=>{i.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Remove Watched Videos'},2e3);return}i.disabled=!0,i.textContent=`Removing 0 / ${c.length}…`;let l=0;for(const a of c){const y=parseInt(a.dataset.index,10);await this._removeNativeVideo(y)&&(a.style.transition="opacity 0.3s, transform 0.3s",a.style.opacity="0",a.style.transform="scale(0.95)",setTimeout(()=>a.remove(),320),l++,i.textContent=`Removing ${l} / ${c.length}…`),await new Promise(u=>setTimeout(u,800))}i.disabled=!1,i.textContent=l>0?`✓ Removed ${l} video${l!==1?"s":""}`:"None removed",setTimeout(()=>{i.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Remove Watched Videos'},3e3)});const n=t.querySelector("#ypp-pl-grid"),r=s=>{n&&(this._currentCols=String(s),n.className=`ypp-pl-grid ypp-pl-cols-${this._currentCols}`,t.querySelectorAll(".ypp-col-btn").forEach(i=>{i.classList.toggle("active",i.dataset.cols===this._currentCols)}))};t.querySelectorAll(".ypp-col-btn").forEach(s=>{s.addEventListener("click",()=>{const i=s.dataset.cols;r(i);try{chrome.storage.local.set({playlistCols:i})}catch{}})}),r(this._currentCols),(f=t.querySelector("#ypp-pl-filter"))==null||f.addEventListener("input",s=>{const i=s.target.value.toLowerCase().trim();t.querySelectorAll(".ypp-pl-card").forEach(c=>{const l=!i||(c.dataset.title||"").includes(i);c.style.display=l?"":"none"})}),n==null||n.addEventListener("click",s=>{var b,u,S,L;const i=s.target.closest(".ypp-pl-card-menu");if(!i)return;s.preventDefault(),s.stopPropagation(),(b=document.querySelector(".ypp-pl-card-context-menu"))==null||b.remove();const c=i.dataset.href,l=i.closest(".ypp-pl-card"),a=document.createElement("div");a.className="ypp-pl-card-context-menu",a.innerHTML=`
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
            `;const y=i.getBoundingClientRect();a.style.cssText=`
                position: fixed;
                top: ${y.bottom+4}px;
                left: ${y.left-160}px;
                z-index: 99999;
            `,document.body.appendChild(a),(u=a.querySelector('[data-action="open-new"]'))==null||u.addEventListener("click",()=>{window.open(c,"_blank"),a.remove()}),(S=a.querySelector('[data-action="watch-later"]'))==null||S.addEventListener("click",()=>{if(l){const g=parseInt(l.dataset.index,10),x=document.querySelectorAll("ytd-playlist-video-renderer")[g];if(x){const w=x.querySelector("ytd-menu-renderer button");w&&(w.click(),setTimeout(()=>{const $=document.querySelectorAll("ytd-menu-popup-renderer ytd-menu-service-item-renderer");for(const E of $)if((E.textContent||"").toLowerCase().includes("watch later")){E.click();break}document.body.click()},100))}}a.remove()}),(L=a.querySelector('[data-action="remove"]'))==null||L.addEventListener("click",()=>{if(l){const g=parseInt(l.dataset.index,10);this._removeNativeVideo(g).then(C=>{C?(l.style.transition="opacity 0.3s, transform 0.3s",l.style.opacity="0",l.style.transform="scale(0.95)",setTimeout(()=>l.remove(),320)):(l.style.opacity="",l.style.pointerEvents="")}),l.style.opacity="0.4",l.style.pointerEvents="none"}a.remove()}),this._menuCloseFn&&document.removeEventListener("click",this._menuCloseFn),this._menuCloseFn=g=>{a.contains(g.target)||(a.remove(),document.removeEventListener("click",this._menuCloseFn),this._menuCloseFn=null)},setTimeout(()=>{document.body.contains(a)&&document.addEventListener("click",this._menuCloseFn)},0)})}_esc(e){return(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}_removeNativeVideo(e){return new Promise(t=>{const r=document.querySelectorAll("ytd-playlist-video-renderer")[e];if(!r)return t(!1);const o=r.querySelector("ytd-menu-renderer button");if(!o)return t(!1);document.body.click(),setTimeout(()=>{o.click(),this.utils.pollFor(()=>{const d=document.querySelector("ytd-menu-popup-renderer");if(d){const p=d.querySelectorAll("ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer");for(const h of p)if((h.textContent||"").toLowerCase().includes("remove from"))return h}return null},2e3,100).then(d=>{d?(d.click(),setTimeout(()=>document.body.click(),50),t(!0)):t(!1)}).catch(()=>t(!1))},50)})}};
