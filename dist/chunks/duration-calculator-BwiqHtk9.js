window.YPP.features=window.YPP.features||{};window.YPP.features.PlaylistDuration=class extends window.YPP.features.BaseFeature{constructor(){super("PlaylistDuration"),this.debounceTimer=null,this.card=null,this._boundCalculate=this.calculateDuration.bind(this)}getConfigKey(){return"playlistDuration"}async enable(){location.pathname.includes("/playlist")&&(await super.enable(),this.calculateDuration(),this.observer.start(),this.observer.register("playlist-duration","ytd-app",()=>{location.pathname.includes("/playlist")&&(clearTimeout(this.debounceTimer),this.debounceTimer=setTimeout(this._boundCalculate,1e3))},!1))}async disable(){await super.disable(),this.observer&&(this.observer.unregister("playlist-duration"),this.observer.stop()),clearTimeout(this.debounceTimer),this.card&&(this.card.remove(),this.card=null)}async calculateDuration(){var t,e,n,a,s,i,y,o,l,u,p,m,b,P,S,A,$,z,R,D,E,I,Y;if(!this.isCalculating){this.isCalculating=!0;try{let g=0,d=0,c=0;const M=Array.from(document.querySelectorAll("script")).find(r=>r.textContent.includes("var ytInitialData ="));if(!M)return this.fallbackCalculate();const q=M.textContent.match(/var ytInitialData = ({.*?});/s);if(!q)return this.fallbackCalculate();let h;try{h=JSON.parse(q[1])}catch{return this.fallbackCalculate()}const j=(s=(a=(n=(e=(t=h==null?void 0:h.header)==null?void 0:t.playlistHeaderRenderer)==null?void 0:e.numVideosText)==null?void 0:n.runs)==null?void 0:a[0])==null?void 0:s.text;j&&(c=parseInt(j.replace(/[^0-9]/g,""),10));const B=($=(A=(S=(P=(b=(m=(p=(u=(l=(o=(y=(i=h==null?void 0:h.contents)==null?void 0:i.twoColumnBrowseResultsRenderer)==null?void 0:y.tabs)==null?void 0:o[0])==null?void 0:l.tabRenderer)==null?void 0:u.content)==null?void 0:p.sectionListRenderer)==null?void 0:m.contents)==null?void 0:b[0])==null?void 0:P.itemSectionRenderer)==null?void 0:S.contents)==null?void 0:A[0])==null?void 0:$.playlistVideoListRenderer;if(!B)return this.fallbackCalculate();let v=B.contents||[];const V=r=>{for(const x of r){const f=x.playlistVideoRenderer;f&&f.lengthSeconds&&(g+=parseInt(f.lengthSeconds,10),d++)}};if(V(v),this.renderCard(g,d,c-d,c),window.YPP.dataApi&&window.YPP.dataApi.apiKey&&v.length>0){let r=v[v.length-1],x=(D=(R=(z=r==null?void 0:r.continuationItemRenderer)==null?void 0:z.continuationEndpoint)==null?void 0:R.continuationCommand)==null?void 0:D.token;for(;x&&d<c;)try{const f=await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${window.YPP.dataApi.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json",...window.YPP.dataApi.getHeaders()||{}},body:JSON.stringify({context:{client:{clientName:"WEB",clientVersion:window.YPP.dataApi.clientVersion||"2.20230101.00.00"}},continuation:x})});if(!f.ok)break;const C=await f.json(),k=C==null?void 0:C.onResponseReceivedActions;if(!k||k.length===0)break;const L=k.find(T=>T.appendContinuationItemsAction);if(!L)break;const w=L.appendContinuationItemsAction.continuationItems;if(!w)break;V(w),this.renderCard(g,d,c-d,c),r=w[w.length-1],x=(Y=(I=(E=r==null?void 0:r.continuationItemRenderer)==null?void 0:E.continuationEndpoint)==null?void 0:I.continuationCommand)==null?void 0:Y.token,await new Promise(T=>setTimeout(T,250))}catch{break}}this.renderCard(g,d,c-d,c)}catch{this.fallbackCalculate()}finally{this.isCalculating=!1}}}fallbackCalculate(){const t=document.querySelectorAll('ytd-playlist-video-renderer ytd-thumbnail-overlay-time-status-renderer, ytd-playlist-video-renderer badge-shape[class*="time-status"]'),e=document.querySelectorAll("ytd-playlist-video-renderer");let n=0,a=0;t.forEach(o=>{const l=o.textContent.trim();if(l&&l.includes(":")){const u=l.replace(/[^0-9:]/g,""),p=this.parseTime(u);p>0&&(n+=p,a++)}});let s=e.length;const i=document.querySelector(".metadata-stats, ytd-playlist-byline-renderer");if(i){const o=i.textContent.match(/([\d,]+)\s+videos/i);o&&(s=parseInt(o[1].replace(/,/g,""),10))}const y=e.length-a;e.length>0&&this.renderCard(n,a,y,s)}parseTime(t){const e=t.split(":").map(Number);return e.length===3?e[0]*3600+e[1]*60+e[2]:e.length===2?e[0]*60+e[1]:e.length===4?e[0]*86400+e[1]*3600+e[2]*60+e[3]:0}formatTimeText(t){if(t===0)return"0s";const e=Math.floor(t/86400),n=Math.floor(t%86400/3600),a=Math.floor(t%3600/60),s=t%60;let i=[];return e>0&&i.push(`<span class="ypp-time-val">${e}</span><span class="ypp-time-lbl">d</span>`),n>0&&i.push(`<span class="ypp-time-val">${n}</span><span class="ypp-time-lbl">h</span>`),(a>0||n>0)&&i.push(`<span class="ypp-time-val">${a}</span><span class="ypp-time-lbl">m</span>`),i.push(`<span class="ypp-time-val">${s}</span><span class="ypp-time-lbl">s</span>`),i.join(" ")}renderCard(t,e,n,a){const s=document.querySelector("ytd-playlist-header-renderer");if(!s)return;if(!this.card){this.card=document.createElement("div"),this.card.id="ypp-playlist-card",this.card.style.cssText=`
                margin-top: 24px;
                background: linear-gradient(145deg, rgba(20, 20, 24, 0.8), rgba(15, 15, 18, 0.9));
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 24px;
                font-family: var(--ypp-font-family, 'Inter', 'Roboto', sans-serif);
                color: #fff;
                width: 100%;
                box-sizing: border-box;
                backdrop-filter: blur(24px) saturate(1.2);
                -webkit-backdrop-filter: blur(24px) saturate(1.2);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
                position: relative;
                overflow: hidden;
            `;const p=document.createElement("div");p.style.cssText=`
                position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                background: radial-gradient(circle at top right, rgba(62, 166, 255, 0.15), transparent 60%);
                pointer-events: none; z-index: 0;
            `,this.card.appendChild(p),this.contentDiv=document.createElement("div"),this.contentDiv.style.cssText="position: relative; z-index: 1;",this.card.appendChild(this.contentDiv);const m=document.createElement("style");m.textContent=`
                .ypp-time-val { font-weight: 700; color: #fff; }
                .ypp-time-lbl { font-weight: 500; color: #aaa; margin-left: 2px; margin-right: 6px; font-size: 0.85em; }
                .ypp-speed-box { background: rgba(255,255,255,0.06); padding: 10px 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
                .ypp-speed-box:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.1); }
                .ypp-speed-lbl { font-size: 11px; color: #aaa; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                .ypp-speed-val { font-size: 14px; }
            `,this.card.appendChild(m);const b=s.querySelector("ytd-playlist-byline-renderer")||s.querySelector(".metadata-action-bar");b?b.parentNode.insertBefore(this.card,b.nextSibling):s.appendChild(this.card)}const i=this.formatTimeText(t),y=this.formatTimeText(Math.floor(t/1.25)),o=this.formatTimeText(Math.floor(t/1.5)),l=this.formatTimeText(Math.floor(t/2));let u="";e<a&&(u=`
                <div style="margin-top: 16px; padding: 10px 14px; background: rgba(255, 171, 0, 0.1); border: 1px solid rgba(255, 171, 0, 0.3); border-radius: 10px; font-size: 12px; color: #ffab00; display: flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <span><strong>Partial calculation:</strong> Scroll down to load all videos. Calculated ${e} of ${a} videos.</span>
                </div>
            `),this.contentDiv.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; color: var(--ypp-accent-color, #3ea6ff); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Total Duration
                    </div>
                    <div style="font-size: 26px; line-height: 1.2;">${i}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 13px; font-weight: 600; color: #fff; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                        ${e} videos
                    </div>
                    ${n>0?`<div style="font-size: 11px; color: #ff4e45; margin-top: 6px; font-weight: 500;">${n} unplayable</div>`:""}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.25x Speed</span>
                    <span class="ypp-speed-val">${y}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 1.50x Speed</span>
                    <span class="ypp-speed-val">${o}</span>
                </div>
                <div class="ypp-speed-box">
                    <span class="ypp-speed-lbl">At 2.00x Speed</span>
                    <span class="ypp-speed-val">${l}</span>
                </div>
            </div>
            
            ${u}
        `}};
