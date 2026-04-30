window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFiltersOverlay = class VideoFiltersOverlay {
    static applyOverlay(ctx, type, grainAmount = 0, sharpness = 0) {
        const container = document.getElementById('movie_player');
        if (!container) return;

        const overlay = document.createElement('div');
        overlay.id = 'ypp-filter-overlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '5';

        overlay.style.zIndex = '5';

        this.injectSpecialEffectsSVG();

        if (grainAmount > 0 || type === 'grain_custom') {
            overlay.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;
            overlay.style.opacity = (grainAmount || 20) / 100;
            overlay.style.mixBlendMode = 'overlay';
            overlay.style.pointerEvents = 'none';
        }

        if (type === 'nightvision') {
            overlay.style.backgroundImage = `
                radial-gradient(circle, transparent 40%, rgba(0, 30, 0, 0.8) 100%),
                repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)
            `;
            overlay.style.boxShadow = 'inset 0 0 100px rgba(0, 255, 0, 0.1)';
            overlay.style.mixBlendMode = 'multiply';
        } else if (type === 'crt') {
            this.injectCRTSVGFilter();
            overlay.style.backgroundImage = `
                radial-gradient(ellipse 85% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.4) 100%),
                repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.15) 0px,
                    rgba(0,0,0,0.15) 1px,
                    transparent 1px,
                    transparent 3px
                ),
                repeating-linear-gradient(
                    90deg,
                    rgba(255, 40,  40,  0.1) 0px,
                    rgba(255, 40,  40,  0.1) 1px,
                    rgba(40,  255, 40,  0.1) 1px,
                    rgba(40,  255, 40,  0.1) 2px,
                    rgba(40,  40,  255, 0.1) 2px,
                    rgba(40,  40,  255, 0.1) 3px,
                    transparent 3px,
                    transparent 3px
                )
            `;
            overlay.style.backgroundSize = '100% 100%, 100% 3px, 3px 100%';
            overlay.style.boxShadow = 'inset 0 0 80px rgba(0,0,0,0.6)';
            overlay.style.borderRadius = '6px';
            overlay.style.animation = 'ypp-crt-flicker 3s ease-in-out infinite';

        } else if (type === 'vhs') {
            overlay.style.backgroundImage = `
                repeating-linear-gradient(
                    0deg,
                    rgba(0,0,0,0.22) 0px,
                    rgba(0,0,0,0.22) 2px,
                    transparent 2px,
                    transparent 5px
                )
            `;
            overlay.style.mixBlendMode = 'multiply';
            const band = document.createElement('div');
            Object.assign(band.style, {
                position: 'absolute', left: '0', width: '100%', height: '6px',
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(1px)',
                animation: 'ypp-vhs-band 4s linear infinite',
                pointerEvents: 'none'
            });
            overlay.appendChild(band);

        } else if (type === 'oldfilm') {
            overlay.style.backgroundImage = `
                radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)
            `;
            overlay.style.animation = 'ypp-grain 0.1s steps(1) infinite';
        }

        if (type !== 'nightvision' && type !== 'grain_custom' && !grainAmount) {
             container.appendChild(overlay);
        } else if (type === 'nightvision' || grainAmount > 0) {
             container.appendChild(overlay);
        }
        
        ctx._filterOverlay = overlay;
        this.injectOverlayCSS();
    }

    static injectSVGSharpness(amount) {
        if (amount <= 0) return;
        let svg = document.getElementById('ypp-svg-sharpness-defs');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'ypp-svg-sharpness-defs';
            svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
            document.body.appendChild(svg);
        }
        
        // Calculate kernel matrix based on amount (0 to 100)
        // Center weight increases as sharpness increases
        const strength = (amount / 100) * 2; 
        const center = 1 + (4 * strength);
        const edge = -strength;
        
        svg.innerHTML = `
            <defs>
                <filter id="ypp-svg-sharpness">
                    <feConvolveMatrix order="3 3" preserveAlpha="true" kernelMatrix="
                        0 ${edge} 0
                        ${edge} ${center} ${edge}
                        0 ${edge} 0"/>
                </filter>
            </defs>
        `;
    }

    static injectCRTSVGFilter() {
        if (document.getElementById('ypp-crt-svg-defs')) return;
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.id = 'ypp-crt-svg-defs';
        svg.setAttribute('xmlns', svgNS);
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';

        const defs = document.createElementNS(svgNS, 'defs');
        const filter = document.createElementNS(svgNS, 'filter');
        filter.id = 'ypp-crt-rgb';
        filter.setAttribute('x', '0%');
        filter.setAttribute('y', '0%');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('color-interpolation-filters', 'sRGB');

        const el = (tag, attrs) => {
            const e = document.createElementNS(svgNS, tag);
            Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
            return e;
        };

        filter.append(
            el('feOffset',      { in: 'SourceGraphic', dx: '1.5', dy: '0', result: 'rShifted' }),
            el('feColorMatrix', { in: 'rShifted', type: 'matrix',
                values: '1 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'rOnly' }),
            el('feColorMatrix', { in: 'SourceGraphic', type: 'matrix',
                values: '0 0 0 0 0   0 1 0 0 0   0 0 0 0 0   0 0 0 1 0', result: 'gOnly' }),
            el('feOffset',      { in: 'SourceGraphic', dx: '-1.5', dy: '0', result: 'bShifted' }),
            el('feColorMatrix', { in: 'bShifted', type: 'matrix',
                values: '0 0 0 0 0   0 0 0 0 0   0 0 1 0 0   0 0 0 1 0', result: 'bOnly' }),
            el('feBlend', { in: 'rOnly',  in2: 'gOnly', mode: 'screen', result: 'rg' }),
            el('feBlend', { in: 'rg',     in2: 'bOnly', mode: 'screen' })
        );

        defs.appendChild(filter);
        svg.appendChild(defs);
        document.body.appendChild(svg);
    }

    static injectSpecialEffectsSVG() {
        if (document.getElementById('ypp-special-fx-defs')) return;
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.id = 'ypp-special-fx-defs';
        svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';

        svg.innerHTML = `
            <defs>
                <filter id="ypp-fx-matrix" color-interpolation-filters="sRGB">
                    <feColorMatrix type="matrix" values="
                        0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"/>
                </filter>
                <filter id="ypp-fx-edge" color-interpolation-filters="sRGB">
                    <feConvolveMatrix order="3 3" preserveAlpha="true" kernelMatrix="
                        -1 -1 -1
                        -1  8 -1
                        -1 -1 -1"/>
                </filter>
                <filter id="ypp-fx-emboss" color-interpolation-filters="sRGB">
                    <feConvolveMatrix order="3 3" preserveAlpha="true" kernelMatrix="
                        -2 -1  0
                        -1  1  1
                         0  1  2"/>
                </filter>
                <filter id="ypp-fx-posterize" color-interpolation-filters="sRGB">
                    <feComponentTransfer>
                        <feFuncR type="discrete" tableValues="0 0.1 0.25 0.5 0.75 0.9 1"/>
                        <feFuncG type="discrete" tableValues="0 0.1 0.25 0.5 0.75 0.9 1"/>
                        <feFuncB type="discrete" tableValues="0 0.1 0.25 0.5 0.75 0.9 1"/>
                    </feComponentTransfer>
                </filter>
                <filter id="ypp-fx-glitch" color-interpolation-filters="sRGB">
                    <feOffset in="SourceGraphic" dx="6" dy="0" result="red-shift"/>
                    <feOffset in="SourceGraphic" dx="-6" dy="0" result="blue-shift"/>
                    <feColorMatrix in="red-shift" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red-only"/>
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green-only"/>
                    <feColorMatrix in="blue-shift" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue-only"/>
                    <feBlend mode="screen" in="red-only" in2="green-only" result="red-green"/>
                    <feBlend mode="screen" in="red-green" in2="blue-only"/>
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);
    }

    static injectOverlayCSS() {
        if (document.getElementById('ypp-overlay-css')) return;
        const style = document.createElement('style');
        style.id = 'ypp-overlay-css';
        style.textContent = `
            @keyframes ypp-crt-flicker {
                0%   { opacity: 1; }
                48%  { opacity: 1; }
                50%  { opacity: 0.94; }
                52%  { opacity: 1; }
                88%  { opacity: 1; }
                90%  { opacity: 0.97; }
                92%  { opacity: 1; }
            }
            @keyframes ypp-vhs-band {
                0%   { top: -8px; }
                100% { top: 102%; }
            }
            @keyframes ypp-grain {
                0%  { background-position: 0% 0%; }
                10% { background-position: -5% -5%; }
                20% { background-position: -10% 5%; }
                30% { background-position: 5% -10%; }
                40% { background-position: -5% 15%; }
                50% { background-position: -10% 5%; }
                60% { background-position: 15% 0%; }
                70% { background-position: 0% 10%; }
                80% { background-position: -15% 0%; }
                90% { background-position: 10% 5%; }
                100%{ background-position: 5% 0%; }
            }
        `;
        document.head.appendChild(style);
    }
    
    static removeOverlay(ctx) {
        if (ctx._filterOverlay) {
            ctx._filterOverlay.remove();
            ctx._filterOverlay = null;
        }
        const crtSvg = document.getElementById('ypp-crt-svg-defs');
        if (crtSvg) crtSvg.remove();
        const sharpSvg = document.getElementById('ypp-svg-sharpness-defs');
        if (sharpSvg) sharpSvg.remove();
        const fxSvg = document.getElementById('ypp-special-fx-defs');
        if (fxSvg) fxSvg.remove();
    }
};
