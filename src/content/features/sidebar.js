/**
 * Sidebar Manager (Redesign)
 * Starting fresh to place sidebar on homepage first.
 */
window.YPP = window.YPP || {};
/**
 * Sidebar Manager
 * Controls sidebar visibility and ensures proper state management.
 * @class SidebarManager
 */
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
        // Logic: if forceHideSidebar is enabled OR we just want to control it
        // For now, let's say we always "enable" it to manage visibility,
        // unless disabled entirely.
        if (settings.forceHideSidebar) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable sidebar management
     */
    enable() {
        if (this.isEnabled) {
            this.ensureSidebarVisible();
            return;
        }
        this.isEnabled = true;
        this.Utils.log('Sidebar Manager Enabled', 'SIDEBAR');

        this.ensureSidebarVisible();

        window.addEventListener('yt-page-data-updated', this.handleNavigation);
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
    }

    /**
     * Disable sidebar management and cleanup
     */
    disable() {
        if (!this.isEnabled) return;

        this.isEnabled = false;
        document.body.classList.remove('ypp-hide-sidebar');

        window.removeEventListener('yt-page-data-updated', this.handleNavigation);
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
        this.Utils.log('Sidebar Manager Disabled', 'SIDEBAR');
    }

    /**
     * Handle navigation events to re-apply sidebar state
     */
    handleNavigation() {
        if (this.isEnabled) this.ensureSidebarVisible();
    }

    /**
     * Ensure sidebar visibility class is applied
     */
    ensureSidebarVisible() {
        if (!this.isEnabled) return;

        // Use requestAnimationFrame to ensure DOM is ready and avoid layout thrashing
        requestAnimationFrame(() => {
            document.body.classList.add('ypp-hide-sidebar');
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
