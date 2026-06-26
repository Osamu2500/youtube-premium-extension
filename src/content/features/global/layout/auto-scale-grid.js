window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Auto Scale Grid
 * Adjusts the global grid UI scale (spacing/fonts) based on window size.
 * Column count is computed via calculateColumns() and consumed by LayoutManager.
 * AutoScaleGrid NEVER writes --ypp-dynamic-cols or --ypp-active-columns directly
 * so it cannot race with the manual column slider.
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

    /**
     * Pure calculation — no DOM side-effects.
     * LayoutManager calls this instead of reading a CSS variable.
     * @returns {number} computed column count based on current window/grid width
     */
    static calculateColumns() {
        const gridRenderer = document.querySelector('ytd-rich-grid-renderer');
        let width = window.innerWidth;
        if (gridRenderer && gridRenderer.clientWidth > 0) {
            width = gridRenderer.clientWidth;
        }
        if (width >= 2100) return 6;
        if (width >= 1800) return 5;
        if (width >= 1400) return 4;
        if (width >= 1000) return 3;
        if (width >= 600)  return 2;
        return 1;
    }

    async enable() {
        this._applyScale();
        this._resizeListener = this.utils.debounce(this._boundApplyScale, 150);
        this.addListener(window, 'resize', this._resizeListener);
    }

    async disable() {
        // Only reset the UI scale — column vars are owned by LayoutManager.
        document.documentElement.style.setProperty('--ypp-auto-scale', 1);
        document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        this.cleanupEvents();
        this._resizeListener = null;

        // Signal LayoutManager to re-evaluate immediately now that auto-scale is off.
        const layoutFeature = window.YPP?.featureManager?.getFeature?.('layout');
        if (layoutFeature && typeof layoutFeature.onUpdate === 'function' && layoutFeature.settings) {
            layoutFeature.onUpdate();
        }
    }

    async onUpdate() {
        if (this.settings && this.settings.autoScaleLayout) {
            if (!this._resizeListener) {
                this.enable();
            } else {
                this._applyScale();
            }
        } else {
            this.disable();
        }
    }

    /**
     * Applies ONLY the UI scale factor (spacing/font scaling).
     * Column decisions belong exclusively to LayoutManager.
     */
    _applyScale() {
        if (!this.settings || !this.settings.autoScaleLayout) return;

        const uiScale = Math.max(0.7, Math.min(1.3, window.innerWidth / 1280));
        document.documentElement.style.setProperty('--ypp-auto-scale', uiScale);

        // Signal LayoutManager to pick up the auto column count via onUpdate.
        // This is debounced on the resize path so it won't spam.
        const layoutFeature = window.YPP?.featureManager?.getFeature?.('layout');
        if (layoutFeature && typeof layoutFeature.applyGridLayout === 'function') {
            layoutFeature._processedContainers = new WeakSet();
            layoutFeature.applyGridLayout();
        }
    }

    onPageChange() {
        // Only recompute in auto mode (homeColumns === 0).
        const manualCols = Number(this.settings?.homeColumns ?? 0);
        if (manualCols === 0 && this.settings?.autoScaleLayout) {
            this._applyScale();
        }
    }
};
