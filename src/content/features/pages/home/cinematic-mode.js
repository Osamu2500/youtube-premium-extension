import cinematicThemeCSS from './cinematic-theme.css?raw';

/**
 * Cinematic Mode — Netflix-style home feed overlay.
 */
window.YPP.features.CinematicMode = class CinematicMode extends window.YPP.features.BaseFeature {
    static SELECTORS = {
        YTD_RICH_ITEM: 'ytd-rich-item-renderer',
        YTD_VIDEO_PREVIEW: 'ytd-video-preview',
        THUMBNAIL: '#thumbnail',
        HERO_BUTTON: '.netflix-unmute-button',
        APP_DRAWER: 'tp-yt-app-drawer',
        CONTENTS: '#contents',
        RICH_GRID: 'ytd-rich-grid-renderer',
        VIDEO_LINK: 'a[href*="/watch?v="]'
    };

    static CLASSES = {
        HERO_PREVIEW_ACTIVE: 'netflix-hero-preview-active',
        ACTIVE_PREVIEW: 'netflix-active-preview',
        CINEMATIC_HOME: 'cinematic-home',
        CINEMATIC: 'cinematic',
        FADING: 'fading',
        FADING_PREVIEW: 'netflix-fading-preview'
    };

    static EVENTS = {
        NAVIGATE_START: 'yt-navigate-start',
        NAVIGATE_FINISH: 'yt-navigate-finish',
        WHEEL: 'wheel',
        KEYDOWN: 'keydown',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup'
    };

    constructor() {
        super();
        this._cinematicActive = false;
        this._videoQueue = [];
        this._currentVideoIndex = 0;
        this._videoTimer = null;
        this._checkInterval = null;
        this._isUserHovering = false;
        this._mo = null;
        this._abortController = null;
        this._isMuted = true;
        this._isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        this._navObserver = null;
        this._darkModeObserver = null;
        this._navListenersAdded = false;
        
        this.CONFIG = {
            PREVIEW_DELAY: 7750,
            FADE_DURATION: 1250,
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
        this._onNavigateFinish = this._onNavigateFinish.bind(this);
        this._playNextVideo = this._playNextVideo.bind(this);
    }

    getConfigKey() {
        return 'cinematicMode';
    }

    _extractVideoId(url) {
        if (!url) return '';
        try {
            const u = new URL(url, window.location.origin);
            let videoId = u.searchParams.get('v');
            if (!videoId && u.pathname.startsWith('/shorts/')) {
                videoId = u.pathname.split('/shorts/')[1].split('?')[0];
            }
            return videoId || '';
        } catch(e) {
            if (window.YPP?.errorHandler) window.YPP.errorHandler.handleError(e, 'CinematicMode');
            return '';
        }
    }

    /**
     * Initializes the feature, injects styles, and adds navigation event listeners.
     */
    enable() {
        super.enable();
        // Restore user's saved mute preference; fall back to true (muted)
        // since browsers block autoplay of unmuted videos without interaction.
        this._isMuted = this.settings?.cinematicMuted !== undefined
            ? this.settings.cinematicMuted
            : true;
        
        this._injectStyles();
        
        // Use BaseFeature's tracked listener for navigate start & finish
        if (!this._navListenersAdded) {
            this.addListener(document, 'yt-navigate-start', this._onNavigateStart);
            this.addListener(window, 'yt-navigate-finish', this._onNavigateFinish);
            this._navListenersAdded = true;
        }
        
        this.onPageChange();
    }

    /**
     * Disables the feature, removes injected styles, and tears down the UI.
     */
    disable() {
        super.disable();
        this._navListenersAdded = false;
        // Event listeners are cleaned up automatically by BaseFeature.cleanupEvents()
        this._teardown();
        const style = document.getElementById('ypp-cinematic-style');
        if (style) style.remove();
    }

    /**
     * Called when extension settings update, allowing dynamic syncing of the mute state.
     */
    async onUpdate() {
        const previousMuteState = this._isMuted;
        this._isMuted = this.settings.cinematicMuted !== undefined ? this.settings.cinematicMuted : this._isFirefox;
        
        // Sync UI if mute state changed from popup
        if (previousMuteState !== this._isMuted && this._cinematicActive) {
            const heroButton = document.querySelector(CinematicMode.SELECTORS.HERO_BUTTON);
            if (heroButton) {
                heroButton.classList.toggle('muted', this._isMuted);
                const html = this._generateMuteButtonHTML(this._isMuted);
                heroButton.innerHTML = html;
            }
            this._syncMuteState();
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

    /**
     * Evaluates the current page path and activates/deactivates Cinematic Mode.
     */
    async onPageChange() {
        const isHome = window.location.pathname === '/' || window.location.pathname.includes('/feed/subscriptions');
        
        if (!isHome || !this.settings?.cinematicMode) {
            this._teardown();
            return;
        }

        await this._activate();
    }

    async _activate() {
        if (this._cinematicActive) return;
        this._cinematicActive = true;
        this._abortController = new AbortController();

        document.documentElement.setAttribute('dark', ''); 
        document.body.classList.add(CinematicMode.CLASSES.CINEMATIC);
        document.body.classList.add(CinematicMode.CLASSES.CINEMATIC_HOME);

        const contents = document.querySelector('ytd-rich-grid-renderer > #contents, ytd-rich-grid-renderer');
        if (contents) contents.classList.add('ypp-grid-container');

        // Drawer hide retries
        try {
            const appDrawer = await this.waitForElement(CinematicMode.SELECTORS.APP_DRAWER, 5000);
            if (appDrawer) appDrawer.removeAttribute('opened');
        } catch (e) {
            this.utils.log("App drawer timeout or not found", "CINEMATIC", "warn");
        }

        this._setupScrollHandler();
        this._lastPathname = window.location.pathname;

        // Enforce darkmode
        // Removed raw MutationObserver per architecture rules

        try {
            // Wait for grid to settle after YPP layout manager runs
            await new Promise(r => setTimeout(r, 500));

            // Wait for ANY item to appear first
            const anyItem = await this.waitForElement(CinematicMode.SELECTORS.YTD_RICH_ITEM, 10000);
            if (!anyItem) return;

            // Build the filtered queue to get the first VALID playable video.
            this._cachedContents = document.querySelector(CinematicMode.SELECTORS.CONTENTS);

            // We cannot use the raw first DOM element — it may be a Shorts shelf,
            // a promoted card, or an ad that has no ?v= URL, which would abort the hero.
            
            // Wait for at least one valid video title link to be stamped in the DOM
            await this.pollFor(() => {
                const grid = document.querySelector('ytd-rich-grid-renderer') || document.querySelector('#contents');
                if (!grid) return false;
                const link = grid.querySelector('a[href*="/watch?v="]');
                return !!link && !!link.href;
            }, 10000, 250);

            await this._updateVideoQueue();

            // If still empty, YouTube might be unusually slow, retry once after 1s
            if (this._videoQueue.length === 0) {
                await new Promise(r => setTimeout(r, 1000));
                await this._updateVideoQueue();
            }

            const firstValid = this._videoQueue[0];
            if (!firstValid) {
                this.utils.log("No valid video found for cinematic hero", "CINEMATIC", "warn");
                return;
            }

            await this._makeHeroPreview(firstValid);
            this._setupContentObserver();

            firstValid.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);

            this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
        } catch(e) {
            this.utils.log(e.message, "CINEMATIC", "error");
        }
    }

    // ─── Hero Manager ─────────────────────────────────────────────────────────

    async _simulateHover(element) {
        console.log('[CinematicMode] _simulateHover called', element);
        if (!element) {
            console.error('[CinematicMode] element is null!');
            return;
        }
        
        const thumbnailContainer = element.querySelector('#thumbnail');
        console.log('[CinematicMode] thumbnailContainer:', thumbnailContainer);
        
        if (!thumbnailContainer) {
            console.error('[CinematicMode] #thumbnail not found in element');
            return;
        }

        // Block mouseleave to keep preview alive
        if (!element._hoverLock) {
            const blockLeave = (e) => {
                if (element._isNetflixHeroPreview) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            };
            
            this.addListener(element, 'mouseleave', blockLeave, true);
            this.addListener(element, 'mouseout', blockLeave, true);
            this.addListener(thumbnailContainer, 'mouseleave', blockLeave, true);
            this.addListener(thumbnailContainer, 'mouseout', blockLeave, true);
            element._hoverLock = true;
            console.log('[CinematicMode] Hover lock installed');
        }
        element._isNetflixHeroPreview = true;

        // Mute before dispatching
        this._syncMuteState();
        console.log('[CinematicMode] Mute state synced:', this._isMuted);

        // Actually hover the element using native mouse events with real coordinates
        const rect = thumbnailContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        console.log('[CinematicMode] Dispatching events at', centerX, centerY);

        // Dispatch events in sequence
        const FULL_HOVER_EVENTS = ['pointerenter', 'pointerover', 'mouseenter', 'mouseover', 'pointermove', 'mousemove'];
        for (const eventType of FULL_HOVER_EVENTS) {
            const event = new MouseEvent(eventType, {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX,
                clientY: centerY,
                relatedTarget: document.body
            });
            thumbnailContainer.dispatchEvent(event);
            console.log(`[CinematicMode] Dispatched ${eventType}`);
        }

        // CRITICAL: Keep "moving" the mouse to simulate sustained hover
        // YouTube may check for continuous pointer presence
        const moveInterval = setInterval(() => {
            thumbnailContainer.dispatchEvent(new MouseEvent('pointermove', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: centerX + (Math.random() * 4 - 2), // tiny jitter
                clientY: centerY + (Math.random() * 4 - 2)
            }));
        }, 100);

        // Wait for preview to appear
        await new Promise(r => setTimeout(r, 1000));
        clearInterval(moveInterval);

        const preview = element.querySelector('ytd-video-preview');
        console.log('[CinematicMode] Preview found after hover:', !!preview, preview);
        
        if (!preview) {
            console.warn('[CinematicMode] Preview did NOT appear after hover simulation');
            console.log('[CinematicMode] Element innerHTML:', element.innerHTML.substring(0, 500));
        }
        
        // Mute the video
        this._syncMuteState();
    }

    async _waitForPreview(videoElement, retries = 3) {
        for (let i = 0; i < retries; i++) {
            await this._simulateHover(videoElement);
            const preview = videoElement.querySelector('ytd-video-preview');
            if (preview) return preview;
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    }

    /**
     * Physically moves ytd-video-preview into the hero wrapper div.
     * This is the original cinematic temp approach and is more reliable than
     * remotely forcing CSS overrides from outside the element's stacking context.
     */
    _movePreviewIntoHero(preview) {
        const heroWrapper = this._heroState.heroElement;
        if (!heroWrapper || !preview) return;
        
        // Only move if not already inside the hero
        if (preview.parentNode === heroWrapper) return;
        
        // Save original parent for potential teardown/restore
        if (!this._heroState.originalPreviewParent) {
            this._heroState.originalPreviewParent = preview.parentNode;
        }
        
        // Insert hero before the preview's current position, then move preview into it
        if (preview.parentNode && preview.parentNode !== heroWrapper) {
            heroWrapper.insertBefore(preview, heroWrapper.querySelector('.netflix-hero-gradient') || null);
        }
        
        // Verify it moved
        if (!heroWrapper.contains(preview)) {
            console.error('[CinematicMode] Preview move failed!');
        } else {
            console.log('[CinematicMode] Preview successfully moved to hero');
        }
        
        // Reset any inline styles the previous approach may have applied
        const toReset = [preview, ...Array.from(preview.querySelectorAll(
            '#video-preview-container, #player-container, ytd-player, #container.ytd-player, .html5-video-player, .html5-video-container'
        ))];
        toReset.forEach(el => {
            if (el && el.style) {
                el.style.removeProperty('position');
                el.style.removeProperty('top');
                el.style.removeProperty('left');
                el.style.removeProperty('width');
                el.style.removeProperty('height');
                el.style.removeProperty('z-index');
                el.style.removeProperty('max-width');
            }
        });
    }

    async _makeHeroPreview(videoElement) {
        try {
            if (this._heroState.status === 'creating') return;

            const videoId = this._extractVideoId(videoElement.querySelector(CinematicMode.SELECTORS.VIDEO_LINK)?.href);
            if (!videoId) return;

            // Handle hot-swapping the hero video if one already exists
            if (this._heroState.status === 'ready') {
                if (this._heroState.currentVideo === videoElement) return;

                if (this._heroState.currentVideo) {
                    this._heroState.currentVideo.classList.remove(CinematicMode.CLASSES.ACTIVE_PREVIEW);
                    this._heroState.currentVideo._isNetflixHeroPreview = false;
                }

                this._heroState.currentVideo = videoElement;
                videoElement.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);
                this._updateHeroContent(videoElement);

                // Update thumbnail fallback immediately
                if (this._heroState.heroElement) {
                    this._heroState.heroElement.style.backgroundImage = `url('https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg')`;
                }

                this._waitForPreview(videoElement).then(preview => {
                    if (preview) {
                        heroWrapper.classList.remove('netflix-hero-ken-burns');
                        heroWrapper.style.backgroundImage = 'none';
                        this._movePreviewIntoHero(preview);
                    } else {
                        this.utils.log("Native preview failed, using Ken Burns fallback", "CINEMATIC", "warn");
                    }
                }).catch(e => {
                    this.utils.log(e.message, "CINEMATIC", "error");
                });
                return;
            }

            this._heroState.status = 'creating';
            this._heroState.currentVideo = videoElement;
            videoElement.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);

            const heroWrapper = document.createElement('div');
            heroWrapper.className = `netflix-hero ${CinematicMode.CLASSES.FADING}`;
            this._heroState.heroElement = heroWrapper;

            // Show thumbnail immediately so the screen is never blank
            heroWrapper.style.backgroundImage = `url('https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg')`;
            heroWrapper.style.backgroundSize = 'cover';
            heroWrapper.style.backgroundPosition = 'center';
            heroWrapper.classList.add('netflix-hero-ken-burns');

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

            const gradient = document.createElement('div');
            gradient.className = 'netflix-hero-gradient';
            heroWrapper.appendChild(gradient);

            const contentOverlay = document.createElement('div');
            contentOverlay.className = 'netflix-hero-content';
            heroWrapper.appendChild(contentOverlay);

            // Append hero to body BEFORE waiting for preview, so UI shows immediately
            document.body.appendChild(heroWrapper);

            // Hide native YouTube volume buttons
            const hideNativeVolume = document.createElement('style');
            hideNativeVolume.textContent = '.ytp-mute-button, .ytp-volume-area { display: none !important; }';
            heroWrapper.appendChild(hideNativeVolume);

            this._heroState.status = 'ready';
            this._updateHeroContent(videoElement);

            // Safely remove fading class next frame
            requestAnimationFrame(() => {
                if (this._heroState.heroElement === heroWrapper) {
                    heroWrapper.classList.remove('fading');
                }
            });

            // Wait for YouTube to create the preview element
            this._waitForPreview(videoElement).then(async preview => {
                if (!preview && this._videoQueue.length > 1) {
                    this.utils.log("Native preview failed for first video, retrying next video...", "CINEMATIC", "warn");
                    this._currentVideoIndex = (this._currentVideoIndex + 1) % this._videoQueue.length;
                    const nextVideo = this._videoQueue[this._currentVideoIndex];
                    preview = await this._waitForPreview(nextVideo);
                    if (preview && this._heroState.heroElement === heroWrapper) {
                        this._heroState.currentVideo = nextVideo;
                        this._updateHeroContent(nextVideo);
                    }
                }
                
                if (preview && this._heroState.heroElement === heroWrapper) {
                    heroWrapper.classList.remove('netflix-hero-ken-burns');
                    heroWrapper.style.backgroundImage = 'none';
                    this._movePreviewIntoHero(preview);
                } else if (!preview) {
                    this.utils.log("All native preview attempts failed, sticking with Ken Burns fallback", "CINEMATIC", "warn");
                }
            }).catch(e => {
                this.utils.log(e.message, "CINEMATIC", "error");
            });

        } catch (e) {
            this.utils.log(e.message, "CINEMATIC", "error");
        }
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

    async _updateHeroContent(videoElement) {
        if (this._heroState.status !== 'ready' || !this._heroState.heroElement) return;
        
        const existingContent = this._heroState.heroElement.querySelector('.netflix-hero-content');
        if (!existingContent) return;

        const videoId = this._extractVideoId(videoElement.querySelector(CinematicMode.SELECTORS.VIDEO_LINK)?.href);
        if (videoId) {
            this._heroState.heroElement.style.backgroundImage = `url('https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg')`;
        }

        // Direct extraction — no caching
        const getText = (el) => el?.textContent?.trim() || el?.getAttribute('title')?.trim() || null;
        
        // Try multiple selectors for title
        const titleSelectors = [
            '#video-title-link yt-formatted-string',
            '#video-title-link',
            '#video-title',
            'a[href*="/watch?v="] #video-title',
            'h3 a'
        ];
        
        let title = null;
        for (const sel of titleSelectors) {
            const el = videoElement.querySelector(sel);
            if (el) {
                const t = getText(el);
                if (t) {
                    title = t;
                    break;
                }
            }
        }

        // Try multiple selectors for channel
        const channelSelectors = [
            'ytd-channel-name a',
            'ytd-channel-name yt-formatted-string',
            '#channel-name a',
            '#text.ytd-channel-name'
        ];
        
        let channelName = null;
        for (const sel of channelSelectors) {
            const el = videoElement.querySelector(sel);
            if (el) {
                const t = getText(el);
                if (t) {
                    channelName = t;
                    break;
                }
            }
        }

        // Avatar
        const avatarEl = videoElement.querySelector('yt-img-shadow img, yt-avatar-shape img, #avatar-link img, ytd-channel-name img');
        const avatar = avatarEl?.src || null;

        // If data is still loading from Polymer data binding, wait and retry!
        if (!title || !channelName || title === '' || channelName === '') {
            if (!videoElement._heroRetryCount) videoElement._heroRetryCount = 0;
            if (videoElement._heroRetryCount < 15) {
                videoElement._heroRetryCount++;
                if (!this._cinematicActive) return;
                setTimeout(() => this._updateHeroContent(videoElement), 200);
                return;
            }
        }
        
        title = title || 'Featured Video';
        channelName = channelName || 'YouTube Creator';
        
        const titleLink = videoElement.querySelector('a#video-title-link, a#video-title, a#thumbnail');
        const url = titleLink?.href || '#';
        const isRecent = this._isRecentlyAdded(videoElement);

        const rawHtml = `
            <div class="channel-info">
                ${avatar ? `<img src="${avatar}" class="channel-avatar" onerror="this.style.display='none'">` : ''}
                <h2 class="channel-name">${this._escapeHTML(channelName)}</h2>
            </div>   
            ${isRecent ? `<span class="recently-badge">Recently Added</span>` : ''}
            <h1>${this._escapeHTML(title)}</h1>
            <div class="netflix-hero-buttons">
                <button class="netflix-play-button">
                    <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                    Play
                </button>
                <button class="netflix-unmute-button secondary">
                    ${this._generateMuteButtonHTML(this._isMuted)}
                </button>
            </div>
        `;

        existingContent.innerHTML = rawHtml;
        
        const unmuteBtn = existingContent.querySelector('.netflix-unmute-button');
        if (unmuteBtn) {
            unmuteBtn.classList.toggle('muted', this._isMuted);
            this.addListener(unmuteBtn, 'click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._handleMuteToggle(unmuteBtn);
            });
        }
        
        const playBtn = existingContent.querySelector('.netflix-play-button');
        if (playBtn) {
            this.addListener(playBtn, 'click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (url && url !== '#') {
                    window.location.href = url;
                }
            });
        }
        
        const heroWrapper = this._heroState.heroElement;
        const prevButton = heroWrapper.querySelector('.netflix-nav-button.prev');
        const nextButton = heroWrapper.querySelector('.netflix-nav-button.next');
        
        if (prevButton && !prevButton.dataset.bound) {
            prevButton.dataset.bound = "true";
            this.addListener(prevButton, 'click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._navigateVideo('prev');
            });
        }
        if (nextButton && !nextButton.dataset.bound) {
            nextButton.dataset.bound = "true";
            this.addListener(nextButton, 'click', (e) => {
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
            button.innerHTML = html;
            
            if (window.YPP?.StorageManager) window.YPP.StorageManager.set('cinematicMuted', this._isMuted);
        } catch(e) {
            this.utils.log(e.message, 'CINEMATIC', 'error');
        }
    }



    _syncMuteState() {
        // Native YouTube preview handles mute toggle via DOM
        const preview = document.querySelector(CinematicMode.SELECTORS.YTD_VIDEO_PREVIEW);
        const muteButton = preview?.querySelector('yt-mute-toggle-button button');
        
        if (muteButton) {
            const isMutedNow = muteButton.getAttribute('aria-label')?.toLowerCase().includes('unmute');
            if (isMutedNow !== this._isMuted) {
                muteButton.click();
            }
        }
    }

    _updateMuteButtonVisibility() {
        const heroButton = document.querySelector(CinematicMode.SELECTORS.HERO_BUTTON);
        if (heroButton) heroButton.style.opacity = '1';
    }

    _handleVideoEnter(card) {
        if (this._heroState.currentVideo !== card) {
            this._isUserHovering = true;
            this._heroState.currentVideo = card;
            clearTimeout(this._videoTimer);
            
            const targetIndex = this._videoQueue.indexOf(card);
            if (targetIndex !== -1 && targetIndex !== this._currentVideoIndex) {
                this._currentVideoIndex = targetIndex;
                this._handleVideoTransition(this._heroState.heroElement, targetIndex);
            } else if (targetIndex === this._currentVideoIndex) {
                // If it's already the current video, just ensure it has the active class and keep playing
                if (!card.classList.contains(CinematicMode.CLASSES.ACTIVE_PREVIEW)) {
                    card.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);
                }
                this._simulateHover(card);
            }
        } else {
            this._isUserHovering = true;
            clearTimeout(this._videoTimer);
        }
    }

    _handleVideoLeave(card) {
        // Debounce to allow the next card's mouseenter to fire
        setTimeout(() => {
            if (this._heroState.currentVideo === card) {
                this._isUserHovering = false;
                // Do not revert! The video should keep playing in the hero area.
                // Just start the timer to play the next video in the queue.
                clearTimeout(this._videoTimer);
                this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
            }
        }, 50);
    }

    // ─── Queue Management & Scroll ────────────────────────────────────────────

    _updateVideoQueue() {
        return new Promise(resolve => {
            window.YPP.Utils.batch.read(() => {
                try {
                    const grid = document.querySelector(CinematicMode.SELECTORS.RICH_GRID);
                    if (!grid) return resolve();

                    const newNodes = Array.from(grid.querySelectorAll(`${CinematicMode.SELECTORS.YTD_RICH_ITEM}:not([data-ypp-scanned="true"])`));
                    if (newNodes.length === 0 && this._videoQueue.length > 0) return resolve();

                    const itemsToProcess = [];
                    let queueUpdated = false;

                    newNodes.forEach(item => {
                        item.setAttribute('data-ypp-scanned', 'true');
                        if (item.closest('ytd-rich-section-renderer[is-shorts]')) {
                            item.setAttribute('data-ypp-is-shorts', 'true');
                            return;
                        }
                        
                        const titleLink = item.querySelector('a#video-title-link, a#video-title, a#thumbnail, a[href*="/watch?v="]');
                        if (titleLink && this._extractVideoId(titleLink.href)) {
                            this._videoQueue.push(item);
                            queueUpdated = true;
                            
                            if (!item.hasAttribute('data-ypp-processed')) {
                                itemsToProcess.push({
                                    video: item,
                                    isRecent: this._isRecentlyAdded(item),
                                    thumbnail: item.querySelector('ytd-thumbnail'),
                                    badges: item.querySelectorAll('.recently-badge-container')
                                });
                            }
                        }
                    });

                    if (itemsToProcess.length === 0 && !queueUpdated) return resolve();

                    window.YPP.Utils.batch.write(() => {
                        try {
                            itemsToProcess.forEach(item => {
                                item.video.setAttribute('data-ypp-processed', 'true');
                                
                                if (!item.video.dataset.yppHoverBound) {
                                    item.video.dataset.yppHoverBound = 'true';
                                    this.addListener(item.video, 'mouseenter', () => this._handleVideoEnter(item.video));
                                    this.addListener(item.video, 'mouseleave', () => this._handleVideoLeave(item.video));
                                }

                                item.badges.forEach(badge => badge.remove());
                                if (item.isRecent) {
                                    const badgeContainer = document.createElement('div');
                                    badgeContainer.className = 'recently-badge-container';
                                    badgeContainer.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #e50914; color: white; padding: 4px 8px; border-radius: 4px; font-size: 1.2rem; font-weight: bold; z-index: 10; pointer-events: none;';
                                    badgeContainer.textContent = 'Recently Added';
                                    if (item.thumbnail) item.thumbnail.appendChild(badgeContainer);
                                }
                            });

                            const firstVideo = this._videoQueue[0];
                            if (firstVideo && this._heroState.status === 'ready' && queueUpdated) {
                                firstVideo.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);
                                this._updateHeroContent(firstVideo);
                                clearTimeout(this._videoTimer);
                                this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                            }
                        } finally {
                            resolve();
                        }
                    });
                } catch(e) {
                    this.utils.log(e.message, "CINEMATIC", "error");
                    resolve();
                }
            });
        });
    }

    _isRecentlyAdded(element) {
        try {
            const metadataItems = element.querySelectorAll('#metadata-line .inline-metadata-item, #metadata-line span.ytd-video-meta-block');
            const timeElement = Array.from(metadataItems).find(item => item.textContent.toLowerCase().includes('ago'));
            const timeText = timeElement?.textContent?.toLowerCase() || '';
            const timeMatch = timeText.match(/(\d+)\s+(hour|day|minute)s?\s+ago/);
            
            if (!timeMatch) return false;
            
            const amount = parseInt(timeMatch[1], 10);
            const unit = timeMatch[2];
            
            if (unit === 'minute' || unit === 'hour') return true;
            if (unit === 'day' && amount <= 3) return true;
            
            return false;
        } catch(e) {
            this.utils.log(e.message, "CINEMATIC", "error");
            return false;
        }
    }

    _setupContentObserver() {
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.register('cinematic-content-scanner', CinematicMode.SELECTORS.YTD_RICH_ITEM, () => {
                clearTimeout(this._contentUpdateTimer);
                this._contentUpdateTimer = setTimeout(() => this._updateVideoQueue(), this.CONFIG.CONTENT_UPDATE_DELAY);
            });
        }
    }

    _setupScrollHandler() {
        let _isMiddleClickHeld = false;
        
        this.addListener(document, CinematicMode.EVENTS.MOUSEDOWN, (e) => {
            if (e.button === 1) { // Middle click
                _isMiddleClickHeld = true;
                e.preventDefault();
            }
        }, { signal: this._abortController?.signal });

        this.addListener(document, CinematicMode.EVENTS.MOUSEUP, (e) => {
            if (e.button === 1) {
                _isMiddleClickHeld = false;
            }
        }, { signal: this._abortController?.signal });

        let _wheelDelta = 0;
        let _isWheelTicking = false;
        let _scrollSwitchTimeout = null;

        this.addListener(document.body, CinematicMode.EVENTS.WHEEL, (e) => {
            if (_isMiddleClickHeld) {
                e.preventDefault();
                if (!_scrollSwitchTimeout) {
                    if (e.deltaY > 0) this._navigateVideo('next');
                    else if (e.deltaY < 0) this._navigateVideo('prev');
                    
                    _scrollSwitchTimeout = setTimeout(() => { _scrollSwitchTimeout = null; }, 300);
                }
                return;
            }

            if (this._cachedContents && this._cachedContents.contains(e.target)) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    _wheelDelta += e.deltaY;
                    if (!_isWheelTicking) {
                        _isWheelTicking = true;
                        requestAnimationFrame(() => {
                            if (this._cachedContents) {
                                this._cachedContents.scrollLeft += _wheelDelta;
                            }
                            _wheelDelta = 0;
                            _isWheelTicking = false;
                        });
                    }
                }
            }
        }, { passive: false, signal: this._abortController?.signal });

        this.addListener(document, CinematicMode.EVENTS.KEYDOWN, (e) => {
            if (!this._cachedContents) return;
            const contents = this._cachedContents;
            
            // Allow Ctrl + Left/Right to navigate videos
            if (e.ctrlKey && e.key === 'ArrowRight') {
                e.preventDefault();
                this._navigateVideo('next');
                return;
            }
            if (e.ctrlKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                this._navigateVideo('prev');
                return;
            }

            const active = document.activeElement;
            const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTyping) return; // Don't intercept keyboard events when typing

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
                    e.preventDefault();
                    contents.scrollLeft += this.CONFIG.SCROLL_AMOUNT;
                    break;
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    contents.scrollLeft -= this.CONFIG.SCROLL_AMOUNT;
                    break;
            }
        }, { signal: this._abortController.signal });
    }

    _onNavigateFinish() {
        const newPathname = window.location.pathname;
        if (newPathname === this._lastPathname) return;
        
        const isHome = newPathname === '/' || newPathname === '';
        const isFeed = newPathname.includes('/feed/subscriptions');
        
        if (isHome || isFeed) {
            if (this._isFirefox) {
                const c = document.querySelector('#content');
                if (c) c.style.visibility = 'hidden';
            }
            this.onPageChange();
        } else {
            const isHomePage = (newPathname === '/' || newPathname.includes('/feed/subscriptions'));
            document.body.classList.toggle(CinematicMode.CLASSES.CINEMATIC_HOME, isHomePage);
        }
        this._lastPathname = newPathname;
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
        // Find current active preview
        const activeVideos = document.querySelectorAll(`.${CinematicMode.CLASSES.ACTIVE_PREVIEW}`);
        activeVideos.forEach(video => {
            video.classList.remove(CinematicMode.CLASSES.ACTIVE_PREVIEW);
            video.classList.add(CinematicMode.CLASSES.FADING_PREVIEW);
            
            // Release the simulated hover lock so YouTube can cleanly move the preview
            if (video._isNetflixHeroPreview) {
                video._isNetflixHeroPreview = false;
                video.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true, view: window }));
                const thumb = video.querySelector(CinematicMode.SELECTORS.THUMBNAIL);
                if (thumb) thumb.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true, view: window }));
            }
        });

        heroWrapper.classList.add(CinematicMode.CLASSES.FADING); 

        setTimeout(() => {
            // Remove fading class from old videos
            document.querySelectorAll(`.${CinematicMode.CLASSES.FADING_PREVIEW}`).forEach(video => {
                video.classList.remove(CinematicMode.CLASSES.FADING_PREVIEW);
            });

            if (!this._cinematicActive || this._heroState.status !== 'ready') return;
            
            const nextVideo = this._videoQueue[targetIndex];
            if (!nextVideo) return;

            nextVideo.classList.add(CinematicMode.CLASSES.ACTIVE_PREVIEW);
            this._updateHeroContent(nextVideo);
            
            // Update the background image to the new video's thumbnail and add Ken Burns
            const videoId = this._extractVideoId(nextVideo.querySelector('a#video-title-link, a#video-title, a#thumbnail')?.href);
            if (videoId) {
                heroWrapper.style.backgroundImage = `url('https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg')`;
                heroWrapper.classList.add('netflix-hero-ken-burns');
            }
            
            // Wait for preview to load to remove fallback
            this._waitForPreview(nextVideo).then(preview => {
                if (preview && this._heroState.heroElement === heroWrapper && this._heroState.currentVideo === nextVideo) {
                    heroWrapper.classList.remove('netflix-hero-ken-burns');
                    heroWrapper.style.backgroundImage = 'none';
                    this._movePreviewIntoHero(preview);
                }
            });

            heroWrapper.classList.remove(CinematicMode.CLASSES.FADING);
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

        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('cinematic-content-scanner');
            window.YPP.sharedObserver.unregister('cinematic-preview-styler');
        }
        if (this._contentUpdateTimer) {
            clearTimeout(this._contentUpdateTimer);
            this._contentUpdateTimer = null;
        }

        // Cleanup any processed stamps
        document.querySelectorAll('[data-ypp-processed="true"]').forEach(el => {
            el.removeAttribute('data-ypp-processed');
            el.querySelectorAll('.recently-badge-container').forEach(badge => badge.remove());
        });

        const hero = this._heroState.heroElement;
        if (hero) {
            hero.remove();
        }

        this._heroState = {
            status: 'inactive',
            heroElement: null,
            observers: new Set(),
            currentVideo: null,
            previewStyleObserver: null,
        };
    }

    _teardown() {
        this._cinematicActive = false;
        
        document.body.classList.remove(CinematicMode.CLASSES.CINEMATIC_HOME);
        document.body.classList.remove(CinematicMode.CLASSES.CINEMATIC);
        document.documentElement.removeAttribute('dark');
        
        const contents = document.querySelector('ytd-rich-grid-renderer > #contents, ytd-rich-grid-renderer');
        if (contents) contents.classList.remove('ypp-grid-container');
        
        const style = document.getElementById('ypp-cinematic-style');
        if (style) style.remove();
        
        clearTimeout(this._videoTimer);
        clearInterval(this._checkInterval);
        this._videoTimer = null;
        this._checkInterval = null;
        
        if (this._mo) {
            this._mo.disconnect();
            this._mo = null;
        }

        if (this._navObserver) {
            this._navObserver.disconnect();
            this._navObserver = null;
        }



        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }
        
        this._teardownHero();

        document.querySelectorAll('.netflix-active-preview').forEach(el => {
            el.classList.remove('netflix-active-preview');
        });
    }
};
