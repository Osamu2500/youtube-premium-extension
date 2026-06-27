window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.IntentionalDelay=class extends window.YPP.features.BaseFeature{constructor(){super("IntentionalDelay"),this._boundCheck=this._onPageChange.bind(this),this._overlay=null,this._activeVideoId=null,this._countdownInterval=null}getConfigKey(){return"intentionalDelay"}async enable(){var e;await super.enable(),this._onPageChange(),(e=window.YPP.events)==null||e.on("page:changed",this._boundCheck)}async disable(){var e;await super.disable(),this._removeOverlay(),(e=window.YPP.events)==null||e.off("page:changed",this._boundCheck)}_onPageChange(){var t;if(!((t=this.settings)!=null&&t.intentionalDelay)||!location.pathname.startsWith("/watch"))return;const e=new URL(location.href).searchParams.get("v");!e||this._activeVideoId===e||(this._activeVideoId=e,this._showOverlay())}_showOverlay(){this._removeOverlay();const e=document.createElement("script");e.textContent=`
            try {
                const player = document.getElementById('movie_player');
                if (player && player.pauseVideo) player.pauseVideo();
            } catch(e) {}
        `,document.body.appendChild(e),e.remove(),this._overlay=document.createElement("div"),this._overlay.className="ypp-intentional-delay-overlay",this._overlay.innerHTML=`
            <div class="ypp-id-content">
                <h2>Take a breath.</h2>
                <p>Is this video intentional, or are you just scrolling?</p>
                <div class="ypp-id-timer">3</div>
                <button class="ypp-id-skip" style="display:none;">Proceed to Video</button>
            </div>
        `,document.body.appendChild(this._overlay);let t=3;const a=this._overlay.querySelector(".ypp-id-timer"),i=this._overlay.querySelector(".ypp-id-skip");this._countdownInterval=setInterval(()=>{t--,t<=0?(clearInterval(this._countdownInterval),this._countdownInterval=null,a.style.display="none",i.style.display="block"):a.textContent=t},1e3),i.addEventListener("click",()=>{this._removeOverlay();const n=document.createElement("script");n.textContent=`
                try {
                    const player = document.getElementById('movie_player');
                    if (player && player.playVideo) player.playVideo();
                } catch(e) {}
            `,document.body.appendChild(n),n.remove()})}_removeOverlay(){this._countdownInterval&&(clearInterval(this._countdownInterval),this._countdownInterval=null),this._overlay&&(this._overlay.remove(),this._overlay=null)}};
