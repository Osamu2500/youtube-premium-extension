window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFiltersOverlay = class VideoFiltersOverlay {
    static applyOverlay(ctx, type) {
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

        if (type === 'crt') {
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

        container.appendChild(overlay);
        ctx._filterOverlay = overlay;
        this.injectOverlayCSS();
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
    }
};
