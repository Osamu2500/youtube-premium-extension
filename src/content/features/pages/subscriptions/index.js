// Main entry point for Subscriptions Feature
window.YPP.features.SubscriptionsOrganizer = class SubscriptionsOrganizer extends window.YPP.features.BaseFeature {
    constructor() {
        super('SubscriptionsOrganizer');
        this.manager = new window.YPP.features.SubscriptionManager();
        this.ui = new window.YPP.features.SubscriptionUI(this.manager);
    }

    getConfigKey() {
        return null; // Will manually abort if conditions fail
    }

    async enable() {
        if (!this.settings?.enableSubsManager) return;
        
        // Prevent collision with the newer Native Subscription Folders feature
        if (this.settings?.subscriptionFolders) {
             this.utils?.log('Native Subscription Folders is active. Legacy SubscriptionsOrganizer is disabled.', 'SubscriptionsOrganizer', 'info');
             return;
        }
        
        await super.enable();
        this.utils?.log('Starting Subscriptions Organizer', 'SubscriptionsOrganizer');
        
        // Inject styles
        this.utils?.injectCSS('src/content/features/pages/subscriptions/subscriptions.css', 'ypp-subs-css');

        // Share the BaseFeature observer with the UI module
        this.ui.observer = this.observer;
        
        await this.manager.init();
        this.ui.enable();
    }
    
    async disable() {
        await super.disable();
        if (this.ui && typeof this.ui.disable === 'function') {
             this.ui.disable();
        }
        this.utils?.removeStyle('ypp-subs-css');
    }
};
