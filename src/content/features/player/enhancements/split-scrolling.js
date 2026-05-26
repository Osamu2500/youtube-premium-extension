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
        // Ensure styles are injected before toggling the class
        this.injectStyles();
        document.body.classList.add('ypp-split-scrolling-enabled');
    }

    disable() {
        document.body.classList.remove('ypp-split-scrolling-enabled');
        // We keep the <style> injected and just rely on the body class for toggling
        // This is more performant than adding/removing DOM nodes.
    }

    injectStyles() {
        if (document.getElementById(this.styleId)) return;

        const css = `
            /* Independent Scrollable Sidebar */
            /* We make the sidebar sticky and scrollable, leaving the main body scroll intact for the left side. */
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary {
                position: sticky !important;
                top: var(--ytd-masthead-height, 56px) !important;
                height: calc(100vh - var(--ytd-masthead-height, 56px)) !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                margin-top: 0 !important;
                padding-top: var(--ytd-margin-6x, 24px) !important;
                /* Firefox scrollbar styling */
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            }

            /* Custom scrollbars for the sidebar (Webkit) - Only apply if hide scrollbar is not active */
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar {
                width: 8px !important;
                display: block !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 4px !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar-track {
                background: transparent !important;
            }
            
            /* Explicitly hide sidebar scrollbar when hideScrollbar feature is enabled */
            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary {
                scrollbar-width: none !important;
            }
            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary::-webkit-scrollbar {
                width: 0px !important;
                display: none !important;
                background: transparent !important;
            }

            /* Add some padding bottom so the last item isn't flush */
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #secondary-inner {
                padding-bottom: 40px !important;
            }
            
            /* Ensure the columns container allows the sticky behavior */
            body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden]) #columns {
                overflow: visible !important;
            }
        `;

        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = css;
        document.head.appendChild(style);
    }
};
