window.YPP.features.AudioMode=class extends window.YPP.features.BaseFeature{getConfigKey(){return"audioModeEnabled"}constructor(){var e;super("audioMode"),this.Utils=((e=window.YPP)==null?void 0:e.Utils)||{},this.isActive=!1,this.styleId="ypp-audio-mode-style",this.overlay=null}run(e){e.audioModeEnabled?this.enable():this.disable()}enable(){var e,t;this.isActive||(this.isActive=!0,console.log("YPP Audio Mode: Enabling"),this.injectStyles(),this.showThumbnailOverlay(),(t=(e=this.Utils).createToast)==null||t.call(e,"Audio Mode Enabled 🎵"))}disable(){var t,i;if(!this.isActive)return;this.isActive=!1,console.log("YPP Audio Mode: Disabling");const e=document.getElementById(this.styleId);e&&e.remove(),this.overlay&&(this.overlay.remove(),this.overlay=null),(i=(t=this.Utils).createToast)==null||i.call(t,"Audio Mode Disabled")}injectStyles(){const e=`
            /* Hide the video element but keep it playing */
            .html5-video-player video {
                opacity: 0 !important;
            }
            
            /* Hide ad visuals if possible */
            .ytp-ad-image-overlay {
                display: none !important;
            }

            /* Ensure controls are still visible on hover */
            .html5-video-player:hover .ytp-chrome-bottom {
                opacity: 1 !important;
            }
            
            /* Prevent video from being clickable */
            #ypp-audio-overlay {
                cursor: default;
            }
        `;if(!document.getElementById(this.styleId)){const t=document.createElement("style");t.id=this.styleId,t.textContent=e,document.head.appendChild(t)}}async showThumbnailOverlay(){if(this.Utils.pollFor)try{const e=await this.Utils.pollFor(()=>document.querySelector(".html5-video-player"),1e4,500);if(!e){console.error("YPP Audio Mode: Player not found");return}const t=new URLSearchParams(window.location.search).get("v");if(!t){console.error("YPP Audio Mode: Video ID not found");return}const i=await this.getThumbnailUrl(t),o=document.createElement("div");o.id="ypp-audio-overlay",o.style.cssText=`
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            overflow: hidden;
        `,o.innerHTML=`
            <div style="text-align: center; position: relative; z-index: 2;">
                <div style="position: relative; display: inline-block;">
                    <img id="ypp-audio-thumb" src="${i}" 
                         style="max-height: 50vh; max-width: 80vw; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); transition: transform 0.3s;"
                         onerror="this.src='https://via.placeholder.com/640x360/1a1a2e/3ea6ff?text=Audio+Mode'">
                    <div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background: rgba(62,166,255,0.2); padding: 8px 16px; border-radius: 20px; backdrop-filter: blur(10px);">
                        <span style="font-size: 14px; color: #3ea6ff; font-weight: 500;">🎵 Audio Only</span>
                    </div>
                </div>
                <div style="margin-top: 35px; font-family: 'YouTube Sans', 'Roboto', sans-serif; font-size: 18px; color: rgba(255,255,255,0.9); font-weight: 400; max-width: 600px; padding: 0 20px;">
                    ${this.getVideoTitle()}
                </div>
                <!-- Animated visualizer -->
                <div class="ypp-audio-waves" style="display: flex; gap: 5px; justify-content: center; margin-top: 25px; height: 40px; align-items: flex-end;">
                    ${[...Array(7)].map((s,a)=>`
                        <div style="
                            width: 4px; 
                            background: linear-gradient(to top, #3ea6ff, #00d4ff); 
                            border-radius: 4px 4px 0 0;
                            animation: wave ${.8+Math.random()*.6}s infinite ease-in-out ${a*.1}s;
                        "></div>
                    `).join("")}
                </div>
                <style>
                    @keyframes wave {
                        0%, 100% { height: 15px; opacity: 0.5; }
                        50% { height: 40px; opacity: 1; }
                    }
                    #ypp-audio-thumb:hover {
                        transform: scale(1.02);
                    }
                </style>
            </div>
            <!-- Background blur effect -->
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('${i}');
                background-size: cover;
                background-position: center;
                filter: blur(60px) brightness(0.3);
                opacity: 0.5;
                z-index: 1;
            "></div>
        `,o.onclick=s=>{if(s.target.id!=="ypp-audio-thumb"){const a=document.querySelector("video");a&&(a.paused?a.play():a.pause())}},e.prepend(o),this.overlay=o}catch(e){console.error("YPP Audio Mode: Failed to overlay",e)}}async getThumbnailUrl(e){const t=[`https://i.ytimg.com/vi/${e}/maxresdefault.jpg`,`https://i.ytimg.com/vi/${e}/sddefault.jpg`,`https://i.ytimg.com/vi/${e}/hqdefault.jpg`];for(const i of t)try{if((await fetch(i,{method:"HEAD"})).ok)return i}catch{}return t[t.length-1]}getVideoTitle(){try{const e=document.querySelector("h1.ytd-watch-metadata yt-formatted-string");if(e)return e.textContent}catch{}return"Listening to Audio"}};
