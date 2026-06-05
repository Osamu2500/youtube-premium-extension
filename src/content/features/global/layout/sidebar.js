/**
 * Sidebar Manager
 * Controls sidebar visibility and ensures proper state management.
 * Relies on CSS body classes: 'ypp-hide-sidebar' and 'ypp-floating-guide'.
 *
 * This feature is ALWAYS ACTIVE (getConfigKey returns null) because it
 * manages two independent settings (forceHideSidebar + floatingGuide).
 * The enable/disable logic is driven by those two flags in onUpdate().
 *
 * @class SidebarManager
 * @extends BaseFeature
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SidebarManager = class SidebarManager extends window.YPP.features.BaseFeature {

    constructor() {
        super('sidebarLayout');
        // _active tracks whether we have event listeners registered.
        // Distinct from BaseFeature.isEnabled which tracks the feature toggle.
        this._active = false;
    }

    /**
     * Always active — the feature decides internally whether to apply sidebar
     * hiding or floating guide based on the individual setting flags.
     */
    getConfigKey() { return null; }

    /**
     * Called by BaseFeature.update() on first enable.
     * Registers navigation listeners and applies initial state.
     */
    async enable() {
        if (this._active) return;
        this._active = true;

        // Use BaseFeature.addListener() so cleanup is automatic on disable()
        this.addListener(window, 'yt-navigate-finish', () => this._applyState());
        this.addListener(window, 'yt-page-data-updated', () => this._applyState());

        this._applyState();
        this.utils?.log('Sidebar Manager Enabled', 'SIDEBAR');
    }

    /**
     * Called by BaseFeature.update() when the feature is disabled.
     * BaseFeature.cleanupEvents() handles listener removal automatically.
     */
    async disable() {
        this._active = false;
        document.body?.classList.remove('ypp-hide-sidebar', 'ypp-floating-guide');
        await super.disable(); // calls cleanupEvents()
        this.utils?.log('Sidebar Manager Disabled', 'SIDEBAR');
    }

    /**
     * Called by BaseFeature.update() when settings change while already enabled.
     * Re-applies body classes without re-registering listeners.
     */
    async onUpdate() {
        this._applyState();
    }

    /**
     * Applies the correct CSS classes to document.body based on current settings.
     * Deferred via requestAnimationFrame to batch with paint cycle.
     * @private
     */
    _applyState() {
        if (!this.settings) return;

        requestAnimationFrame(() => {
            if (!document.body) return;

            document.body.classList.toggle('ypp-hide-sidebar', !!this.settings.forceHideSidebar);
            document.body.classList.toggle('ypp-floating-guide', !!this.settings.floatingGuide);
        });
    }

    /**
     * Toggle the guide sidebar if it's missing.
     * @private
     * @reserved — Reserved for a future sidebar toggle feature.
     */
    _toggleGuideIfMissing() {
        try {
            const selectors = window.YPP.CONSTANTS?.SELECTORS;
            if (!selectors) return;
            const guide = document.querySelector(selectors.MAIN_GUIDE);
            if (!guide) {
                const btn = document.querySelector(selectors.GUIDE_BUTTON);
                if (btn) {
                    btn.click();
                } else {
                    this.utils?.log('Guide button not found, cannot toggle sidebar.', 'SIDEBAR', 'warn');
                }
            }
        } catch (error) {
            this.utils?.log(`Error toggling guide: ${error.message}`, 'SIDEBAR', 'error');
        }
    }
};
