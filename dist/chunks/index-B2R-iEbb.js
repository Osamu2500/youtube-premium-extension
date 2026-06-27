window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.AccountMenuData=class{static getAvatarUrl(e,{isActive:r=!1}={}){var h,s,p,u,g;const t=e.querySelector("yt-img-shadow"),n=t==null?void 0:t.getAttribute("src");if(n&&!n.startsWith("data:")&&n!==window.location.href)return n;const c=e.querySelector("img#img, yt-img-shadow img, img"),l=(c==null?void 0:c.getAttribute("src"))||(c==null?void 0:c.src)||"";if(l&&!l.startsWith("data:")&&l!==window.location.href)return l;try{const a=e.data||e.__data;if(a){const o=((h=a.accountPhoto)==null?void 0:h.thumbnails)||((s=a.thumbnail)==null?void 0:s.thumbnails)||((p=a.photo)==null?void 0:p.thumbnails)||a.thumbnails;if(Array.isArray(o)&&o.length){const i=o[o.length-1];if(i!=null&&i.url&&!i.url.startsWith("data:"))return i.url}if((u=a.accountPhoto)!=null&&u.url)return a.accountPhoto.url;if((g=a.thumbnail)!=null&&g.url)return a.thumbnail.url}}catch{}if(r){const a=document.querySelector("#masthead #avatar-btn img,#avatar-btn yt-img-shadow img,#avatar-btn img"),o=(a==null?void 0:a.getAttribute("src"))||(a==null?void 0:a.src)||"";if(o&&!o.startsWith("data:")&&o!==window.location.href)return o}return""}static extractData(e){var l,h,s,p,u,g;const r=[];let t="";const n=e.querySelector("ytd-active-account-header-renderer");if(n){t=((h=(l=n.querySelector("#account-name yt-formatted-string,#account-name span,#account-name"))==null?void 0:l.textContent)==null?void 0:h.trim())||"";const a=((p=(s=n.querySelector("#channel-handle, #account-email, #email"))==null?void 0:s.textContent)==null?void 0:p.trim())||"";r.push({name:t,handle:a,avatar:this.getAvatarUrl(n,{isActive:!0}),isActive:!0})}const c=((u=e.querySelector("#manage-account"))==null?void 0:u.href)||((g=e.querySelector('a[href*="/channel"]'))==null?void 0:g.href)||"/";return e.querySelectorAll("ytd-account-item-renderer, ytd-account-item").forEach((a,o)=>{var f,b,k;const i=a.querySelector("#account-name yt-formatted-string,#account-name span,#account-name,#channel-title yt-formatted-string,#channel-title,#name"),y=((f=i==null?void 0:i.textContent)==null?void 0:f.trim())||"";if(!y)return;const w=((k=(b=a.querySelector("#account-email, #channel-handle"))==null?void 0:b.textContent)==null?void 0:k.trim())||"",v=!!a.querySelector('yt-icon[icon="checked"], [aria-checked="true"]')||!!t&&y===t,d=this.getAvatarUrl(a,{isActive:v}),m=r.find(A=>A.name===y);m?(m.nativeIndex=o,d&&!m.avatar&&(m.avatar=d)):r.push({name:y,handle:w,avatar:d,isActive:v,nativeIndex:o})}),{accounts:r,channelHref:c}}};window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.AccountMenuUI=class{static esc(e){return(e||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}static letterAvatar(e,r,t=!1){var u;const n=(e||"A").trim(),c=((u=Array.from(n)[0])==null?void 0:u.toUpperCase())||"?",h=`hsl(${n.codePointAt(0)*47%360},50%,35%)`,s=Math.round(r*.38);return`<div class="ypp-letter-avatar" style="width:${r}px;height:${r}px;border-radius:50%;background:${h};display:flex;align-items:center;justify-content:center;font-size:${s}px;color:#fff;font-weight:600;font-family:Roboto,Arial,sans-serif;flex-shrink:0;user-select:none;position:relative;${t?"box-shadow:0 0 0 3px #ff4e45,0 0 0 5px rgba(255,78,69,0.25);":""}">${c}</div>`}static diskHTML(e,r,t=!1){const n=e==null?void 0:e.avatar,c=t?"box-shadow:0 0 0 3px #ff4e45,0 0 0 5px rgba(255,78,69,0.25);":"";return n?`<div class="ypp-disk-wrap"
                        data-fallback-name="${this.esc((e==null?void 0:e.name)||"")}"
                        data-size="${r}"
                        data-ring="${t?"1":"0"}"
                        style="width:${r}px;height:${r}px;border-radius:50%;
                               overflow:hidden;flex-shrink:0;position:relative;
                               ${c}">
                       <img class="ypp-disk-img"
                            src="${this.esc(n)}"
                            alt="${this.esc((e==null?void 0:e.name)||"")}"
                            loading="eager"
                            style="width:100%;height:100%;object-fit:cover;display:block;">
                   </div>`:this.letterAvatar(e==null?void 0:e.name,r,t)}static buildMenuHTML(e){const{accounts:r,channelHref:t}=e,n=r.find(y=>y.isActive)||r[0],c=r.filter(y=>!y.isActive),l=88,h=40,s=l*2+h+28,p=c.map((y,w)=>{const x=w/c.length*2*Math.PI-Math.PI/2,v=Math.round(Math.cos(x)*l),d=Math.round(Math.sin(x)*l),m=y.nativeIndex??w,f=(y.name||"").split(" ")[0].substring(0,9);return`<div class="ypp-satellite"
                         data-account-index="${m}"
                         title="${this.esc(y.name)}"
                         role="button"
                         tabindex="0"
                         aria-label="Switch to ${this.esc(y.name)}"
                         style="position:absolute;top:50%;left:50%;
                                transform:translate(calc(-50% + ${v}px),calc(-50% + ${d}px));
                                cursor:pointer;
                                display:flex;flex-direction:column;
                                align-items:center;gap:3px;">
                        ${this.diskHTML(y,h)}
                        <span style="font-size:10px;font-weight:500;
                                     color:rgba(255,255,255,0.7);
                                     max-width:${h+16}px;
                                     overflow:hidden;text-overflow:ellipsis;
                                     white-space:nowrap;line-height:1;
                                     text-align:center;
                                     font-family:Roboto,Arial,sans-serif;
                                     text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                            ${this.esc(f)}
                        </span>
                    </div>`}).join(""),u=`
            <div style="position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%);z-index:2;pointer-events:none;">
                ${this.diskHTML(n,68,!0)}
            </div>`,g=`
            <div class="ypp-orbital-wrap"
                 style="position:relative;width:${s}px;height:${s}px;margin:0 auto;">
                ${p}
                ${u}
            </div>`,a=this.esc(t),o={appearance:'<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/>',settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 9a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 4.6l.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',language:'<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 7.64c-1.38-1.53-3.11-2.6-5.08-3.16.89 1.13 1.55 2.45 1.93 3.86h3.15zm-8.8 3.86h4.88c-.06 1.13-.25 2.22-.56 3.25H9.08c-.31-1.03-.5-2.12-.56-3.25zm.56-4.5h3.76c.21 1.05.34 2.15.34 3.25 0 1.1-.13 2.2-.34 3.25H9.64c-.21-1.05-.34-2.15-.34-3.25 0-1.1.13-2.2.34-3.25zm1.5-6.1c1.55.51 2.92 1.44 3.99 2.65h-3.99V2.9zm-4.66.26c1.07-1.21 2.44-2.14 3.99-2.65v3.41H6.96zM4.64 9.64h3.15c.38-1.41 1.04-2.73 1.93-3.86-1.97.56-3.7 1.63-5.08 3.16v.7z"/>',location:'<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',keyboard:'<path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>',restricted:'<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>',help:'<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',feedback:'<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>',studio:'<path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-3V8l5 3 5-3v6l-5 3z"/>',purchases:'<path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',data:'<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',google:'<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.545,6.477,2.545,12s4.476,10,10,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>'},i=(y,w,x,v=!1,d="")=>`
            <${v?'a href="'+d+'" target="_blank"':'button id="'+y+'"'} class="ypp-menu-item" style="padding: 10px 14px; border-radius: 10px; margin-bottom: 2px;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="${v?"currentColor":"none"}" stroke="currentColor" stroke-width="${v?"0":"2"}" aria-hidden="true" style="opacity:0.8; margin-right: 4px;">
                    ${w}
                </svg>
                ${x}
            </${v?"a":"button"}>
        `;return`
        <div class="ypp-menu-header"
             style="padding:24px 16px 16px;text-align:center;
                    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
                    border-bottom:1px solid rgba(255,255,255,0.06);">
            ${g}
            <div style="margin-top:20px;">
                <div class="ypp-active-name" style="font-size:18px; font-weight:600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${this.esc((n==null?void 0:n.name)||"Account")}</div>
                ${n!=null&&n.handle?`<div class="ypp-active-handle" style="font-size:13px; color: rgba(255,255,255,0.6); margin-top:4px;">${this.esc(n.handle)}</div>`:""}
                <a class="ypp-channel-link"
                   href="${a}"
                   id="ypp-view-channel"
                   style="display:inline-block; margin-top:12px; padding:6px 16px; background:rgba(255,255,255,0.1); border-radius:20px; text-decoration:none; color:#fff; font-size:13px; font-weight:500; transition:background 0.2s;">View channel</a>
            </div>
        </div>

        <div class="ypp-menu-scrollable" style="max-height: 400px; overflow-y: auto; padding: 12px 8px;">
            ${i("ypp-appearance",o.appearance,"Appearance")}
            ${i("ypp-settings",o.settings,"Settings")}
            ${i("ypp-language",o.language,"Language")}
            ${i("ypp-location",o.location,"Location")}
            ${i("ypp-keyboard",o.keyboard,"Keyboard shortcuts")}
            ${i("ypp-restricted",o.restricted,"Restricted Mode")}
            
            <div style="height: 1px; background: rgba(255,255,255,0.06); margin: 8px 12px;"></div>

            <button class="ypp-menu-item ypp-more-toggle" id="ypp-more-toggle"
                    aria-expanded="false" aria-controls="ypp-more-items"
                    style="padding: 10px 14px; border-radius: 10px; color: rgba(255,255,255,0.7);">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="margin-right: 4px;">
                    <circle cx="12" cy="5"  r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
                More options
                <svg class="ypp-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            <div class="ypp-more-items" id="ypp-more-items" role="group" style="margin-left: 8px; border-left: 2px solid rgba(255,255,255,0.05); padding-left: 4px; margin-top: 4px;">
                ${i("",o.studio,"YouTube Studio",!0,"https://studio.youtube.com")}
                ${i("",o.purchases,"Purchases & memberships",!0,"/paid_memberships")}
                ${i("",o.data,"Your data in YouTube",!0,"/account")}
                ${i("",o.google,"Google Account",!0,"https://myaccount.google.com")}
                ${i("ypp-help",o.help,"Help")}
                ${i("ypp-feedback",o.feedback,"Send feedback")}
            </div>
        </div>

        <div class="ypp-menu-footer" style="padding: 12px; background: rgba(0,0,0,0.2);">
            <button class="ypp-menu-item ypp-signout" id="ypp-signout" style="padding: 10px 14px; border-radius: 10px; justify-content: center; background: rgba(255, 78, 69, 0.1); border: 1px solid rgba(255, 78, 69, 0.2); color: #ff4e45; font-weight: 500;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="margin-right: 4px;">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
            </button>
        </div>

        <div class="ypp-signout-confirm" id="ypp-signout-confirm" role="dialog"
             aria-modal="true" aria-labelledby="ypp-confirm-title">
            <div class="ypp-confirm-box">
                <p id="ypp-confirm-title">Sign out of YouTube?</p>
                <div class="ypp-confirm-actions">
                    <button id="ypp-confirm-cancel">Cancel</button>
                    <button id="ypp-confirm-ok" class="danger">Sign out</button>
                </div>
            </div>
        </div>`}};window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.AccountMenu=class extends window.YPP.features.BaseFeature{constructor(){super("AccountMenu"),this._pollTimer=null,this._avatarPollTimer=null,this._observer=null,this._injected=!1,this._pageChangedHandler=null}getConfigKey(){return"enableAccountMenu"}async enable(){var e,r,t;await super.enable();try{(e=window.YPP)!=null&&e.sharedObserver&&window.YPP.sharedObserver.register("account-menu-scanner",'ytd-multi-page-menu-renderer[slot="menu"], tp-yt-iron-dropdown ytd-multi-page-menu-renderer',()=>this._onMutation()),this._pageChangedHandler=()=>this._cleanup(),(r=window.YPP.events)==null||r.on("page:changed",this._pageChangedHandler)}catch(n){(t=this.utils)==null||t.log("Error enabling AccountMenu","ACCOUNT","error",n)}}async disable(){var e,r;await super.disable(),(e=window.YPP)!=null&&e.sharedObserver&&window.YPP.sharedObserver.unregister("account-menu-scanner"),this._pageChangedHandler&&((r=window.YPP.events)==null||r.off("page:changed",this._pageChangedHandler),this._pageChangedHandler=null),this._cleanup()}_onMutation(){if(this._injected)return;const e=this._findMenu();e&&this._startPolling(e)}_findMenu(){const e=document.querySelectorAll('ytd-multi-page-menu-renderer[slot="menu"],tp-yt-iron-dropdown ytd-multi-page-menu-renderer');for(const r of e)if(r.querySelector("ytd-active-account-header-renderer")||r.querySelector("ytd-account-item-renderer"))return r;return null}_startPolling(e){if(this._pollTimer)return;let r=0;const t=80;let n=!1;const c=()=>{if(r++,!e.isConnected||r>t){this._clearPollTimer();return}if(!n){n=!0;const u=Array.from(e.querySelectorAll("ytd-compact-link-renderer, ytd-menu-navigation-item-renderer, tp-yt-paper-item")).find(a=>{const o=a.textContent||"";return/(switch account|cambiar de|切り替える|wechseln|changer de|trocar de|cambia account|zmień konto|byta konto|skift konto|vaihda tili|mudar de|chuyển đổi|ganti akun|сменить аккаунт|змінити обліковий|تبديل الحساب|खाता बदलें)/i.test(o)}),g=e.querySelectorAll("ytd-account-item-renderer, ytd-account-item").length;u&&g===0?(u.click(),this._waitingForAccounts=!0):this._waitingForAccounts=!1}const l=window.YPP.features.AccountMenuData.extractData(e);if(!l.accounts.some(u=>u.name)){this._pollTimer=setTimeout(c,50);return}const s=e.querySelectorAll("ytd-account-item-renderer, ytd-account-item").length,p=l.accounts.filter(u=>!u.isActive).length;if(this._waitingForAccounts&&s===0&&r<40){this._pollTimer=setTimeout(c,50);return}if(s>0&&p===0&&r<40){this._pollTimer=setTimeout(c,50);return}this._clearPollTimer(),this._doInject(e,l)};this._pollTimer=setTimeout(c,30)}_clearPollTimer(){clearTimeout(this._pollTimer),this._pollTimer=null}_clearAvatarPollTimer(){clearTimeout(this._avatarPollTimer),this._avatarPollTimer=null}_doInject(e,r){if(this._injected)return;this._injected=!0,e.dataset.yppRedesigned="1",Array.from(e.children).forEach(n=>{n.classList.contains("ypp-account-menu")||(n.style.position="absolute",n.style.opacity="0",n.style.pointerEvents="none",n.style.zIndex="-1")}),e.querySelectorAll("ytd-account-item-renderer, ytd-account-item").forEach(n=>{n.style.setProperty("position","absolute","important"),n.style.setProperty("top","0","important"),n.style.setProperty("left","0","important")});const t=document.createElement("div");t.className="ypp-account-menu",t.style.cssText="opacity:0;transform:translateY(-6px);transition:opacity 0.2s ease,transform 0.2s ease;",t.innerHTML=window.YPP.features.AccountMenuUI.buildMenuHTML(r),e.appendChild(t),this._wireEvents(t),requestAnimationFrame(()=>{requestAnimationFrame(()=>{t.style.opacity="1",t.style.transform="translateY(0)"})}),this._scheduleAvatarRefresh(t)}_scheduleAvatarRefresh(e){const r=[300,800,1600];let t=0;const n=(l,h,s,p)=>{var o;const u=l.querySelector(".ypp-letter-avatar");if(!u)return;const g=document.createElement("div");g.innerHTML=window.YPP.features.AccountMenuUI.diskHTML(h,s,p);const a=g.firstElementChild;u.replaceWith(a),(o=a==null?void 0:a.querySelector(".ypp-disk-img"))==null||o.addEventListener("error",()=>{const i=document.createElement("div");i.innerHTML=window.YPP.features.AccountMenuUI.letterAvatar(h.name,s,p),a.replaceWith(i.firstElementChild)})},c=()=>{if(!e.isConnected)return;const l=this._findMenu();if(!l)return;if(window.YPP.features.AccountMenuData.extractData(l).accounts.forEach(s=>{if(s.avatar)if(s.isActive){const p=e.querySelector(".ypp-orbital-wrap > div:not(.ypp-satellite)");p&&n(p,s,64,!0)}else{const p=e.querySelector(`.ypp-satellite[title="${CSS.escape(s.name)}"]`);p&&n(p,s,40,!1)}}),t++,t<r.length){const s=r[t]-r[t-1];this._avatarPollTimer=setTimeout(c,s)}};this._avatarPollTimer=setTimeout(c,r[0])}_wireEvents(e){var h,s,p,u,g,a,o,i,y,w,x,v;(h=e.querySelector("#ypp-view-channel"))==null||h.addEventListener("click",()=>this._closeMenu()),(s=e.querySelector("#ypp-appearance"))==null||s.addEventListener("click",()=>{this._closeMenu(),setTimeout(()=>{var d;(d=document.querySelector('ytd-toggle-theme-compact-link-renderer button,[aria-label*="Appearance"]'))==null||d.click()},100)}),(p=e.querySelector("#ypp-settings"))==null||p.addEventListener("click",()=>{this._closeMenu(),window.location.href="/account"});const r=d=>{this._closeMenu(),setTimeout(()=>{const f=Array.from(document.querySelectorAll("ytd-compact-link-renderer, ytd-menu-navigation-item-renderer, ytd-toggle-theme-compact-link-renderer")).find(b=>{const k=(b.textContent||"").toLowerCase(),A=(b.getAttribute("aria-label")||"").toLowerCase();return d.some(S=>k.includes(S)||A.includes(S))});f&&f.click()},100)};(u=e.querySelector("#ypp-language"))==null||u.addEventListener("click",()=>r(["language","idioma","langue","sprache","język"])),(g=e.querySelector("#ypp-location"))==null||g.addEventListener("click",()=>r(["location","ubicación","lieu","standort","lokalizacja"])),(a=e.querySelector("#ypp-restricted"))==null||a.addEventListener("click",()=>r(["restricted","restringido","restreint","eingeschränkt"])),(o=e.querySelector("#ypp-keyboard"))==null||o.addEventListener("click",()=>{this._closeMenu(),setTimeout(()=>{document.dispatchEvent(new KeyboardEvent("keydown",{key:"?",shiftKey:!0,bubbles:!0}))},100)}),(i=e.querySelector("#ypp-help"))==null||i.addEventListener("click",()=>{this._closeMenu(),window.open("https://support.google.com/youtube/","_blank")}),(y=e.querySelector("#ypp-feedback"))==null||y.addEventListener("click",()=>r(["feedback","comentarios","commentaires","feedback"]));const t=e.querySelector("#ypp-more-toggle"),n=e.querySelector("#ypp-more-items"),c=e.querySelector(".ypp-chevron");t&&n&&t.addEventListener("click",()=>{const d=n.classList.toggle("open");t.setAttribute("aria-expanded",String(d)),c&&(c.style.transform=d?"rotate(180deg)":"")});const l=e.querySelector("#ypp-signout-confirm");(w=e.querySelector("#ypp-signout"))==null||w.addEventListener("click",()=>{l&&(l.style.display="flex")}),(x=e.querySelector("#ypp-confirm-cancel"))==null||x.addEventListener("click",()=>{l&&(l.style.display="none")}),(v=e.querySelector("#ypp-confirm-ok"))==null||v.addEventListener("click",()=>{const d=document.querySelector('a[href*="logout"]')||document.querySelector('a[href*="signout"]');d?d.click():window.location.href="https://www.youtube.com/logout"}),e.querySelectorAll(".ypp-disk-img").forEach(d=>{d.addEventListener("error",()=>{const m=d.closest(".ypp-disk-wrap");if(!m)return;const f=m.dataset.fallbackName||"",b=parseInt(m.dataset.size,10)||40,k=m.dataset.ring==="1",A=document.createElement("div");A.innerHTML=window.YPP.features.AccountMenuUI.letterAvatar(f,b,k),m.replaceWith(A.firstElementChild)})}),e.querySelectorAll(".ypp-satellite").forEach(d=>{const m=()=>{var b;const f=parseInt(d.dataset.accountIndex,10);isNaN(f)||(b=document.querySelectorAll("ytd-account-item-renderer")[f])==null||b.click()};d.addEventListener("click",m),d.addEventListener("keydown",f=>{(f.key==="Enter"||f.key===" ")&&(f.preventDefault(),m())})})}_closeMenu(){const e=document.querySelector("tp-yt-iron-overlay-backdrop");if(e){e.click();return}document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:!0}))}_cleanup(){this._clearPollTimer(),this._clearAvatarPollTimer(),this._injected=!1,document.querySelectorAll("[data-ypp-redesigned]").forEach(e=>{var r;Array.from(e.children).forEach(t=>{t.classList.contains("ypp-account-menu")||(t.style.display="",t.style.position="",t.style.opacity="",t.style.pointerEvents="",t.style.zIndex="")}),e.querySelectorAll("ytd-account-item-renderer, ytd-account-item").forEach(t=>{t.style.position="",t.style.top="",t.style.left=""}),delete e.dataset.yppRedesigned,(r=e.querySelector(".ypp-account-menu"))==null||r.remove()})}};
