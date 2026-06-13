/**
 * DistractionFreeBase
 * Base class for Focus, Zen, Study, Cinema, and Minimal modes.
 * Centralizes layout manipulation, sidebar collapsing, and element hiding.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DistractionFreeBase = class DistractionFreeBase extends window.YPP.features.BaseFeature {
    constructor(featureName) {
        super(featureName);
    }

    /**
     * Applies the layout modifications required for distraction-free viewing
     * @param {string} modeClass - The CSS class applied to the body (e.g., 'ypp-focus-mode')
     * @param {Object} options - Defines what to hide and how to expand the player
     * @param {boolean} options.hideSidebar - Collapses the right sidebar completely
     * @param {boolean} options.hideComments - Hides the comments section
     * @param {boolean} options.hideRelated - Hides related videos feed
     * @param {boolean} options.hideShorts - Hides shorts shelf
     * @param {string} options.playerMaxWidth - CSS max-width for the primary container (e.g., '1000px', '100%')
     */
    enableDistractionFreeLayout(modeClass, options = {}) {
        document.body.classList.add(modeClass);

        if (options.hideRelated) document.body.classList.add('ypp-hide-related');
        if (options.hideComments) document.body.classList.add('ypp-hide-comments');
        if (options.hideShorts) document.body.classList.add('ypp-hide-shorts');

        this._applyLayoutStyles(modeClass, options);
    }

    /**
     * Removes layout modifications
     * @param {string} modeClass - The CSS class to remove
     * @param {Object} options - Must match the options provided to enableDistractionFreeLayout
     */
    disableDistractionFreeLayout(modeClass, options = {}) {
        document.body.classList.remove(modeClass);

        if (options.hideRelated) document.body.classList.remove('ypp-hide-related');
        if (options.hideComments) document.body.classList.remove('ypp-hide-comments');
        if (options.hideShorts) document.body.classList.remove('ypp-hide-shorts');

        this._removeLayoutStyles(modeClass);
    }

    /**
     * Dynamically injects CSS for player expansion and sidebar collapsing
     * @private
     */
    _applyLayoutStyles(modeClass, options) {
        const styleId = `ypp-layout-style-${modeClass}`;
        let style = document.getElementById(styleId);

        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        let css = `
            /* Base transition for smooth layout changes */
            ytd-watch-flexy[flexy] #columns,
            ytd-watch-flexy[flexy] #primary,
            ytd-watch-flexy[flexy] #secondary {
                transition: max-width 0.4s cubic-bezier(0.2, 0, 0, 1), 
                            width 0.4s cubic-bezier(0.2, 0, 0, 1), 
                            opacity 0.3s ease,
                            min-width 0.4s cubic-bezier(0.2, 0, 0, 1) !important;
            }
        `;

        if (options.hideSidebar) {
            css += `
                body.${modeClass} ytd-watch-flexy:not([theater]) #columns {
                    --ytd-watch-flexy-sidebar-width: 0px !important;
                }
                body.${modeClass} #secondary {
                    opacity: 0;
                    pointer-events: none;
                    width: 0 !important;
                    min-width: 0 !important;
                    overflow: hidden !important;
                    flex: 0 !important;
                }
            `;
        }

        if (options.playerMaxWidth) {
            css += `
                body.${modeClass} #primary {
                    max-width: ${options.playerMaxWidth} !important;
                    margin: 0 auto !important;
                }
            `;
        }

        style.textContent = css;
    }

    /**
     * Removes dynamically injected CSS
     * @private
     */
    _removeLayoutStyles(modeClass) {
        const style = document.getElementById(`ypp-layout-style-${modeClass}`);
        if (style) style.remove();
    }
};
