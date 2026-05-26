/**
 * Split Scrolling Feature
 * Gives the sidebar and main video column independent scrollbars, 
 * locking the main page scroll so the video doesn't move when scrolling the sidebar.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SplitScrolling = class SplitScrolling extends window.YPP.features.BaseFeature {
    constructor() {
        super('SplitScrolling');
        this.styleId = 'ypp-split-scrolling-style';
    }

    getConfigKey() { return 'splitScrolling'; }

    run(settings) {
        if (settings.splitScrolling) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        document.body.classList.add('ypp-split-scrolling-enabled');
        this.injectStyles();
    }

    disable() {
        document.body.classList.remove('ypp-split-scrolling-enabled');
        const style = document.getElementById(this.styleId);
        if (style) style.remove();
    }

    injectStyles() {
        if (document.getElementById(this.styleId)) return;

        const css = `
            /* ONLY apply when on the watch page (ytd-watch-flexy is not hidden) */
            body.ypp-split-scrolling-enabled:has(ytd-watch-flexy:not([hidden])) {
                overflow: hidden !important; /* Hide main body scroll */
            }

            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) {
                height: calc(100vh - var(--ytd-masthead-height, 56px)) !important;
                overflow: hidden !important;
            }

            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #columns {
                height: 100% !important;
                max-height: 100% !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: stretch !important;
            }

            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #primary {
                flex: 1 !important;
                height: 100% !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.2) transparent;
                padding-right: 12px !important;
                margin-right: 12px !important;
            }

            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary {
                height: 100% !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.2) transparent;
                padding-right: 8px !important;
            }

            /* Custom scrollbars for webkit */
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #primary::-webkit-scrollbar,
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar {
                width: 6px;
            }
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #primary::-webkit-scrollbar-thumb,
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
            }
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #primary::-webkit-scrollbar-track,
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar-track {
                background: transparent;
            }
            
            /* Add some padding bottom so the last item isn't flush */
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #primary-inner,
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary-inner {
                padding-bottom: 80px !important;
            }
        `;

        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }
};
