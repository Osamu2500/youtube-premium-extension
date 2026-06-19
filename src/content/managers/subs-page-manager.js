class SubscriptionsPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/feed\/subscriptions/];
        
        // Initialize features managed by this page
        this.features = {
            deckMode: new window.YPP.features.DeckMode(),
            // Ensure folder UI features are managed here if needed
            folderUi: window.YPP.features.FolderUI ? new window.YPP.features.FolderUI() : null,
            subscriptionsUi: window.YPP.features.SubscriptionsUI ? new window.YPP.features.SubscriptionsUI() : null
        };
    }

    onActivate() {
        this.utils.log('Subscriptions Page Active', 'SUBS_MANAGER', 'info');
    }

    onDeactivate() {
        this.utils.log('Subscriptions Page Deactivated', 'SUBS_MANAGER', 'info');
        // Disable features that shouldn't persist outside the subs page
        Object.values(this.features).forEach(feature => {
            if (feature?.disable) feature.disable();
        });
    }

    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        if (!this.isActive) return;

        // Apply Deck Mode if enabled
        if (this.features.deckMode) {
            if (this.settings.enableDeckMode) {
                this.features.deckMode.enable();
            } else {
                this.features.deckMode.disable();
            }
        }

        // Apply Folders if enabled
        if (this.features.folderUi) {
            if (this.settings.subscriptionFolders) {
                this.features.folderUi.enable();
                this.features.subscriptionsUi?.enable();
            } else {
                this.features.folderUi.disable();
                this.features.subscriptionsUi?.disable();
            }
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.SubscriptionsPageManager = SubscriptionsPageManager;
