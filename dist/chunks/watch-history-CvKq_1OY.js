window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.WatchHistoryTracker=class extends window.YPP.features.BaseFeature{constructor(){super("WatchHistoryTracker"),this.STORAGE_PREFIX="ypp_analytics_",this.FLUSH_INTERVAL=1e4,this.activeVideoId=null,this.videoTitle="Unknown Video",this.videoChannel="Unknown Channel",this.sessionSeconds=0,this.lastTickTime=0,this.isTracking=!1,this.flushTimer=null,this.videoElement=null,this.lastAlertTime=0,this.handleTimeUpdate=this.handleTimeUpdate.bind(this),this.handlePlay=this.handlePlay.bind(this),this.handlePause=this.handlePause.bind(this),this.saveData=this.saveData.bind(this)}getConfigKey(){return null}async enable(){await super.enable(),this.flushTimer=setInterval(this.saveData,this.FLUSH_INTERVAL),this.addListener(window,"beforeunload",this.saveData),this._injectAlertStyles(),(this.utils.isWatchPage()||this._isOnShortsPage())&&this._handleStartTracking()}async disable(){var e;await super.disable(),this.flushTimer&&(clearInterval(this.flushTimer),this.flushTimer=null),this.stopTracking(),(e=document.querySelector(".ypp-watch-alert"))==null||e.remove()}onVideoChange(e){this.isEnabled&&this._handleStartTracking(e)}_isOnShortsPage(){return location.pathname.startsWith("/shorts/")}_handleStartTracking(e){this.stopTracking();const s=this.utils.isWatchPage(),t=this._isOnShortsPage();if(!s&&!t)return;let a=e;a||(a=new URLSearchParams(window.location.search).get("v"),t&&(a=location.pathname.split("/shorts/")[1])),a&&(this.activeVideoId=a,this.sessionSeconds=0,this.videoTitle="Unknown Video",this.videoChannel="Unknown Channel",this.pollFor("watch-history-video","video.html5-main-video",n=>{this.attachListeners(n)}))}attachListeners(e){var s,t;this.isTracking||!this.isEnabled||(this.videoElement=e,this.isTracking=!0,this.lastTickTime=Date.now(),setTimeout(()=>this.extractMetadata(),1e3),this.videoElement.addEventListener("timeupdate",this.handleTimeUpdate),this.videoElement.addEventListener("play",this.handlePlay),this.videoElement.addEventListener("pause",this.handlePause),(t=(s=this.utils).log)==null||t.call(s,`Tracking started for ${this.activeVideoId}`,"TRACKER"))}stopTracking(){this.videoElement&&(this.videoElement.removeEventListener("timeupdate",this.handleTimeUpdate),this.videoElement.removeEventListener("play",this.handlePlay),this.videoElement.removeEventListener("pause",this.handlePause)),this.saveData(),this.isTracking=!1,this.videoElement=null,this.activeVideoId=null,this.sessionSeconds=0}extractMetadata(){var e,s;try{const t=((s=(e=window.YPP.CONSTANTS)==null?void 0:e.SELECTORS)==null?void 0:s.METADATA_SELECTORS)||{TITLE:[],CHANNEL:[]},a=t.TITLE.map(i=>document.querySelector(i)).find(i=>i)||document.querySelector("h1.ytd-watch-metadata"),n=t.CHANNEL.map(i=>document.querySelector(i)).find(i=>i)||document.querySelector("ytd-video-owner-renderer #channel-name a");this.videoTitle=a?a.textContent.trim():"Unknown Video",this.videoChannel=n?n.textContent.trim():"Unknown Channel"}catch{}}handlePlay(){this.lastTickTime=Date.now(),this.videoTitle==="Unknown Video"&&this.extractMetadata()}handlePause(){this.handleTimeUpdate()}handleTimeUpdate(){if(!this.isTracking||!this.videoElement||this.videoElement.paused)return;const e=Date.now(),s=e-this.lastTickTime;s>0&&s<5e3&&(this.sessionSeconds+=s/1e3),this.lastTickTime=e}async saveData(){var i,r,c,d;if(!this.activeVideoId||this.sessionSeconds<5)return;const e=Math.floor(this.sessionSeconds),s=this.activeVideoId,t={title:this.videoTitle,channel:this.videoChannel,lastWatched:Date.now()};this.sessionSeconds-=e;const a=new Date().toISOString().split("T")[0],n=`${this.STORAGE_PREFIX}${a}`;try{let o=(await chrome.storage.local.get(n))[n]||{videos:{},totalSeconds:0};o.videos||(o.videos={}),o.totalSeconds||(o.totalSeconds=0),o.totalSeconds+=e,o.videos[s]||(o.videos[s]={title:t.title,channel:t.channel,seconds:0,lastWatched:t.lastWatched});const l=o.videos[s];l.seconds+=e,l.lastWatched=t.lastWatched,l.title==="Unknown Video"&&t.title!=="Unknown Video"&&(l.title=t.title),l.channel==="Unknown Channel"&&t.channel!=="Unknown Channel"&&(l.channel=t.channel),await chrome.storage.local.set({[n]:o}),(r=(i=this.utils).log)==null||r.call(i,`Saved +${e}s for ${s}. Total Today: ${o.totalSeconds}s`,"TRACKER","debug"),this._checkWatchTimeAlert(o.totalSeconds)}catch(h){if(h.message&&h.message.includes("Extension context invalidated"))return;(d=(c=this.utils).log)==null||d.call(c,"Save failed: "+h.message,"TRACKER","error")}}_checkWatchTimeAlert(e){var n;if(!((n=this.settings)!=null&&n.watchTimeAlert))return;const s=this.settings.watchTimeAlertHours??2,t=s*3600;if(e<t)return;const a=Date.now();a-this.lastAlertTime<60*60*1e3||(this.lastAlertTime=a,this._showWatchTimeAlert(e,s))}_showWatchTimeAlert(e,s){var r;(r=document.querySelector(".ypp-watch-alert"))==null||r.remove();const t=Math.floor(e/3600),a=Math.floor(e%3600/60),n=t>0?`${t}h ${a}m`:`${a}m`,i=document.createElement("div");i.className="ypp-watch-alert",i.innerHTML=`
            <div class="ypp-watch-alert-icon">⏱️</div>
            <div class="ypp-watch-alert-body">
                <div class="ypp-watch-alert-title">Watch Time Reminder</div>
                <div class="ypp-watch-alert-msg">You've watched <strong>${n}</strong> today (limit: ${s}h). Time for a break?</div>
            </div>
            <button class="ypp-watch-alert-close" aria-label="Dismiss">✕</button>
        `,i.querySelector(".ypp-watch-alert-close").addEventListener("click",()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),300)}),document.body.appendChild(i),i.offsetWidth,i.classList.add("show"),setTimeout(()=>{i.isConnected&&(i.classList.remove("show"),setTimeout(()=>i.remove(),300))},2e4)}_injectAlertStyles(){if(document.getElementById("ypp-watch-alert-styles"))return;const e=document.createElement("style");e.id="ypp-watch-alert-styles",e.textContent=`
            .ypp-watch-alert {
                position: fixed;
                bottom: -100px;
                right: 24px;
                background: rgba(20, 20, 20, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                z-index: 999999;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                color: white;
                font-family: 'Inter', Roboto, sans-serif;
                transition: bottom 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .ypp-watch-alert.show {
                bottom: 24px;
            }
            .ypp-watch-alert-icon {
                font-size: 24px;
                animation: ypp-pulse 2s infinite;
            }
            .ypp-watch-alert-title {
                font-weight: 700;
                font-size: 14px;
                margin-bottom: 4px;
                color: #ff4e45;
            }
            .ypp-watch-alert-msg {
                font-size: 13px;
                color: #ccc;
                max-width: 250px;
                line-height: 1.4;
            }
            .ypp-watch-alert-close {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                margin-left: 8px;
                transition: color 0.2s;
            }
            .ypp-watch-alert-close:hover {
                color: white;
            }
            @keyframes ypp-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `,document.head.appendChild(e)}};
