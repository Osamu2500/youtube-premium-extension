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
        this._checkInterval = null;
        this._isUserHovering = false;
        this._mo = null;
        this._abortController = null;
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

    enable() {
        super.enable();
        // Restore user's saved mute preference; fall back to true (muted) on Firefox
        // since Firefox blocks autoplay more aggressively than Chrome.
        this._isMuted = this.settings?.cinematicMuted !== undefined
            ? this.settings.cinematicMuted
            : this._isFirefox;
        
        this._injectStyles();
        
        // Use BaseFeature's tracked listener for navigate start & finish
        this.addListener(document, 'yt-navigate-start', this._onNavigateStart);
        this.addListener(window, 'yt-navigate-finish', this._onNavigateFinish);
        
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
                    heroButton.innerHTML = html;
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
        document.body.classList.add('cinematic');
        document.body.classList.add('cinematic-home');

        // Drawer hide retries
        this.waitForElement('tp-yt-app-drawer', 5000).then(appDrawer => {
            if (appDrawer) appDrawer.removeAttribute('opened');
        });

        this._setupScrollHandler();
        this._lastPathname = window.location.pathname;

        // Enforce darkmode
        // Removed raw MutationObserver per architecture rules

        try {
            // Wait for grid to settle after YPP layout manager runs
            await new Promise(r => setTimeout(r, 500));

            // Wait for ANY ytd-rich-item-renderer to appear first
            const anyItem = await this.waitForElement('ytd-rich-item-renderer', 10000);
            if (!anyItem) return;

            // Build the filtered queue to get the first VALID playable video.
            this._cachedContents = document.querySelector('#contents');

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
                window.YPP.utils.log("No valid video found for cinematic hero", "CINEMATIC", "warn");
                return;
            }

            await this._makeHeroPreview(firstValid);
            this._setupContentObserver();

            firstValid.classList.add('netflix-active-preview');

            this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
            
            // Periodic check removed for performance
        } catch(e) {
            window.YPP.utils.log("Cinematic Initialization Error", "CINEMATIC", "error", e);
        }
    }

    // ─── Hero Manager ─────────────────────────────────────────────────────────

    _simulateHover(element) {
        if (!element) return;
        
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 250;
        const HOVER_EVENTS = ['mouseenter', 'mouseover', 'pointerenter'];

        const attemptHover = (retryCount = 0) => {
            const thumbnailContainer = element.querySelector('#thumbnail');
            
            if (!thumbnailContainer && retryCount < MAX_RETRIES) {
                setTimeout(() => attemptHover(retryCount + 1), RETRY_DELAY);
                return;
            }
            if (!thumbnailContainer) return;

            HOVER_EVENTS.forEach(eventType => {
                [element, thumbnailContainer].forEach(target => {
                    target.dispatchEvent(new MouseEvent(eventType, {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    }));
                });
            });
            
            // Wait for YouTube to load and mute
            setTimeout(() => {
                if (!this._isMuted) this._syncMuteState();
                this._updateMuteButtonVisibility();
            }, 500);
        };
        
        attemptHover();
    }

    async _waitForPreview(videoElement) {
        return new Promise((resolve) => {
            let attempts = 0;
            this._simulateHover(videoElement);

            const check = setInterval(() => {
                attempts++;
                const preview = document.querySelector('ytd-video-preview');
                if (preview || attempts > 20) {
                    clearInterval(check);
                    resolve(preview);
                }
            }, 100);
        });
    }

    async _makeHeroPreview(videoElement) {
        if (this._heroState.status !== 'inactive') return;
        this._heroState.status = 'creating';
        this._heroState.currentVideo = videoElement;

        const videoId = this._extractVideoId(videoElement.querySelector('a#video-title-link, a#video-title, a#thumbnail, a[href*="/watch?v="]')?.href);
        if (!videoId) {
            this._heroState.status = 'inactive';
            return;
        }

        const preview = await this._waitForPreview(videoElement);
        if (!preview) {
            this._heroState.status = 'inactive';
            return;
        }

        const heroWrapper = document.createElement('div');
        heroWrapper.className = 'netflix-hero fading';
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

        // Insert hero at document.body level so position:fixed is always
        // anchored to the true viewport. Inserting it inside YouTube's
        // component tree risks landing inside a transformed/filtered ancestor
        // which silently converts fixed → absolute in CSS.
        document.body.appendChild(heroWrapper);
        heroWrapper.appendChild(preview);

        // ── Override ytd-video-preview inline styles ──────────────────────────
        // YouTube sets dimension/position via JS using setProperty('...', '...', 'important')
        // which produces inline !important styles that CSS rules CANNOT beat.
        // We fight back with the same technique, and watch for changes across the subtree.
        let previewStyleObserver;
        
        const applyFullscreen = (el) => {
            if (!el) return;
            // Only set if not already set to avoid unnecessary reflows/loops
            if (el.style.getPropertyValue('width') !== '100%') {
                el.style.setProperty('position', 'absolute', 'important');
                el.style.setProperty('top', '0', 'important');
                el.style.setProperty('left', '0', 'important');
                el.style.setProperty('width', '100%', 'important');
                el.style.setProperty('height', '100%', 'important');
                el.style.setProperty('max-width', 'none', 'important');
                el.style.setProperty('max-height', 'none', 'important');
                el.style.setProperty('transform', 'none', 'important');
                el.style.setProperty('border-radius', '0', 'important');
                el.style.setProperty('margin', '0', 'important');
                el.style.setProperty('padding', '0', 'important');
            }
        };

        const forcePreviewFullscreen = () => {
            if (previewStyleObserver) previewStyleObserver.disconnect();
            
            applyFullscreen(preview);
            
            // Apply to all intermediate containers that might restrict sizing
            const containers = preview.querySelectorAll('#video-preview-container, #player-container, ytd-player, #container.ytd-player, .html5-video-player, .html5-video-container');
            containers.forEach(applyFullscreen);

            // Force the actual video element to break out and be fixed 100vw/100vh
            const videoEl = preview.querySelector('video');
            if (videoEl && videoEl.style.getPropertyValue('width') !== '100vw') {
                videoEl.style.setProperty('position', 'fixed', 'important');
                videoEl.style.setProperty('top', '0', 'important');
                videoEl.style.setProperty('left', '0', 'important');
                videoEl.style.setProperty('width', '100vw', 'important');
                videoEl.style.setProperty('height', '100vh', 'important');
                videoEl.style.setProperty('min-width', '100vw', 'important');
                videoEl.style.setProperty('min-height', '100vh', 'important');
                videoEl.style.setProperty('max-width', 'none', 'important');
                videoEl.style.setProperty('max-height', 'none', 'important');
                videoEl.style.setProperty('object-fit', 'cover', 'important');
                videoEl.style.setProperty('transform', 'none', 'important');
            }
            
            if (previewStyleObserver) {
                previewStyleObserver.observe(preview, { attributes: true, attributeFilter: ['style'], subtree: true });
            }
        };

        previewStyleObserver = new MutationObserver(forcePreviewFullscreen);
        this._heroState.previewStyleObserver = previewStyleObserver;
        forcePreviewFullscreen(); // Trigger first run and start observing
        // ─────────────────────────────────────────────────────────────────────

        const gradient = document.createElement('div');
        gradient.className = 'netflix-hero-gradient';
        heroWrapper.appendChild(gradient);

        const contentOverlay = document.createElement('div');
        contentOverlay.className = 'netflix-hero-content';
        heroWrapper.appendChild(contentOverlay);

        this._setupPreviewChangeObserver();
        this._heroState.status = 'ready';
        this._updateHeroContent(videoElement);

        // Trigger fade in animation
        heroWrapper.offsetHeight;
        heroWrapper.classList.remove('fading');
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

    _updateHeroContent(videoElement) {
        if (this._heroState.status !== 'ready' || !this._heroState.heroElement) return;
        
        const existingContent = this._heroState.heroElement.querySelector('.netflix-hero-content');
        if (!existingContent) return;

        const title = videoElement.querySelector('#video-title')?.textContent?.trim() || 'Featured Video';
        const avatar = videoElement.querySelector('yt-avatar-shape img, #avatar-link img, #avatar img')?.src || null;
        const channelName = videoElement.querySelector('ytd-channel-name a, ytd-channel-name yt-formatted-string, #channel-name a')?.textContent?.trim() || 'YouTube Creator';
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
            unmuteBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._handleMuteToggle(unmuteBtn);
            });
        }
        
        const playBtn = existingContent.querySelector('.netflix-play-button');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
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
            button.innerHTML = html;
            
            if (window.YPP?.StorageManager) window.YPP.StorageManager.set('cinematicMuted', this._isMuted);
        } catch(e) {
            if (window.YPP?.errorHandler) window.YPP.errorHandler.handleError(e, 'CinematicMode');
        }
    }



    _syncMuteState() {
        // Native YouTube preview handles mute toggle via DOM
        const preview = document.querySelector('ytd-video-preview');
        const muteButton = preview?.querySelector('yt-mute-toggle-button button');
        
        if (muteButton) {
            const isMutedNow = muteButton.getAttribute('aria-label')?.toLowerCase().includes('unmute');
            if (isMutedNow !== this._isMuted) {
                muteButton.click();
            }
        }
    }

    _updateMuteButtonVisibility() {
        const heroButton = document.querySelector('.netflix-unmute-button');
        if (heroButton) heroButton.style.opacity = '1';
    }

    _setupPreviewChangeObserver() {
        if (this._heroState.observer) this._heroState.observer.disconnect();

        this._heroState.observer = new MutationObserver(() => {
            const preview = document.querySelector('ytd-video-preview');
            if (preview && this._heroState.heroElement && preview.parentNode !== this._heroState.heroElement) {
               // YouTube tried to take it back; steal it again!
               this._heroState.heroElement.insertBefore(preview, this._heroState.heroElement.firstChild);
            }
        });

        this._heroState.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    _handleVideoEnter(card) {
        if (!this._isUserHovering || this._heroState.currentVideo !== card) {
            this._isUserHovering = true;
            this._heroState.currentVideo = card;
            clearTimeout(this._videoTimer);
            this._updateHeroContent(card);
            
            this._simulateHover(card);
        }
    }

    _handleVideoLeave(card) {
        // Debounce to allow the next card's mouseenter to fire before reverting
        setTimeout(() => {
            if (this._heroState.currentVideo === card && this._isUserHovering) {
                this._isUserHovering = false;
                const currentVideo = this._videoQueue[this._currentVideoIndex];
                if (currentVideo) {
                    this._updateHeroContent(currentVideo);
                    this._simulateHover(currentVideo);
                    
                    clearTimeout(this._videoTimer);
                    this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                }
            }
        }, 50);
    }

    // ─── Queue Management & Scroll ────────────────────────────────────────────

    _updateVideoQueue() {
        return new Promise(resolve => {
            window.YPP.Utils.batch.read(() => {
                try {
                    const grid = document.querySelector('ytd-rich-grid-renderer');
                    if (!grid) return resolve();

                    const newNodes = Array.from(grid.querySelectorAll('ytd-rich-item-renderer:not([data-ypp-scanned="true"])'));
                    newNodes.forEach(item => {
                        item.setAttribute('data-ypp-scanned', 'true');
                        if (item.closest('ytd-rich-section-renderer[is-shorts]')) {
                            item.setAttribute('data-ypp-is-shorts', 'true');
                        }
                    });
                    
                    let allVideos = Array.from(grid.querySelectorAll('ytd-rich-item-renderer[data-ypp-scanned="true"]:not([data-ypp-is-shorts="true"])'));
                    const newQueue = allVideos.filter(item => {
                        const titleLink = item.querySelector('a#video-title-link, a#video-title, a#thumbnail, a[href*="/watch?v="]');
                        return titleLink && this._extractVideoId(titleLink.href);
                    });

                    const itemsToProcess = [];
                    newQueue.forEach(video => {
                        if (video.hasAttribute('data-ypp-processed')) return;
                        itemsToProcess.push({
                            video,
                            isRecent: this._isRecentlyAdded(video),
                            thumbnail: video.querySelector('ytd-thumbnail'),
                            badges: video.querySelectorAll('.recently-badge-container')
                        });
                    });

                    let queueUpdated = false;
                    if (newQueue.length !== this._videoQueue.length) {
                        const grew = newQueue.length > this._videoQueue.length;
                        this._videoQueue = newQueue;
                        if (!grew) this._currentVideoIndex = 0;
                        queueUpdated = true;
                    }

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
                                firstVideo.classList.add('netflix-active-preview');
                                this._updateHeroContent(firstVideo);
                                clearTimeout(this._videoTimer);
                                this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                            }
                        } finally {
                            resolve();
                        }
                    });
                } catch(e) {
                    window.YPP.utils?.log("Queue update error: " + e.message, "CINEMATIC", "error");
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
            return false;
        }
    }

    _setupContentObserver() {
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.register('cinematic-content-scanner', 'ytd-rich-item-renderer', () => {
                clearTimeout(this._contentUpdateTimer);
                this._contentUpdateTimer = setTimeout(() => this._updateVideoQueue(), this.CONFIG.CONTENT_UPDATE_DELAY);
            });
        }
    }

    _setupScrollHandler() {

        this.addListener(document.body, 'wheel', (e) => {
            if (this._cachedContents && this._cachedContents.contains(e.target)) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    this._cachedContents.scrollLeft += e.deltaY;
                }
            }
        }, { passive: false, signal: this._abortController.signal });

        this.addListener(document, 'keydown', (e) => {
            if (!this._cachedContents) return;
            const contents = this._cachedContents;

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
            document.body.classList.toggle('cinematic-home', isHomePage);
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
        document.querySelectorAll('.netflix-active-preview').forEach(video => {
            video.classList.remove('netflix-active-preview');
        });

        heroWrapper.classList.add('fading'); 

        setTimeout(() => {
            if (!this._cinematicActive || this._heroState.status !== 'ready') return;
            
            const nextVideo = this._videoQueue[targetIndex];
            if (!nextVideo) return;

            nextVideo.classList.add('netflix-active-preview');
            this._updateHeroContent(nextVideo);
            
            const videoId = this._extractVideoId(nextVideo.querySelector('a#video-title-link, a#video-title, a#thumbnail')?.href);
            const iframe = heroWrapper.querySelector('iframe');
            if (iframe && videoId && !iframe.src.includes(videoId)) {
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${this._isMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&loop=1&playlist=${videoId}&enablejsapi=1`;
            }

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

        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('cinematic-content-scanner');
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

        if (this._heroState.previewStyleObserver) {
            this._heroState.previewStyleObserver.disconnect();
            this._heroState.previewStyleObserver = null;
        }

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
        
        document.body.classList.remove('cinematic-home');
        document.body.classList.remove('cinematic');
        document.documentElement.removeAttribute('dark');
        
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
