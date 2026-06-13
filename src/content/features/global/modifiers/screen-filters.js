window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ScreenFilters = class ScreenFilters extends window.YPP.features.BaseFeature {
    constructor() {
        super('ScreenFilters');
        this.filterOverlay = null;
    }

    getConfigKey() {
        return null; // Handle manually based on multiple settings
    }

    async enable() {
        this._updateFilters();
    }

    async disable() {
        if (this.filterOverlay) {
            this.filterOverlay.remove();
            this.filterOverlay = null;
        }
    }

    async onUpdate() {
        this._updateFilters();
    }

    _updateFilters() {
        const s = this.settings || {};
        const blueLight = s.blueLight || 0;
        const dim = s.dim || 0;

        if (blueLight === 0 && dim === 0) {
            this.disable();
            return;
        }

        if (!this.filterOverlay) {
            this.filterOverlay = document.createElement('div');
            this.filterOverlay.className = 'ypp-screen-filter';
            Object.assign(this.filterOverlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: '9999999',
                mixBlendMode: 'multiply',
                transition: 'background 0.3s ease'
            });
            document.documentElement.appendChild(this.filterOverlay);
        }

        // Calculate blended color
        // Blue light reduces blue/green, basically a warm orange overlay. 
        // 100 blueLight = approx rgba(255, 140, 0, 0.4)
        // 100 dim = rgba(0, 0, 0, 0.8)
        
        let overlayCss = '';
        
        if (blueLight > 0 && dim === 0) {
            const opacity = (blueLight / 100) * 0.4;
            overlayCss = `rgba(255, 150, 0, ${opacity})`;
        } else if (dim > 0 && blueLight === 0) {
            const opacity = (dim / 100) * 0.8;
            overlayCss = `rgba(0, 0, 0, ${opacity})`;
        } else {
            // Combine both: just use multiple backgrounds or a solid mix
            // Multiple backgrounds on a single div is perfectly valid in CSS!
            const blueOp = (blueLight / 100) * 0.4;
            const dimOp = (dim / 100) * 0.8;
            // Since it's multiply blend mode, we can stack gradients or background layers
            overlayCss = `linear-gradient(rgba(255, 150, 0, ${blueOp}), rgba(255, 150, 0, ${blueOp})), linear-gradient(rgba(0, 0, 0, ${dimOp}), rgba(0, 0, 0, ${dimOp}))`;
            this.filterOverlay.style.background = overlayCss;
            return;
        }

        this.filterOverlay.style.background = overlayCss;
    }
};
