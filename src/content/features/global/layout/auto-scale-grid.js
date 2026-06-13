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
        const resizeListener = this.utils.debounce(this._boundApplyScale, 150);
        this.addListener(window, 'resize', resizeListener);
        // Force layout-manager to update instantly
        window.dispatchEvent(new Event('resize'));
    }

    async disable() {
        document.documentElement.style.setProperty('--ypp-auto-scale', 1);
        document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        this.cleanupEvents();
        // Force layout-manager to update instantly
        window.dispatchEvent(new Event('resize'));
    }
    
    async onUpdate() {
        if (this.settings && this.settings.autoScaleLayout) {
            this._applyScale();
        } else {
            this.disable(); // Need to disable to reset values
        }
    }

    _applyScale() {
        if (!this.settings || !this.settings.autoScaleLayout) return;

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
            
            // Set dynamic column override for layout-manager to read
            document.documentElement.style.setProperty('--ypp-dynamic-cols', cols);
        } else {
            document.documentElement.style.removeProperty('--ypp-dynamic-cols');
        }
    }
    
    onPageChange() {
        this._applyScale();
    }
};
