/**
 * Sidebar Manager
 * Controls sidebar visibility and ensures proper state management.
 * Relies on the 'ypp-hide-sidebar' body class to hide the guide/sidebar.
 * @class SidebarManager
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SidebarManager = class SidebarManager {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        /** @type {boolean} Internal state tracking if the manager is active */
        this.isEnabled = false;
        /** @type {Object|null} Current user settings */
        this.settings = null;

        // Bind methods for safe event removal
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    /**
     * Update settings and apply changes
     * @param {Object} settings - Updated settings
     */
    update(settings) {
        this.settings = settings;
        // Logic: if forceHideSidebar or hoverSidebar is enabled, enable manager
        if (settings.forceHideSidebar || settings.hoverSidebar) {
            this.enable(); 
        } else {
            this.disable(); 
        }
    }

    /**
     * Enable sidebar management
     */
    enable() {
        if (!this.isEnabled) {
            this.isEnabled = true;
            this.Utils.log('Sidebar Manager Enabled', 'SIDEBAR');
            window.addEventListener('yt-page-data-updated', this.handleNavigation);
            window.addEventListener('yt-navigate-finish', this.handleNavigation);
        }
        this.ensureSidebarState();
    }

    /**
     * Disable sidebar management and cleanup
     */
    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        document.body.classList.remove('ypp-hide-sidebar', 'ypp-hover-sidebar');

        window.removeEventListener('yt-page-data-updated', this.handleNavigation);
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
        this.Utils.log('Sidebar Manager Disabled', 'SIDEBAR');
    }

    /**
     * Handle navigation events to re-apply sidebar state
     */
    handleNavigation() {
        if (this.isEnabled) this.ensureSidebarState();
    }

    /**
     * Ensures the correct CSS class is applied to the body based on settings.
     * Note: `forceHideSidebar` (Zen Mode) takes strict precedence over `hoverSidebar` (Top Drawer).
     * Uses `requestAnimationFrame` to ensure the DOM is ready and avoid layout thrashing.
     */
    ensureSidebarState() {
        if (!this.isEnabled || !this.settings) return;

        // Use requestAnimationFrame to ensure DOM is ready and avoid layout thrashing
        requestAnimationFrame(() => {
            if (!document.body) return;

            if (this.settings.forceHideSidebar) {
                document.body.classList.add('ypp-hide-sidebar');
                document.body.classList.remove('ypp-hover-sidebar');
            } else if (this.settings.hoverSidebar) {
                document.body.classList.add('ypp-hover-sidebar');
                document.body.classList.remove('ypp-hide-sidebar');
            } else {
                document.body.classList.remove('ypp-hide-sidebar', 'ypp-hover-sidebar');
            }
        });
    }

    /**
     * Toggle the guide sidebar if it's missing
     * @private
     * @reserved - Reserved for future sidebar toggle feature
     */
    toggleGuideIfMissing() {
        try {
            const guide = document.querySelector(this.CONSTANTS.SELECTORS.MAIN_GUIDE);
            if (!guide) {
                const btn = document.querySelector(this.CONSTANTS.SELECTORS.GUIDE_BUTTON);
                if (btn) {
                    btn.click();
                } else {
                    this.Utils.log('Guide button not found, cannot toggle sidebar.', 'SIDEBAR', 'warn');
                }
            }
        } catch (error) {
            this.Utils.log(`Error toggling guide: ${error.message}`, 'SIDEBAR', 'error');
        }
    }
};
