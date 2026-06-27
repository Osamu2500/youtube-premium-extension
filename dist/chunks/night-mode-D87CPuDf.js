(function(){class i extends window.YPP.features.BaseFeature{getConfigKey(){return null}constructor(){super("nightMode"),this._Utils=window.YPP.Utils,this._elements={blueLight:null,dim:null,svgFilter:null}}enable(e){try{this.update(e)}catch(t){console.error("[YPP] NightMode enable error:",t)}}disable(){try{this._removeBlueLight(),this._elements.dim&&(this._elements.dim.remove(),this._elements.dim=null)}catch(e){console.error("[YPP] NightMode disable error:",e)}}update(e){try{this._applyBlueLight((e==null?void 0:e.blueLight)||0),this._applyDim((e==null?void 0:e.dim)||0)}catch(t){console.error("[YPP] NightMode update error:",t)}}_applyBlueLight(e){if(e=Number(e),e===0){this._removeBlueLight();return}if(this._elements.blueLight||this._createBlueLightFilter(),this._elements.svgFilter){const t=this._elements.svgFilter.querySelector("feColorMatrix");if(t){const l=`1 0 0 0 0  0 1 0 0 0  0 0 ${1-e/100} 0 0  0 0 0 1 0`;t.setAttribute("values",l)}}}_createBlueLightFilter(){const e=document.createElement("div");e.id="ypp-bluelight-container",e.style.cssText="position:fixed;top:0;left:0;width:0;height:0;z-index:-1;pointer-events:none;",e.innerHTML=`
                <svg viewBox="0 0 1 1" style="width:0;height:0;overflow:hidden;position:absolute;">
                    <filter id="ypp-bluelight-filter">
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
                    </filter>
                </svg>
            `,document.documentElement.appendChild(e),document.documentElement.style.filter="url(#ypp-bluelight-filter)",this._elements.blueLight=e,this._elements.svgFilter=e.querySelector("filter")}_removeBlueLight(){this._elements.blueLight&&(this._elements.blueLight.remove(),this._elements.blueLight=null,this._elements.svgFilter=null,document.documentElement.style.filter="")}_applyDim(e){if(e=Number(e),e===0){this._elements.dim&&(this._elements.dim.remove(),this._elements.dim=null);return}if(!this._elements.dim){const t=document.createElement("div");t.id="ypp-dim-overlay",t.style.cssText=`
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: black;
                    pointer-events: none;
                    z-index: 2147483647; /* Max Z-Index */
                    transition: opacity 0.2s ease;
                    mix-blend-mode: multiply;
                `,document.documentElement.appendChild(t),this._elements.dim=t}this._elements.dim.style.opacity=(e/100).toString()}async disable(){super.disable(),this._removeBlueLight(),this._elements.dim&&(this._elements.dim.remove(),this._elements.dim=null)}}typeof window.YPP>"u"&&(window.YPP={}),typeof window.YPP.features>"u"&&(window.YPP.features={}),window.YPP.features.NightModeManager=i})();
