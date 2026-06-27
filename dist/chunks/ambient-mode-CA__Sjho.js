window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.AmbientMode=class extends window.YPP.features.BaseFeature{constructor(){super("AmbientMode"),this.canvas=null,this.ctx=null,this.animationFrame=null,this.video=null,this.container=null,this.toggleBtn=null}getConfigKey(){return"ambientMode"}async enable(){this.utils.isWatchPage()&&(await super.enable(),this.initDOM(),this.injectToggleButton(),this.startLoop())}async disable(){await super.disable(),this.animationFrame&&(cancelAnimationFrame(this.animationFrame),this.animationFrame=null),this.canvas&&(this.canvas.remove(),this.canvas=null),this.container&&(this.container.remove(),this.container=null),this.toggleBtn&&(this.toggleBtn.remove(),this.toggleBtn=null)}async onUpdate(){var e,n;if(this.isEnabled&&this.canvas&&this.container){const i=((e=this.settings)==null?void 0:e.ambientIntensity)??.6,t=((n=this.settings)==null?void 0:n.ambientBlur)??120;this.container.style.opacity=i;const s=Math.max(1,Math.round(t/20));this.ctx&&(this.ctx.filter=`blur(${s}px) saturate(2.0) brightness(0.85)`)}}async injectToggleButton(){var e,n;try{if(!this.utils.pollFor)return;const i=await this.utils.pollFor(()=>document.querySelector(".ytp-size-button"),1e4,250);if(i&&!document.getElementById("ypp-ambient-toggle")){const t=document.createElement("button");t.id="ypp-ambient-toggle",t.className="ytp-button"+(this.isEnabled?" ypp-ambient-active":""),t.title="Ambient Mode",t.setAttribute("aria-label","Ambient Mode"),t.innerHTML='<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>',this.addListener(t,"click",async()=>{var a,o;const s=!this.isEnabled;s?(await this.enable(),this.isEnabled=!0,t.classList.add("ypp-ambient-active")):(await this.disable(),this.isEnabled=!1,t.classList.remove("ypp-ambient-active"));try{const l={...(await chrome.storage.local.get("settings")).settings||{},ambientMode:s};await chrome.storage.local.set({settings:l})}catch(r){(o=(a=this.utils).log)==null||o.call(a,"Failed to save ambient mode state: "+r.message,"AMBIENT","error")}}),i.parentNode&&(i.parentNode.insertBefore(t,i),this.toggleBtn=t)}}catch(i){(n=(e=this.utils).log)==null||n.call(e,"Failed to inject toggle button: "+i.message,"AMBIENT","error")}}initDOM(){var t,s,a;if(this.video=document.querySelector("video"),!this.video)return;const e=document.querySelector("ytd-watch-flexy");if(!e)return;this.container=document.createElement("div"),this.container.id="ypp-massive-ambient-container",this.container.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 150vh; /* Bleed way down the page */
            z-index: -1; /* Behind all content */
            pointer-events: none;
            overflow: hidden;
            transform: translateZ(0); /* Hardware acceleration */
            opacity: ${((t=this.settings)==null?void 0:t.ambientIntensity)||.6};
            transition: opacity 0.5s ease;
        `,this.canvas=document.createElement("canvas"),this.canvas.id="ypp-massive-ambient-canvas",(s=this.settings)!=null&&s.ambientBlur,this.canvas.style.cssText=`
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%) scale(1.2);
            width: 100vw;
            height: 100vh;
            image-rendering: auto; /* Allow native bilinear stretching */
            mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
        `,this.container.appendChild(this.canvas),e.style.position="relative",e.insertBefore(this.container,e.firstChild),this.ctx=this.canvas.getContext("2d",{alpha:!1,desynchronized:!0});const n=((a=this.settings)==null?void 0:a.ambientBlur)||120,i=Math.max(1,Math.round(n/20));this.ctx.filter=`blur(${i}px) saturate(2.0) brightness(0.85)`}startLoop(){let e=0;const n=1e3/5,i=t=>{if(!this.isEnabled)return;const s=t-e;s>n&&(e=t-s%n,this.video&&!this.video.paused&&!this.video.ended&&this.video.readyState>=2&&!document.hidden&&this.ctx&&this.ctx.drawImage(this.video,0,0,16,16)),this.animationFrame=requestAnimationFrame(i)};this.canvas&&(this.canvas.width=16,this.canvas.height=16),this.animationFrame=requestAnimationFrame(i)}};
