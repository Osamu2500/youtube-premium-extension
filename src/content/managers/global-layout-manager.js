class GlobalLayoutManager extends window.YPP.BasePageManager {
    constructor(utils, settings) {
        super(utils, settings);
        this.matchPatterns = [/.*/]; // Matches everywhere
        
        // Map settings keys to body CSS classes
        this.TOGGLE_MAP = {
            hideComments: 'ypp-hide-comments',
            hideMetrics: 'ypp-hide-metrics',
            hideThumbnails: 'ypp-hide-thumbnails',
            hideWatched: 'ypp-hide-watched',
            hideMixes: 'ypp-hide-mixes',
            hidePlaylists: 'ypp-hide-playlists',
            hidePodcasts: 'ypp-hide-podcasts',
            hidePosts: 'ypp-hide-posts',
            hidePromos: 'ypp-hide-promos',
            hideVoiceSearch: 'ypp-hide-voice-search',
            aggressiveShortsBlock: 'ypp-hide-shorts',
            hideLiveChat: 'ypp-hide-livechat',
            hideEndScreens: 'ypp-hide-endscreens',
            hideCards: 'ypp-hide-cards',
            hideAnnotations: 'ypp-hide-annotations',
            hideMerch: 'ypp-hide-merch',
            hideDonations: 'ypp-hide-fundraiser',
            hideRelated: 'ypp-hide-related'
            // Features like stopLooping, durationFilter, cleanMixUrls will be handled via JS
        };
    }

    onActivate() {
        this.utils.log('Global Layout Active', 'GLOBAL_MANAGER', 'info');
        this._startMonitoring();
    }

    onDeactivate() {
        // Global manager is never deactivated unless extension is disabled
    }

    applySettings(settings) {
        // Apply pure CSS toggles
        for (const [key, cssClass] of Object.entries(this.TOGGLE_MAP)) {
            if (settings[key]) {
                document.body.classList.add(cssClass);
            } else {
                document.body.classList.remove(cssClass);
            }
        }
        
        // Handle JS-heavy toggles
        if (settings.cleanMixUrls) {
            this._enableCleanMixUrls();
        } else {
            this._disableCleanMixUrls();
        }
    }

    _startMonitoring() {
        if (!window.YPP?.sharedObserver) return;
        
        // Complex DOM filtering (Mixes)
        window.YPP.sharedObserver.register('global_mixes', 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-compact-radio-renderer, ytd-radio-renderer', (elements) => {
            if (!this.settings.hideMixes) return;
            elements.forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'ytd-compact-radio-renderer' || tag === 'ytd-radio-renderer' || el.querySelector("a[href*='start_radio'], a[href*='list=RD'], ytd-thumbnail-overlay-bottom-panel-renderer")) {
                    el.style.setProperty('display', 'none', 'important');
                    el.setAttribute('data-ypp-hide-mixes', 'true');
                }
            });
        });

        // Complex DOM filtering (Shorts)
        window.YPP.sharedObserver.register('global_shorts', 'ytd-rich-section-renderer, ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer', (elements) => {
            if (!this.settings.aggressiveShortsBlock) return;
            elements.forEach(el => {
                if (el.hasAttribute('is-shorts') || el.querySelector('ytd-reel-item-renderer, ytd-rich-shelf-renderer[is-shorts], a[href^="/shorts/"]')) {
                    el.style.setProperty('display', 'none', 'important');
                    el.setAttribute('data-ypp-hide-shorts', 'true');
                }
            });
        });
        
        // Complex DOM filtering (Playlists)
        window.YPP.sharedObserver.register('global_playlists', 'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer', (elements) => {
            if (!this.settings.hidePlaylists) return;
            elements.forEach(el => {
                if (el.querySelector("ytd-playlist-thumbnail, a.ytd-thumbnail[href*='list=PL']")) {
                    el.style.setProperty('display', 'none', 'important');
                }
            });
        });
    }

    // --- Clean Mix URLs ---
    _enableCleanMixUrls() {
        if (!this._mixClickHandler) {
            this._mixClickHandler = (e) => {
                const a = e.target.closest('a[href]');
                if (a && a.href.includes('list=RD')) {
                    try {
                        const url = new URL(a.href, window.location.origin);
                        const list = url.searchParams.get('list');
                        if (list && list.startsWith('RD')) {
                            url.searchParams.delete('list');
                            url.searchParams.delete('start_radio');
                            a.href = url.pathname + url.search + url.hash;
                        }
                    } catch (err) {}
                }
            };
            document.addEventListener('click', this._mixClickHandler, true);
        }
    }

    _disableCleanMixUrls() {
        if (this._mixClickHandler) {
            document.removeEventListener('click', this._mixClickHandler, true);
            this._mixClickHandler = null;
        }
    }
}

window.YPP = window.YPP || {};
window.YPP.managers = window.YPP.managers || {};
window.YPP.managers.GlobalLayoutManager = GlobalLayoutManager;
