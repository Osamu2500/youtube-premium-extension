import cinematicModeCSS from './cinematic-mode.css?raw';

/**
 * Cinematic Mode — Netflix-style home feed overlay.
 */
window.YPP.features.CinematicMode = class CinematicMode extends window.YPP.features.BaseFeature {
    constructor() {
        super();
        this._observer = null;
        this._isInitialized = false;
    }

    getConfigKey() { return 'cinematicMode'; }
    
    enable() {
        if (this._isInitialized) return;
        super.enable();
        
        this._isInitialized = true;
        this._injectStyles();

        this._observer = new MutationObserver(this._debounce(() => {
            if (this._isHomepage()) this._renderHero();
        }, 250));

        this._observer.observe(document.body, { childList: true, subtree: true });
        this.onPageChange();
    }
    
    disable() {
        super.disable();
        this._isInitialized = false;
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        const hero = document.querySelector('#ypp-cinematic-app');
        if (hero) hero.remove();
        document.body.classList.remove('ypp-cinematic-mode');
        
        const style = document.getElementById('ypp-cinematic-mode-style');
        if (style) style.remove();
    }

    onPageChange() {
        if (this._isHomepage()) {
            this._renderHero();
        } else {
            const hero = document.querySelector('#ypp-cinematic-app');
            if (hero) hero.remove();
            document.body.classList.remove('ypp-cinematic-mode');
        }
    }
    
    _injectStyles() {
        if (document.getElementById('ypp-cinematic-mode-style')) return;
        const style = document.createElement('style');
        style.id = 'ypp-cinematic-mode-style';
        style.textContent = cinematicModeCSS;
        document.head.appendChild(style);
    }

    _isHomepage() {
        return ['/', ''].includes(location.pathname) || location.pathname.includes('/feed/subscriptions') || location.pathname.includes('/feed/trending');
    }
    
    _escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    }

    _debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    _renderHero() {
        if (!this._isHomepage() || this.settings?.hideFeed || document.querySelector('#ypp-cinematic-app')) return;
        
        // Find the first video link (lenient selector for any watch link in the main feed)
        const firstVideo = document.querySelector('ytd-rich-item-renderer a[href*="/watch?v="], ytd-rich-grid-media a[href*="/watch?v="]');
        if (!firstVideo) return;
        
        const videoId = new URL(firstVideo.href, window.location.origin).searchParams.get('v');
        if (!videoId) return;

        const parentRenderer = firstVideo.closest('ytd-rich-item-renderer') || firstVideo.closest('ytd-rich-grid-media');
        const title = parentRenderer?.querySelector('#video-title')?.textContent?.trim() || 'Featured Video';
        const channel = parentRenderer?.querySelector('ytd-channel-name')?.textContent?.trim() || '';
        const avatarEl = parentRenderer?.querySelector('yt-avatar-shape img, #avatar-link img, #avatar img');
        const avatar = avatarEl ? avatarEl.src : '';
        
        const appContainer = document.createElement('div');
        appContainer.id = 'ypp-cinematic-app';
        
        appContainer.innerHTML = `
            <div class="ypp-cinematic-hero">
                <div class="ypp-cinematic-hero-bg" style="background-image: url('https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg')"></div>
                <div class="ypp-cinematic-hero-content">
                    <div class="ypp-cinematic-hero-channel">
                        ${avatar ? `<img src="${avatar}" class="channel-avatar" onerror="this.style.display='none'">` : ''}
                        <span>${this._escapeHTML(channel)}</span>
                    </div>
                    <h1 class="ypp-cinematic-hero-title">${this._escapeHTML(title)}</h1>
                    <div class="ypp-cinematic-hero-actions">
                        <button class="ypp-cinematic-btn ypp-cinematic-btn-play" data-url="${firstVideo.href}">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                            Play
                        </button>
                    </div>
                </div>
            </div>
            <!-- Rows container for future horizontal cards if needed -->
            <div class="ypp-cinematic-rows"></div>
        `;
        
        const playBtn = appContainer.querySelector('.ypp-cinematic-btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                location.href = e.target.closest('button').dataset.url;
            });
        }
        
        // Hide the native grid first
        document.body.classList.add('ypp-cinematic-mode');
        
        // Inject at the very top of the app container
        const pageManager = document.querySelector('ytd-page-manager');
        if (pageManager) {
            pageManager.insertBefore(appContainer, pageManager.firstChild);
        } else {
            document.body.appendChild(appContainer);
        }
    }
};
