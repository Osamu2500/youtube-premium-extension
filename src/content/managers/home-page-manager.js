class HomePageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        // Home page is strictly '/' or '/?.*' but not '/watch' etc.
        this.matchPatterns = [/^\/$/];
        
        this.state = {
            viewMode: 'default', // 'default', 'cinematic'
            shorts: 'default', // 'default', 'hidden', 'redirect'
            feed: 'default' // 'default', 'hook-free', 'detox'
        };
    }

    onActivate() {
        this.utils.log('Home Page Active', 'HOME_MANAGER', 'info');
        this._applyDOM();
    }

    onDeactivate() {
        this._cleanupDOM();
    }

    applySettings(settings) {
        let newMode = 'default';
        let newShorts = 'default';
        let newFeed = 'default';

        if (settings.cinematicTheme) newMode = 'cinematic';
        
        if (settings.hideShorts) newShorts = 'hidden';
        else if (settings.redirectShorts) newShorts = 'redirect';

        if (settings.dopamineDetox) newFeed = 'detox';
        else if (settings.hookFreeHome) newFeed = 'hook-free';

        this.setState({
            viewMode: newMode,
            shorts: newShorts,
            feed: newFeed
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
            'ypp-cinematic-home', 'ypp-hide-shorts', 'ypp-redirect-shorts',
            'ypp-dopamine-detox', 'ypp-hook-free-home'
        ];
        body.classList.remove(...classesToRemove);

        if (this.state.viewMode === 'cinematic') body.classList.add('ypp-cinematic-home');
        
        if (this.state.shorts === 'hidden') body.classList.add('ypp-hide-shorts');
        else if (this.state.shorts === 'redirect') body.classList.add('ypp-redirect-shorts');

        if (this.state.feed === 'detox') body.classList.add('ypp-dopamine-detox');
        else if (this.state.feed === 'hook-free') body.classList.add('ypp-hook-free-home');

        // Emit event for isolated features
        window.dispatchEvent(new CustomEvent('ypp-home-mode-changed', { 
            detail: this.state
        }));
    }

    _cleanupDOM() {
        const classesToRemove = [
            'ypp-cinematic-home', 'ypp-hide-shorts', 'ypp-redirect-shorts',
            'ypp-dopamine-detox', 'ypp-hook-free-home'
        ];
        document.body.classList.remove(...classesToRemove);
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.HomePageManager = HomePageManager;
