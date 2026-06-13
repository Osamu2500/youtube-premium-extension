/**
 * Feed Grid Columns (Subscriptions Columns)
 * Manages the CSS custom property for the number of columns on the Subscriptions feed.
 */
class FeedGridColumns extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'subscriptionsColumns'; }
    constructor() { super('FeedGridColumns'); }

    async enable() {
        if (this.settings.subscriptionsColumns) {
            document.documentElement.style.setProperty('--ypp-subscriptions-columns', this.settings.subscriptionsColumns);
        }
    }

    async disable() {
        document.documentElement.style.removeProperty('--ypp-subscriptions-columns');
    }

    async onUpdate() {
        if (this.settings.subscriptionsColumns) {
            document.documentElement.style.setProperty('--ypp-subscriptions-columns', this.settings.subscriptionsColumns);
        } else {
            document.documentElement.style.removeProperty('--ypp-subscriptions-columns');
        }
    }
}
window.YPP.features.FeedGridColumns = FeedGridColumns;
