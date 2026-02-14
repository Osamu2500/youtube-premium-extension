// Main entry point for Subscriptions Feature
window.YPP.features.SubscriptionsOrganizer = class SubscriptionsOrganizer {
    constructor() {
        this.logger = new window.YPP.Utils.Logger('SubscriptionsOrganizer');
        this.manager = new window.YPP.features.SubscriptionManager();
        this.ui = new window.YPP.features.SubscriptionUI(this.manager);
    }

    async run(settings) {
        this.logger.info('Running Subscriptions Organizer');
        
        // Inject styles
        const cssUrl = chrome.runtime.getURL('src/content/features/subscriptions/subscriptions.css');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        document.head.appendChild(link);

        await this.manager.init();
        this.ui.init();
    }
};
