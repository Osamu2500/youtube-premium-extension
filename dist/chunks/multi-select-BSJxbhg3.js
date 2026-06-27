window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.MultiSelect=class extends window.YPP.features.BaseFeature{constructor(){super("MultiSelect"),this._selected=new Map,this._bound=this._init.bind(this),this._actionBar=null}getConfigKey(){return"multiSelect"}async enable(){var e,t;await super.enable(),this._init(),(e=window.YPP.events)==null||e.on("page:changed",this._bound),(t=window.YPP.events)==null||t.on("dom:nodes-added",this._bound)}async disable(){var e,t,s;await super.disable(),(e=window.YPP.events)==null||e.off("page:changed",this._bound),(t=window.YPP.events)==null||t.off("dom:nodes-added",this._bound),this._clearAll(),(s=this._actionBar)==null||s.remove(),this._actionBar=null}_init(){this._attachCheckboxes()}_getVideoCards(){return document.querySelectorAll("ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer, ytd-grid-video-renderer")}_getVideoData(e){var n,l,a;const t=e.querySelector("a#thumbnail, a.ytd-thumbnail, a#wc-endpoint, a.ytd-playlist-video-renderer"),s=(t==null?void 0:t.href)||"",o=(n=s.match(/[?&]v=([^&]+)/))==null?void 0:n[1],i=((a=(l=e.querySelector("#video-title, h3 a, .title"))==null?void 0:l.textContent)==null?void 0:a.trim())||"";return{videoId:o,href:s,title:i}}_attachCheckboxes(){this._getVideoCards().forEach(e=>{if(e.dataset.yppMultiSelect)return;e.dataset.yppMultiSelect="1";const{videoId:t,href:s,title:o}=this._getVideoData(e);if(!t)return;const i=document.createElement("div");i.className="ypp-ms-checkbox",i.dataset.videoId=t,i.innerHTML=`
                <svg viewBox="0 0 24 24" width="14" height="14" 
                    fill="none" stroke="currentColor" stroke-width="3"
                    class="ypp-ms-check-icon">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;const n=e.querySelector("ytd-thumbnail, #thumbnail");n&&(n.style.position="relative",n.appendChild(i)),i.addEventListener("click",l=>{l.preventDefault(),l.stopPropagation(),this._toggleSelect(e,t,s,o)})})}_toggleSelect(e,t,s,o){var i,n;this._selected.has(t)?(this._selected.delete(t),e.classList.remove("ypp-ms-selected"),(i=e.querySelector(".ypp-ms-checkbox"))==null||i.classList.remove("ypp-ms-checked")):(this._selected.set(t,{title:o,href:s,element:e}),e.classList.add("ypp-ms-selected"),(n=e.querySelector(".ypp-ms-checkbox"))==null||n.classList.add("ypp-ms-checked")),this._updateActionBar()}_clearAll(){this._selected.forEach(({element:e})=>{var t;e.classList.remove("ypp-ms-selected"),(t=e.querySelector(".ypp-ms-checkbox"))==null||t.classList.remove("ypp-ms-checked")}),this._selected.clear(),this._updateActionBar()}_updateActionBar(){var t,s,o,i,n;const e=this._selected.size;if(e===0){(t=this._actionBar)==null||t.remove(),this._actionBar=null;return}this._actionBar||(this._actionBar=document.createElement("div"),this._actionBar.className="ypp-ms-bar",document.body.appendChild(this._actionBar)),this._actionBar.innerHTML=`
            <div class="ypp-ms-bar-info">
                <span class="ypp-ms-count">${e}</span>
                <span class="ypp-ms-label">
                    video${e!==1?"s":""} selected
                </span>
            </div>
            <div class="ypp-ms-bar-actions">
                <button class="ypp-ms-btn" id="ypp-ms-queue">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="21" y2="6"/>
                        <line x1="8" y1="12" x2="21" y2="12"/>
                        <line x1="8" y1="18" x2="21" y2="18"/>
                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                    Add to Queue
                </button>
                <button class="ypp-ms-btn" id="ypp-ms-playlist">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 
                            2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                    </svg>
                    Save to Playlist
                </button>
                <button class="ypp-ms-btn" id="ypp-ms-wl">
                    <svg viewBox="0 0 24 24" width="15" height="15" 
                        fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Watch Later
                </button>
                <button class="ypp-ms-btn ypp-ms-btn-clear" 
                    id="ypp-ms-clear">
                    ✕ Clear
                </button>
            </div>
        `,(s=this._actionBar.querySelector("#ypp-ms-queue"))==null||s.addEventListener("click",()=>this._addToQueue()),(o=this._actionBar.querySelector("#ypp-ms-wl"))==null||o.addEventListener("click",()=>this._addToWatchLater()),(i=this._actionBar.querySelector("#ypp-ms-playlist"))==null||i.addEventListener("click",()=>this._showPlaylistPicker()),(n=this._actionBar.querySelector("#ypp-ms-clear"))==null||n.addEventListener("click",()=>this._clearAll())}_addToQueue(){const e=[...this._selected.values()];e.forEach(({href:t},s)=>{setTimeout(()=>{new URL(t),window.open(t,"_blank")},s*200)}),this._showToast(`${e.length} videos added to queue`),this._clearAll()}_addToWatchLater(){const e=[...this._selected.values()];e.forEach(({element:t})=>{const s=t.querySelector('ytd-menu-renderer button, #button[aria-label*="Action menu"]');s&&(s.click(),setTimeout(()=>{const o=document.querySelector('ytd-menu-service-item-renderer:first-child, [aria-label*="Watch later"], yt-formatted-string:first-child');o==null||o.click()},300))}),this._showToast(`${e.length} videos saved to Watch Later`),this._clearAll()}_showPlaylistPicker(){const e=[...this._selected.values()][0];if(!e)return;const t=e.element.querySelector("ytd-menu-renderer button");t==null||t.click(),setTimeout(()=>{const s=document.querySelector('[aria-label*="Save to playlist"], ytd-menu-service-item-renderer:nth-child(2)');s==null||s.click()},300)}_showToast(e){var t,s;(s=(t=window.YPP.Utils)==null?void 0:t.showToast)!=null&&s.call(t,e)||console.log(`[YPP] ${e}`)}};
