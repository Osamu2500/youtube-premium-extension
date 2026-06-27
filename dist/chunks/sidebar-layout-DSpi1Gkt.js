window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};const e="ypp-sidebar-layout-expanded";window.YPP.features.SidebarLayout=class extends window.YPP.features.BaseFeature{constructor(){super("SidebarLayout"),this._currentLayout=null}enable(t){this.update(t)}disable(){try{this._removeStyle(),this._currentLayout=null}catch(t){console.error("[YPP] SidebarLayout disable error:",t)}}update(t){if(((t==null?void 0:t.sidebarLayout)??"compact")==="expanded"){if(this._currentLayout==="expanded")return;this._currentLayout="expanded",this._injectStyle()}else{if(this._currentLayout==="compact")return;this._currentLayout="compact",this._removeStyle()}}onPageChange(){this._currentLayout==="expanded"&&(document.getElementById(e)||this._injectStyle())}_injectStyle(){this._removeStyle();const t=document.createElement("style");t.id=e,t.setAttribute("data-ypp-feature","sidebarLayout"),t.textContent=`
      /* ══ YPP: Large Sidebar Thumbnails (2026 YouTube layout) ═════════════ */

      /* Switch card from inline-flex row → block so thumbnail stacks on top */
      ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer {
        display: block !important;
        margin-bottom: 12px !important;
      }

      /* Dismissible wrapper: must be column flex for thumbnail-on-top layout */
      ytd-watch-next-secondary-results-renderer #dismissible.ytd-compact-video-renderer {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        align-items: stretch !important;
      }

      /* Thumbnail: full-width 16:9 block */
      ytd-watch-next-secondary-results-renderer #thumbnail.ytd-compact-video-renderer {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
        max-width: 100% !important;
        margin-bottom: 8px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }

      /* ytd-thumbnail host — same treatment */
      ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
      }

      /* Inner image */
      ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
      }

      /* Details row below thumbnail */
      ytd-watch-next-secondary-results-renderer #details.ytd-compact-video-renderer {
        display: flex !important;
        flex-direction: row !important;
        width: 100% !important;
        padding: 0 !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }

      /* Meta text */
      ytd-watch-next-secondary-results-renderer #meta.ytd-compact-video-renderer {
        flex: 1 !important;
        min-width: 0 !important;
      }

      /* Title: unclamp for full display */
      ytd-watch-next-secondary-results-renderer #video-title.ytd-compact-video-renderer {
        -webkit-line-clamp: unset !important;
        max-height: unset !important;
        white-space: normal !important;
        overflow: visible !important;
      }

      /* Sidebar list padding */
      ytd-watch-next-secondary-results-renderer #items.ytd-watch-next-secondary-results-renderer {
        padding: 0 !important;
      }

      /* ══ YPP: Support for new yt-lockup-view-model ═══════════════════════ */

      ytd-watch-next-secondary-results-renderer yt-lockup-view-model,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model {
        display: block !important;
        margin-bottom: 12px !important;
      }
      
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model > *,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model > * {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(yt-image),
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(img),
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(yt-image),
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(img) {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
        max-width: 100% !important;
        margin-bottom: 8px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        flex: none !important;
        position: relative !important;
      }

      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(yt-image) yt-image,
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(yt-image) img,
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(img) yt-image,
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(img) img,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(yt-image) yt-image,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(yt-image) img,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(img) yt-image,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(img) img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
      }

      ytd-watch-next-secondary-results-renderer yt-lockup-view-model .yt-lockup-metadata-view-model-wiz,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model .yt-lockup-metadata-view-model-wiz {
        padding: 0 !important;
        width: 100% !important;
      }

      ytd-watch-next-secondary-results-renderer yt-lockup-view-model h3,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model h3,
      ytd-watch-next-secondary-results-renderer yt-lockup-view-model .yt-lockup-metadata-view-model-wiz__title,
      ytd-watch-next-secondary-results-renderer ytd-lockup-view-model .yt-lockup-metadata-view-model-wiz__title {
        -webkit-line-clamp: unset !important;
        max-height: unset !important;
        white-space: normal !important;
        overflow: visible !important;
      }

    `,document.head.appendChild(t)}_removeStyle(){var t;(t=document.getElementById(e))==null||t.remove()}};
