window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};const S=(s,t=5e3)=>window.YPP.Utils.waitForElement(s,t);window.YPP.features.FocusMode=class extends window.YPP.features.BaseFeature{constructor(){super("FocusMode"),this._initConstants()}_initConstants(){this._CONSTANTS=window.YPP.CONSTANTS||{},this._CSS_CLASSES=this._CONSTANTS.CSS_CLASSES||{}}getConfigKey(){return"enableFocusMode"}async enable(){this.observer.register("focus-mode","#contents, ytd-watch-flexy",()=>{this.isEnabled&&this.settings&&this._applyFocusState()},!1),await super.enable(),this._run()}async disable(){this.observer.unregister("focus-mode"),this._toggleDetox(!1),this._toggleFocus(!1),this._toggleCinemaMode(!1),this._toggleMinimalMode(!1),await super.disable()}async onUpdate(){this._run()}_run(){var t,e;if(this.settings)try{this._toggleDetox(this.settings.dopamineDetox),this._toggleFocus(this.settings.enableFocusMode),this._toggleCinemaMode(this.settings.cinemaMode),this._toggleMinimalMode(this.settings.minimalMode),this._applyFocusState()}catch(i){(e=(t=this.utils).log)==null||e.call(t,`Error running focus mode: ${i.message}`,"FOCUS","error")}}_applyFocusState(){const t=this.settings;t&&t.enableFocusMode&&this._hideDistractions(!0)}_toggleDetox(t){var e,i;document.body.classList.toggle(this._CSS_CLASSES.DOPAMINE_DETOX,t),t?this._applyDetoxStyle():this._removeDetoxStyle(),(i=(e=this.utils).log)==null||i.call(e,`Dopamine detox ${t?"enabled":"disabled"}`,"FOCUS")}_applyDetoxStyle(){const t=this._CSS_CLASSES.DOPAMINE_DETOX_STYLE||"ypp-detox-style";let e=document.getElementById(t);e||(e=document.createElement("style"),e.id=t,document.head.appendChild(e)),e.textContent=`
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} ytd-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} ytd-grid-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} #thumbnail img,
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} .ytp-thumbnail-overlay,
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} .html5-main-video {
                filter: grayscale(100%) !important;
            }

            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} ytd-video-renderer:hover ytd-thumbnail,
            .${this._CSS_CLASSES.DOPAMINE_DETOX||"ypp-dopamine-detox"} ytd-rich-item-renderer:hover ytd-thumbnail {
                filter: grayscale(60%) !important;
            }
        `}_removeDetoxStyle(){const t=this._CSS_CLASSES.DOPAMINE_DETOX_STYLE||"ypp-detox-style",e=document.getElementById(t);e&&e.remove()}_toggleFocus(t){var e,i;document.body.classList.toggle(this._CSS_CLASSES.FOCUS_MODE,t),(i=(e=this.utils).log)==null||i.call(e,`Focus mode ${t?"enabled":"disabled"}`,"FOCUS")}_hideDistractions(t){const e=this._settingsRef;if(!e)return;const i=(o,n)=>{o&&document.body.classList.toggle(o,!!n)};i("ypp-hide-comments",e.hideComments),i("ypp-hide-shorts",e.hideShorts),i("ypp-hide-chat",e.hideChat),i("ypp-hide-live-chat",e.hideLiveChat),i("ypp-hide-recommendations",e.hideRecommendations)}_toggleCinemaMode(t){var e,i;document.body.classList.toggle(this._CSS_CLASSES.CINEMA_MODE,t),t?this._applyCinemaStyle():this._removeCinemaStyle(),(i=(e=this.utils).log)==null||i.call(e,`Cinema mode ${t?"enabled":"disabled"}`,"FOCUS"),t&&this._ensureTheaterMode()}async _ensureTheaterMode(){try{const t=await S(".ytp-size-button",2e3);if(!t)return;document.querySelector("ytd-watch-flexy[theater]")||t.click()}catch{}}_applyCinemaStyle(){const t=this._CSS_CLASSES.CINEMA_STYLE||"ypp-cinema-style";let e=document.getElementById(t);e||(e=document.createElement("style"),e.id=t,document.head.appendChild(e)),e.textContent=`
            .${this._CSS_CLASSES.CINEMA_MODE||"ypp-cinema-mode"} #columns,
            .${this._CSS_CLASSES.CINEMA_MODE||"ypp-cinema-mode"} #primary + #secondary {
                opacity: 0.3;
                transform: scale(0.95);
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
            }

            .${this._CSS_CLASSES.CINEMA_MODE||"ypp-cinema-mode"} #primary {
                max-width: 1000px !important;
                margin: 0 auto;
            }

            .${this._CSS_CLASSES.CINEMA_MODE||"ypp-cinema-mode"} #columns:hover #primary + #secondary,
            .${this._CSS_CLASSES.CINEMA_MODE||"ypp-cinema-mode"} #columns:hover #secondary {
                opacity: 1;
                transform: scale(1);
                pointer-events: auto;
            }
        `}_removeCinemaStyle(){const t=this._CSS_CLASSES.CINEMA_STYLE||"ypp-cinema-style",e=document.getElementById(t);e&&e.remove()}_toggleMinimalMode(t){var e,i;document.body.classList.toggle(this._CSS_CLASSES.MINIMAL_MODE,t),t?this._applyMinimalStyle():this._removeMinimalStyle(),(i=(e=this.utils).log)==null||i.call(e,`Minimal mode ${t?"enabled":"disabled"}`,"FOCUS")}_applyMinimalStyle(){const t=this._CSS_CLASSES.MINIMAL_STYLE||"ypp-minimal-style";let e=document.getElementById(t);e||(e=document.createElement("style"),e.id=t,document.head.appendChild(e)),e.textContent=`
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} ytd-masthead #buttons,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} ytd-masthead #end,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} ytd-video-primary-info-renderer #top-row,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #owner,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #comments,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #secondary {
                opacity: 0.2;
                transition: opacity 0.3s ease;
            }

            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} ytd-masthead:hover #buttons,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} ytd-masthead:hover #end,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #owner:hover,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #comments:hover,
            .${this._CSS_CLASSES.MINIMAL_MODE||"ypp-minimal-mode"} #secondary:hover {
                opacity: 1;
            }
        `}_removeMinimalStyle(){const t=this._CSS_CLASSES.MINIMAL_STYLE||"ypp-minimal-style",e=document.getElementById(t);e&&e.remove()}isActive(){return this._isActive}update(t){this._settingsRef=t,this._run(t)}toggleFeature(t,e){if(this._settingsRef)switch(this._settingsRef[t]=e,t){case"dopamineDetox":this._toggleDetox(e);break;case"enableFocusMode":this._toggleFocus(e);break;case"cinemaMode":this._toggleCinemaMode(e);break;case"minimalMode":this._toggleMinimalMode(e);break}}};
