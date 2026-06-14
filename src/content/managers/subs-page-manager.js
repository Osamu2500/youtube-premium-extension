class SubscriptionsPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/feed\/subscriptions/];
        
        this.state = {
            viewMode: 'default', // 'default', 'deck', 'grid'
            folders: 'default', // 'default', 'enabled'
        };
    }

    onActivate() {
        this.utils.log('Subscriptions Page Active', 'SUBS_MANAGER', 'info');
        this._applyDOM();
    }

    onDeactivate() {
        this._cleanupDOM();
    }

    applySettings(settings) {
        let newMode = 'default';
        let newFolders = 'default';

        if (settings.deckMode) newMode = 'deck';
        if (settings.subscriptionFolders) newFolders = 'enabled';

        this.setState({
            viewMode: newMode,
            folders: newFolders
        });
    }

    setState(newState) {
        let changed = false;
        for (const [key, value] of Object.entries(newState)) {
            if (this.state[key] !== value) {
                this.state[key] = value;
                changed = true;
            }
        }
        
        if (changed && this.isActive) {
            this._applyDOM();
        }
    }

    _applyDOM() {
        const body = document.body;
        
        const classesToRemove = [
            'ypp-subs-deck-mode', 'ypp-subs-folders-enabled'
        ];
        body.classList.remove(...classesToRemove);

        if (this.state.viewMode === 'deck') body.classList.add('ypp-subs-deck-mode');
        if (this.state.folders === 'enabled') body.classList.add('ypp-subs-folders-enabled');

        window.dispatchEvent(new CustomEvent('ypp-subs-mode-changed', { 
            detail: this.state
        }));
    }

    _cleanupDOM() {
        const classesToRemove = [
            'ypp-subs-deck-mode', 'ypp-subs-folders-enabled'
        ];
        document.body.classList.remove(...classesToRemove);
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.SubscriptionsPageManager = SubscriptionsPageManager;
