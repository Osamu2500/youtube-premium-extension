// @ts-nocheck
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Classic Progress Bar Feature
 * Enforces the solid red progress bar and removes the pink gradient added by modern YouTube UI.
 */
window.YPP.features.ClassicProgressBar = class ClassicProgressBar extends window.YPP.features.BaseFeature {
    constructor() {
        super('ClassicProgressBar');
        this.styleId = 'ypp-classic-progress-bar-style';
    }

    getConfigKey() {
        return 'revertProgressBar';
    }

    async enable() {
        await super.enable();
        this.injectCSS();
    }

    async disable() {
        await super.disable();
        this.removeCSS();
    }

    injectCSS() {
        if (document.getElementById(this.styleId)) return;
        
        const style = document.createElement('style');
        style.id = this.styleId;
        style.textContent = `
            /* Remove modern gradient from progress bar */
            .ytp-swatch-background-color {
                background: #f00 !important;
                background-color: #f00 !important;
            }
            
            /* Remove the gradient that appears on hover/drag */
            .ytp-progress-list {
                background: rgba(255, 255, 255, 0.2) !important;
            }
            
            .ytp-play-progress {
                background: #f00 !important;
                background-color: #f00 !important;
            }
            
            /* Ensure chapters still have separators */
            .ytp-chapter-hover-container {
                background-color: transparent !important;
            }
            
            /* Keep scrubber button red */
            .ytp-scrubber-button {
                background: #f00 !important;
                background-color: #f00 !important;
                box-shadow: none !important;
            }
        `;
        document.head.appendChild(style);
        if (this.utils?.log) this.utils.log('Classic Progress Bar CSS injected', 'UI');
    }

    removeCSS() {
        const style = document.getElementById(this.styleId);
        if (style) {
            style.remove();
            if (this.utils?.log) this.utils.log('Classic Progress Bar CSS removed', 'UI');
        }
    }
};
