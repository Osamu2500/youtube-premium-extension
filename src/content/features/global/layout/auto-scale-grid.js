window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Auto Scale Grid
 * Adjusts the global grid UI scale and columns based on window size.
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
        // Use debounce for resize listener
        this._resizeListener = this.utils.debounce(this._boundApplyScale, 150);
        this.addListener(window, 'resize', this._resizeListener);
        // Force layout-manager to update instantly
        window.dispatchEvent(new Event('resize'));
    }

    async disable() {
        document.documentElement.style.setProperty('--ypp-auto-scale', 1);
        document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        this.cleanupEvents();
        this._resizeListener = null;
        // Force layout-manager to update instantly
        window.dispatchEvent(new Event('resize'));
    }
    
    async onUpdate() {
        if (this.settings && this.settings.autoScaleLayout) {
            if (!this._resizeListener) {
                // If it was disabled, we need to fully re-enable it
                this.enable();
            } else {
                this._applyScale();
            }
        } else {
            this.disable(); // Need to disable to reset values
        }
    }

    _applyScale() {
        if (!this.settings || !this.settings.autoScaleLayout) return;

        // ✅ RESPECT MANUAL OVERRIDE: homeColumns === 0 means "auto" (use window-width calc).
        // homeColumns >= 1 means the user has picked a manual count — bail out and let
        // layout-manager read homeColumns directly; don't touch --ypp-dynamic-cols.
        const manualCols = Number(this.settings?.homeColumns || 0);
        if (manualCols > 0) {
            // Set --ypp-active-columns so the CSS :root selector has a value to match
            document.documentElement.style.setProperty('--ypp-active-columns', manualCols);
            // Clear any stale dynamic-cols so CSS doesn't fight the manual value
            document.documentElement.style.removeProperty('--ypp-dynamic-cols');
            // Still apply UI scale factor for spacing/fonts
            const uiScale = Math.max(0.7, Math.min(1.3, window.innerWidth / 1280));
            document.documentElement.style.setProperty('--ypp-auto-scale', uiScale);
            return;
        }

        // Auto mode: calculate columns from window width
        const path = window.location.pathname;
        const isHome = path === '/' || path === '/index';

        const availableWidth = window.innerWidth;
        const uiScale = Math.max(0.7, Math.min(1.3, availableWidth / 1280));
        document.documentElement.style.setProperty('--ypp-auto-scale', uiScale);

        if (isHome) {
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
            else if (width >= 600) cols = 2;
            else cols = 1;

            // Publish for layout-manager to consume
            document.documentElement.style.setProperty('--ypp-dynamic-cols', cols);
        } else {
            document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        }
    }

    onPageChange() {
        // Re-run in auto mode (homeColumns === 0) on every navigation.
        // In manual mode layout-manager already has the correct value — skip.
        const manualCols = this.settings?.homeColumns ?? 0;
        if (manualCols === 0) {
            this._applyScale();
        }
    }
};
