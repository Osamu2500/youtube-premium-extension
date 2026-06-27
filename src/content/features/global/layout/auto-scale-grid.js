window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Auto Scale Grid
 * Adjusts the global grid UI scale (fonts/spacing) and auto column count based on window size.
 * 
 * IMPORTANT: AutoScaleGrid ONLY controls the home page in auto mode (homeColumns === 0).
 * It publishes --ypp-dynamic-cols which layout-manager reads on each applyGridLayout() call.
 * It signals layout-manager by dispatching a synthetic 'resize' event, which triggers
 * layout-manager's debounced resize listener — clean, decoupled, no circular calls.
 */
window.YPP.features.AutoScaleGrid = class AutoScaleGrid extends window.YPP.features.BaseFeature {
    constructor() {
        super('AutoScaleGrid');
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this._boundApplyScale = this._applyScale.bind(this);
    }

    getConfigKey() {
        return 'autoScaleLayout';
    }

    async enable() {
        this._applyScale();
        // Debounced resize listener so window resizing doesn't thrash
        this._resizeListener = this.utils.debounce(this._boundApplyScale, 150);
        this.addListener(window, 'resize', this._resizeListener);
        // Signal layout-manager to re-apply with the new --ypp-dynamic-cols value
        window.dispatchEvent(new Event('resize'));
    }

    async disable() {
        // Reset scale and clear the dynamic cols var
        document.documentElement.style.setProperty('--ypp-auto-scale', 1);
        document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        this.cleanupEvents();
        this._resizeListener = null;
        // Signal layout-manager to fall back to manual/default columns
        window.dispatchEvent(new Event('resize'));
    }

    async onUpdate() {
        if (this.settings && this.settings.autoScaleLayout) {
            if (!this._resizeListener) {
                // Was disabled — re-enable fully
                this.enable();
            } else {
                this._applyScale();
                window.dispatchEvent(new Event('resize'));
            }
        } else {
            this.disable();
        }
    }

    /**
     * Calculates and publishes auto column count for the home page
     * based on window/grid width, and sets the UI scale factor.
     * Only runs when autoScaleLayout is true.
     * Only publishes --ypp-dynamic-cols on the home page (/ or /index).
     */
    _applyScale() {
        if (!this.settings || !this.settings.autoScaleLayout) return;

        const path = window.location.pathname;
        const isHome = path === '/' || path === '/index';

        const availableWidth = window.innerWidth;
        const uiScale = Math.max(0.7, Math.min(1.3, availableWidth / 1280));
        document.documentElement.style.setProperty('--ypp-auto-scale', uiScale);

        if (isHome) {
            // Only publish auto cols when user hasn't set a manual override
            const manualCols = Number(this.settings?.homeColumns || 0);
            if (manualCols > 0) {
                // Manual override active — don't touch --ypp-dynamic-cols
                // layout-manager will use homeColumns directly
                document.documentElement.style.removeProperty('--ypp-dynamic-cols');
                return;
            }

            const gridRenderer = document.querySelector('ytd-rich-grid-renderer');
            let width = window.innerWidth;
            if (gridRenderer && gridRenderer.clientWidth > 0) {
                width = gridRenderer.clientWidth;
            }

            let cols = 4;
            if (width >= 2100) cols = 6;
            else if (width >= 1800) cols = 5;
            else if (width >= 1400) cols = 4;
            else if (width >= 1000) cols = 3;
            else if (width >= 600)  cols = 2;
            else cols = 1;

            // Publish for layout-manager to consume via applyGridLayout()
            document.documentElement.style.setProperty('--ypp-dynamic-cols', cols);
        } else {
            // Not on home — clear dynamic cols
            document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        }
    }

    onPageChange() {
        // Re-run on every SPA navigation to recalculate for the current page
        this._applyScale();
    }
};
