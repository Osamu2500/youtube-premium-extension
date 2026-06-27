window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};window.YPP.features.WatchRedesign=class extends(window.YPP.features.BaseFeature||Object){constructor(){super("WatchRedesign"),this.configKey=null,this.isWatchPage=!1,this.glassPlayerEnabled=!1,this.glassPlayerEnabled=!1,this.sidebarCommentsEnabled=!1,this._mountInterval=null}init(){this._injectCSS(),this._checkRoute()}enable(t){if(t)try{this.glassPlayerEnabled=!!t.glassPlayerUI,this.sidebarCommentsEnabled=!!t.sidebarComments,this._applyFeatures()}catch(a){console.error("Error enabling WatchRedesign",a)}}disable(){this.glassPlayerEnabled=!1,this.sidebarCommentsEnabled=!1,this._mountInterval&&(clearInterval(this._mountInterval),this._mountInterval=null),window.YPP&&window.YPP.sharedObserver&&window.YPP.sharedObserver.unregister("watch-redesign-comments"),this._applyFeatures()}_injectCSS(){if(document.getElementById("ypp-watch-redesign-style"))return;const t=document.createElement("style");t.id="ypp-watch-redesign-style",t.textContent=`
            /* ========================================================
               GLOBAL: DYNAMIC PROGRESS BAR ALIGNMENT
               ======================================================== */
            .html5-video-player .ytp-chrome-bottom {
                transform: translateY(calc(var(--ypp-letterbox-bottom, 0px) * -1)) !important;
                transition: transform 0.2s ease-out !important;
            }

            /* ========================================================
               PHASE 1: GLASS PLAYER UI
               ======================================================== */
            html.ypp-glass-player-active ytd-watch-flexy .html5-video-player {
                border-radius: 16px !important;
                overflow: hidden !important;
                box-shadow: 0 12px 48px rgba(0,0,0,0.5) !important;
            }

            /* Glassmorphic Bottom Control Bar */
            html.ypp-glass-player-active .ytp-chrome-bottom {
                background: rgba(10, 10, 12, 0.6) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 0 0 16px 16px !important;
                padding-bottom: 4px !important;
                text-shadow: none !important;
                width: 100% !important;
                left: 0 !important;
                padding-left: 12px !important;
                padding-right: 12px !important;
                box-sizing: border-box !important;
            }

            /* Player Controls Hover Glow */
            html.ypp-glass-player-active .ytp-chrome-controls .ytp-button:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                transform: scale(1.05) !important;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            html.ypp-glass-player-active .ytp-chrome-controls .ytp-button {
                transition: all 0.2s ease !important;
            }

            /* Progress Bar Re-styling */
            html.ypp-glass-player-active .ytp-swatch-background-color {
                background-color: var(--ypp-accent-color, #ff4e45) !important;
            }
            
            html.ypp-glass-player-active .ytp-play-progress {
                background: linear-gradient(90deg, var(--ypp-accent-color, #ff4e45), #ff8a84) !important;
            }

            /* Glassmorphic Menus (Settings, Tooltips) */
            html.ypp-glass-player-active .ytp-popup {
                background: rgba(20, 20, 24, 0.75) !important;
                backdrop-filter: blur(24px) !important;
                -webkit-backdrop-filter: blur(24px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
            }
            html.ypp-glass-player-active .ytp-panel-menu {
                background: transparent !important;
            }

            /* Action Buttons under player (Like, Share, etc.) */
            html.ypp-glass-player-active ytd-watch-metadata #actions ytd-button-renderer button,
            html.ypp-glass-player-active ytd-watch-metadata #actions ytd-toggle-button-renderer button,
            html.ypp-glass-player-active ytd-watch-metadata #actions yt-button-shape button {
                background: rgba(255, 255, 255, 0.08) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(8px) !important;
                border-radius: 24px !important;
                transition: all 0.2s ease !important;
            }
            
            html.ypp-glass-player-active ytd-watch-metadata #actions yt-button-shape button:hover {
                background: rgba(255, 255, 255, 0.15) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            }

            /* ========================================================
               PHASE 2: SIDEBAR COMMENTS
               ======================================================== */
            
            /* CSS-only Sidebar Comments via CSS Grid and display: contents */
            
            /* Convert the main wrapper into a Grid layout */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #columns {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) var(--ytd-watch-flexy-sidebar-width, 402px) !important;
                grid-template-rows: auto auto auto !important;
                column-gap: 24px !important;
                align-items: start !important;
            }

            /* Flatten the hierarchy so children can participate in the Grid */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #primary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #primary-inner,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #secondary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #secondary-inner {
                display: contents !important;
            }

            /* Place the elements into their grid cells */
            
            /* Left column: Video player and description */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player-container-outer,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player-wide {
                grid-column: 1 !important;
                grid-row: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #below {
                grid-column: 1 !important;
                grid-row: 2 / span 2 !important;
            }

            /* Right column: Comments */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments {
                grid-column: 2 !important;
                grid-row: 1 !important;
                
                /* Glassmorphic styling for comments */
                background: var(--ypp-card-bg, rgba(20, 19, 24, 0.6)) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 16px !important;
                padding: 16px !important;
                margin-top: 16px !important;
                margin-bottom: 24px !important;
                max-height: calc(100vh - 120px) !important;
                overflow-y: auto !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
            }

            /* Right column: Related Videos (moved below comments) */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #related {
                grid-column: 2 !important;
                grid-row: 2 !important;
                margin-top: 24px !important;
            }
            
            /* Custom scrollbar for sidebar comments */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments::-webkit-scrollbar {
                width: 6px;
            }
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
            
            /* Chat integration (if active) */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #chat {
                grid-column: 2 !important;
                grid-row: 1 !important;
            }
        `,document.head.appendChild(t)}onPageChange(t){this._checkRoute()}_checkRoute(){this.isWatchPage=window.location.pathname==="/watch",this.isWatchPage?this._applyFeatures():this._cleanup()}_applyFeatures(){this.isWatchPage&&(this.glassPlayerEnabled?document.documentElement.classList.add("ypp-glass-player-active"):document.documentElement.classList.remove("ypp-glass-player-active"),this._startTrackingVideoRatio(),this.sidebarCommentsEnabled?document.documentElement.classList.add("ypp-sidebar-comments-active"):document.documentElement.classList.remove("ypp-sidebar-comments-active"))}_cleanup(){document.documentElement.classList.remove("ypp-glass-player-active"),document.documentElement.classList.remove("ypp-sidebar-comments-active"),this._stopTrackingVideoRatio()}_startTrackingVideoRatio(){this._stopTrackingVideoRatio();const t=()=>{if(!this.isWatchPage)return;const a=document.querySelector("video.video-stream"),e=document.querySelector(".html5-video-player");if(!a||!e)return;if(!a.videoWidth||!a.videoHeight||!e.clientHeight||!e.clientWidth){e.style.removeProperty("--ypp-letterbox-bottom");return}const r=a.videoWidth/a.videoHeight,o=e.clientWidth/e.clientHeight;let i=0;if(r>o){const n=e.clientWidth/r;i=(e.clientHeight-n)/2}e.style.setProperty("--ypp-letterbox-bottom",`${Math.max(0,i)}px`)};this._resizeObserver=new ResizeObserver(()=>t()),window.YPP.Utils&&window.YPP.Utils.pollFor&&window.YPP.Utils.pollFor(()=>{const a=document.querySelector(".html5-video-player"),e=document.querySelector("video.video-stream");return a&&e?{container:a,video:e}:null},1e4,500).then(a=>{if(!a)return;const{container:e,video:r}=a;this._ratioInterval=null,this._resizeObserver.observe(e),r.addEventListener("loadedmetadata",t),this._trackedVideo=r,this._updateRatioFn=t,t()})}_stopTrackingVideoRatio(){this._resizeObserver&&(this._resizeObserver.disconnect(),this._resizeObserver=null),this._ratioInterval&&(clearInterval(this._ratioInterval),this._ratioInterval=null),this._trackedVideo&&this._updateRatioFn&&(this._trackedVideo.removeEventListener("loadedmetadata",this._updateRatioFn),this._trackedVideo=null,this._updateRatioFn=null);const t=document.querySelector(".html5-video-player");t&&t.style.removeProperty("--ypp-letterbox-bottom")}};
