/**
 * Header Navigation Manager - Creates custom navigation buttons in the header
 * @class HeaderNav
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav extends window.YPP.features.BaseFeature {

    static ICONS = {
        Subscriptions: '<rect x="2" y="6" width="20" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></rect><polygon points="10 9 15 12 10 15 10 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        Shorts: '<rect x="5" y="2" width="14" height="20" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></rect><polygon points="10 9 14 12 10 15 10 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        WatchLater: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle><polyline points="12 7 12 12 15 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>',
        Playlists: '<line x1="12" y1="12" x2="20" y2="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><line x1="16" y1="6" x2="20" y2="6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><line x1="12" y1="18" x2="20" y2="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><polygon points="4 6 8 8.5 4 11 4 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        History: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 7v5l4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'
    };

    constructor() {
        // FIX 1: super() MUST be called before any `this` access in a derived class
        super('HeaderNav');

        this._currentUrl = window.location.pathname + window.location.search;
        this._boundHandleNavigate = this._handleNavigate.bind(this);
        this._domObserver = window.YPP.sharedObserver;
    }

    getConfigKey() {
        // Feature is enabled if ANY nav button is on, or sidebar/logo settings are active
        return null; // We handle our own enable logic inside enable()
    }

    // =========================================================================
    // LIFECYCLE  (BaseFeature calls enable() / disable() — no settings arg)
    // =========================================================================

    async enable() {
        // this.settings is already set by BaseFeature.update() before enable() is called
        const s = this.settings || {};

        const shouldRun = s.navShorts || s.navSubscriptions || s.navWatchLater ||
            s.navPlaylists || s.navHistory || s.forceHideSidebar || s.logoRedirectSub;

        if (!shouldRun) return; // No nav items configured — nothing to do

        this._applySidebarState();
        this._observeHeader();
    }

    async disable() {
        if (this._domObserver) {
            this._domObserver.unregister('header-nav-end');
        }

        if (window.YPP.ui?.manager) {
            window.YPP.ui.manager.remove('header-nav-group');
        }

        window.removeEventListener('yt-navigate-finish', this._boundHandleNavigate);

        // Call super to clean up any tracked listeners
        await super.disable();
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    _applySidebarState() {
        document.body.classList.toggle('ypp-hide-sidebar', !!(this.settings?.forceHideSidebar));
    }

    _observeHeader() {
        if (!this._domObserver) return;

        this._domObserver.start();

        // Watch for ytd-masthead #end — our injection target
        this._domObserver.register(
            'header-nav-end',
            'ytd-masthead #end',
            () => {
                // #end appeared (or was re-rendered) — re-inject and heal
                this._scheduleInjection();
                window.YPP.ui?.manager?.heal();
            },
            true  // immediate: trigger if #end already exists
        );

        // Initial injection attempt (covers cases where #end is already in DOM)
        this._scheduleInjection();

        // Keep active state updated on SPA navigation
        window.addEventListener('yt-navigate-finish', this._boundHandleNavigate);
    }

    _handleNavigate() {
        this._currentUrl = window.location.pathname + window.location.search;
        this._updateActiveStates();
        // Re-inject in case navigation wiped the header
        this._scheduleInjection();
    }

    _scheduleInjection() {
        requestAnimationFrame(() => this._injectButtons());
    }

    _injectButtons() {
        const s = this.settings || {};

        // Button definitions (only include enabled ones)
        const allButtons = [
            { setting: 'navSubscriptions', label: 'Subscriptions', url: '/feed/subscriptions', icon: HeaderNav.ICONS.Subscriptions },
            { setting: 'navShorts',        label: 'Shorts',        url: '/shorts',             icon: HeaderNav.ICONS.Shorts },
            { setting: 'navWatchLater',    label: 'Watch Later',   url: '/playlist?list=WL',   icon: HeaderNav.ICONS.WatchLater },
            { setting: 'navPlaylists',     label: 'Playlists',     url: '/feed/playlists',     icon: HeaderNav.ICONS.Playlists },
            { setting: 'navHistory',       label: 'History',       url: '/feed/history',       icon: HeaderNav.ICONS.History }
        ];

        const activeButtons = allButtons.filter(btn => s[btn.setting]);

        if (activeButtons.length === 0) return;

        // If already mounted and still in DOM, just update active states
        const existing = document.querySelector('[data-ypp-id="header-nav-group"]');
        if (existing) {
            this._updateActiveStates();
            return;
        }

        if (!window.YPP.ui?.manager || !window.YPP.ui?.components?.createButton) {
            this.utils?.log('UIManager or button factory not ready yet', 'HEADERNAV', 'warn');
            return;
        }

        const navGroup = document.createElement('div');
        navGroup.className = 'ypp-nav-group';

        activeButtons.forEach(cfg => {
            this._createButton(navGroup, cfg.label, cfg.url, cfg.icon, cfg.setting);
        });

        window.YPP.ui.manager.mount('headerRight', { id: 'header-nav-group', el: navGroup }, 'prepend');

        this._updateActiveStates();
    }

    _createButton(container, label, url, svgContent, idSuffix) {
        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this._isCurrentPage(url)) {
                this._navigateTo(url);
            }
        };

        const component = window.YPP.ui.components.createButton({
            id: `nav-${idSuffix}`,
            icon: `<svg viewBox="0 0 24 24" class="ypp-nav-icon" style="pointer-events:none;display:block;width:24px;height:24px;">${svgContent}</svg>`,
            tooltip: label,
            onClick: handleClick,
            className: 'ypp-nav-btn'
        });

        component.el.dataset.url = url;
        component.el.setAttribute('tabindex', '0');
        component.el.setAttribute('role', 'button');
        component.el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
            }
        });

        container.appendChild(component.el);
    }

    _isCurrentPage(url) {
        const path = window.location.pathname;
        if (url === '/shorts') return path.startsWith('/shorts/');
        if (url.includes('?')) return path.includes(url.split('?')[0]);
        return path === url || path === url + '/';
    }

    _navigateTo(url) {
        const link = document.createElement('a');
        link.href = url;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 100);
    }

    _updateActiveStates() {
        document.querySelectorAll('.ypp-nav-btn').forEach(btn => {
            const url = btn.dataset.url;
            const isActive = this._isCurrentPage(url);
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    }
};
