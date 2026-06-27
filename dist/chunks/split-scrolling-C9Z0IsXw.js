window.YPP=window.YPP||{};window.YPP.features=window.YPP.features||{};const i="ypp-split-scrolling-style",o="ypp-split-scrolling-enabled";window.YPP.features.SplitScrolling=class extends window.YPP.features.BaseFeature{constructor(){super("SplitScrolling")}getConfigKey(){return"splitScrolling"}enable(){this._injectStyles(),document.body.classList.add(o)}disable(){document.body.classList.remove(o),super.disable()}onPageChange(e){this.isEnabled&&!document.getElementById(i)&&this._injectStyles()}_injectStyles(){if(document.getElementById(i))return;const e=document.createElement("style");e.id=i,e.setAttribute("data-ypp-feature","splitScrolling");const t="body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden])";e.textContent=`
            /* ══ YPP: Independent Sidebar Scroll ══════════════════════════════ */

            /*
             * overflow:clip on ancestors — the critical fix.
             *
             * overflow:clip visually clips overflowing content, just like
             * overflow:hidden, but does NOT create a block formatting context
             * (BFC). A BFC is what causes position:sticky to silently stop
             * working. Using clip instead of hidden preserves sticky while
             * still preventing scroll-bar emergence on these containers.
             */
            body.ypp-split-scrolling-enabled #page-manager {
                overflow: clip !important;
            }

            ${t} {
                overflow: clip !important;
                /* Establish a height context so the child height:calc() resolves */
                min-height: 100vh !important;
            }

            /*
             * #columns is a flex container. overflow:visible lets the sticky
             * child escape, and align-items:flex-start stops it from
             * stretching to the container height (which would prevent scrolling).
             */
            ${t} #columns {
                overflow: visible !important;
                align-items: flex-start !important;
            }

            /* ── The sticky, independently-scrollable sidebar ─────────────── */

            ${t} #secondary {
                position: sticky !important;
                top: var(--ytd-masthead-height, 56px) !important;
                height: calc(100vh - var(--ytd-masthead-height, 56px)) !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                margin-top: 0 !important;
                padding-top: var(--ytd-margin-6x, 24px) !important;
                /* Firefox */
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            }

            /* ── Webkit scrollbar (shown unless hide-scrollbar is active) ──── */

            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${t} #secondary::-webkit-scrollbar {
                width: 6px !important;
                display: block !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${t} #secondary::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 4px !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${t} #secondary::-webkit-scrollbar-track {
                background: transparent !important;
            }

            /* ── Override: hide sidebar scrollbar when global hide-scrollbar is on */

            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ${t} #secondary {
                scrollbar-width: none !important;
            }
            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ${t} #secondary::-webkit-scrollbar {
                width: 0 !important;
                display: none !important;
            }

            /* ── Breathing room at the bottom of the sidebar list ─────────── */

            ${t} #secondary-inner {
                padding-bottom: 40px !important;
            }
        `,document.head.appendChild(e)}};
