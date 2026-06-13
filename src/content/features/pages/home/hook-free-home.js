window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Hook-Free Home
 * Hides the home feed entirely to prevent doomscrolling.
 */
window.YPP.features.HookFreeHome = class HookFreeHome extends window.YPP.features.BaseFeature {
    constructor() {
        super('HookFreeHome');
        this.CONSTANTS = window.YPP.CONSTANTS || {};
        this.CSS_CLASS = this.CONSTANTS.CSS_CLASSES?.HOOK_FREE || 'ypp-hook-free';
    }

    getConfigKey() {
        return 'hookFreeHome';
    }

    async enable() {
        document.documentElement.classList.add(this.CSS_CLASS);
        document.body.classList.add(this.CSS_CLASS);
    }

    async disable() {
        document.documentElement.classList.remove(this.CSS_CLASS);
        document.body.classList.remove(this.CSS_CLASS);
    }
    
    async onUpdate() {
        // Controlled completely by enable/disable state from BaseFeature
    }
};
