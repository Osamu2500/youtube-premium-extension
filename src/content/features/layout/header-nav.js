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
        this.domObserver = new this.Utils.DOMObserver();
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
            settings.forceHideSidebar;

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

        const navGroup = document.querySelector('.ypp-nav-group');
        if (navGroup) navGroup.remove();

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
            // Try specific selectors first, then broader ones
            const centerSection = document.querySelector('ytd-masthead #center') || 
                                document.querySelector('ytd-masthead #container') ||
                                document.querySelector('ytd-masthead');
            
            if (centerSection) {
                 this.injectButtons(centerSection);
            } else {
                this.Utils?.log('Header injection target not found (yet)', 'HEADERNAV', 'debug');
            }
        });
    }

    /**
     * Inject navigation buttons into the header
     * @private
     */
    injectButtons(centerSection) {
        if (!centerSection || !this.isEnabled) return;

        try {
            // Check if our group already exists in valid state
            if (centerSection.querySelector('.ypp-nav-group')) {
                this._updateActiveStates();
                return;
            }

            // Remove any stale groups that might exist outside the current center context
            const oldGroups = document.querySelectorAll('.ypp-nav-group');
            oldGroups.forEach(g => g.remove());

            const navGroup = document.createElement('div');
            navGroup.className = 'ypp-nav-group ypp-nav-group-right';

            // Define button config for cleaner iteration
            const buttons = [
                { setting: 'navSubscriptions', label: 'Subscriptions', url: '/feed/subscriptions', icon: HeaderNav.ICONS.Subscriptions },
                { setting: 'navShorts', label: 'Shorts', url: '/shorts', icon: HeaderNav.ICONS.Shorts },
                { setting: 'navWatchLater', label: 'Watch Later', url: '/playlist?list=WL', icon: HeaderNav.ICONS.WatchLater },
                { setting: 'navPlaylists', label: 'Playlists', url: '/feed/playlists', icon: HeaderNav.ICONS.Playlists },
                { setting: 'navHistory', label: 'History', url: '/feed/history', icon: HeaderNav.ICONS.History }
            ];

            let addedCount = 0;
            buttons.forEach(btnConfig => {
                if (this.settings[btnConfig.setting]) {
                    this.createButton(navGroup, btnConfig.label, btnConfig.url, btnConfig.icon);
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                this.Utils?.log('No nav buttons enabled in settings', 'HEADERNAV', 'warn');
                return;
            }

            // Intelligent Placement
            const searchBox = centerSection.querySelector('ytd-searchbox');
            const micBtn = centerSection.querySelector('#voice-search-button');
            
            this.Utils?.log(`Injecting nav buttons: SearchBox=${!!searchBox}, MicBtn=${!!micBtn}`, 'HEADERNAV', 'debug');

            // Robust insertion logic
            if (micBtn && micBtn.nextSibling) {
                centerSection.insertBefore(navGroup, micBtn.nextSibling);
            } else if (micBtn) {
                centerSection.appendChild(navGroup);
            } else if (searchBox && searchBox.nextSibling) {
                centerSection.insertBefore(navGroup, searchBox.nextSibling);
            } else if (searchBox) {
               centerSection.appendChild(navGroup);
            } else {
                // Fallback: just append to center section
                centerSection.appendChild(navGroup);
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
     * @private
     */
    createButton(container, label, url, svgContent) {
        try {
            const btn = document.createElement('div');
            btn.className = 'ypp-nav-btn';
            btn.title = label; // Used by CSS tooltip
            btn.dataset.url = url;
            
            // Simple SVG injection
            btn.innerHTML = `<svg viewBox="0 0 24 24" class="ypp-nav-icon" style="pointer-events: none; display: block; width: 24px; height: 24px; fill: currentColor;">${svgContent}</svg>`;

            // Reliable Navigation with keyboard support
            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Check if already on the page
                if (this.isCurrentPage(url)) {
                    this.Utils?.log(`Already on ${label} page`, 'HEADERNAV');
                    return;
                }

                // Navigate using YouTube's navigation if possible
                this.navigateTo(url);
            };

            btn.addEventListener('click', handleClick);
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(e);
                }
            });

            // Make button focusable
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('role', 'button');

            container.appendChild(btn);
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
