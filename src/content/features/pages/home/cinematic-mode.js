import cinematicThemeCSS from './cinematic-theme.css?raw';

/**
 * Cinematic Mode — Netflix-style home feed overlay.
 */
window.YPP.features.CinematicMode = class CinematicMode extends window.YPP.features.BaseFeature {
    constructor() {
        super();
        this._cinematicActive = false;
        this._videoQueue = [];
        this._currentVideoIndex = 0;
        this._videoTimer = null;
        this._isUserHovering = false;
        this._mo = null;
        this._scrollHandler = null;
        this._keyboardHandler = null;
        this._isMuted = true;
        this._isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        this._navObserver = null;
        this._darkModeObserver = null;
        
        this.CONFIG = {
            PREVIEW_DELAY: 7750,
            FADE_DURATION: 1250,
            HOVER_EVENTS: ['mouseenter', 'mouseover', 'pointerenter'],
            CHECK_INTERVAL: 500,
            CONTENT_UPDATE_DELAY: 100,
            SCROLL_AMOUNT: 70,
        };

        this._heroState = {
            status: 'inactive',
            heroElement: null,
            observers: new Set(),
            currentVideo: null,
        };

        this.onPageChange = this.onPageChange.bind(this);
        this._onNavigateStart = this._onNavigateStart.bind(this);
        this._playNextVideo = this._playNextVideo.bind(this);
        this._periodicCheck = this._periodicCheck.bind(this);
        this._handleNavigation = this._handleNavigation.bind(this);
    }

    getConfigKey() {
        return 'cinematicMode';
    }

    enable() {
        super.enable();
        this._isMuted = this.settings.cinematicMuted !== undefined ? this.settings.cinematicMuted : this._isFirefox;
        
        this._injectStyles();
        
        // Use BaseFeature's tracked listener for navigate start
        this.addListener(document, 'yt-navigate-start', this._onNavigateStart);
        
        this.onPageChange();
    }

    disable() {
        super.disable();
        // Event listeners are cleaned up automatically by BaseFeature.cleanupEvents()
        this._teardown();
        const style = document.getElementById('ypp-cinematic-style');
        if (style) style.remove();
    }

    async onUpdate() {
        if (this.settings) {
            const previousMuteState = this._isMuted;
            this._isMuted = this.settings.cinematicMuted !== undefined ? this.settings.cinematicMuted : this._isFirefox;
            
            // Sync UI if mute state changed from popup
            if (previousMuteState !== this._isMuted && this._cinematicActive) {
                const heroButton = document.querySelector('.netflix-unmute-button');
                if (heroButton) {
                    heroButton.classList.toggle('muted', this._isMuted);
                    const html = this._generateMuteButtonHTML(this._isMuted);
                    heroButton.innerHTML = window.YPP.utils.sanitizeHTML ? window.YPP.utils.sanitizeHTML(html) : html;
                }
                this._syncMuteState();
            }
        }
    }

    _injectStyles() {
        if (document.getElementById('ypp-cinematic-style')) return;
        const style = document.createElement('style');
        style.id = 'ypp-cinematic-style';
        style.textContent = cinematicThemeCSS;
        document.head.appendChild(style);
    }

    _onNavigateStart() {
        // Cleanup some UI elements immediately on nav start
        this._teardownHero();
    }

    async onPageChange() {
        const isHome = window.location.pathname === '/' || window.location.pathname.includes('/feed/subscriptions');
        
        if (!isHome || !this.settings.cinematicMode) {
            this._teardown();
            return;
        }

        await this._activate();
    }

    async _activate() {
        if (this._cinematicActive) return;
        this._cinematicActive = true;

        document.documentElement.setAttribute('dark', ''); 
        document.body.classList.add('cinematic');
        document.body.classList.add('cinematic-home');

        // Drawer hide retries
        const hideDrawer = () => {
            const appDrawer = document.querySelector('tp-yt-app-drawer');
            if (appDrawer) appDrawer.removeAttribute('opened');
        };
        [0, 100, 500, 1000, 2000, 3000].forEach(delay => setTimeout(hideDrawer, delay));

        this._setupScrollHandler();
        this._setupNavigationListeners();

        // Enforce darkmode
        this._darkModeObserver = new MutationObserver(() => {
            if (!document.documentElement.hasAttribute('dark')) {
                document.documentElement.setAttribute('dark', '');
            }
        });
        this._darkModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dark'] });

        try {
            // Wait for grid to settle after YPP layout manager runs
            await new Promise(r => setTimeout(r, 500));

            const firstVideo = await this.waitForElement('ytd-rich-item-renderer', 10000);
            if (!firstVideo) return;
            
            await this._makeHeroPreview(firstVideo);
            this._updateVideoQueue();
            this._setupContentObserver();

            firstVideo.classList.add('netflix-active-preview');

            this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
            
            // Set up periodic check
            this._checkInterval = setInterval(this._periodicCheck, this.CONFIG.CHECK_INTERVAL);
        } catch(e) {
            window.YPP.utils.log("Cinematic Initialization Error", "CINEMATIC", "error", e);
        }
    }

    // ─── Periodic Checker ─────────────────────────────────────────────────────

    _periodicCheck() {
        if (!this._isUserHovering) {
            const currentVideo = this._videoQueue[this._currentVideoIndex];
            if (currentVideo && this._heroState.status === 'ready') {
                const iframe = this._heroState.heroElement?.querySelector('iframe');
                if (!iframe) {
                    this._updateHeroContent(currentVideo);
                }
            }
        }
    }

    // ─── Hero Manager ─────────────────────────────────────────────────────────

    async _makeHeroPreview(videoElement) {
        if (this._heroState.status !== 'inactive') return;
        this._heroState.status = 'creating';
        this._heroState.currentVideo = videoElement;

        const heroWrapper = document.createElement('div');
        heroWrapper.className = 'netflix-hero';
        this._heroState.heroElement = heroWrapper;
        
        const navHTML = `
          <div class="netflix-hero-nav">
            <button class="netflix-nav-button prev" aria-label="Previous video" style="pointer-events: auto;">
              <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>
            </button>
            <button class="netflix-nav-button next" aria-label="Next video" style="pointer-events: auto;">
              <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
            </button>
          </div>
        `;
        heroWrapper.insertAdjacentHTML('afterbegin', navHTML);

        const url = videoElement.querySelector('a#video-title-link')?.href || '';
        let videoId = '';
        try { videoId = new URL(url).searchParams.get('v'); } catch(e) {}
        
        if (!videoId) {
            this._heroState.status = 'inactive';
            return;
        }

        const iframe = document.createElement('iframe');
        iframe.className = 'netflix-hero-iframe';
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${this._isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}&enablejsapi=1`;
        iframe.frameBorder = '0';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; object-fit: cover; border: none;';
        
        heroWrapper.appendChild(iframe);

        const gradient = document.createElement('div');
        gradient.className = 'netflix-hero-gradient';
        heroWrapper.appendChild(gradient);

        const contentOverlay = document.createElement('div');
        contentOverlay.className = 'netflix-hero-content';
        heroWrapper.appendChild(contentOverlay);

        // Append directly to the body, ensuring it's a fixed background element!
        document.body.appendChild(heroWrapper);

        this._setupPreviewChangeObserver();
        this._heroState.status = 'ready';
        this._updateHeroContent(videoElement);
    }

    _updateHeroContent(videoElement) {
        if (this._heroState.status !== 'ready' || !this._heroState.heroElement) return;
        
        const existingContent = this._heroState.heroElement.querySelector('.netflix-hero-content');
        const iframe = this._heroState.heroElement.querySelector('iframe');
        if (!existingContent) return;

        const title = videoElement.querySelector('#video-title')?.textContent?.trim() || 'Video Title';
        const avatar = videoElement.querySelector('yt-avatar-shape img, #avatar-link img, #avatar img')?.src || null;
        const channelName = videoElement.querySelector('ytd-channel-name a, ytd-channel-name yt-formatted-string')?.textContent?.trim() || 'Channel Name';
        const url = videoElement.querySelector('a#video-title-link')?.href || '#';
        const isRecent = this._isRecentlyAdded(videoElement);
        
        let videoId = '';
        try { videoId = new URL(url).searchParams.get('v'); } catch(e) {}

        if (videoId && iframe) {
            const currentSrc = iframe.src;
            if (!currentSrc.includes(videoId)) {
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${this._isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&loop=1&playlist=${videoId}&enablejsapi=1`;
            }
        }

        if (!title || !channelName) return;

        const rawHtml = `
            <div class="channel-info" style="display: flex; align-items: center; gap: 15px; margin-bottom: 1.5rem;">
                ${avatar ? `<img src="${avatar}" class="channel-avatar" style="border-radius: 100%; border: 1px solid rgba(255,255,255,0.7); width: 40px;" onerror="this.style.display='none'">` : ''}
                <h2 class="channel-name" style="font-size: 1.5em; font-weight: normal;">${window.YPP.utils.escapeHTML(channelName)}</h2>
            </div>   
            ${isRecent ? '<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500; margin-bottom: 14px; display: inline-block;">Recently Added</span>' : ''}
            <h1 style="font-size: 4em; margin-bottom: 2rem; max-width: 780px;">${window.YPP.utils.escapeHTML(title)}</h1>
            <div class="netflix-hero-buttons" style="display: flex; gap: 1rem;">
                <a class="netflix-play-button" href="${url}" style="background: white; color: black; display: flex; align-items: center; gap: 0.5rem; padding: 0.8em 2em; border-radius: 4px; font-size: 1.5em; text-decoration: none; font-weight: bold; cursor: pointer;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                    Play
                </a>
                <button class="netflix-unmute-button secondary" style="background-color: rgba(109, 109, 110, 0.7); color: white; display: flex; align-items: center; gap: 0.5rem; padding: 0.8em 2em; border: none; border-radius: 4px; font-size: 1.5em; cursor: pointer; transition: all 0.2s;">
                    ${this._generateMuteButtonHTML(this._isMuted)}
                </button>
            </div>
        `;

        existingContent.innerHTML = window.YPP.utils.sanitizeHTML ? window.YPP.utils.sanitizeHTML(rawHtml) : rawHtml;
        
        const unmuteBtn = existingContent.querySelector('.netflix-unmute-button');
        if (unmuteBtn) {
            unmuteBtn.classList.toggle('muted', this._isMuted);
            unmuteBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._handleMuteToggle(unmuteBtn);
            });
        }
        
        const heroWrapper = this._heroState.heroElement;
        const prevButton = heroWrapper.querySelector('.netflix-nav-button.prev');
        const nextButton = heroWrapper.querySelector('.netflix-nav-button.next');
        
        if (prevButton && !prevButton.dataset.bound) {
            prevButton.dataset.bound = "true";
            prevButton.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._navigateVideo('prev');
            });
        }
        if (nextButton && !nextButton.dataset.bound) {
            nextButton.dataset.bound = "true";
            nextButton.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._navigateVideo('next');
            });
        }
    }

    _generateMuteButtonHTML(isMuted) {
        return isMuted ? `
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
            </svg>
            Unmute
        ` : `
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
            </svg>
            Mute
        `;
    }

    _handleMuteToggle(button) {
        try {
            this._isMuted = !this._isMuted;
            this._syncMuteState();
            
            button.classList.toggle('muted', this._isMuted);
            const html = this._generateMuteButtonHTML(this._isMuted);
            button.innerHTML = window.YPP.utils.sanitizeHTML ? window.YPP.utils.sanitizeHTML(html) : html;
            
            window.YPP.utils.saveSettings({ cinematicMuted: this._isMuted });
        } catch(e) {}
    }

    _syncMuteState() {
        const iframe = this._heroState.heroElement?.querySelector('iframe');
        if (iframe && iframe.contentWindow) {
            const func = this._isMuted ? 'mute' : 'unMute';
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
        }
    }

    _updateMuteButtonVisibility() {
        const heroButton = document.querySelector('.netflix-unmute-button');
        if (heroButton) heroButton.style.opacity = '1';
    }

    _setupPreviewChangeObserver() {
        // Now just observes user hover state on videos
        const observer = new MutationObserver(() => {
            const hoveredVideo = document.querySelector('ytd-rich-item-renderer:hover');

            if (hoveredVideo) {
                if (!this._isUserHovering || this._heroState.currentVideo !== hoveredVideo) {
                    this._isUserHovering = true;
                    this._heroState.currentVideo = hoveredVideo;
                    clearTimeout(this._videoTimer);
                    this._updateHeroContent(hoveredVideo);
                }
            } else {
                if (this._isUserHovering) {
                    this._isUserHovering = false;
                    const currentVideo = this._videoQueue[this._currentVideoIndex];
                    if (currentVideo) {
                        this._updateHeroContent(currentVideo);
                        this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                    }
                }
            }
        });

        observer.observe(document.body, { attributes: true, attributeFilter: ['active', 'playing', 'hidden'], subtree: true });
        this._heroState.observers.add(observer);
    }

    // ─── Queue Management & Scroll ────────────────────────────────────────────

    _updateVideoQueue() {
        const allVideos = document.querySelectorAll('#contents > ytd-rich-item-renderer, #contents > ytd-rich-section-renderer ytd-rich-item-renderer');
        const newQueue = Array.from(allVideos).filter(item => item.querySelector('#video-title-link'));

        if (newQueue.length !== this._videoQueue.length) {
            this._videoQueue = newQueue;
            this._currentVideoIndex = 0;
            clearTimeout(this._videoTimer);

            newQueue.forEach(video => {
                // Skip processing if already stamped
                if (video.hasAttribute('data-ypp-processed')) return;
                
                video.querySelectorAll('.recently-badge-container').forEach(badge => badge.remove());
                if (this._isRecentlyAdded(video)) {
                    const badgeContainer = document.createElement('div');
                    badgeContainer.className = 'recently-badge-container';
                    badgeContainer.style = 'position: absolute; top: -17px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 8px;';
                    const badgeHtml = '<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500;">Recently Added</span>';
                    badgeContainer.innerHTML = window.YPP.utils.sanitizeHTML ? window.YPP.utils.sanitizeHTML(badgeHtml) : badgeHtml;
                    const thumbnail = video.querySelector('ytd-thumbnail');
                    if (thumbnail) thumbnail.appendChild(badgeContainer);
                }
                
                // Stamp processed node
                video.setAttribute('data-ypp-processed', 'true');
            });

            const firstVideo = this._videoQueue[0];
            
            if (firstVideo) {
                if (this._heroState.status === 'inactive') {
                    // Retry making hero preview if it failed initially due to skeleton loaders
                    this._makeHeroPreview(firstVideo).then(() => {
                        firstVideo.classList.add('netflix-active-preview');
                        this._updateHeroContent(firstVideo);
                        clearTimeout(this._videoTimer);
                        this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                    });
                } else if (this._heroState.status === 'ready') {
                    firstVideo.classList.add('netflix-active-preview');
                    this._updateHeroContent(firstVideo);
                    clearTimeout(this._videoTimer);
                    this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                }
            }
        }
    }

    _isRecentlyAdded(element) {
        const metadataItems = element.querySelectorAll('#metadata-line .inline-metadata-item, #metadata-line span.ytd-video-meta-block');
        const timeElement = Array.from(metadataItems).find(item => item.textContent.toLowerCase().includes('ago'));
        const timeText = timeElement?.textContent?.toLowerCase() || '';
        const timeMatch = timeText.match(/(\d+)\s+(hour|day|minute)s?\s+ago/);
        
        if (!timeMatch) return false;
        
        const count = parseInt(timeMatch[1], 10);
        const unit = timeMatch[2];
        
        return unit === 'minute' || unit === 'hour' || (unit === 'day' && count <= 2);
    }

    _setupContentObserver() {
        const contents = document.querySelector('#contents');
        if (!contents) return;

        this._mo = new MutationObserver(() => {
            setTimeout(() => this._updateVideoQueue(), this.CONFIG.CONTENT_UPDATE_DELAY);
        });
        
        this._mo.observe(contents, { childList: true, subtree: true, attributes: true, characterData: true });
    }

    _setupScrollHandler() {
        const originalOverflow = document.body.style.overflow;

        this._scrollHandler = (e) => {
            const contents = document.querySelector('#contents');
            if (contents) {
                e.preventDefault();
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    contents.scrollLeft += e.deltaX;
                } else {
                    contents.scrollLeft += e.deltaY;
                }
            }
        };

        this._keyboardHandler = (e) => {
            const contents = document.querySelector('#contents');
            if (!contents) return;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this._navigateVideo('prev');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this._navigateVideo('next');
                    break;
                case 'ArrowDown':
                case 'PageDown':
                case 'Space':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        contents.scrollLeft += this.CONFIG.SCROLL_AMOUNT;
                    }
                    break;
                case 'ArrowUp':
                case 'PageUp':
                    if (document.activeElement.tagName !== 'INPUT') {
                        e.preventDefault();
                        contents.scrollLeft -= this.CONFIG.SCROLL_AMOUNT;
                    }
                    break;
            }
        };

        document.body.style.overflow = 'hidden';
        document.body.addEventListener('wheel', this._scrollHandler, { passive: false });
        document.addEventListener('keydown', this._keyboardHandler);
    }

    _setupNavigationListeners() {
        let lastPathname = window.location.pathname;

        this._navObserver = new MutationObserver(() => {
            const currentPathname = window.location.pathname;
            this._handleNavigation(currentPathname, lastPathname);
            lastPathname = currentPathname;
        });
        this._navObserver.observe(document, { subtree: true, childList: true });
    }

    _handleNavigation(newPathname, lastPathname) {
        if (newPathname === lastPathname) return;
        
        const isHome = newPathname === '/' || newPathname === '';
        const isFeed = newPathname.includes('/feed/subscriptions');
        
        if (isHome || isFeed) {
            if (this._isFirefox) {
                const c = document.querySelector('#content');
                if (c) c.style.visibility = 'hidden';
            }
            window.location.reload();
        } else {
            setTimeout(() => {
                const isHomePage = (newPathname === '/' || newPathname.includes('/feed/subscriptions'));
                document.body.classList.toggle('cinematic-home', isHomePage);
            }, 500);
        }
    }

    _navigateVideo(direction) {
        if (this._isUserHovering || this._videoQueue.length === 0) return;

        const heroWrapper = this._heroState.heroElement;
        if (!heroWrapper) return;

        clearTimeout(this._videoTimer);
        const queueLength = this._videoQueue.length;
        
        this._currentVideoIndex = direction === 'next'
            ? (this._currentVideoIndex + 1) % queueLength
            : (this._currentVideoIndex - 1 + queueLength) % queueLength;

        this._handleVideoTransition(heroWrapper, this._currentVideoIndex);
    }

    _playNextVideo() {
        this._navigateVideo('next');
        this._updateMuteButtonVisibility();
    }

    _handleVideoTransition(heroWrapper, targetIndex) {
        document.querySelectorAll('.netflix-active-preview').forEach(video => {
            video.classList.remove('netflix-active-preview');
        });

        heroWrapper.classList.add('fading'); 

        setTimeout(() => {
            const nextVideo = this._videoQueue[targetIndex];
            if (!nextVideo) return;

            nextVideo.classList.add('netflix-active-preview');
            this._updateHeroContent(nextVideo);
            this._syncMuteState();

            heroWrapper.classList.remove('fading');
            this._updateMuteButtonVisibility();
            
            clearTimeout(this._videoTimer);
            this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
        }, this.CONFIG.FADE_DURATION);
    }

    // ─── Teardown ─────────────────────────────────────────────────────────────

    _teardownHero() {
        if (this._heroState.status === 'inactive') return;
        this._heroState.status = 'destroying';
        
        this._heroState.observers.forEach(obs => obs.disconnect());
        this._heroState.observers.clear();

        const hero = this._heroState.heroElement;
        if (hero) {
            const preview = hero.querySelector('ytd-video-preview');
            if (preview) document.body.appendChild(preview); 
            hero.remove();
        }

        this._heroState = {
            status: 'inactive',
            heroElement: null,
            observers: new Set(),
            currentVideo: null,
        };
    }

    _teardown() {
        this._cinematicActive = false;
        
        document.body.classList.remove('cinematic-home');
        document.body.classList.remove('cinematic');
        document.documentElement.removeAttribute('dark');
        
        clearTimeout(this._videoTimer);
        clearInterval(this._checkInterval);
        
        if (this._mo) {
            this._mo.disconnect();
            this._mo = null;
        }

        if (this._navObserver) {
            this._navObserver.disconnect();
            this._navObserver = null;
        }

        if (this._darkModeObserver) {
            this._darkModeObserver.disconnect();
            this._darkModeObserver = null;
        }

        if (this._scrollHandler) {
            document.body.removeEventListener('wheel', this._scrollHandler);
            this._scrollHandler = null;
        }

        if (this._keyboardHandler) {
            document.removeEventListener('keydown', this._keyboardHandler);
            this._keyboardHandler = null;
        }

        document.body.style.overflow = '';
        
        this._teardownHero();

        document.querySelectorAll('.netflix-active-preview').forEach(el => {
            el.classList.remove('netflix-active-preview');
        });
    }
};
