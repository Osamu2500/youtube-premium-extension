/**
 * Header Navigation Manager - Creates custom navigation buttons in the header
 * @class HeaderNav
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav {

    static ICONS = {
        Subscriptions: '<path d="M20 7H4V6h16v1zm-2 4H6v-1h12v1zm4 11v-8c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v8h20zM10 17l6-3.5-6-3.5v7z" fill="currentColor"></path>',
        Shorts: '<path d="M17.77 10.32l-1.2-3.5c-0.18-0.52-0.65-0.9-1.2-0.96c-0.55-0.08-1.1 0.16-1.42 0.6L12 9.5l-2-3 c-0.8-1.2-2.4-1.6-3.7-0.9C4.8 6.4 4 8.1 4.5 9.6l1.2 3.5c0.18 0.52 0.65 0.9 1.2 0.96c0.55 0.08 1.1-0.16 1.42-0.6L10 10.5l2 3 c0.8 1.2 2.4 1.6 3.7 0.9C17.2 13.6 18 11.9 17.5 10.4z M10 14.65V10.7l3.43 1.98L10 14.65z" fill="currentColor"></path>',
        WatchLater: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"></path>',
        Playlists: '<path d="M19 9H2v2h17V9zm0-4H2v2h17V5zM2 15h13v-2H2v2zm15-2v6l5-3-5-3z" fill="currentColor"></path>',
        History: '<path d="M13 3a9 9 0 109 9 9 9 0 00-9-9zm0 16a7 7 0 117-7 7 7 0 01-7 7zm1-11h-2v5.41l4.29 2.51.71-1.22-3-1.78z" fill="currentColor"></path>',
        Trending: '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="currentColor"></path>'
    };

    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        /** @type {boolean} Internal state tracking if the manager is active */
        this.isEnabled = false;
        /** @type {Object|null} Current user settings */
        this.settings = null;
        this.observer = null;
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

        // Inject styles consistently
        this._injectStyles();

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
        this.isEnabled = false;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        const navGroup = document.querySelector('.ypp-nav-group');
        if (navGroup) navGroup.remove();

        this.Utils.removeStyle('ypp-header-nav-style');
        window.removeEventListener('yt-navigate-finish', this._boundHandleNavigate);
    }

    handleSidebarState() {
        // Toggle body class based on setting
        document.body.classList.toggle('ypp-hide-sidebar', !!this.settings.forceHideSidebar);
    }

    _injectStyles() {
        const css = `
            .ypp-nav-group {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: 16px;
                margin-right: 16px;
                height: 40px;
            }
            .ypp-nav-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--yt-spec-text-primary);
                transition: background-color 0.2s;
                position: relative;
            }
            .ypp-nav-btn:hover {
                background-color: var(--yt-spec-badge-chip-background);
            }
            .ypp-nav-btn.active {
                background-color: var(--yt-spec-text-primary);
                color: var(--yt-spec-text-primary-inverse);
            }
            .ypp-nav-btn svg {
                width: 24px;
                height: 24px;
                fill: currentColor;
            }
            /* Tooltip integration (simple title for now) */
            .ypp-nav-btn::after {
                content: attr(title);
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
                z-index: 2000;
            }
            .ypp-nav-btn:hover::after {
                opacity: 1;
            }
            /* Hide Sidebar Support */
            body.ypp-hide-sidebar ytd-mini-guide-renderer, 
            body.ypp-hide-sidebar app-drawer, 
            body.ypp-hide-sidebar #guide {
                display: none !important;
            }
            body.ypp-hide-sidebar ytd-app {
                --ytd-mini-guide-width: 0px !important;
            }
            body.ypp-hide-sidebar #content {
                margin-left: 0 !important;
            }
        `;
        this.Utils.addStyle(css, 'ypp-header-nav-style');
    }

    observeHeader() {
        if (this.observer) return;

        // Debounce injection to avoid rapid DOM thrashing
        const debouncedInject = this.Utils.debounce(() => {
            if (this.isEnabled) this.scheduleInjection();
        }, 200);

        this.observer = new MutationObserver((mutations) => {
            // Check if relevant header parts changed
            const shouldUpdate = mutations.some(m =>
                m.target.id === 'center' ||
                m.target.tagName === 'YTD-MASTHEAD'
            );
            if (shouldUpdate) debouncedInject();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });

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
            if (document.querySelector('.ypp-nav-group-right')) {
                this._updateActiveStates();
                return;
            }

            // Remove any stale groups
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
                { setting: 'navHistory', label: 'History', url: '/feed/history', icon: HeaderNav.ICONS.History },
                { setting: 'navTrending', label: 'Trending', url: '/feed/trending', icon: HeaderNav.ICONS.Trending }
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
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" class="ypp-nav-icon">${svgContent}</svg>
            `;

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
