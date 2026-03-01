// Main entry point for Subscriptions Feature
window.YPP.features.SubscriptionsOrganizer = class SubscriptionsOrganizer {
    constructor() {
        this.logger = window.YPP.Utils || console;
        this.manager = new window.YPP.features.SubscriptionManager();
        this.ui = new window.YPP.features.SubscriptionUI(this.manager);
    }

    async run(settings) {
        if (!settings.enableSubsManager) return; // Optional check if needed
        
        // Prevent collision with the newer Native Subscription Folders feature
        if (settings.subscriptionFolders) {
             this.logger.info('Native Subscription Folders is active. Legacy SubscriptionsOrganizer is disabled to prevent conflicts.');
             return;
        }
        
        this.logger.info('Running Subscriptions Organizer');
        
        // Inject styles
        window.YPP.Utils.injectCSS('src/content/features/pages/subscriptions/subscriptions.css', 'ypp-subs-css');

        await this.manager.init();
        this.ui.init();
    }
};
