class WatchPageManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/^\/watch/];
        
        this.state = {
            sidebar: 'default', // 'default', 'compact', 'hidden'
            viewMode: 'default', // 'default', 'cinema', 'minimal', 'zen', 'focus', 'study'
            comments: 'default', // 'default', 'hidden'
        };

        this.ROOT_SELECTORS = [
            'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
            'ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
            'ytd-watch-next-secondary-results-renderer ytd-lockup-view-model',
            'ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer'
        ];
    }

    onActivate() {
        this.utils.log('Watch Page Active', 'WATCH_MANAGER', 'info');
        this._cleanUpLegacyStamps();
        this._applyDOM();
    }

    onDeactivate() {
        this._cleanupDOM();
    }

    applySettings(settings) {
        // Evaluate settings to determine state
        // This acts as the single source of truth for the watch page layout
        
        let newSidebar = 'default';
        let newMode = 'default';
        let newComments = 'default';

        if (settings.sidebarLayout) {
            newSidebar = settings.sidebarLayout;
        }

        // Evaluate view modes (priority order)
        if (settings.studyMode) newMode = 'study';
        else if (settings.focusMode) newMode = 'focus';
        else if (settings.zenMode) newMode = 'zen';
        else if (settings.cinemaMode) newMode = 'cinema';
        else if (settings.minimalMode) newMode = 'minimal';

        if (settings.hideComments) newComments = 'hidden';

        this.setState({
            sidebar: newSidebar,
            viewMode: newMode,
            comments: newComments
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
        
        // 1. Reset all managed classes
        const classesToRemove = [
            'ypp-sidebar-compact', 'ypp-sidebar-expanded', 'ypp-sidebar-hidden',
            'ypp-cinema-mode', 'ypp-minimal-mode', 'ypp-zen-mode', 'ypp-focus-mode', 'ypp-study-mode',
            'ypp-hide-comments'
        ];
        body.classList.remove(...classesToRemove);

        // 2. Apply Sidebar
        if (this.state.sidebar === 'compact') body.classList.add('ypp-sidebar-compact');
        else if (this.state.sidebar === 'expanded') body.classList.add('ypp-sidebar-expanded');
        else if (this.state.sidebar === 'hidden' || ['zen', 'focus', 'study'].includes(this.state.viewMode)) {
            body.classList.add('ypp-sidebar-hidden'); // Force hide sidebar in extreme modes
        }

        // 3. Apply View Mode
        if (this.state.viewMode !== 'default') {
            body.classList.add(`ypp-${this.state.viewMode}-mode`);
        }

        // 4. Apply Comments
        if (this.state.comments === 'hidden' || ['zen', 'focus', 'study'].includes(this.state.viewMode)) {
            body.classList.add('ypp-hide-comments'); // Force hide comments in extreme modes
        }

        // Emit event for isolated features (like ZenMode canvas or StudyMode timer) to start/stop
        window.dispatchEvent(new CustomEvent('ypp-watch-mode-changed', { 
            detail: { mode: this.state.viewMode }
        }));
    }

    _cleanupDOM() {
        const classesToRemove = [
            'ypp-sidebar-compact', 'ypp-sidebar-expanded', 'ypp-sidebar-hidden',
            'ypp-cinema-mode', 'ypp-minimal-mode', 'ypp-zen-mode', 'ypp-focus-mode', 'ypp-study-mode',
            'ypp-hide-comments'
        ];
        document.body.classList.remove(...classesToRemove);
    }

    _cleanUpLegacyStamps() {
        // One-time cleanup of legacy DOM stamps left over from previous extension versions
        document.querySelectorAll('[data-ypp-processed-layout]').forEach(el => {
            el.removeAttribute('data-ypp-processed-layout');
        });

        // Clean up any legacy inline styles that might have been applied by earlier code
        document.querySelectorAll(this.ROOT_SELECTORS.join(', ')).forEach(node => {
            if (node.style) {
                node.style.removeProperty('display');
                node.style.removeProperty('margin-bottom');
            }

            const dismissible = node.querySelector('#dismissible') || node;
            if (dismissible && dismissible.style) {
                dismissible.style.removeProperty('display');
                dismissible.style.removeProperty('flex-direction');
                dismissible.style.removeProperty('width');
                dismissible.style.removeProperty('align-items');
                dismissible.style.removeProperty('gap');
            }

            const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
            if (thumbnail && thumbnail.style) {
                thumbnail.style.removeProperty('display');
                thumbnail.style.removeProperty('width');
                thumbnail.style.removeProperty('height');
                thumbnail.style.removeProperty('aspect-ratio');
                thumbnail.style.removeProperty('max-width');
                thumbnail.style.removeProperty('min-width');
                thumbnail.style.removeProperty('margin-bottom');
                thumbnail.style.removeProperty('border-radius');
                thumbnail.style.removeProperty('overflow');
                thumbnail.style.removeProperty('flex');
            }

            const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
            if (details && details.style) {
                details.style.removeProperty('display');
                details.style.removeProperty('flex-direction');
                details.style.removeProperty('flex');
                details.style.removeProperty('min-width');
                details.style.removeProperty('width');
                details.style.removeProperty('padding');
                details.style.removeProperty('align-items');
                details.style.removeProperty('gap');
            }

            const title = node.querySelector('#video-title, h3');
            if (title && title.style) {
                title.style.removeProperty('-webkit-line-clamp');
                title.style.removeProperty('max-height');
                title.style.removeProperty('white-space');
                title.style.removeProperty('overflow');
            }
        });
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.WatchPageManager = WatchPageManager;
