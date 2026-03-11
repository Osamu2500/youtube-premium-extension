/**
 * Header Navigation Manager - Creates custom navigation buttons in the header
 * @class HeaderNav
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav {

    static ICONS = {
        Subscriptions: '<rect x="2" y="6" width="20" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></rect><polygon points="10 9 15 12 10 15 10 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        Shorts: '<rect x="5" y="2" width="14" height="20" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></rect><polygon points="10 9 14 12 10 15 10 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        WatchLater: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></circle><polyline points="12 7 12 12 15 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>',
        Playlists: '<line x1="12" y1="12" x2="20" y2="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><line x1="16" y1="6" x2="20" y2="6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><line x1="12" y1="18" x2="20" y2="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line><polygon points="4 6 8 8.5 4 11 4 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polygon>',
        History: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 3v5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 7v5l4 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'
    };

    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        /** @type {boolean} Internal state tracking if the manager is active */
        this.isEnabled = false;
        /** @type {Object|null} Current user settings */
        this.settings = null;
        this.domObserver = window.YPP.sharedObserver || new this.Utils.DOMObserver();
        this._currentUrl = window.location.pathname + window.location.search;

        // Bind methods
        this._boundHandleNavigate = this._handleNavigate.bind(this);
    }

    run(settings) {
        this.enable(settings);
    }

    /**
     * Initialize header navigation
     * @param {Object} settings - User settings object
     */
    enable(settings) {
        this.settings = settings;
        const shouldRun = settings.navTrending || settings.navShorts ||
            settings.navSubscriptions || settings.navWatchLater ||
            settings.navPlaylists || settings.navHistory ||
            settings.forceHideSidebar || settings.logoRedirectSub;

        if (!shouldRun) {
            this.disable();
            return;
        }

        // Styles are now universally handled by styles.css

        if (this.isEnabled) {
            this.handleSidebarState();
            // Re-inject if context changed
            this.scheduleInjection();
            return;
        }

        this.isEnabled = true;
        this.handleSidebarState();
        this.observeHeader();
    }

    /**
     * Disable header navigation and clean up
     */
    disable() {
        if (!this.isEnabled) return;
        this.isEnabled = false;
        
        if (this.domObserver) {
            this.domObserver.stop();
        }

        if (window.YPP.ui) {
            window.YPP.ui.remove('header-nav-group');
        }

        window.removeEventListener('yt-navigate-finish', this._boundHandleNavigate);
    }

    handleSidebarState() {
        // Toggle body class based on setting
        document.body.classList.toggle('ypp-hide-sidebar', !!this.settings.forceHideSidebar);
    }

    // Styles moved to styles.css

    observeHeader() {
        this.domObserver.start();
        
        // Register observer for masthead/center changes safely
        this.domObserver.register(
            'header-nav-center',
            'ytd-masthead #center',
            () => this.scheduleInjection(),
            true
        );

        // Initial check
        this.scheduleInjection();

        // Listen for navigations to update active state
        window.addEventListener('yt-navigate-finish', this._boundHandleNavigate);
    }

    _handleNavigate() {
        if (!this.isEnabled) return;
        this._currentUrl = window.location.pathname + window.location.search;
        this._updateActiveStates();
        // Sometimes navigation wipes the header, so check injection again
        this.scheduleInjection();
    }

    scheduleInjection() {
        // Use requestAnimationFrame for safer DOM access
        requestAnimationFrame(() => {
            this.handleLogoRedirect();
            this.injectButtons();
        });
    }

    /**
     * Override main YouTube logo to redirect to Subscriptions feed
     */
    handleLogoRedirect() {
        return; // Disabled per user request - always go to home
    }

    /**
     * Inject navigation buttons into the header
     * @private
     */
    injectButtons() {
        if (!this.isEnabled) return;

        try {
            // Define button config for cleaner iteration
            const buttons = [
                { setting: 'navSubscriptions', label: 'Subscriptions', url: '/feed/subscriptions', icon: HeaderNav.ICONS.Subscriptions },
                { setting: 'navShorts', label: 'Shorts', url: '/shorts', icon: HeaderNav.ICONS.Shorts },
                { setting: 'navWatchLater', label: 'Watch Later', url: '/playlist?list=WL', icon: HeaderNav.ICONS.WatchLater },
                { setting: 'navPlaylists', label: 'Playlists', url: '/feed/playlists', icon: HeaderNav.ICONS.Playlists },
                { setting: 'navHistory', label: 'History', url: '/feed/history', icon: HeaderNav.ICONS.History }
            ];

            // Filter active buttons based on settings
            const activeButtons = buttons.filter(btn => this.settings[btn.setting]);

            if (activeButtons.length === 0) {
                this.Utils?.log('No nav buttons enabled in settings', 'HEADERNAV', 'warn');
                return;
            }

            // Create a wrapper component for the buttons group so UI manager handles it as one unit
            const navGroup = document.createElement('div');
            navGroup.className = 'ypp-nav-group ypp-nav-group-right';

            activeButtons.forEach(btnConfig => {
                this.createButton(navGroup, btnConfig.label, btnConfig.url, btnConfig.icon, btnConfig.setting);
            });

            // Submit to UIManager
            if (window.YPP.ui && window.YPP.ui.manager) {
                 window.YPP.ui.manager.mount('headerRight', {
                     id: 'header-nav-group',
                     el: navGroup
                 }, 'prepend'); // prepend inserts it before the profile/notifications
            }
            
            this._updateActiveStates();
        } catch (error) {
            this.Utils?.log(`Error injecting buttons: ${error.message}`, 'HEADERNAV', 'error');
        }
    }

    /**
     * Create a single navigation button
     * @param {HTMLElement} container - Container to append button to
     * @param {string} label - Button label/title
     * @param {string} url - Navigation URL
     * @param {string} svgContent - SVG icon content
     * @param {string} idSuffix - Unique ID string
     * @private
     */
    createButton(container, label, url, svgContent, idSuffix) {
        try {
            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (this.isCurrentPage(url)) {
                    this.Utils?.log(`Already on ${label} page`, 'HEADERNAV');
                    return;
                }
                this.navigateTo(url);
            };

            // Use the UI Manager component factory if it exists
            if (window.YPP.ui?.components?.createButton) {
                const component = window.YPP.ui.components.createButton({
                    id: `nav-${idSuffix}`,
                    icon: `<svg viewBox="0 0 24 24" class="ypp-nav-icon" style="pointer-events: none; display: block; width: 24px; height: 24px; fill: currentColor;">${svgContent}</svg>`,
                    tooltip: label,
                    onClick: handleClick,
                    className: 'ypp-nav-btn'
                });
                
                // Add attributes required by CSS state logic
                component.el.dataset.url = url;
                component.el.setAttribute('tabindex', '0');
                component.el.setAttribute('role', 'button');
                
                // Listen for keyboard
                component.el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick(e);
                    }
                });

                container.appendChild(component.el);
            } else {
                 // Fallback if UI Manager fails to load
                 this.Utils?.log('UIManager factory not found for HeaderNav button', 'HEADERNAV', 'warn');
            }
        } catch (error) {
            this.Utils?.log(`Error creating button ${label}: ${error.message}`, 'HEADERNAV', 'error');
        }
    }

    /**
     * Check if the given URL is the current page
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isCurrentPage(url) {
        const currentPath = window.location.pathname;
        
        if (url === '/shorts') {
            return currentPath.startsWith('/shorts/');
        }
        
        if (url.includes('?')) {
            return currentPath.includes(url.split('?')[0]);
        }
        
        return currentPath === url || currentPath === url + '/';
    }

    /**
     * Navigate to a URL using YouTube's navigation system
     * @param {string} url - URL to navigate to
     */
    navigateTo(url) {
        try {
            // Create a specialized event for YouTube navigation if possible, 
            // otherwise standard link click is the best way to trigger router.
            const link = document.createElement('a');
            link.href = url;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => link.remove(), 100);
        } catch (error) {
            // Fallback to direct navigation
            this.Utils?.log(`Using fallback navigation to ${url}`, 'HEADERNAV');
            window.location.href = url;
        }
    }

    /**
     * Update active states for navigation buttons
     * @private
     */
    _updateActiveStates() {
        const btns = document.querySelectorAll('.ypp-nav-btn');
        btns.forEach(btn => {
            const url = btn.dataset.url;
            const isActive = this.isCurrentPage(url);
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    }

    /**
     * Refresh navigation - re-check current page and update states
     */
    refresh() {
        this._currentUrl = window.location.pathname + window.location.search;
        this._updateActiveStates();
    }
};
