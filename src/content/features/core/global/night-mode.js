/**
 * Night Mode Manager
 * Handles Blue Light Filter (SVG) and Dim Overlay
 */
(function() {
    class NightModeManager {
        constructor() {
            this._Utils = window.YPP.Utils;
            this._elements = {
                blueLight: null,
                dim: null,
                svgFilter: null
            };
        }

        run(settings) {
            this._applyBlueLight(settings.blueLight || 0);
            this._applyDim(settings.dim || 0);
        }

        _applyBlueLight(value) {
            value = Number(value);
            if (value === 0) {
                this._removeBlueLight();
                return;
            }

            if (!this._elements.blueLight) {
                this._createBlueLightFilter();
            }

            // Update Matrix Values
            if (this._elements.svgFilter) {
                 const matrix = this._elements.svgFilter.querySelector('feColorMatrix');
                 if (matrix) {
                     // Standard Identity Matrix but with Blue reduced
                     const b = 1 - (value / 100);
                     const matrixValues = `1 0 0 0 0  0 1 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`;
                     matrix.setAttribute('values', matrixValues);
                 }
            }
        }

        _createBlueLightFilter() {
            // Create clean SVG filter accessible to the page
            const div = document.createElement('div');
            div.id = 'ypp-bluelight-container';
            div.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:-1;pointer-events:none;';
            
            div.innerHTML = `
                <svg viewBox="0 0 1 1" style="width:0;height:0;overflow:hidden;position:absolute;">
                    <filter id="ypp-bluelight-filter">
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
                    </filter>
                </svg>
            `;
            document.documentElement.appendChild(div);
            
            // Apply filter to HTML
            document.documentElement.style.filter = 'url(#ypp-bluelight-filter)';
            
            this._elements.blueLight = div;
            this._elements.svgFilter = div.querySelector('filter');
        }

        _removeBlueLight() {
            if (this._elements.blueLight) {
                this._elements.blueLight.remove();
                this._elements.blueLight = null;
                this._elements.svgFilter = null;
                document.documentElement.style.filter = '';
            }
        }

        _applyDim(value) {
            value = Number(value);
            if (value === 0) {
                if (this._elements.dim) {
                    this._elements.dim.remove();
                    this._elements.dim = null;
                }
                return;
            }

            if (!this._elements.dim) {
                const dim = document.createElement('div');
                dim.id = 'ypp-dim-overlay';
                dim.style.cssText = `
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
                `;
                document.documentElement.appendChild(dim);
                this._elements.dim = dim;
            }

            this._elements.dim.style.opacity = (value / 100).toString();
        }
    }

    // Register Feature
    if (typeof window.YPP === 'undefined') { window.YPP = {}; }
    if (typeof window.YPP.features === 'undefined') { window.YPP.features = {}; }
    
    window.YPP.features.NightModeManager = NightModeManager;
})();
