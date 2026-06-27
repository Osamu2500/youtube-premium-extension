window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.VolumeBoosterUI=class q{static saveVolumeSettings(e){var o,s;if(!this.debouncedSave){const t=((s=(o=window.YPP)==null?void 0:o.Utils)==null?void 0:s.debounce)||((r,i)=>{let p;return(...y)=>{clearTimeout(p),p=setTimeout(()=>r(...y),i)}});this.debouncedSave=t(r=>{var i,p;(p=(i=window.YPP)==null?void 0:i.MainApp)!=null&&p.saveSettings&&window.YPP.MainApp.saveSettings({volumeLevel:r._volumeGain,volumeBalance:r._balance,volumeCompressor:r._compressorEnabled,volumeMono:r._monoEnabled,volumeEqBands:JSON.stringify(r._eqGains)})},300)}this.debouncedSave(e)}static toggleEQPanel(e,o,s){if(e._volumePopup){e._volumePopup.remove(),e._volumePopup=null,s.classList.remove("active"),e._volumePopupOutsideHandler&&(document.removeEventListener("click",e._volumePopupOutsideHandler),e._volumePopupOutsideHandler=null),e._volumePopupEscapeHandler&&(document.removeEventListener("keydown",e._volumePopupEscapeHandler),e._volumePopupEscapeHandler=null);return}this.injectEQStyles(),s.classList.add("active");const t=document.createElement("div");t.id="ypp-eq-panel";const r=!!s.closest(".ypp-global-player-bar");r&&(t.classList.add("ypp-panel-transparent"),t.style.background="rgba(8, 8, 18, 0.62)",t.style.backdropFilter="blur(24px) saturate(160%)",t.style.webkitBackdropFilter="blur(24px) saturate(160%)",t.style.boxShadow="0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",t.style.border="1px solid rgba(255,255,255,0.1)",t.style.width="360px");const i=document.createElement("div");i.className="ypp-eq-header",i.innerHTML=`
            <div class="ypp-eq-title-group">
                <div class="ypp-eq-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                        <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
                    </svg>
                </div>
                <div>
                    <div class="ypp-eq-title">Equalizer</div>
                    <div class="ypp-eq-subtitle">10-Band · Pro Audio Engine</div>
                </div>
            </div>
            <button class="ypp-eq-close-btn" id="ypp-eq-close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        `,t.appendChild(i),i.querySelector("#ypp-eq-close").onclick=()=>this.toggleEQPanel(e,o,s);const p=document.createElement("div");p.className="ypp-eq-gain-row";const y=document.createElement("span");y.className="ypp-eq-gain-value",y.textContent=Math.round(e._volumeGain*100)+"%";const b=document.createElement("input");b.type="range",b.min=1,b.max=6,b.step=.05,b.value=e._volumeGain,b.className="ypp-eq-hslider",b.oninput=n=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume();const a=parseFloat(n.target.value);e.setVolume(a),y.textContent=Math.round(a*100)+"%",s.classList.toggle("active",a>1.01||e._eqGains.some(l=>l!==0)||e._balance!==0),q.saveVolumeSettings(e),this.updateGainTrack(b)},p.innerHTML='<span class="ypp-eq-row-label">Volume Boost</span>',p.appendChild(b),p.appendChild(y),t.appendChild(p),this.updateGainTrack(b);const N=document.createElement("div");N.className="ypp-eq-gain-row";const w=document.createElement("span");w.className="ypp-eq-gain-value",w.textContent=e._balance===0?"C":e._balance<0?"L"+Math.abs(Math.round(e._balance*100)):"R"+Math.round(e._balance*100);const c=document.createElement("input");c.type="range",c.min=-1,c.max=1,c.step=.05,c.value=e._balance,c.className="ypp-eq-hslider ypp-eq-balance-slider",c.oninput=n=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume();const a=parseFloat(n.target.value);e.setBalance(a),w.textContent=a===0?"C":a<0?"L"+Math.abs(Math.round(a*100)):"R"+Math.round(a*100),s.classList.toggle("active",e._volumeGain>1.01||e._eqGains.some(l=>l!==0)||a!==0),this.updateBalanceTrack(c),q.saveVolumeSettings(e)},c.ondblclick=()=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume(),e.setBalance(0),c.value=0,w.textContent="C",this.updateBalanceTrack(c),q.saveVolumeSettings(e)},N.innerHTML='<span class="ypp-eq-row-label">Balance</span>',N.appendChild(c),N.appendChild(w),t.appendChild(N),this.updateBalanceTrack(c);const d=document.createElement("div");d.style.cssText="display:flex;border-bottom:1px solid rgba(255,255,255,0.08);";const u=(n,a)=>{const l=document.createElement("button");l.textContent=n;const h=r?"6px":"10px",v=r?"10px":"12px";return l.style.cssText=`flex:1;padding:${h};background:transparent;border:none;color:${a?"#fff":"rgba(255,255,255,0.45)"};font-size:${v};font-weight:600;cursor:pointer;border-bottom:2px solid ${a?"rgba(255,255,255,0.7)":"transparent"};transition:all 0.2s;font-family:inherit;`,l.onmouseenter=()=>{l.classList.contains("active")||(l.style.color="rgba(255,255,255,0.75)")},l.onmouseleave=()=>{l.classList.contains("active")||(l.style.color="rgba(255,255,255,0.45)")},a&&l.classList.add("active"),l},E=u("Equalizer",!0),C=u("Dynamics",!1),P=u("Spatial",!1);d.append(E,C,P),t.appendChild(d);const x=document.createElement("div");x.className="ypp-eq-presets-row";let f=null;Object.keys(e._presets).forEach(n=>{const a=document.createElement("button");a.className="ypp-eq-preset-btn",a.textContent=n,n==="Flat"&&(a.classList.add("active"),f=a),a.onclick=()=>{e._applyPreset(n),this.syncBandUI(e,t,k),f&&f.classList.remove("active"),a.classList.add("active"),f=a,q.saveVolumeSettings(e)},x.appendChild(a)}),t.appendChild(x);const k=document.createElement("canvas");k.width=r?268:340,k.height=r?52:72,k.className="ypp-eq-canvas";const Y=document.createElement("div");Y.className="ypp-eq-bands",e._bands.forEach((n,a)=>{const l=document.createElement("div");l.className="ypp-eq-band-col";const h=document.createElement("div");h.className="ypp-eq-band-db",h.style.color=n.color;const v=e._eqGains[a];h.textContent=(v>=0?"+":"")+v;const L=document.createElement("div");L.className="ypp-eq-band-track";const F=document.createElement("div");F.className="ypp-eq-band-center";const m=document.createElement("input");m.type="range",m.min=-12,m.max=12,m.step=.5,m.value=e._eqGains[a],m.className="ypp-eq-vslider",m.style.setProperty("--band-color",n.color),m.dataset.band=a,m.oninput=V=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume();const g=parseFloat(V.target.value);e._setEQBand(a,g),h.textContent=(g>=0?"+":"")+g,this.drawCurve(e,k),f&&(f.classList.remove("active"),f=null),q.saveVolumeSettings(e)},m.ondblclick=()=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume(),e._setEQBand(a,0),m.value=0,h.textContent="0",this.drawCurve(e,k),q.saveVolumeSettings(e)};const T=document.createElement("div");T.className="ypp-eq-band-freq",T.textContent=n.label,L.append(F,m),l.append(h,L,T),Y.appendChild(l)});const M=document.createElement("div");M.id="ypp-eq-tab-eq",M.appendChild(k),M.appendChild(Y),t.appendChild(M);const _=document.createElement("div");_.id="ypp-eq-tab-dyn",_.style.display="none",_.style.cssText="padding:16px 18px;display:none;";const S=(n,a,l,h,v,L,F)=>{const m=document.createElement("div");m.style.cssText="display:flex;align-items:center;gap:12px;margin-bottom:14px;";const T=document.createElement("span");T.style.cssText="font-size:10px;font-weight:700;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px;min-width:80px;",T.textContent=n;const V=document.createElement("span");V.style.cssText="font-size:11px;font-weight:800;color:#fff;min-width:36px;text-align:right;",V.textContent=v+L;const g=document.createElement("input");return g.type="range",g.min=a,g.max=l,g.step=h,g.value=v,g.className="ypp-eq-hslider",g.style.flex="1",g.oninput=$=>{V.textContent=$.target.value+L,F(parseFloat($.target.value))},m.append(T,g,V),m};e.compressorNode?(_.appendChild(S("Threshold",-60,0,1,-24,"dB",n=>{e.compressorNode.threshold.value=n})),_.appendChild(S("Ratio",1,20,.5,4,":1",n=>{e.compressorNode.ratio.value=n})),_.appendChild(S("Attack",0,1,.01,.003,"s",n=>{e.compressorNode.attack.value=n})),_.appendChild(S("Release",0,1,.01,.25,"s",n=>{e.compressorNode.release.value=n})),_.appendChild(S("Knee",0,40,1,30,"dB",n=>{e.compressorNode.knee.value=n}))):_.innerHTML='<div style="padding:20px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;">Compressor unavailable — audio not initialised yet.</div>',t.appendChild(_);const B=document.createElement("div");B.id="ypp-eq-tab-spa",B.style.cssText="padding:16px 18px;display:none;";const W=S("Stereo Width",0,200,1,100,"%",n=>{e.setWidth&&e.setWidth(n/100)});B.appendChild(W);const j=S("Mono Mix",0,100,1,0,"%",n=>{e.setMono&&(e.setMono(n>50),q.saveVolumeSettings(e))});B.appendChild(j),t.appendChild(B);const J=[M,_,B],D=[E,C,P];D.forEach((n,a)=>{n.onclick=()=>{D.forEach((l,h)=>{const v=a===h;l.classList.toggle("active",v),l.style.color=v?"#fff":"rgba(255,255,255,0.45)",l.style.borderBottom=`2px solid ${v?"rgba(255,255,255,0.7)":"transparent"}`,J[h].style.display=v?"":"none"})}});const Q=document.createElement("div");Q.className="ypp-eq-footer";const z=document.createElement("button");z.className="ypp-eq-comp-btn"+(e._compressorEnabled?" active":""),z.innerHTML=`
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            Compressor
        `,z.onclick=()=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume(),e._compressorEnabled=!e._compressorEnabled,z.classList.toggle("active",e._compressorEnabled),e.compressorNode&&(e.compressorNode.ratio.value=e._compressorEnabled?4:1,e.compressorNode.threshold.value=e._compressorEnabled?-24:0),q.saveVolumeSettings(e)};const H=document.createElement("button");H.className="ypp-eq-comp-btn"+(e._monoEnabled?" active":""),H.innerHTML=`
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-2-10h4v6h-4z"/>
            </svg>
            Mono
        `,H.onclick=()=>{e.ctx&&e.ctx.state==="suspended"&&e.ctx.resume(),e.setMono(!e._monoEnabled),H.classList.toggle("active",e._monoEnabled),q.saveVolumeSettings(e)};const G=document.createElement("button");G.className="ypp-eq-reset-btn",G.textContent="Reset All",G.onclick=()=>{e._eqGains.fill(0),e._eqNodes.forEach(n=>{n&&(n.gain.value=0)}),this.syncBandUI(e,t,k),f&&f.classList.remove("active"),x.querySelector(".ypp-eq-preset-btn").classList.add("active"),f=x.querySelector(".ypp-eq-preset-btn"),q.saveVolumeSettings(e)};const R=document.createElement("div");if(R.className="ypp-eq-hint",R.textContent="Dbl-click to center/zero",Q.append(z,H,G,R),t.appendChild(Q),r){const n=window.YPP.Utils.getPopupPortal();t.style.pointerEvents="auto",t.style.position="absolute",t.style.overflow="visible",t.style.clip="auto",t.style.clipPath="none",n.appendChild(t);const a=()=>{var h;return(h=window.YPP.Utils)==null?void 0:h.positionPopupBesideVideo(t,s,o,360)};a(),requestAnimationFrame(a);const l=()=>{e._volumePopup?a():window.removeEventListener("resize",l)};window.addEventListener("resize",l,{passive:!0})}else document.body.appendChild(t);e._volumePopup=t;let A=null;const I=()=>{e._volumePopup&&(e.analyserNode&&this.drawCurve(e,k,!0),A=requestAnimationFrame(I))};I(),e.analyserNode||this.drawCurve(e,k);const O=n=>{e._volumePopup&&!e._volumePopup.contains(n.target)&&!s.contains(n.target)&&(A&&cancelAnimationFrame(A),this.toggleEQPanel(e,o,s))};e._volumePopupOutsideHandler=O,setTimeout(()=>document.addEventListener("click",O),0);const U=n=>{n.key==="Escape"&&e._volumePopup&&(A&&cancelAnimationFrame(A),this.toggleEQPanel(e,o,s))};e._volumePopupEscapeHandler=U,document.addEventListener("keydown",U)}static syncBandUI(e,o,s){const t=o.querySelectorAll(".ypp-eq-vslider"),r=o.querySelectorAll(".ypp-eq-band-db");t.forEach((i,p)=>{i.value=e._eqGains[p]}),r.forEach((i,p)=>{const y=e._eqGains[p];i.textContent=(y>=0?"+":"")+y}),e.analyserNode||this.drawCurve(e,s)}static updateGainTrack(e){const o=(parseFloat(e.value)-1)/5*100;e.style.background=`linear-gradient(90deg, rgba(255,255,255,0.85) ${o}%, rgba(255,255,255,0.1) ${o}%)`}static updateBalanceTrack(e){const o=parseFloat(e.value),s=(o+1)/2*100;o<0?e.style.background=`linear-gradient(90deg, rgba(255,255,255,0.1) ${s}%, rgba(255,255,255,0.85) ${s}%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.1) 50%)`:e.style.background=`linear-gradient(90deg, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.85) ${s}%, rgba(255,255,255,0.1) ${s}%)`}static drawCurve(e,o,s=!1){const t=o.getContext("2d"),r=o.width,i=o.height;t.clearRect(0,0,r,i);const p=Math.log10(20),y=Math.log10(2e4),b=13;if(s&&e.analyserNode){const d=e.analyserNode.frequencyBinCount,u=new Uint8Array(d);e.analyserNode.getByteFrequencyData(u),t.fillStyle="rgba(255, 255, 255, 0.15)";const E=r/d*2.5;let C,P=0;for(let x=0;x<d;x++)C=u[x]/255*i,t.fillRect(P,i-C,E-1,C),P+=E}t.strokeStyle="rgba(255,255,255,0.07)",t.lineWidth=1,t.beginPath(),t.moveTo(0,i/2),t.lineTo(r,i/2),t.stroke(),e._bands.forEach(d=>{const u=(Math.log10(d.freq)-p)/(y-p)*r;t.strokeStyle="rgba(255,255,255,0.06)",t.lineWidth=1,t.setLineDash([2,5]),t.beginPath(),t.moveTo(u,0),t.lineTo(u,i),t.stroke(),t.setLineDash([])});const N=d=>{let u=0;return e._bands.forEach((E,C)=>{const P=e._eqGains[C];if(P===0)return;const x=E.type==="peaking"?.85:1.6,f=Math.log2(d/E.freq)/x;u+=P*Math.exp(-f*f*2.2)}),Math.max(-b,Math.min(b,u))},w=[];for(let d=0;d<=r;d++){const u=p+d/r*(y-p),E=N(Math.pow(10,u));w.push([d,i/2-E/b*(i/2-5)])}const c=t.createLinearGradient(0,0,0,i);c.addColorStop(0,"rgba(255, 255, 255, 0.20)"),c.addColorStop(.5,"rgba(255, 255, 255, 0.05)"),c.addColorStop(1,"rgba(255, 255, 255, 0.01)"),t.beginPath(),t.moveTo(0,i/2),w.forEach(([d,u])=>t.lineTo(d,u)),t.lineTo(r,i/2),t.closePath(),t.fillStyle=c,t.fill(),t.beginPath(),t.moveTo(w[0][0],w[0][1]),w.forEach(([d,u])=>t.lineTo(d,u)),t.strokeStyle="rgba(255, 255, 255, 0.85)",t.lineWidth=2.5,t.lineJoin="round",t.stroke()}static injectEQStyles(){if(document.getElementById("ypp-eq-styles"))return;const e=document.createElement("style");e.id="ypp-eq-styles",e.textContent=`
/* ── EQ Panel ── */
#ypp-eq-panel {
    position: fixed;
    bottom: 80px;
    right: 80px;
    width: 380px;
    background: rgba(0, 0, 0, 0.15); /* Fully transparent with heavy blur */
    border: 1px solid rgba(255,255,255,0.15);
    border-top: 1px solid rgba(255,255,255,0.25);
    border-radius: 20px;
    z-index: 2147483646;
    color: #fff;
    font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4),
                inset 0 1px 0 rgba(255,255,255,0.1);
    backdrop-filter: blur(64px) saturate(180%);
    -webkit-backdrop-filter: blur(64px) saturate(180%);
    user-select: none;
    overflow: hidden;
    animation: ypp-eq-in 0.28s cubic-bezier(0.2, 0, 0, 1) forwards;
}
@keyframes ypp-eq-in {
    from { opacity:0; transform:translateY(12px) scale(calc(0.96 * var(--ypp-auto-scale, 1))); }
    to   { opacity:1; transform:translateY(0)   scale(var(--ypp-auto-scale, 1));    }
}

/* Header */
.ypp-eq-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px 13px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
}
.ypp-eq-title-group { display:flex; align-items:center; gap:10px; }
.ypp-eq-icon {
    width: 32px; height: 32px; border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.35);
}
.ypp-eq-title { font-size:14px; font-weight:700; letter-spacing:-0.3px; }
.ypp-eq-subtitle { font-size:10px; color:rgba(255,255,255,0.38); font-weight:500; margin-top:1px; }
.ypp-eq-close-btn {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.7); border-radius: 50%; width:28px; height:28px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; transition: background 0.2s, color 0.2s;
}
.ypp-eq-close-btn:hover { background: rgba(255,255,255,0.14); color:#fff; }

/* Gain Row */
.ypp-eq-gain-row {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ypp-eq-row-label {
    font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45);
    text-transform: uppercase; letter-spacing: 0.6px; min-width: 72px;
}
.ypp-eq-gain-value {
    font-size: 12px; font-weight: 800; color: #ffffff;
    min-width: 40px; text-align: right;
}

/* Horizontal slider */
.ypp-eq-hslider {
    -webkit-appearance: none; appearance: none; flex: 1;
    height: 4px; border-radius: 4px; outline: none; cursor: pointer;
    border: none; transition: height 0.15s ease;
}
.ypp-eq-hslider:hover { height: 6px; }
.ypp-eq-hslider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: #fff; border: 2.5px solid #fff; cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 0 3px rgba(255,255,255,0.2);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
}
.ypp-eq-hslider::-webkit-slider-thumb:hover {
    transform: scale(1.35);
    box-shadow: 0 2px 12px rgba(0,0,0,0.6), 0 0 0 5px rgba(255,255,255,0.3), 0 0 16px rgba(255,255,255,0.4);
}

/* Presets */
.ypp-eq-presets-row {
    display: flex; gap: 6px; padding: 9px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
}
.ypp-eq-presets-row::-webkit-scrollbar { display: none; }
.ypp-eq-preset-btn {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.6); border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 4px 13px;
    font-family: inherit; transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
}
.ypp-eq-preset-btn:hover {
    background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.3); color: #fff;
}
.ypp-eq-preset-btn.active {
    background: rgba(255,255,255,0.25); border-color: rgba(255,255,255,0.5);
    color: #ffffff; box-shadow: 0 0 12px rgba(255,255,255,0.15);
}

/* Canvas */
.ypp-eq-canvas {
    display: block; width: calc(100% - 36px); height: 72px;
    margin: 0 18px 2px; border-radius: 10px;
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
}

/* Band columns */
.ypp-eq-bands {
    display: flex; gap: 0; padding: 6px 14px 12px;
    justify-content: space-between;
}
.ypp-eq-band-col {
    display: flex; flex-direction: column; align-items: center;
    gap: 3px; flex: 1; padding: 0 2px;
}
.ypp-eq-band-db {
    font-size: 9px; font-weight: 800; min-height: 13px; line-height: 1;
}
.ypp-eq-band-track {
    position: relative; height: 80px; width: 100%;
    display: flex; align-items: center; justify-content: center;
}
.ypp-eq-band-center {
    position: absolute; width: 100%; height: 1px;
    background: rgba(255,255,255,0.1); top: 50%; left: 0;
    pointer-events: none;
}
.ypp-eq-band-freq {
    font-size: 9px; color: rgba(255,255,255,0.38); font-weight:600;
}

/* Vertical slider (rotated horizontal) */
.ypp-eq-vslider {
    -webkit-appearance: none; appearance: none;
    width: 80px;
    height: 3px; border-radius: 3px; outline: none; cursor: pointer;
    background: rgba(255,255,255,0.1); border: none;
    transform: rotate(-90deg);
    transform-origin: center;
    position: absolute;
    transition: height 0.1s ease;
}
.ypp-eq-vslider:hover { height: 5px; }
.ypp-eq-vslider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--band-color, #ffffff);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255,255,255,0.3);
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.ypp-eq-vslider::-webkit-slider-thumb:hover { transform: scale(1.45); }

/* Footer */
.ypp-eq-footer {
    display: flex; align-items: center; gap: 8px;
    padding: 0 18px 14px;
}
.ypp-eq-comp-btn {
    display: flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.55); border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 5px 13px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-comp-btn.active {
    background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4);
    color: #ffffff; box-shadow: 0 0 10px rgba(255,255,255,0.15);
}
.ypp-eq-comp-btn:hover { background: rgba(255,255,255,0.1); }
.ypp-eq-reset-btn {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.22);
    color: #ffffff; border-radius: 20px; cursor: pointer;
    font-size: 11px; font-weight: 600; padding: 5px 14px;
    font-family: inherit; transition: all 0.2s ease;
}
.ypp-eq-reset-btn:hover { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.4); }
.ypp-eq-hint {
    font-size: 9px; color: rgba(255,255,255,0.22); margin-left: auto;
}
        `,document.head.appendChild(e)}};window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.VolumeBooster=class extends window.YPP.features.BaseFeature{constructor(){super("VolumeBooster"),this.name="VolumeBooster",this.settings=null,this._audioConnected=!1,this.ctx=null,this.source=null,this.gainNode=null,this.compressorNode=null,this.pannerNode=null,this.analyserNode=null,this._eqNodes=[],this._compressorEnabled=!0,this._monoEnabled=!1,this._eqGains=new Array(10).fill(0),this._volumeGain=1,this._balance=0,this._volumePopup=null,this._volumePopupOutsideHandler=null,this._boundVideo=null,this._initHandler=null,this._bands=[{label:"60",freq:60,type:"lowshelf",color:"#ffffff"},{label:"170",freq:170,type:"peaking",color:"#ffffff"},{label:"310",freq:310,type:"peaking",color:"#ffffff"},{label:"600",freq:600,type:"peaking",color:"#ffffff"},{label:"1k",freq:1e3,type:"peaking",color:"#ffffff"},{label:"3k",freq:3e3,type:"peaking",color:"#ffffff"},{label:"6k",freq:6e3,type:"peaking",color:"#ffffff"},{label:"10k",freq:1e4,type:"peaking",color:"#ffffff"},{label:"14k",freq:14e3,type:"peaking",color:"#ffffff"},{label:"16k",freq:16e3,type:"highshelf",color:"#ffffff"}],this._presets={Flat:[0,0,0,0,0,0,0,0,0,0],"Bass Boost":[8,6,4,2,0,-1,0,0,0,0],Acoustic:[4,4,3,1,1,1,3,4,3,2],Classical:[4,3,2,1,-1,-1,0,2,3,4],Dance:[8,6,3,0,0,-1,-2,-2,0,1],Electronic:[6,5,2,0,-2,1,0,1,4,5],"Lo-Fi":[3,2,0,-2,-4,-4,-3,-2,-1,0],Pop:[-2,-1,1,3,4,4,2,1,0,-1],Rock:[6,4,2,-1,-2,-1,1,3,4,5],Vocal:[-2,-1,0,2,4,4,3,2,1,0],Cinematic:[5,3,1,-1,-2,1,3,4,4,3]}}getConfigKey(){return"enableVolumeBoost"}_loadSettings(e){if(e&&(e.volumeLevel!==void 0&&(this._volumeGain=e.volumeLevel),e.volumeBalance!==void 0&&(this._balance=e.volumeBalance),e.volumeCompressor!==void 0&&(this._compressorEnabled=e.volumeCompressor),e.volumeMono!==void 0&&(this._monoEnabled=e.volumeMono),e.volumeEqBands))try{const o=JSON.parse(e.volumeEqBands);Array.isArray(o)&&o.length===10&&(this._eqGains=o.map(s=>typeof s=="number"?s:0))}catch(o){console.warn("[YPP:VolumeBooster] Failed to parse EQ bands",o)}}enable(e){this.settings={...this.settings,...e},this._loadSettings(this.settings),this.run()}disable(){var o,s,t,r;this._volumePopup&&(this._volumePopup.remove(),this._volumePopup=null,this._volumePopupOutsideHandler&&(document.removeEventListener("click",this._volumePopupOutsideHandler),this._volumePopupOutsideHandler=null),this._volumePopupEscapeHandler&&(document.removeEventListener("keydown",this._volumePopupEscapeHandler),this._volumePopupEscapeHandler=null));const e=((r=(t=(s=(o=this._boundVideo)==null?void 0:o.closest)==null?void 0:s.call(o,"body"))==null?void 0:t.querySelector)==null?void 0:r.call(t,'#ypp-volume-boost-btn[data-vb-id="'+this._id+'"]'))||document.getElementById("ypp-volume-boost-btn");e&&e.remove(),this._boundVideo&&this._initHandler&&(this._boundVideo.removeEventListener("play",this._initHandler),this._boundVideo.removeEventListener("volumechange",this._initHandler),this._initHandler=null),this._audioConnected&&(this.gainNode&&this.gainNode.gain.setTargetAtTime(1,this.ctx.currentTime,.05),this._eqNodes.forEach(i=>{i&&i.gain.setTargetAtTime(0,this.ctx.currentTime,.05)}),this.compressorNode&&(this.compressorNode.ratio.value=1,this.compressorNode.threshold.value=0),this.pannerNode&&this.pannerNode.pan.setTargetAtTime(0,this.ctx.currentTime,.05),this.source&&(this.source.channelCount=2,this.source.channelCountMode="max"))}update(e){this.settings={...this.settings,...e},this._loadSettings(this.settings),this.settings.enableVolumeBoost?(this._audioConnected&&this._restoreAudioState(),this.run()):this.disable()}run(){if(!this.settings||!this.settings.enableVolumeBoost)return;const e=document.querySelector(".html5-main-video")||document.querySelector("video");e&&this.initAudioContext(e)}onPageChange(){if(!this.settings||!this.settings.enableVolumeBoost)return;const e=document.querySelector(".html5-main-video")||document.querySelector("video");e&&this.initAudioContext(e)}initAudioContext(e){this._audioConnected&&this._boundVideo===e||(this._audioConnected&&this._boundVideo&&this._boundVideo!==e&&(this.disable(),this._audioConnected=!1),this._boundVideo=e,this._initHandler=()=>{if(!this._audioConnected)try{if(e.__ypp_ctx&&e.__ypp_source)this.ctx=e.__ypp_ctx,this.source=e.__ypp_source,this.source.disconnect();else{const o=window.AudioContext||window.webkitAudioContext;this.ctx=new o,this.source=this.ctx.createMediaElementSource(e),e.__ypp_ctx=this.ctx,e.__ypp_source=this.source}this._buildAudioGraph(),this._audioConnected=!0,this._restoreAudioState()}catch(o){console.warn("[YPP:VolumeBooster] Audio engine init failed:",o),this._audioConnected=!1}},e.addEventListener("play",this._initHandler,{once:!0}),e.addEventListener("volumechange",this._initHandler,{once:!0}),e.paused||this._initHandler())}_buildAudioGraph(){this._eqNodes=this._bands.map((o,s)=>{const t=this.ctx.createBiquadFilter();return t.type=o.type,t.frequency.value=o.freq,t.gain.value=this._eqGains[s],o.type==="peaking"&&(t.Q.value=1.4),t}),this.pannerNode=this.ctx.createStereoPanner(),this.pannerNode.pan.value=this._balance,this.compressorNode=this.ctx.createDynamicsCompressor(),this._applyCompressorState(),this.gainNode=this.ctx.createGain(),this.gainNode.gain.value=this._volumeGain,this.analyserNode=this.ctx.createAnalyser(),this.analyserNode.fftSize=128,this.analyserNode.smoothingTimeConstant=.85;let e=this.source;this._eqNodes.forEach(o=>{e.connect(o),e=o}),e.connect(this.pannerNode),this.pannerNode.connect(this.compressorNode),this.compressorNode.connect(this.gainNode),this.gainNode.connect(this.analyserNode),this.analyserNode.connect(this.ctx.destination)}_restoreAudioState(){this.setVolume(this._volumeGain),this.setBalance(this._balance),this.setMono(this._monoEnabled),this._applyCompressorState(),this._eqNodes.forEach((e,o)=>{e&&e.gain.setTargetAtTime(this._eqGains[o],this.ctx.currentTime,.05)})}_applyCompressorState(){this.compressorNode&&(this._compressorEnabled?(this.compressorNode.threshold.value=-24,this.compressorNode.knee.value=10,this.compressorNode.ratio.value=4,this.compressorNode.attack.value=.003,this.compressorNode.release.value=.25):(this.compressorNode.threshold.value=0,this.compressorNode.ratio.value=1))}setVolume(e){this._volumeGain=e,this.gainNode&&this.ctx&&this.gainNode.gain.setTargetAtTime(e,this.ctx.currentTime,.05)}setBalance(e){this._balance=e,this.pannerNode&&this.ctx&&this.pannerNode.pan.setTargetAtTime(e,this.ctx.currentTime,.05)}setMono(e){if(this._monoEnabled=e,this.ctx&&this.source)try{this.source.channelCount=e?1:2,this.source.channelCountMode=e?"explicit":"max"}catch{this.source.channelCountMode=e?"explicit":"max"}}_setEQBand(e,o){this._eqGains[e]=o,this._eqNodes[e]&&this.ctx&&this._eqNodes[e].gain.setTargetAtTime(o,this.ctx.currentTime,.05)}_applyPreset(e){const o=this._presets[e];o&&(this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume(),o.forEach((s,t)=>this._setEQBand(t,s)))}createButton(e){const o=`<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="#fff">
            <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z"/>
        </svg>`,s=document.createElement("button");return s.innerHTML=o,s.title="Equalizer",s.className="ypp-action-btn",s.id="ypp-volume-boost-btn",s.onclick=t=>{t.stopPropagation(),window.YPP.features.VolumeBoosterUI&&window.YPP.features.VolumeBoosterUI.toggleEQPanel(this,e,s)},s}};
