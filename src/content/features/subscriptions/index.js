// Main entry point for Subscriptions Feature
window.YPP.features.SubscriptionsOrganizer = class SubscriptionsOrganizer {
    constructor() {
        this.logger = new window.YPP.Utils.Logger('SubscriptionsOrganizer');
        this.manager = new window.YPP.features.SubscriptionManager();
        this.ui = new window.YPP.features.SubscriptionUI(this.manager);
    }

    async run(settings) {
        if (!settings.enableSubsManager) return; // Optional check if needed
        
        this.logger.info('Running Subscriptions Organizer');
        
        // Inject styles
        window.YPP.Utils.injectCSS('src/content/features/subscriptions/subscriptions.css', 'ypp-subs-css');

        await this.manager.init();
        this.ui.init();
    }
};
