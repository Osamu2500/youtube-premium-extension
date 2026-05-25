window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.RedirectHome = class RedirectHome extends window.YPP.features.BaseFeature {
    constructor() {
        super('RedirectHome');
        this._boundCheck = this._checkRedirect.bind(this);
    }
    getConfigKey() { return 'redirectHome'; }
    async enable() {
        await super.enable();
        this._checkRedirect();
        window.YPP.events?.on('page:changed', this._boundCheck);
    }
    async disable() {
        await super.disable();
        window.YPP.events?.off('page:changed', this._boundCheck);
    }
    _checkRedirect() {
        if (!this.settings?.redirectHome) return;
        if (location.pathname === '/' || location.pathname === '') {
            this.utils?.log('Redirecting Home to Subscriptions (UnTrap feature)', 'CONTENT');
            location.replace('/feed/subscriptions');
        }
    }
};
