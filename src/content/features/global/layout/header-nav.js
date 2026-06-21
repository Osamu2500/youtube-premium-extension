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
        History: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 7v5l4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
        Library: '<path d="M4 22H20C21.1 22 22 21.1 22 20V8C22 6.9 21.1 6 20 6H12L10 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22ZM4 8H20V20H4V8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'
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
        return null;
    }

    // =========================================================================
    // LIFECYCLE  (BaseFeature calls enable() / disable() — no settings arg)
    // =========================================================================

    async enable() {
        // this.settings is already set by BaseFeature.update() before enable() is called
        const s = this.settings || {};

        const shouldRun = s.navShorts || s.navSubscriptions || s.navWatchLater || s.navLibrary ||
            s.navPlaylists || s.navHistory;

        if (!shouldRun) return; // No nav items configured — nothing to do

        try {
            this._applySidebarState();
            this._observeHeader();
        } catch (e) {
            this.utils?.log('Error enabling HeaderNav', 'HEADERNAV', 'error', e);
        }
    }

    async disable() {
        if (this._domObserver) {
            this._domObserver.unregister('header-nav-end');
        }

        if (window.YPP.ui?.manager) {
            window.YPP.ui.manager.remove('header-nav-group');
        }

        if (this._domObserver) {
            this._domObserver.unregister('header-nav-masthead');
        }
        
        if (this._observeTimeout) clearTimeout(this._observeTimeout);
        if (this._injectTimeout) clearTimeout(this._injectTimeout);

        // Call super to clean up any tracked listeners
        await super.disable();
    }

    async onUpdate() {
        // Feature manager called this because it's enabled and settings updated
        const s = this.settings || {};
        const shouldRun = s.navShorts || s.navSubscriptions || s.navWatchLater || s.navLibrary ||
            s.navPlaylists || s.navHistory;


        if (window.YPP.ui?.manager) {
            window.YPP.ui.manager.remove('header-nav-group');
        }

        if (shouldRun) {
            this._scheduleInjection();
        }
    }

    // =========================================================================
    // INTERNAL
    // =========================================================================

    _observeHeader() {
        if (!this._domObserver) return;

        this._domObserver.start();

        // Initial injection
        this._scheduleInjection();

        // Keep active state updated on SPA navigation
        this.addListener(window, 'yt-navigate-finish', this._boundHandleNavigate);

        // Use sharedObserver instead of a dedicated MutationObserver to prevent memory leaks
        this._domObserver.register('header-nav-masthead', 'ytd-masthead #end, ytd-masthead #end *', () => {
            const existing = document.querySelector('[data-ypp-id="header-nav-group"]');
            if (!existing && document.querySelector('ytd-masthead #end')) {
                // It was wiped out by YouTube, re-inject
                this._scheduleInjection();
                if (window.YPP.ui?.manager) window.YPP.ui.manager.heal();
            }
        }, true);
    }

    _handleNavigate() {
        this._currentUrl = window.location.pathname + window.location.search;
        this._updateActiveStates();
        // Re-inject in case navigation wiped the header
        this._scheduleInjection();
    }

    _scheduleInjection(retryCount = 0) {
        requestAnimationFrame(() => {
            const injected = this._injectButtons();
            // If injection was skipped because UIManager wasn't ready yet, retry
            if (!injected && retryCount < 10) {
                this._injectTimeout = setTimeout(() => this._scheduleInjection(retryCount + 1), 200);
            }
        });
    }

    _injectButtons() {
        const s = this.settings || {};

        // Button definitions (only include enabled ones)
        const allButtons = [
            { setting: 'navSubscriptions', label: 'Subscriptions', url: '/feed/subscriptions', icon: HeaderNav.ICONS.Subscriptions },
            { setting: 'navShorts',        label: 'Shorts',        url: '/shorts',             icon: HeaderNav.ICONS.Shorts },
            { setting: 'navLibrary',       label: 'Library',       url: '/feed/you',           icon: HeaderNav.ICONS.Library },
            { setting: 'navWatchLater',    label: 'Watch Later',   url: '/playlist?list=WL',   icon: HeaderNav.ICONS.WatchLater },
            { setting: 'navPlaylists',     label: 'Playlists',     url: '/feed/playlists',     icon: HeaderNav.ICONS.Playlists },
            { setting: 'navHistory',       label: 'History',       url: '/feed/history',       icon: HeaderNav.ICONS.History }
        ];

        const activeButtons = allButtons.filter(btn => s[btn.setting]);

        if (activeButtons.length === 0) return true; // nothing to inject — not an error

        // If already mounted and still in DOM, just update active states
        const existing = document.querySelector('[data-ypp-id="header-nav-group"]');
        if (existing) {
            this._updateActiveStates();
            return true; // already injected
        }

        if (!window.YPP.ui?.manager || !window.YPP.ui?.components?.createButton) {
            this.utils?.log('UIManager or button factory not ready yet', 'HEADERNAV', 'warn');
            return false; // signal to caller: retry needed
        }

        if (!this.navGroup) {
            this.navGroup = document.createElement('div');
            this.navGroup.className = 'ypp-nav-group';
        } else {
            this.navGroup.innerHTML = '';
        }

        activeButtons.forEach(cfg => {
            this._createButton(this.navGroup, cfg.label, cfg.url, cfg.icon, cfg.setting);
        });

        window.YPP.ui.manager.mount('headerRight', { id: 'header-nav-group', el: this.navGroup });

        if (!document.contains(this.navGroup)) {
            // Target was not ready or mount failed, retry needed
            return false;
        }

        this._updateActiveStates();
        return true; // injection succeeded
    }

    _createButton(container, label, url, svgContent, idSuffix) {
        const handleClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Always navigate for query-string URLs (e.g. /playlist?list=WL vs /playlist?list=XXX)
            // so switching between playlists always works even when already on a playlist page.
            if (url.includes('?')) {
                this._navigateTo(url);
            } else if (!this._isCurrentPage(url)) {
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
        this.addListener(component.el, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
            }
        });

        container.appendChild(component.el);
    }

    _isCurrentPage(url) {
        const path = window.location.pathname;
        const search = window.location.search;

        if (url === '/shorts') return path.startsWith('/shorts/');

        // For URLs with query strings (e.g. /playlist?list=WL), compare
        // the full path+query so Watch Later and other playlists are distinct.
        if (url.includes('?')) {
            const [urlPath, urlQuery] = url.split('?');
            return path === urlPath && search === `?${urlQuery}`;
        }

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
