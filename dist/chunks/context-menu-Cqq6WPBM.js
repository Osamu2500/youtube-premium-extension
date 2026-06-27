window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.ContextMenu=class extends window.YPP.features.BaseFeature{getConfigKey(){return"contextMenu"}constructor(){super("contextMenu"),this.isActive=!1,this.observer=window.YPP.sharedObserver||new window.YPP.Utils.DOMObserver}enable(e){var n;if(!this.isActive){this.isActive=!0;try{this.init()}catch(t){(n=this.utils)==null||n.log("Error enabling ContextMenu","CONTEXTMENU","error",t)}}}disable(){this.isActive&&(this.isActive=!1,this.observer.unregister("context-menu-cards"),this.observer.unregister("context-menu-header"),this.observer.stop(),document.querySelectorAll(".ypp-add-to-group-btn").forEach(e=>e.remove()))}update(e){}run(e){this.enable(e)}init(){this.observer.start(),this.observer.register("context-menu-cards","ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer",e=>{this.isActive&&e.forEach(n=>this.injectButton(n))}),this.observer.register("context-menu-header","#inner-header-container #buttons",()=>{this.isActive&&window.YPP.Utils.isChannelPage()&&this.injectChannelHeaderButton()})}injectButton(e){if(e.querySelector(".ypp-add-to-group-btn"))return;const n=e.querySelector("#metadata-line")||e.querySelector(".ytd-video-meta-block");if(!n)return;const t=document.createElement("button");t.className="ypp-add-to-group-btn",t.textContent="+",t.title="Add to Group",t.style.cssText=`
            margin-left: 8px;
            background: transparent;
            border: 1px solid currentColor;
            color: var(--yt-spec-text-secondary);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 14px;
            line-height: 1;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        `,t.onmouseenter=()=>t.style.opacity="1",t.onmouseleave=()=>t.style.opacity="0.6",t.onclick=o=>{o.stopPropagation(),o.preventDefault(),this.handleCardClick(e,o)},n.appendChild(t)}injectChannelHeaderButton(){const e=document.querySelector("#inner-header-container #buttons");if(!e||document.getElementById("ypp-channel-add-btn"))return;const n=document.createElement("button");n.id="ypp-channel-add-btn",n.className="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m",n.textContent="Add to Group",n.style.marginRight="8px",n.onclick=t=>{const o=document.querySelector("#inner-header-container #text"),r=o?o.textContent.trim():"Unknown";this.showGroupSelector(r,t.clientX,t.clientY)},e.prepend(n)}handleCardClick(e,n){const t=e.querySelector("#text.ytd-channel-name")||e.querySelector(".ytd-channel-name"),o=t?t.textContent.trim():null;o&&this.showGroupSelector(o,n.clientX,n.clientY)}showGroupSelector(e,n,t){const o=document.querySelector(".ypp-group-selector-popup");o&&o.remove();const r=document.createElement("div");r.className="ypp-group-selector-popup",r.style.cssText=`
            position: fixed;
            top: ${t}px;
            left: ${n}px;
            background: #282828;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            min-width: 150px;
        `,r.innerHTML=`<div style="padding:4px 8px; font-weight:bold; font-size:12px; opacity:0.7">Add ${e} to...</div>`,chrome.storage.local.get("yt_subscription_groups").then(d=>{const l=d.yt_subscription_groups||{},a=Object.keys(l);a.length===0?r.innerHTML+='<div style="padding:8px; font-size:12px">No groups created. Go to Subscriptions to manage groups.</div>':a.forEach(i=>{const s=document.createElement("div");s.textContent=i,s.style.cssText=`
                        padding: 6px 8px;
                        cursor: pointer;
                        font-size: 13px;
                        border-radius: 4px;
                    `,s.onmouseenter=()=>s.style.backgroundColor="rgba(255,255,255,0.1)",s.onmouseleave=()=>s.style.backgroundColor="transparent",s.onclick=async()=>{const c=(await chrome.storage.local.get("yt_subscription_groups")).yt_subscription_groups||{};c[i]||(c[i]=[]),c[i].some(p=>p.id===e)?window.YPP.Utils.createToast(`Already in ${i}`,"info"):(c[i].push({id:e,name:e}),await chrome.storage.local.set({yt_subscription_groups:c}),window.YPP.Utils.createToast(`Added to ${i}`,"success")),r.remove()},r.appendChild(s)}),setTimeout(()=>{document.addEventListener("click",function i(s){r.contains(s.target)||(r.remove(),document.removeEventListener("click",i))})},100)}),document.body.appendChild(r)}};
