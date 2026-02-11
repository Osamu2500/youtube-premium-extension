/**
 * Header Navigation Manager - Creates custom navigation buttons in the header
 * @class HeaderNav
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav {

    static ICONS = {
        Subscriptions: `
            <path d="M20 6H4V4h16v2zM18 10H6v-2h12v2zM4 14v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6H4zm8 5l-3-1.73V13.8L12 15.54 l3-1.73v3.46L12 19z" fill="currentColor" opacity="0.9"></path>
            <path d="M12 19l3-1.73v-3.46L12 15.54l-3-1.73V17.27L12 19z" fill="currentColor" fill-opacity="0.3"></path>
        `,
        Shorts: `
             <path d="M17.77 10.32l-1.2-3.5c-0.18-0.52-0.65-0.9-1.2-0.96c-0.55-0.08-1.1 0.16-1.42 0.6L12 9.5l-2-3 c-0.8-1.2-2.4-1.6-3.7-0.9C4.8 6.4 4 8.1 4.5 9.6l1.2 3.5c0.18 0.52 0.65 0.9 1.2 0.96c0.55 0.08 1.1-0.16 1.42-0.6L10 10.5l2 3 c0.8 1.2 2.4 1.6 3.7 0.9C17.2 13.6 18 11.9 17.5 10.4z M10 14.65V10.7l3.43 1.98L10 14.65z" fill="currentColor"></path>
             <path d="M10 14.65l3.43-1.98L10 10.7v3.95z" fill="white"></path>
        `,
        WatchLater: `
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"></path>
            <path d="M13 7h-2v5.41l4.29 2.51l1-1.66l-3.29-1.92V7z" fill="currentColor"></path>
        `,
        Playlists: `
            <path d="M3 13h18v-2H3v2zm0-4h18V7H3v2zm0 8h12v-2H3v2zm16-2v6l5-3-5-3z" fill="currentColor"></path>
            <path d="M19 17v6l5-3z" fill="currentColor" opacity="0.5"></path>
        `,
        History: `
            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z" fill="currentColor" opacity="0.5"></path>
            <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="currentColor"></path>
        `,
        Trending: `
           <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" fill="currentColor"></path>
           <circle cx="19.5" cy="9.5" r="1.5" fill="currentColor" opacity="0.5"></circle>
        `,
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

        window.removeEventListener('yt-navigate-finish', this._boundHandleNavigate);
    }

    handleSidebarState() {
        // Toggle body class based on setting
        document.body.classList.toggle('ypp-hide-sidebar', !!this.settings.forceHideSidebar);
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
            const centerSection = document.querySelector('ytd-masthead #center');
            if (centerSection) this.injectButtons(centerSection);
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

            buttons.forEach(btnConfig => {
                if (this.settings[btnConfig.setting]) {
                    this.createButton(navGroup, btnConfig.label, btnConfig.url, btnConfig.icon);
                }
            });

            // Intelligent Placement
            const searchForm = centerSection.querySelector('#search-form');
            const micBtn = centerSection.querySelector('#voice-search-button');

            // Robust insertion logic
            if (micBtn && micBtn.nextSibling) {
                centerSection.insertBefore(navGroup, micBtn.nextSibling);
            } else if (micBtn) {
                centerSection.appendChild(navGroup);
            } else if (searchForm && searchForm.nextSibling) {
                centerSection.insertBefore(navGroup, searchForm.nextSibling);
            } else {
                centerSection.appendChild(navGroup);
            }

            this._updateActiveStates();
        } catch (error) {
            this.Utils.log(`Error injecting buttons: ${error.message}`, 'HEADERNAV', 'error');
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
            const btn = document.createElement('div'); // Div to avoid default anchor drag issues
            btn.className = 'ypp-nav-btn';
            btn.title = label;
            btn.dataset.url = url;
            btn.innerHTML = `
            <svg viewBox="0 0 24 24" class="ypp-nav-icon">${svgContent}</svg>
        `;

            // Reliable Navigation
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Only navigate if different to avoid reloading
                if (window.location.pathname !== url && !(url === '/shorts' && window.location.pathname.startsWith('/shorts'))) {
                    // Use YouTube's navigation event if possible/known, otherwise standard location set
                    // Standard location set is safest for external scripts
                    window.location.href = url;
                }
            });

            container.appendChild(btn);
        } catch (error) {
            this.Utils.log(`Error creating button ${label}: ${error.message}`, 'HEADERNAV', 'error');
        }
    }

    _updateActiveStates() {
        const btns = document.querySelectorAll('.ypp-nav-btn');
        btns.forEach(btn => {
            const url = btn.dataset.url;
            const currentPath = this._currentUrl;

            let isActive = false;

            if (url === '/shorts') {
                isActive = currentPath.startsWith('/shorts/');
            } else if (url.includes('?')) {
                // Exact match for query params (like Watch Later)
                isActive = currentPath.includes(url);
            } else {
                // Path match
                isActive = currentPath === url || currentPath === url + '/';
            }

            btn.classList.toggle('active', isActive);
        });
    }
};
