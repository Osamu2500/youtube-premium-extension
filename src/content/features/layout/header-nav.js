/**
 * Header Navigation Manager - Creates custom navigation buttons in the header
 * @class HeaderNav
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav {

    static ICONS = {
        Subscriptions: '<path d="M4 6h16v2H4zm0 4h16v2H4zm-2 4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2H2zm8 8v-6l5 3-5 3z" fill="currentColor"></path>',
        Shorts: '<g transform="translate(0.5, 0)"><path fill-rule="evenodd" clip-rule="evenodd" d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.65-.15-2.29.4l-4.8 3.53-1.43-.86 3.42-2.05c1.45-.87 1.93-2.74 1.06-4.19l-.06-.1c-.87-1.45-2.74-1.93-4.19-1.06L6 8.52c-1.45.87-1.93 2.74-1.06 4.19.23.39.55.72.91.96l4.8 3.53 1.43.86-3.42 2.05c-1.45.87-1.93 2.74-1.06 4.19l.06.1c.87 1.45 2.74 1.93 4.19 1.06l4.8-2.87c1.45-.87 1.93-2.74 1.06-4.19-.23-.39-.55-.72-.91-.96z" fill="currentColor"></path></g>',
        WatchLater: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"></path>',
        Playlists: '<g transform="translate(0, 1)"><path d="M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z" fill="currentColor"></path></g>',
        History: '<g transform="translate(0.5, 0.5)"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 9H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 6v7l6 3.6.75-1.23-4.75-2.85V9z" fill="currentColor"></path></g>'
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
