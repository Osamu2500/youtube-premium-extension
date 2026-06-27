window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.StatsVisualizer=class extends window.YPP.features.BaseFeature{constructor(){super("StatsVisualizer"),this.enabled=!1,this.overlay=null,this.isInitialized=!1,this.isDragging=!1,this.dragOffset={x:0,y:0},this._onMouseMove=this._onMouseMove.bind(this),this._onMouseUp=this._onMouseUp.bind(this),this.STORAGE_PREFIX="ypp_analytics_"}getConfigKey(){return"statsVisualizer"}run(e){this.isInitialized||(this.isInitialized=!0),this.update(e)}update(e){const s=e==null?void 0:e.statsVisualizer;s&&!this.enabled?this._enable():!s&&this.enabled&&this._disable()}_enable(){this.enabled=!0,this._createOverlay(),this._loadAndRender()}_disable(){this.enabled=!1,this.overlay&&(this.overlay.remove(),this.overlay=null),window.removeEventListener("mousemove",this._onMouseMove),window.removeEventListener("mouseup",this._onMouseUp)}async _loadAndRender(){const e=new Date,s=[];for(let a=0;a<30;a++){const o=new Date;o.setDate(e.getDate()-a),s.push(this.STORAGE_PREFIX+o.toISOString().split("T")[0])}let t={};try{t=await chrome.storage.local.get(s)}catch(a){console.warn("[YPP:StatsVisualizer] Storage read failed:",a)}const i=this._aggregate(t,s);this._renderStats(i)}_aggregate(e,s){new Date().toISOString().split("T")[0];let t=0,i=0,a=0,o=0,l=0,d=0,h=!0;const p=[],c={};for(s.forEach((n,r)=>{const v=e[n];if(!v){r<7&&p.unshift(0),h&&r>0&&(h=!1);return}const u=v.totalSeconds||0,b=v.videos?Object.keys(v.videos).length:0;r===0&&(t=u,i=b),r<7&&(a+=u,o+=b,p.unshift(b)),l+=u,h&&u>0?d++:h=!1,r<7&&v.videos&&Object.values(v.videos).forEach(x=>{const m=x.channel||"Unknown";c[m]=(c[m]||0)+(x.seconds||0)})});p.length<7;)p.unshift(0);const y=Object.entries(c).sort((n,r)=>r[1]-n[1]).slice(0,5),f=t-Math.round(t/1.25);return{todaySec:t,todayCount:i,weekSec:a,weekCount:o,monthSec:l,streak:d,dailyCounts:p,topChannels:y,timeSavedSec:f}}_createOverlay(){if(this.overlay)return;this._injectStyles();const e=document.createElement("div");e.id="ypp-stats-viz",e.innerHTML=`
            <div class="ypp-sv-header">
                <div class="ypp-sv-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <span>Watch Analytics</span>
                    <span class="ypp-sv-badge">Live</span>
                </div>
                <button class="ypp-sv-close" id="ypp-sv-close">✕</button>
            </div>

            <div class="ypp-sv-kpi-row">
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-today-time">—</span>
                    <span class="ypp-sv-kpi-label">Today</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-week-time">—</span>
                    <span class="ypp-sv-kpi-label">This Week</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-streak">—</span>
                    <span class="ypp-sv-kpi-label">🔥 Streak</span>
                </div>
                <div class="ypp-sv-kpi">
                    <span class="ypp-sv-kpi-val" id="ypp-sv-saved">—</span>
                    <span class="ypp-sv-kpi-label">Time Saved</span>
                </div>
            </div>

            <div class="ypp-sv-section">
                <div class="ypp-sv-section-label">Videos Per Day — Last 7 Days</div>
                <canvas id="ypp-sv-canvas" width="600" height="80"></canvas>
            </div>

            <div class="ypp-sv-section">
                <div class="ypp-sv-section-label">Top Channels This Week</div>
                <div id="ypp-sv-channels"></div>
            </div>
        `,e.querySelector("#ypp-sv-close").addEventListener("click",()=>this._disable()),e.querySelector(".ypp-sv-header").addEventListener("mousedown",t=>{this.isDragging=!0,e.style.cursor="grabbing",this.dragOffset.x=t.clientX-e.getBoundingClientRect().left,this.dragOffset.y=t.clientY-e.getBoundingClientRect().top}),window.addEventListener("mousemove",this._onMouseMove),window.addEventListener("mouseup",this._onMouseUp),document.body.appendChild(e),this.overlay=e}_onMouseMove(e){!this.isDragging||!this.overlay||(this.overlay.style.left=`${e.clientX-this.dragOffset.x}px`,this.overlay.style.top=`${e.clientY-this.dragOffset.y}px`)}_onMouseUp(){this.isDragging=!1,this.overlay&&(this.overlay.style.cursor="")}_renderStats(e){if(!this.overlay)return;const s=t=>{const i=Math.floor(t/3600),a=Math.floor(t%3600/60);return i>0?`${i}h ${a}m`:`${a}m`};this._set("ypp-sv-today-time",s(e.todaySec)),this._set("ypp-sv-week-time",s(e.weekSec)),this._set("ypp-sv-streak",e.streak>0?`${e.streak}d`:"—"),this._set("ypp-sv-saved",e.timeSavedSec>60?s(e.timeSavedSec):"< 1m"),this._drawBarChart(e.dailyCounts),this._renderChannels(e.topChannels,e.weekSec)}_set(e,s){var i;const t=(i=this.overlay)==null?void 0:i.querySelector(`#${e}`);t&&(t.textContent=s)}_drawBarChart(e){var p;const s=(p=this.overlay)==null?void 0:p.querySelector("#ypp-sv-canvas");if(!s)return;const t=s.getContext("2d"),i=s.width,a=s.height;t.clearRect(0,0,i,a);const o=Math.max(...e,1),l=Math.floor(i/7)-6,d=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],h=(new Date().getDay()+6)%7;e.forEach((c,y)=>{const g=y*(l+6)+3,f=Math.round(c/o*(a-24)),n=a-20-f,r=t.createLinearGradient(0,n,0,n+f);r.addColorStop(0,"rgba(255,255,255,0.85)"),r.addColorStop(1,"rgba(255,255,255,0.15)"),t.fillStyle=r,t.beginPath(),t.roundRect(g,n,l,f,[3,3,0,0]),t.fill();const v=(h-6+y+7)%7;t.fillStyle="rgba(255,255,255,0.4)",t.font="9px Inter, sans-serif",t.textAlign="center",t.fillText(d[v]??"",g+l/2,a-4),c>0&&(t.fillStyle="rgba(255,255,255,0.7)",t.font="10px Inter, sans-serif",t.fillText(c,g+l/2,n-3))})}_renderChannels(e,s){var a,o;const t=(a=this.overlay)==null?void 0:a.querySelector("#ypp-sv-channels");if(!t)return;if(t.innerHTML="",!e.length){t.innerHTML='<span class="ypp-sv-empty">No data yet — start watching!</span>';return}const i=((o=e[0])==null?void 0:o[1])||1;e.forEach(([l,d],h)=>{const p=Math.round(d/i*100),c=s>0?Math.round(d/s*100):0,y=Math.floor(d/3600),g=Math.floor(d%3600/60),f=y>0?`${y}h ${g}m`:`${g}m`,n=document.createElement("div");n.className="ypp-sv-ch-row",n.innerHTML=`
                <span class="ypp-sv-ch-rank">${h+1}</span>
                <div class="ypp-sv-ch-info">
                    <div class="ypp-sv-ch-name">${this._esc(l)}</div>
                    <div class="ypp-sv-ch-bar-wrap">
                        <div class="ypp-sv-ch-bar" style="width:${p}%"></div>
                    </div>
                </div>
                <span class="ypp-sv-ch-time">${f} <span class="ypp-sv-ch-pct">${c}%</span></span>
            `,t.appendChild(n)})}_esc(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}_injectStyles(){if(document.getElementById("ypp-sv-styles"))return;const e=document.createElement("style");e.id="ypp-sv-styles",e.textContent=`
#ypp-stats-viz {
    position: fixed;
    top: 80px; right: 20px;
    width: 380px;
    background: rgba(10,10,18,0.96);
    border: 1px solid rgba(255,255,255,0.10);
    border-top: 1px solid rgba(255,255,255,0.18);
    border-radius: 18px;
    z-index: 99999;
    color: #fff;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06);
    backdrop-filter: blur(40px) saturate(200%);
    -webkit-backdrop-filter: blur(40px) saturate(200%);
    overflow: hidden;
    animation: ypp-sv-in 0.28s cubic-bezier(0.2,0,0,1) forwards;
    user-select: none;
}
@keyframes ypp-sv-in {
    from { opacity:0; transform:translateY(12px) scale(0.96); }
    to   { opacity:1; transform:none; }
}
.ypp-sv-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    cursor: grab;
}
.ypp-sv-title {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700;
}
.ypp-sv-badge {
    background: rgba(62,166,255,0.15); color: #3ea6ff;
    border: 1px solid rgba(62,166,255,0.3);
    border-radius: 6px; padding: 1px 7px;
    font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
}
.ypp-sv-close {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 50%;
    width: 26px; height: 26px; cursor: pointer; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
}
.ypp-sv-close:hover { background: rgba(255,255,255,0.15); color: #fff; }
.ypp-sv-kpi-row {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; padding: 14px 0;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-kpi {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 0 8px; border-right: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-kpi:last-child { border-right: none; }
.ypp-sv-kpi-val {
    font-size: 18px; font-weight: 800; letter-spacing: -0.5px;
}
.ypp-sv-kpi-label {
    font-size: 9px; color: rgba(255,255,255,0.38);
    font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
}
.ypp-sv-section {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-sv-section:last-child { border-bottom: none; }
.ypp-sv-section-label {
    font-size: 9px; color: rgba(255,255,255,0.35);
    font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;
    margin-bottom: 10px;
}
#ypp-sv-canvas {
    width: 100%; height: 80px; display: block; border-radius: 8px;
    background: rgba(255,255,255,0.02);
}
.ypp-sv-ch-row {
    display: flex; align-items: center; gap: 10px;
    padding: 5px 0;
}
.ypp-sv-ch-rank {
    font-size: 11px; font-weight: 800; color: rgba(255,255,255,0.3);
    min-width: 14px; text-align: center;
}
.ypp-sv-ch-info { flex: 1; min-width: 0; }
.ypp-sv-ch-name {
    font-size: 11px; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 4px;
}
.ypp-sv-ch-bar-wrap {
    height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;
}
.ypp-sv-ch-bar {
    height: 100%; background: rgba(255,255,255,0.7); border-radius: 2px;
    transition: width 0.4s cubic-bezier(0.4,0,0.2,1);
}
.ypp-sv-ch-time {
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.7);
    white-space: nowrap;
}
.ypp-sv-ch-pct {
    font-size: 9px; color: rgba(255,255,255,0.3);
    font-weight: 500; margin-left: 3px;
}
.ypp-sv-empty {
    font-size: 11px; color: rgba(255,255,255,0.3); padding: 8px 0; display: block;
}
        `,document.head.appendChild(e)}};
