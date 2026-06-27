window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.StudyMode=class extends window.YPP.features.BaseFeature{getConfigKey(){return"studyMode"}constructor(){super("StudyMode"),this.speedPanel=null,this.controlBtn=null,this.config={speed:1.25,enableCaptions:!0,enforceInterval:5e3},this.SPEED_PRESETS=[.5,.75,1,1.25,1.5,1.75,2],this.loadConfig()}run(e){e.studyMode?this.enable():this.disable()}update(e){this.run(e)}enable(){var e,t;if(!this._isEnabled){this._isEnabled=!0;try{(e=this.utils)==null||e.createToast(`Study Mode: ${this.config.speed}x Speed ${this.config.enableCaptions?"+ Captions":""}`),this._boundEnforceState=()=>this._enforceState(),window.YPP&&window.YPP.sharedObserver&&window.YPP.sharedObserver.register("study-mode-video","video",n=>{const o=n[0];o&&(o.removeEventListener("ratechange",this._boundEnforceState),o.addEventListener("ratechange",this._boundEnforceState),this._enforceState())},!0),this.injectSpeedControl()}catch(n){(t=this.utils)==null||t.log(`Error enabling study mode: ${n.message}`,"STUDY","error")}}}disable(){var e,t;if(this._isEnabled){this._isEnabled=!1;try{window.YPP&&window.YPP.sharedObserver&&window.YPP.sharedObserver.unregister("study-mode-video");const n=document.querySelector("video");n&&this._boundEnforceState&&n.removeEventListener("ratechange",this._boundEnforceState),this.removeUI(),(n==null?void 0:n.playbackRate)===this.config.speed&&(n.playbackRate=1,(e=this.utils)==null||e.createToast("Study Mode Disabled"))}catch(n){(t=this.utils)==null||t.log(`Error disabling study mode: ${n.message}`,"STUDY","error")}}}async injectSpeedControl(){var e;if(this.utils)try{const t=await this.utils.pollFor(()=>document.querySelector(".ytp-right-controls"),1e4,500);if(!t||document.getElementById("ypp-study-btn"))return;const n=document.createElement("button");n.id="ypp-study-btn",n.className="ytp-button",n.title="Study Mode Speed",n.innerHTML=`<span style="font-size: 13px; font-weight: 500; color: #3ea6ff;">${this.config.speed}x</span>`,n.onclick=o=>{o.stopPropagation(),this.toggleSpeedPanel()},t.insertBefore(n,t.firstChild),this.controlBtn=n}catch(t){(e=this.utils)==null||e.log("Failed to inject controls: "+t.message,"STUDY","error")}}toggleSpeedPanel(){this.speedPanel?this.removeSpeedPanel():this.createSpeedPanel()}createSpeedPanel(){const e=document.createElement("div");e.id="ypp-study-panel",e.style.cssText=`
            position: absolute;
            bottom: 50px;
            right: 20px;
            background: rgba(28, 28, 28, 0.98);
            padding: 16px;
            border-radius: 12px;
            z-index: 6000;
            width: 280px;
            color: #fff;
            font-family: Roboto, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            backdropFilter: blur(10px);
        `;const t=document.createElement("div");t.textContent="📚 Study Mode",t.style.cssText="font-size: 15px; font-weight: 500; margin-bottom: 12px;",e.appendChild(t);const n=document.createElement("div");n.style.cssText="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;",this.SPEED_PRESETS.forEach(i=>{const r=document.createElement("button");r.textContent=`${i}x`,r.style.cssText=`
                background: ${this.config.speed===i?"rgba(62, 166, 255, 0.3)":"rgba(255,255,255,0.1)"};
                border: 1px solid ${this.config.speed===i?"#3ea6ff":"rgba(255,255,255,0.2)"};
                color: #fff;
                padding: 6px 4px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            `,r.onclick=()=>this.setSpeed(i),n.appendChild(r)}),e.appendChild(n);const o=document.createElement("div");o.textContent="🎚️ Custom Speed",o.style.cssText="font-size: 12px; color: #ddd; margin-bottom: 8px;",e.appendChild(o);const d=document.createElement("div");d.style.cssText="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;";const s=document.createElement("input");s.type="range",s.min="0.25",s.max="3.0",s.step="0.05",s.value=this.config.speed,s.style.cssText="flex: 1; cursor: pointer;";const c=document.createElement("span");c.textContent=`${this.config.speed}x`,c.style.cssText="font-size: 12px; color: #3ea6ff; font-weight: 500; min-width: 40px;",s.oninput=i=>{const r=parseFloat(i.target.value);c.textContent=`${r}x`,this.setSpeed(r)},d.appendChild(s),d.appendChild(c),e.appendChild(d);const u=document.createElement("div");u.style.cssText="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;",e.appendChild(u);const l=document.createElement("div");l.style.cssText="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;";const h=document.createElement("span");h.textContent="📝 Auto Captions",h.style.cssText="font-size: 12px;";const a=document.createElement("input");a.type="checkbox",a.checked=this.config.enableCaptions,a.style.cursor="pointer",a.onchange=i=>{this.config.enableCaptions=i.target.checked,this.saveConfig(),this.config.enableCaptions&&this._enableCaptions()},l.appendChild(h),l.appendChild(a),e.appendChild(l);const p=document.createElement("button");p.innerHTML="×",p.style.cssText=`
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: #aaa;
            font-size: 24px;
            cursor: pointer;
            width: 20px;
            height: 20px;
            line-height: 16px;
            padding: 0;
        `,p.onclick=()=>this.removeSpeedPanel(),e.appendChild(p),(document.getElementById("movie_player")||document.body).appendChild(e),this.speedPanel=e}removeSpeedPanel(){this.speedPanel&&(this.speedPanel.remove(),this.speedPanel=null)}removeUI(){this.controlBtn&&(this.controlBtn.remove(),this.controlBtn=null),this.removeSpeedPanel()}setSpeed(e){this.config.speed=e,this.saveConfig();const t=document.querySelector("video");t&&(t.playbackRate=e),this.controlBtn&&(this.controlBtn.innerHTML=`<span style="font-size: 13px; font-weight: 500; color: #3ea6ff;">${e}x</span>`),this.speedPanel&&(this.removeSpeedPanel(),this.createSpeedPanel())}_enforceState(){try{const e=document.querySelector("video");e&&(e.playbackRate!==this.config.speed&&(e.playbackRate=this.config.speed),this.config.enableCaptions&&this._enableCaptions())}catch{}}_enableCaptions(){try{const e=document.querySelector(".ytp-subtitles-button");(e==null?void 0:e.getAttribute("aria-pressed"))==="false"&&e.click()}catch{}}async loadConfig(){var e;try{const t=await chrome.storage.local.get("ypp_study_mode");t.ypp_study_mode&&(this.config={...this.config,...t.ypp_study_mode})}catch(t){(e=this.utils)==null||e.log("Failed to load config: "+t.message,"STUDY","error")}}async saveConfig(){var e;try{await chrome.storage.local.set({ypp_study_mode:this.config})}catch(t){(e=this.utils)==null||e.log("Failed to save config: "+t.message,"STUDY","error")}}};
