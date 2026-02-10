// Header Navigation Buttons (Replacements for Sidebar)
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.HeaderNav = class HeaderNav {

    static ICONS = {
        Subscriptions: `
            <g>
                <path d="M19,6H5C4.45,6,4,5.55,4,5s0.45-1,1-1h14c0.55,0,1,0.45,1,1S19.55,6,19,6z" fill="currentColor" opacity="0.6"></path>
                <path d="M17,10H7c-0.55,0-1-0.45-1-1s0.45-1,1-1h10c0.55,0,1,0.45,1,1S17.55,10,17,10z" fill="currentColor" opacity="0.8"></path>
                <path d="M20,12H4c-1.1,0-2,0.9-2,2v6c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2v-6C22,12.9,21.1,12,20,12z M12,19l-3-1.73V13.8L12,15.54 l3-1.73v3.46L12,19z" fill="currentColor"></path>
            </g>
        `,
        Shorts: `
             <path d="M17.77,10.32c-0.41-0.18-0.87-0.13-1.24,0.13L16.2,10.7l0.53-1.22c0.91-2.09-0.04-4.54-2.13-5.45 c-2.09-0.91-4.54,0.04-5.45,2.13l-1.7,3.91l-0.52-0.23C6.52,9.66,6.06,9.61,5.69,9.87l-0.34,0.22 c-1.89,1.25-2.42,3.8-1.17,5.69l3.41,5.16c0.91,2.09,3.36,3.04,5.45,2.13c2.09-0.91,3.04-3.36,2.13-5.45l-1.7-3.91l0.52,0.23 c0.41,0.18,0.87,0.13,1.24-0.13l0.34-0.22C17.47,12.35,18,9.8,16.75,7.91L17.77,10.32z M10,14.65V10.7l3.43,1.98L10,14.65z" fill="currentColor"></path>
        `,
        WatchLater: `
            <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z" fill="currentColor" opacity="0.4"></path>
            <path d="M13,7h-2v5.41l4.29,2.51l1-1.66l-3.29-1.92V7z" fill="currentColor"></path>
            <path d="M12,4c-4.42,0-8,3.58-8,8c0,4.42,3.58,8,8,8s8-3.58,8-8C20,7.58,16.42,4,12,4z M12,19c-3.87,0-7-3.13-7-7c0-3.87,3.13-7,7-7 s7,3.13,7,7C19,15.87,15.87,19,12,19z" fill="currentColor"></path>
        `,
        Playlists: `
            <path d="M22,7H2v2h20V7z M19,12H2v2h17V12z M14,17H2v2h12V17z M17,15.5l0,5.92c0,0.67,0.73,1.07,1.29,0.71L22,20l-3.71-2.14 C17.73,17.51,17,17.91,17,18.57V15.5z" fill="currentColor"></path>
            <path d="M16,14.5l5.5,3.3l-5.5,3.3V14.5z" fill="currentColor"></path>
        `,
        History: `
            <path d="M13.5,3.13C13.01,3.04,12.51,3,12,3C7.03,3,3,7.03,3,12s4.03,9,9,9s9-4.03,9-9c0-0.51-0.04-1.01-0.13-1.5 c-0.15-0.81-0.94-1.33-1.75-1.17c-0.81,0.15-1.33,0.94-1.17,1.75C17.98,11.26,18,11.63,18,12c0,3.31-2.69,6-6,6s-6-2.69-6-6 s2.69-6,6-6c1.62,0,3.1,0.64,4.2,1.71l-2.7,2.7H19V4.97l-2.61,2.61C15.15,6.33,13.88,5.43,12.42,4.98 C11.59,4.71,11.13,3.83,11.4,3C11.67,2.17,12.55,1.71,13.38,1.98c2.2,0.68,4.11,2.04,5.49,3.88l1.45-1.45L13.5,3.13z" fill="currentColor"></path>
            <path d="M12,7v5l4.2,2.5l0.8-1.3l-3.5-2.1V7H12z" fill="currentColor"></path>
        `,
        Trending: `
           <path d="M17.09,11.18c-0.65-0.34-1.42-0.12-1.78,0.51c-0.23,0.4-0.8,0.56-1.17,0.36c-0.39-0.21-0.54-0.67-0.34-1.08 l2.22-4.32c0.26-0.51,0.06-1.13-0.45-1.39C14.16,4.55,12.59,4,11.02,4c-3.15,0-6.15,1.19-8.4,3.31l-0.8-0.84 C4.47,3.95,8.02,2.5,11.83,2.77c1.47,0.1,2.87,0.49,4.14,1.13L13.62,8.44c-0.64,1.25-0.14,2.79,1.11,3.43 c1.25,0.64,2.79,0.14,3.43-1.11l0.32-0.62C20.4,13.79,20.4,18.89,16.5,21.5c-0.68,0.45-0.44,1.5,0.38,1.5 c3.42,0,6.01-3.2,5.1-6.84C21.64,14.39,19.78,12.56,17.09,11.18z" fill="currentColor"></path>
           <path d="M12.33,16.48c0,2.37-1.08,4.2-3.17,5.52c-0.53,0.33-1.2-0.16-1.05-0.77C9.3,16.32,12.33,12.63,12.33,9.7 c0-0.46-0.08-0.92-0.23-1.37c-0.19-0.59-1.03-0.57-1.19,0.03c-0.1,0.39-0.25,0.76-0.44,1.11C8.75,12.52,6.5,15.2,6.5,18.06 c0,1.4,0.56,2.73,1.47,3.71c0.41,0.44-0.15,1.13-0.68,0.85C5.12,21.46,3.5,19.33,3.5,16.66c0-3.32,2.15-6.26,5.34-7.31 c0.54-0.18,1.02,0.43,0.74,0.92c-0.34,0.61-0.23,1.37,0.28,1.88C11.18,13.48,12.33,14.88,12.33,16.48z" fill="currentColor"></path>
        `,
    };

    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.settings = null;
        this.observer = null;
        this._currentUrl = window.location.pathname + window.location.search;
    }

    run(settings) {
        this.update(settings);
    }

    update(settings) {
        this.settings = settings;
        const shouldRun = settings.navTrending || settings.navShorts ||
            settings.navSubscriptions || settings.navWatchLater ||
            settings.navPlaylists || settings.navHistory ||
            settings.forceHideSidebar;

        if (shouldRun) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.isActive) {
            this.handleSidebarState();
            // Re-inject if context changed
            const center = document.querySelector('ytd-masthead #center');
            if (center) this.injectButtons(center);
            return;
        }
        this.isActive = true;
        this.handleSidebarState();
        this.observeHeader();
    }

    disable() {
        this.isActive = false;
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        const navGroup = document.querySelector('.ypp-nav-group');
        if (navGroup) navGroup.remove();
    }

    handleSidebarState() {
        if (this.settings.forceHideSidebar) {
            document.body.classList.add('ypp-hide-sidebar');
        } else {
            document.body.classList.remove('ypp-hide-sidebar');
        }
    }

    observeHeader() {
        if (this.observer) return;

        const debouncedInject = this.Utils.debounce(() => {
            const centerSection = document.querySelector('ytd-masthead #center');
            if (centerSection) {
                this.injectButtons(centerSection);
            }
        }, 200);

        this.observer = new MutationObserver((mutations) => {
            debouncedInject();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });

        // Initial check
        const centerSection = document.querySelector('ytd-masthead #center');
        if (centerSection) this.injectButtons(centerSection);

        // Listen for navigations to update active state
        window.addEventListener('yt-navigate-finish', () => {
            this._currentUrl = window.location.pathname + window.location.search;
            this._updateActiveStates();
        });
    }

    injectButtons(centerSection) {
        // Prevent duplicates
        if (document.querySelector('.ypp-nav-group-right')) return;

        // Remove old group if it exists roughly in the wrong place
        const oldGroup = document.querySelector('.ypp-nav-group');
        if (oldGroup) oldGroup.remove();

        const navGroup = document.createElement('div');
        navGroup.className = 'ypp-nav-group ypp-nav-group-right';

        // 1. Subscriptions
        if (this.settings.navSubscriptions) {
            this.createButton(navGroup, 'Subscriptions', '/feed/subscriptions', HeaderNav.ICONS.Subscriptions);
        }

        // 2. Shorts
        if (this.settings.navShorts) {
            this.createButton(navGroup, 'Shorts', '/shorts', HeaderNav.ICONS.Shorts);
        }

        // 3. Watch Later
        if (this.settings.navWatchLater) {
            this.createButton(navGroup, 'Watch Later', '/playlist?list=WL', HeaderNav.ICONS.WatchLater);
        }

        // 4. Playlists
        if (this.settings.navPlaylists) {
            this.createButton(navGroup, 'Playlists', '/feed/playlists', HeaderNav.ICONS.Playlists);
        }

        // 5. History
        if (this.settings.navHistory) {
            this.createButton(navGroup, 'History', '/feed/history', HeaderNav.ICONS.History);
        }

        // 6. Trending
        if (this.settings.navTrending) {
            this.createButton(navGroup, 'Trending', '/feed/trending', HeaderNav.ICONS.Trending);
        }

        // Place after search
        const searchForm = centerSection.querySelector('#search-form');
        const micBtn = centerSection.querySelector('#voice-search-button');

        if (micBtn && micBtn.nextSibling) {
            centerSection.insertBefore(navGroup, micBtn.nextSibling);
        } else if (searchForm && searchForm.nextSibling) {
            centerSection.insertBefore(navGroup, searchForm.nextSibling);
        } else {
            centerSection.appendChild(navGroup);
        }

        this._updateActiveStates();
    }

    createButton(container, label, url, svgContent) {
        const btn = document.createElement('div'); // Div to avoid default anchor drag issues
        btn.className = 'ypp-nav-btn';
        btn.title = label;
        btn.dataset.url = url;
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" class="ypp-nav-icon">${svgContent}</svg>
        `;

        // Reliable Navigation
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent propagation to masthead
            e.preventDefault();

            // Visual feedback
            const ripple = document.createElement('div');
            // (Simple click effect can be added via CSS :active)

            // Navigate
            if (window.location.pathname === url) return; // Already there

            // Try to use YouTube's app navigation if exposed, otherwise standard
            const navEvent = document.querySelector('yt-app');
            if (navEvent && navEvent.navigate) {
                // Experimental: Try using standard link click simulation for SPA
                const a = document.createElement('a');
                a.href = url;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                // Fallback
                window.location.href = url;
            }
        });

        container.appendChild(btn);
    }

    _updateActiveStates() {
        const btns = document.querySelectorAll('.ypp-nav-btn');
        btns.forEach(btn => {
            const url = btn.dataset.url;
            // Simple robust check
            if (this._currentUrl.includes(url)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            // Edge case: Shorts
            if (url === '/shorts' && this._currentUrl.startsWith('/shorts')) {
                btn.classList.add('active');
            }
        });
    }
};
