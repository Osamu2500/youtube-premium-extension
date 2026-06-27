window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.HistoryTracker=class extends window.YPP.features.BaseFeature{constructor(){super("HistoryTracker"),this.STORAGE_PREFIX="ypp_analytics_",this.stats={today:{count:0,seconds:0},week:{count:0,seconds:0},month:{count:0,seconds:0},streak:0,topChannel:"-"},this.isExpanded=!1,this.updateInterval=null,this._boundLoadStats=this.loadStats.bind(this),this._boundHandleVisibility=this._handleVisibility.bind(this)}getConfigKey(){return null}async enable(){var t;await super.enable();try{location.pathname==="/feed/history"&&this._mountAndStart()}catch(e){(t=this.utils)==null||t.log("Error enabling HistoryTracker","HISTORY","error",e)}}async disable(){await super.disable(),this._stopAndUnmount()}onPageChange(t){this.isEnabled&&(location.pathname==="/feed/history"?this._mountAndStart():this._stopAndUnmount())}_mountAndStart(){this.mountUI(),this.loadStats(),this._boundStorageChange||(this._boundStorageChange=(t,e)=>{if(e==="local"){for(let a in t)if(a.startsWith(this.STORAGE_PREFIX)){document.hidden||this.loadStats();break}}},chrome.storage.onChanged.addListener(this._boundStorageChange)),this.addListener(window,"focus",this._boundLoadStats),this.addListener(document,"visibilitychange",this._boundHandleVisibility)}_stopAndUnmount(){this._boundStorageChange&&(chrome.storage.onChanged.removeListener(this._boundStorageChange),this._boundStorageChange=null);const t=document.getElementById("ypp-history-tracker-widget");t&&t.remove(),this.isExpanded=!1}_handleVisibility(){document.hidden||this.loadStats()}mountUI(){const t=document.querySelector('ytd-browse[page-subtype="history"] #primary');if(!t){setTimeout(()=>this.mountUI(),500);return}if(!document.getElementById("ypp-history-tracker-widget")){const e=this.createWidget();t.insertBefore(e,t.firstChild),this.injectComponentStyles(),this.updateWidgetValues()}}async loadStats(){const t=new Date,e=r=>{const o=r.getFullYear(),i=String(r.getMonth()+1).padStart(2,"0"),f=String(r.getDate()).padStart(2,"0");return this.STORAGE_PREFIX+`${o}-${i}-${f}`},a=[];for(let r=0;r<31;r++){const o=new Date;o.setDate(t.getDate()-r),a.push(e(o))}const n=await chrome.storage.local.get(a);let s=0,d=0,l=0,c=0,g=0,b=0;const h=e(t);a.forEach((r,o)=>{const i=n[r];if(!i)return;const f=i.totalSeconds||0,m=i.videos?Object.keys(i.videos).length:0;o===0&&(s=m,d=f),o<7&&(l+=m,c+=f),g+=m,b+=f}),this._calculateStreak(t,e);let y="-",p=0;const u=n[h];if(u!=null&&u.videos){const r={};Object.values(u.videos).forEach(o=>{const i=o.channel||"Unknown";r[i]||(r[i]=0),r[i]+=o.seconds}),Object.entries(r).forEach(([o,i])=>{i>p&&o!=="Unknown Channel"&&(p=i,y=o)})}this.stats={today:{count:s,seconds:d},week:{count:l,seconds:c},month:{count:g,seconds:b},streak:this.stats.streak,topChannel:y},this.updateWidgetValues()}async _calculateStreak(t,e){var l;let a=0,n=!0,s=0;for(;s<365;){const c=new Date;c.setDate(t.getDate()-s);const g=e(c),h=(await chrome.storage.local.get([g]))[g],y=(h==null?void 0:h.totalSeconds)>0;if(n){if(y)a=1,s++;else{const p=new Date;if(p.setDate(t.getDate()-1),((l=(await chrome.storage.local.get([e(p)]))[e(p)])==null?void 0:l.totalSeconds)>0)a=0,s=1;else break}n=!1}else if(y)a++,s++;else break}this.stats.streak=a;const d=document.getElementById("ypp-stats-streak");d&&(d.textContent=a)}createWidget(){const t=document.createElement("div");return t.id="ypp-history-tracker-widget",t.className="ypp-glass-panel",t.innerHTML=`
            <div class="ypp-tracker-header">
                <div class="ypp-tracker-title">
                    <h2>Personal Analytics</h2>
                    <span class="ypp-badge pulse">Live</span>
                </div>
                <div class="ypp-streak-badge" title="Consecutive Days Watched">
                    <span class="fire-icon">🔥</span>
                    <span id="ypp-stats-streak">0</span> <span style="font-size: 10px; opacity: 0.8; margin-left: 2px;">Day Streak</span>
                </div>
                <button id="ypp-tracker-toggle" class="ypp-icon-btn" aria-label="Toggle Details">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>
            
            <div class="ypp-tracker-grid" id="ypp-tracker-content">
                <div class="ypp-stat-card primary">
                    <span class="label">Videos Today</span>
                    <span class="value" id="ypp-stats-today-count">-</span>
                </div>
                <div class="ypp-stat-card primary">
                    <span class="label">Watch Time Today</span>
                    <span class="value" id="ypp-stats-today-time">-</span>
                </div>

                <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 7 Days</span>
                    <span class="value" id="ypp-stats-week-time">-</span>
                </div>
                <div class="ypp-stat-card secondary hidden">
                    <span class="label">Last 30 Days</span>
                    <span class="value" id="ypp-stats-month-time">-</span>
                </div>

                <div class="ypp-stat-card secondary hidden full-width premium-card">
                     <span class="label">Top Channel (Today)</span>
                     <span class="value text-value" id="ypp-stats-top-channel">-</span>
                </div>
            </div>
        `,t.querySelector("#ypp-tracker-toggle").addEventListener("click",()=>{this.isExpanded=!this.isExpanded,this.toggleExpand()}),t}injectComponentStyles(){if(document.getElementById("ypp-tracker-styles"))return;const t=document.createElement("style");t.id="ypp-tracker-styles",t.textContent=`
            #ypp-history-tracker-widget {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                margin: 24px auto 32px auto;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                max-width: 1000px;
                transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                color: #fff;
                font-family: "YouTube Sans", "Inter", sans-serif;
            }
            .ypp-tracker-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .ypp-tracker-title {
                display: flex;
                align-items: center;
            }
            .ypp-tracker-title h2 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                margin-right: 12px;
                letter-spacing: -0.5px;
            }
            .ypp-badge {
                background: rgba(255, 78, 69, 0.15);
                color: #ff4e45;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border: 1px solid rgba(255, 78, 69, 0.3);
            }
            .ypp-badge.pulse {
                animation: pulse-badge 2s infinite;
            }
            @keyframes pulse-badge {
                0% { box-shadow: 0 0 0 0 rgba(255, 78, 69, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(255, 78, 69, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 78, 69, 0); }
            }
            .ypp-streak-badge {
                display: flex;
                align-items: center;
                background: linear-gradient(135deg, rgba(255,152,0,0.2) 0%, rgba(255,87,34,0.2) 100%);
                border: 1px solid rgba(255,152,0,0.3);
                padding: 6px 16px;
                border-radius: 20px;
                margin-left: auto;
                margin-right: 16px;
            }
            .ypp-streak-badge .fire-icon {
                margin-right: 6px;
                font-size: 16px;
            }
            .ypp-streak-badge span:nth-child(2) {
                color: #ff9800;
                font-weight: 800;
                font-size: 15px;
            }
            .ypp-tracker-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                padding: 24px;
                transition: all 0.4s ease;
            }
            .ypp-tracker-grid.expanded {
                grid-template-columns: repeat(4, 1fr);
            }
            .ypp-stat-card {
                background: rgba(255,255,255,0.03);
                padding: 24px 16px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid rgba(255,255,255,0.05);
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .ypp-stat-card:hover {
                background: rgba(255,255,255,0.06);
                transform: translateY(-4px);
                border-color: rgba(255,255,255,0.15);
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            }
            .ypp-stat-card.full-width {
                grid-column: 1 / -1; 
                flex-direction: row;
                justify-content: space-between;
                align-items: center;
                padding: 16px 32px;
            }
            .ypp-stat-card.premium-card {
                background: linear-gradient(135deg, rgba(62,166,255,0.05) 0%, rgba(156,39,176,0.05) 100%);
                border: 1px solid rgba(62,166,255,0.2);
            }
            .ypp-stat-card .label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: #aaa;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .ypp-stat-card.full-width .label {
                margin-bottom: 0;
            }
            .ypp-stat-card .value {
                font-size: 32px;
                font-weight: 800;
                color: #fff;
                letter-spacing: -1px;
            }
            .ypp-stat-card .value.text-value {
                font-size: 20px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 60%;
                color: #3ea6ff;
            }
            .hidden { display: none !important; }
            
            #ypp-tracker-toggle {
                background: rgba(255,255,255,0.1);
                border: none;
                color: #fff;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 36px; height: 36px;
                display: flex; align-items: center; justify-content: center;
                border-radius: 50%;
            }
            #ypp-tracker-toggle:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.05);
            }
            #ypp-tracker-toggle svg {
                transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            #ypp-tracker-toggle.rotated svg {
                transform: rotate(180deg);
            }

            /* Responsive Adjustments */
            @media (max-width: 800px) {
                .ypp-tracker-grid.expanded {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `,document.head.appendChild(t)}toggleExpand(){const t=document.getElementById("ypp-tracker-content"),e=document.getElementById("ypp-tracker-toggle"),a=document.querySelectorAll(".ypp-stat-card.secondary");this.isExpanded?(t.classList.add("expanded"),a.forEach(n=>n.classList.remove("hidden")),e.classList.add("rotated")):(t.classList.remove("expanded"),a.forEach(n=>n.classList.add("hidden")),e.classList.remove("rotated"))}updateWidgetValues(){const t=a=>{const n=Math.floor(a/86400),s=Math.floor(a%86400/3600),d=Math.floor(a%3600/60);return n>0?`${n}d ${s}h`:s>0?`${s}h ${d}m`:`${d}m`},e=(a,n)=>{const s=document.getElementById(a);s&&(s.textContent=n)};e("ypp-stats-today-count",this.stats.today.count),e("ypp-stats-today-time",t(this.stats.today.seconds)),e("ypp-stats-week-time",t(this.stats.week.seconds)),e("ypp-stats-month-time",t(this.stats.month.seconds)),e("ypp-stats-streak",this.stats.streak||0),e("ypp-stats-top-channel",this.stats.topChannel||"-")}};
