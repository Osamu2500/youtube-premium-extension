window.YPP.features.VideoControls=class extends window.YPP.features.BaseFeature{constructor(){super("VideoControls"),this.panel=null,this.isPanelVisible=!1,this._audioCtx=null,this._gainNode=null,this._compressor=null,this._bassFilter=null,this._midFilter=null,this._trebleFilter=null,this._pannerNode=null,this._sourceNode=null,this._audioConnected=!1}getConfigKey(){return"videoControlsEnabled"}async enable(){var t,s;await super.enable(),(t=this.utils)==null||t.log("Running Video Controls","VideoControls"),(s=this.utils)==null||s.injectCSS("src/content/features/player/video-controls/video-controls.css","ypp-video-controls-css"),this.injectToggle()}async disable(){var s;await super.disable();const t=document.getElementById("ypp-vcp-toggle");t&&t.remove(),this.panel&&(this.panel.remove(),this.panel=null),this._teardownAudio(),(s=this.utils)==null||s.removeStyle("ypp-video-controls-css")}_setupAudio(t){var s,l;if(!this._audioConnected)try{t.__ypp_ctx&&t.__ypp_source?(this._audioCtx=t.__ypp_ctx,this._sourceNode=t.__ypp_source):(this._audioCtx=new(window.AudioContext||window.webkitAudioContext),this._sourceNode=this._audioCtx.createMediaElementSource(t),t.__ypp_ctx=this._audioCtx,t.__ypp_source=this._sourceNode),this._gainNode=this._audioCtx.createGain(),this._gainNode.gain.value=1,this._compressor=this._audioCtx.createDynamicsCompressor(),this._compressor.threshold.value=-24,this._compressor.knee.value=10,this._compressor.ratio.value=4,this._compressor.attack.value=.003,this._compressor.release.value=.25,this._bassFilter=this._audioCtx.createBiquadFilter(),this._bassFilter.type="lowshelf",this._bassFilter.frequency.value=250,this._bassFilter.gain.value=0,this._midFilter=this._audioCtx.createBiquadFilter(),this._midFilter.type="peaking",this._midFilter.frequency.value=1e3,this._midFilter.Q.value=1,this._midFilter.gain.value=0,this._trebleFilter=this._audioCtx.createBiquadFilter(),this._trebleFilter.type="highshelf",this._trebleFilter.frequency.value=4e3,this._trebleFilter.gain.value=0,this._pannerNode=this._audioCtx.createStereoPanner(),this._pannerNode.pan.value=0,this._sourceNode.connect(this._bassFilter).connect(this._midFilter).connect(this._trebleFilter).connect(this._pannerNode).connect(this._compressor).connect(this._gainNode).connect(this._audioCtx.destination),this._audioConnected=!0,(s=this.utils)==null||s.log("Audio engine started","VideoControls")}catch(n){(l=this.utils)==null||l.log("Failed to set up audio engine: "+n.message,"VideoControls","warn")}}_teardownAudio(){try{this._sourceNode&&this._sourceNode.disconnect(),this._bassFilter&&this._bassFilter.disconnect(),this._midFilter&&this._midFilter.disconnect(),this._trebleFilter&&this._trebleFilter.disconnect(),this._pannerNode&&this._pannerNode.disconnect(),this._compressor&&this._compressor.disconnect(),this._gainNode&&this._gainNode.disconnect(),this._audioCtx&&this._audioCtx.close()}catch{}this._audioCtx=null,this._gainNode=null,this._compressor=null,this._pannerNode=null,this._bassFilter=null,this._midFilter=null,this._trebleFilter=null,this._sourceNode=null,this._audioConnected=!1}async injectToggle(){var t;if(this.utils)try{const s=await this.utils.pollFor(()=>document.querySelector(".ytp-right-controls"),1e4,500);if(!this.isEnabled||!s||s.querySelector("#ypp-vcp-toggle"))return;const l=document.createElement("button");l.id="ypp-vcp-toggle",l.className="ytp-button",l.title="Video Controls",l.innerHTML='<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',l.onclick=()=>this.togglePanel();const n=s.querySelector(".ytp-settings-button");s.insertBefore(l,n)}catch{(t=this.utils)==null||t.log("Timeout waiting for .ytp-right-controls","VideoControls","debug")}}togglePanel(){this.panel||this.createPanel(),this.isPanelVisible=!this.isPanelVisible,this.panel.classList.toggle("visible",this.isPanelVisible)}createPanel(){this.panel=document.createElement("div"),this.panel.id="ypp-video-control-panel",this.panel.innerHTML=`
            <div class="ypp-vcp-header" id="ypp-vcp-drag">
                <div class="ypp-vcp-title">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                    Control Center
                </div>
                <button class="ypp-vcp-close">&times;</button>
            </div>
            
            <div class="ypp-vcp-tabs">
                <button class="ypp-vcp-tab active" data-tab="video">🎬 Video</button>
                <button class="ypp-vcp-tab" data-tab="audio">🎧 Audio</button>
            </div>
            
            <!-- 🎬 VIDEO TAB -->
            <div class="ypp-vcp-tab-content active" id="ypp-tab-video">
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Playback Speed</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0.25" max="4" step="0.05" value="1" class="ypp-slider" id="ypp-speed-slider">
                        <span class="ypp-value-display" id="ypp-speed-val">1.0x</span>
                    </div>
                </div>

                <div class="ypp-vcp-divider"></div>
                <div class="ypp-vcp-section-title">Cinematic Filters</div>

                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Brightness</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0" max="200" step="5" value="100" class="ypp-slider" id="ypp-bright-slider">
                        <span class="ypp-value-display" id="ypp-bright-val">100%</span>
                    </div>
                </div>
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Contrast</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0" max="200" step="5" value="100" class="ypp-slider" id="ypp-contrast-slider">
                        <span class="ypp-value-display" id="ypp-contrast-val">100%</span>
                    </div>
                </div>
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Saturation</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="0" max="300" step="5" value="100" class="ypp-slider ypp-slider-accent" id="ypp-sat-slider">
                        <span class="ypp-value-display" id="ypp-sat-val">100%</span>
                    </div>
                </div>
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Hue Shift</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-180" max="180" step="5" value="0" class="ypp-slider ypp-slider-accent" id="ypp-hue-slider">
                        <span class="ypp-value-display" id="ypp-hue-val">0°</span>
                    </div>
                </div>

                <div class="ypp-vcp-actions" style="margin-top: 12px;">
                    <button class="ypp-action-btn" id="ypp-sepia-btn">Sepia</button>
                    <button class="ypp-action-btn" id="ypp-gray-btn">Grayscale</button>
                    <button class="ypp-action-btn" id="ypp-flip-btn">Flip</button>
                    <button class="ypp-action-btn" id="ypp-loop-btn">Loop</button>
                </div>
            </div>

            <!-- 🎧 AUDIO TAB -->
            <div class="ypp-vcp-tab-content" id="ypp-tab-audio">
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label-row">
                        <span class="ypp-vcp-label ypp-label-accent">Volume Booster</span>
                        <span class="ypp-badge" id="ypp-boost-badge">OFF</span>
                    </div>
                    <div class="ypp-slider-container">
                        <input type="range" min="1" max="5" step="0.05" value="1" class="ypp-slider ypp-slider-accent" id="ypp-volume-slider">
                        <span class="ypp-value-display" id="ypp-volume-val">100%</span>
                    </div>
                </div>
                
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label">Stereo Pan</div>
                    <div class="ypp-slider-container">
                        <input type="range" min="-1" max="1" step="0.1" value="0" class="ypp-slider" id="ypp-pan-slider">
                        <span class="ypp-value-display" id="ypp-pan-val">C</span>
                    </div>
                </div>

                <div class="ypp-vcp-divider"></div>
                
                <div class="ypp-vcp-section">
                    <div class="ypp-vcp-label-row">
                        <span class="ypp-vcp-section-title" style="margin:0;">Pro Equalizer</span>
                        <button class="ypp-pill-toggle" id="ypp-enhancer-toggle" aria-pressed="false">OFF</button>
                    </div>
                    <div class="ypp-enhancer-body" id="ypp-enhancer-body">
                        <div class="ypp-vcp-sub-label">Bass</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-bass-slider">
                            <span class="ypp-value-display" id="ypp-bass-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-sub-label">Mid (Vocals)</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-mid-slider">
                            <span class="ypp-value-display" id="ypp-mid-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-sub-label">Treble</div>
                        <div class="ypp-slider-container">
                            <input type="range" min="-12" max="12" step="1" value="0" class="ypp-slider" id="ypp-treble-slider">
                            <span class="ypp-value-display" id="ypp-treble-val">0 dB</span>
                        </div>
                        <div class="ypp-vcp-hint" style="margin-top:8px;">Studio compressor active. Prevents peaking at high volumes.</div>
                    </div>
                </div>
            </div>
            </div>
            
            <div style="text-align: center; margin-top: 8px;">
                 <button class="ypp-action-btn" id="ypp-reset-btn" style="width: 100%;">Reset All</button>
            </div>
        `,document.body.appendChild(this.panel),this.restorePosition(),this.setupListeners(),this.makeDraggable()}setupListeners(){const t=document.querySelector(".html5-main-video")||document.querySelector("video");if(!t)return;const s=this.panel.querySelectorAll(".ypp-vcp-tab"),l=this.panel.querySelectorAll(".ypp-vcp-tab-content");s.forEach(i=>{this.addListener(i,"click",e=>{s.forEach(F=>F.classList.remove("active")),l.forEach(F=>F.classList.remove("active")),i.classList.add("active");const a=`ypp-tab-${i.dataset.tab}`;this.panel.querySelector("#"+a).classList.add("active")})});const n=this.panel.querySelector("#ypp-speed-slider"),g=this.panel.querySelector("#ypp-speed-val");this.addListener(n,"input",i=>{const e=parseFloat(i.target.value);t.playbackRate=e,g.textContent=e+"x"});const p=this.panel.querySelector("#ypp-bright-slider"),d=this.panel.querySelector("#ypp-contrast-slider"),u=this.panel.querySelector("#ypp-sat-slider"),v=this.panel.querySelector("#ypp-hue-slider"),r=this.panel.querySelector("#ypp-sepia-btn"),c=this.panel.querySelector("#ypp-gray-btn"),L=this.panel.querySelector("#ypp-flip-btn"),B=this.panel.querySelector("#ypp-loop-btn"),x=()=>{const i=p.value,e=d.value,a=u.value,F=v.value,z=r.classList.contains("active")?"sepia(100%)":"",H=c.classList.contains("active")?"grayscale(100%)":"",O=L.classList.contains("active");let T=`brightness(${i}%) contrast(${e}%) saturate(${a}%) hue-rotate(${F}deg) ${z} ${H}`.trim(),I=O?"scaleX(-1)":"none";t.style.filter=T,t.style.transform=I,this.panel.querySelector("#ypp-bright-val").textContent=i+"%",this.panel.querySelector("#ypp-contrast-val").textContent=e+"%",this.panel.querySelector("#ypp-sat-val").textContent=a+"%",this.panel.querySelector("#ypp-hue-val").textContent=F+"°",q(p,i,200),q(d,e,200),q(u,a,300),q(v,parseInt(F)+180,360)},q=(i,e,a)=>{i.style.setProperty("--pct",e/a*100+"%")};[p,d,u,v].forEach(i=>{this.addListener(i,"input",x)}),[r,c,L].forEach(i=>{this.addListener(i,"click",e=>{e.currentTarget.classList.toggle("active"),x()})}),this.addListener(B,"click",i=>{i.currentTarget.classList.toggle("active"),t.loop=i.currentTarget.classList.contains("active")}),this.addListener(n,"dblclick",()=>{n.value=1,t.playbackRate=1,g.textContent="1.0x"}),this.addListener(p,"dblclick",()=>{p.value=100,x()}),this.addListener(d,"dblclick",()=>{d.value=100,x()}),this.addListener(u,"dblclick",()=>{u.value=100,x()}),this.addListener(v,"dblclick",()=>{v.value=0,x()});const _=this.panel.querySelector("#ypp-volume-slider"),N=this.panel.querySelector("#ypp-volume-val"),C=this.panel.querySelector("#ypp-boost-badge"),m=this.panel.querySelector("#ypp-pan-slider"),P=this.panel.querySelector("#ypp-pan-val"),f=this.panel.querySelector("#ypp-enhancer-toggle"),V=this.panel.querySelector("#ypp-enhancer-body"),h=this.panel.querySelector("#ypp-bass-slider"),w=this.panel.querySelector("#ypp-bass-val"),y=this.panel.querySelector("#ypp-mid-slider"),k=this.panel.querySelector("#ypp-mid-val"),b=this.panel.querySelector("#ypp-treble-slider"),E=this.panel.querySelector("#ypp-treble-val");let o=!1;V.style.display="none";const S=()=>{this._audioConnected||this._setupAudio(t),this._audioCtx&&this._audioCtx.state==="suspended"&&this._audioCtx.resume()};this.addListener(_,"input",i=>{const e=parseFloat(i.target.value);S(),this._gainNode&&(this._gainNode.gain.value=e),N.textContent=Math.round(e*100)+"%",_.style.setProperty("--pct",(e-1)/4*100+"%");const a=e>1.01;C.textContent=a?Math.round(e*100)+"%":"OFF",C.classList.toggle("active",a)}),this.addListener(_,"dblclick",()=>{_.value=1,this._gainNode&&(this._gainNode.gain.value=1),N.textContent="100%",C.textContent="OFF",C.classList.remove("active"),_.style.setProperty("--pct","0%")}),this.addListener(m,"input",i=>{const e=parseFloat(i.target.value);S(),this._pannerNode&&(this._pannerNode.pan.value=e);let a="C";e<0&&(a=`L ${Math.abs(Math.round(e*100))}%`),e>0&&(a=`R ${Math.round(e*100)}%`),P.textContent=a,m.style.setProperty("--pct",(e+1)/2*100+"%")}),this.addListener(m,"dblclick",()=>{m.value=0,this._pannerNode&&(this._pannerNode.pan.value=0),P.textContent="C",m.style.setProperty("--pct","50%")}),this.addListener(f,"click",()=>{o=!o,f.textContent=o?"ON":"OFF",f.setAttribute("aria-pressed",String(o)),f.classList.toggle("on",o),V.style.display=o?"flex":"none",o?(S(),this._bassFilter&&(this._bassFilter.gain.value=parseFloat(h.value)),this._midFilter&&(this._midFilter.gain.value=parseFloat(y.value)),this._trebleFilter&&(this._trebleFilter.gain.value=parseFloat(b.value)),this._compressor&&(this._compressor.ratio.value=4)):(this._bassFilter&&(this._bassFilter.gain.value=0),this._midFilter&&(this._midFilter.gain.value=0),this._trebleFilter&&(this._trebleFilter.gain.value=0),this._compressor&&(this._compressor.ratio.value=1))}),this.addListener(h,"input",i=>{S();const e=parseInt(i.target.value);this._bassFilter&&o&&(this._bassFilter.gain.value=e),w.textContent=(e>0?"+":"")+e+" dB",h.style.setProperty("--pct",(e+12)/24*100+"%")}),this.addListener(h,"dblclick",()=>{h.value=0,h.dispatchEvent(new Event("input"))}),this.addListener(y,"input",i=>{S();const e=parseInt(i.target.value);this._midFilter&&o&&(this._midFilter.gain.value=e),k.textContent=(e>0?"+":"")+e+" dB",y.style.setProperty("--pct",(e+12)/24*100+"%")}),this.addListener(y,"dblclick",()=>{y.value=0,y.dispatchEvent(new Event("input"))}),this.addListener(b,"input",i=>{S();const e=parseInt(i.target.value);this._trebleFilter&&o&&(this._trebleFilter.gain.value=e),E.textContent=(e>0?"+":"")+e+" dB",b.style.setProperty("--pct",(e+12)/24*100+"%")}),this.addListener(b,"dblclick",()=>{b.value=0,b.dispatchEvent(new Event("input"))});const M=this.panel.querySelector("#ypp-reset-btn");this.addListener(M,"click",()=>{t.playbackRate=1,t.style.filter="",t.style.transform="",t.loop=!1,n.value=1,g.textContent="1.0x",p.value=100,this.panel.querySelector("#ypp-bright-val").textContent="100%",p.style.setProperty("--pct","50%"),d.value=100,this.panel.querySelector("#ypp-contrast-val").textContent="100%",d.style.setProperty("--pct","50%"),u.value=100,this.panel.querySelector("#ypp-sat-val").textContent="100%",u.style.setProperty("--pct","33%"),v.value=0,this.panel.querySelector("#ypp-hue-val").textContent="0°",v.style.setProperty("--pct","50%"),r.classList.remove("active"),c.classList.remove("active"),B.classList.remove("active"),L.classList.remove("active"),_.value=1,N.textContent="100%",_.style.setProperty("--pct","0%"),C.textContent="OFF",C.classList.remove("active"),this._gainNode&&(this._gainNode.gain.value=1),m.value=0,P.textContent="C",m.style.setProperty("--pct","50%"),this._pannerNode&&(this._pannerNode.pan.value=0),o=!1,f.textContent="OFF",f.setAttribute("aria-pressed","false"),f.classList.remove("on"),V.style.display="none",h.value=0,w.textContent="0 dB",h.style.setProperty("--pct","50%"),y.value=0,k.textContent="0 dB",y.style.setProperty("--pct","50%"),b.value=0,E.textContent="0 dB",b.style.setProperty("--pct","50%"),this._bassFilter&&(this._bassFilter.gain.value=0),this._midFilter&&(this._midFilter.gain.value=0),this._trebleFilter&&(this._trebleFilter.gain.value=0),this._compressor&&(this._compressor.ratio.value=1)});const A=this.panel.querySelector(".ypp-vcp-close");this.addListener(A,"click",()=>this.togglePanel())}makeDraggable(){const t=this.panel.querySelector("#ypp-vcp-drag");let s=!1,l,n,g,p;const d=r=>{s=!0,this.panel.classList.add("dragging"),l=r.clientX,n=r.clientY;const c=this.panel.getBoundingClientRect();g=c.left,p=c.top,this.panel.style.right="auto",this.panel.style.bottom="auto",this.panel.style.left=g+"px",this.panel.style.top=p+"px"},u=r=>{if(!s)return;const c=r.clientX-l,L=r.clientY-n;this.panel.style.left=g+c+"px",this.panel.style.top=p+L+"px"},v=()=>{if(s){s=!1,this.panel.classList.remove("dragging");const r=this.panel.style.left,c=this.panel.style.top;localStorage.setItem("ypp-vcp-pos",JSON.stringify({left:r,top:c}))}};this.addListener(t,"mousedown",d),this.addListener(document,"mousemove",u),this.addListener(document,"mouseup",v)}restorePosition(){const t=localStorage.getItem("ypp-vcp-pos");if(t)try{const s=JSON.parse(t);s.left&&s.top&&(this.panel.style.left=s.left,this.panel.style.top=s.top,this.panel.style.right="auto")}catch{}}};
