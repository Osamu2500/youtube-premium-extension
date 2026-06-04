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
        this._periodicCheck = this._periodicCheck.bind(this);
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
        this._abortController = new AbortController();

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
        this._lastPathname = window.location.pathname;

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

            // Wait for ANY ytd-rich-item-renderer to appear first
            const anyItem = await this.waitForElement('ytd-rich-item-renderer', 10000);
            if (!anyItem) return;

            // Build the filtered queue to get the first VALID playable video.
            // We cannot use the raw first DOM element — it may be a Shorts shelf,
            // a promoted card, or an ad that has no ?v= URL, which would abort the hero.
            this._updateVideoQueue();

            // If the queue came back empty on first build, wait a bit more for
            // YouTube to finish hydrating the video cards, then retry once.
            if (this._videoQueue.length === 0) {
                await new Promise(r => setTimeout(r, 1500));
                this._updateVideoQueue();
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
            
            // Set up periodic check
            this._checkInterval = setInterval(this._periodicCheck, this.CONFIG.CHECK_INTERVAL);
        } catch(e) {
            window.YPP.utils.log("Cinematic Initialization Error", "CINEMATIC", "error", e);
        }
    }

    // ─── Periodic Checker ─────────────────────────────────────────────────────

    _periodicCheck() {
        if (!this._isUserHovering) {
            const activePreview = document.querySelector('ytd-video-preview[active][playing]:not([hidden])');
            if (!activePreview) {
                const currentVideo = this._videoQueue[this._currentVideoIndex];
                if (currentVideo && this._heroState.status === 'ready') {
                    this._updateHeroContent(currentVideo);
                    this._simulateHover(currentVideo);
                }
            }
        }
    }

    // ─── Hero Manager ─────────────────────────────────────────────────────────

    async _makeHeroPreview(videoElement) {
        if (this._heroState.status !== 'inactive') return;
        this._heroState.status = 'creating';
        this._heroState.currentVideo = videoElement;

        // Wait for preview to be created by hover simulation
        const preview = await this._waitForPreview(videoElement);
        if (!preview) {
            this._heroState.status = 'inactive';
            return;
        }

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

        // Append hero to body so it isn't trapped by thumbnail overflow: hidden
        document.body.appendChild(heroWrapper);
        heroWrapper.appendChild(preview);
        this._forceVideoSize(preview);

        const gradient = document.createElement('div');
        gradient.className = 'netflix-hero-gradient';
        heroWrapper.appendChild(gradient);

        const contentOverlay = document.createElement('div');
        contentOverlay.className = 'netflix-hero-content';
        heroWrapper.appendChild(contentOverlay);

        this._setupPreviewChangeObserver();
        this._heroState.status = 'ready';
        this._updateHeroContent(videoElement);
    }

    _waitForPreview(videoElement) {
        return new Promise(resolve => {
            let resolved = false;
            const done = (preview) => {
                if (resolved) return;
                resolved = true;
                resolve(preview || null);
            };

            // Only look for the preview INSIDE the target video element.
            // YouTube is a SPA and reuses a single <ytd-video-preview> node,
            // moving it to whichever video is currently being hovered.
            const existing = videoElement.querySelector('ytd-video-preview');
            if (existing) return done(existing);

            const observer = new MutationObserver(() => {
                const preview = videoElement.querySelector('ytd-video-preview');
                if (preview) {
                    observer.disconnect();
                    done(preview);
                }
            });
            observer.observe(videoElement, { childList: true, subtree: true });
            
            // Link to controller so it gets cleaned up if cinematic mode is destroyed early
            if (this._abortController) {
                this._abortController.signal.addEventListener('abort', () => {
                    observer.disconnect();
                    done(null);
                });
            }
            
            let attempts = 0;
            const maxAttempts = 10;
            const tryHover = async () => {
                if (resolved) return;
                
                await this._simulateHover(videoElement);
                
                if (resolved) return;
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(tryHover, 400);
                } else {
                    observer.disconnect();
                    // Fallback: If it never appeared inside videoElement, try globally just in case
                    done(videoElement.querySelector('ytd-video-preview') || document.querySelector('ytd-video-preview'));
                }
            };
            tryHover();
        });
    }

    _simulateHover(element) {
        if (!element) return Promise.resolve();
        return new Promise(resolve => {
            const fire = (el) => {
                const rect = el.getBoundingClientRect();
                this.CONFIG.HOVER_EVENTS.forEach(eventType => {
                    el.dispatchEvent(new MouseEvent(eventType, {
                        bubbles: true, cancelable: true, view: window,
                        clientX: rect.left + 10,
                        clientY: rect.top + 10,
                    }));
                });
            };
            const attempt = (retries) => {
                const thumbnailContainer = element.querySelector('#thumbnail, a#thumbnail, ytd-thumbnail a');
                if (thumbnailContainer) {
                    fire(element);
                    fire(thumbnailContainer);
                    setTimeout(() => {
                        if (!this._isMuted) this._syncMuteState();
                        this._updateMuteButtonVisibility();
                        resolve();
                    }, 800);
                } else if (retries > 0) {
                    setTimeout(() => attempt(retries - 1), 300);
                } else {
                    fire(element);
                    resolve();
                }
            };
            setTimeout(() => attempt(5), 100);
        });
    }

    _updateHeroContent(videoElement) {
        if (this._heroState.status !== 'ready' || !this._heroState.heroElement) return;
        
        const existingContent = this._heroState.heroElement.querySelector('.netflix-hero-content');
        if (!existingContent) return;

        const title = videoElement.querySelector('#video-title')?.textContent?.trim() || 'Video Title';
        const avatar = videoElement.querySelector('yt-avatar-shape img, #avatar-link img, #avatar img')?.src || null;
        const channelName = videoElement.querySelector('ytd-channel-name a, ytd-channel-name yt-formatted-string')?.textContent?.trim() || 'Channel Name';
        const titleLink = videoElement.querySelector('a#video-title-link, a#video-title, a#thumbnail');
        const url = titleLink?.href || '#';
        const isRecent = this._isRecentlyAdded(videoElement);
        
        if (!title || !channelName) return;

        const rawHtml = `
            <div class="channel-info" style="display: flex; align-items: center; gap: 15px; margin-bottom: 1.5rem;">
                ${avatar ? `<img src="${avatar}" class="channel-avatar" style="border-radius: 100%; border: 1px solid rgba(255,255,255,0.7); width: 40px;" onerror="this.style.display='none'">` : ''}
                <h2 class="channel-name" style="font-size: 1.5em; font-weight: normal;">${window.YPP.utils.escapeHTML(channelName)}</h2>
            </div>   
            ${isRecent ? `<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500; margin-bottom: 14px; display: inline-block;">Recently Added</span>` : ''}
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
        if (this._isFirefox) return;
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
        // Use real mouse events — CSS :hover is NOT a DOM attribute mutation,
        // so MutationObserver cannot detect it. mouseover/mouseout are the correct APIs.
        const contents = document.querySelector('#contents');
        if (!contents) return;

        contents.addEventListener('mouseover', (e) => {
            const card = e.target.closest('ytd-rich-item-renderer');
            if (!card) return;
            if (!this._isUserHovering || this._heroState.currentVideo !== card) {
                this._isUserHovering = true;
                this._heroState.currentVideo = card;
                clearTimeout(this._videoTimer);
                this._updateHeroContent(card);
                setTimeout(() => this._simulateHover(card), 50);
            }
        }, { signal: this._abortController?.signal });

        contents.addEventListener('mouseout', (e) => {
            // Only fire when leaving the #contents container entirely
            if (contents.contains(e.relatedTarget)) return;
            if (this._isUserHovering) {
                this._isUserHovering = false;
                const currentVideo = this._videoQueue[this._currentVideoIndex];
                if (currentVideo) {
                    this._updateHeroContent(currentVideo);
                    setTimeout(() => {
                        this._simulateHover(currentVideo);
                        this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                    }, 50);
                }
            }
        }, { signal: this._abortController?.signal });

        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.register('cinematic-preview-stealer', 'ytd-video-preview', (elements) => {
                const preview = elements[0] || document.querySelector('ytd-video-preview');
                if (preview && this._heroState.heroElement && preview.parentNode !== this._heroState.heroElement) {
                    // Steal the preview back into our hero container on the body
                    this._heroState.heroElement.appendChild(preview);
                    
                    // Re-append gradients and content to keep them above the video
                    const gradient = this._heroState.heroElement.querySelector('.netflix-hero-gradient');
                    const content = this._heroState.heroElement.querySelector('.netflix-hero-content');
                    if (gradient) this._heroState.heroElement.appendChild(gradient);
                    if (content) this._heroState.heroElement.appendChild(content);
                    
                    this._forceVideoSize(preview);
                }
            });
        }
    }

    _forceVideoSize(preview) {
        if (!preview) return;
        
        const setSize = (node) => {
            if (!node) return;
            node.style.setProperty('width', '100%', 'important');
            node.style.setProperty('height', '100%', 'important');
            node.style.setProperty('max-width', 'none', 'important');
            node.style.setProperty('max-height', 'none', 'important');
            node.style.setProperty('min-width', '100%', 'important');
            node.style.setProperty('min-height', '100%', 'important');
            node.style.setProperty('transform', 'none', 'important');
            node.style.setProperty('border-radius', '0', 'important');
            node.style.setProperty('margin', '0', 'important');
            node.style.setProperty('padding', '0', 'important');
        };

        const stretchContainers = () => {
            window.YPP.Utils.batch.read(() => {
                const videoPreviewContainer = preview.querySelector('#video-preview-container') || preview.querySelector('#inline-preview-player');
                const ytdPlayer = preview.querySelector('ytd-player');
                let playerContainer = ytdPlayer ? ytdPlayer.querySelector('#container') : null;
                if (!playerContainer && ytdPlayer && ytdPlayer.shadowRoot) {
                    playerContainer = ytdPlayer.shadowRoot.querySelector('#container');
                }
                const html5Player = preview.querySelector('.html5-video-player') || (playerContainer ? playerContainer.querySelector('.html5-video-player') : null);
                const html5VideoContainer = preview.querySelector('.html5-video-container') || (html5Player ? html5Player.querySelector('.html5-video-container') : null);
                const video = preview.querySelector('video') || (html5VideoContainer ? html5VideoContainer.querySelector('video') : null);

                window.YPP.Utils.batch.write(() => {
                    setSize(preview);
                    preview.style.setProperty('position', 'absolute', 'important');
                    preview.style.setProperty('top', '0', 'important');
                    preview.style.setProperty('left', '0', 'important');
                    preview.style.setProperty('pointer-events', 'none', 'important');

                    setSize(videoPreviewContainer);
                    setSize(ytdPlayer);
                    setSize(playerContainer);
                    setSize(html5Player);
                    setSize(html5VideoContainer);
                    setSize(video);
                    if (video) {
                        video.style.setProperty('object-fit', 'cover', 'important');
                        video.style.setProperty('z-index', '0', 'important');
                    }
                });
            });
        };

        stretchContainers();

        // Instead of a MutationObserver that fires thousands of times,
        // just rely on the shared observer that triggers when the active preview changes.
        // We also attach the size stretching to the preview playing event to cover late-loaded video elements.
        if (!preview._sizeForcerAttached) {
            preview._sizeForcerAttached = true;
            this.addListener(preview, 'playing', () => stretchContainers(), { capture: true });
            this.addListener(preview, 'loadeddata', () => stretchContainers(), { capture: true });
        }
    }

    // ─── Queue Management & Scroll ────────────────────────────────────────────

    _updateVideoQueue() {
        window.YPP.Utils.batch.read(() => {
            const allVideos = document.querySelectorAll('#contents > ytd-rich-item-renderer, #contents > ytd-rich-section-renderer ytd-rich-item-renderer');
            const newQueue = Array.from(allVideos).filter(item => {
                const titleLink = item.querySelector('a#video-title-link, a#video-title, a#thumbnail');
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

            window.YPP.Utils.batch.write(() => {
                let queueUpdated = false;
                if (newQueue.length !== this._videoQueue.length) {
                    const grew = newQueue.length > this._videoQueue.length;
                    this._videoQueue = newQueue;
                    if (!grew) this._currentVideoIndex = 0;
                    queueUpdated = true;

                    itemsToProcess.forEach(item => {
                        item.badges.forEach(badge => badge.remove());
                        if (item.isRecent) {
                            const badgeContainer = document.createElement('div');
                            badgeContainer.className = 'recently-badge-container';
                            badgeContainer.style = 'position: absolute; top: -17px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 8px;';
                            const badgeHtml = '<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500;">Recently Added</span>';
                            badgeContainer.innerHTML = window.YPP.utils.sanitizeHTML ? window.YPP.utils.sanitizeHTML(badgeHtml) : badgeHtml;
                            if (item.thumbnail) item.thumbnail.appendChild(badgeContainer);
                        }
                        item.video.setAttribute('data-ypp-processed', 'true');
                    });
                }

                const firstVideo = this._videoQueue[0];
                
                if (firstVideo) {
                    if (this._heroState.status === 'inactive') {
                        this._makeHeroPreview(firstVideo).then(() => {
                            if (this._heroState.status === 'ready') {
                                firstVideo.classList.add('netflix-active-preview');
                                this._updateHeroContent(firstVideo);
                                clearTimeout(this._videoTimer);
                                this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                            }
                        });
                    } else if (this._heroState.status === 'ready' && queueUpdated) {
                        firstVideo.classList.add('netflix-active-preview');
                        this._updateHeroContent(firstVideo);
                        clearTimeout(this._videoTimer);
                        this._videoTimer = setTimeout(this._playNextVideo, this.CONFIG.PREVIEW_DELAY);
                    }
                }
            });
        });
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
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.register('cinematic-content-scanner', 'ytd-rich-item-renderer', () => {
                clearTimeout(this._contentUpdateTimer);
                this._contentUpdateTimer = setTimeout(() => this._updateVideoQueue(), this.CONFIG.CONTENT_UPDATE_DELAY);
            });
        }
    }

    _setupScrollHandler() {

        document.body.addEventListener('wheel', (e) => {
            const contents = document.querySelector('#contents');
            if (contents) {
                e.preventDefault();
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    contents.scrollLeft += e.deltaX;
                } else {
                    contents.scrollLeft += e.deltaY;
                }
            }
        }, { passive: false, signal: this._abortController.signal });

        document.addEventListener('keydown', (e) => {
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
            window.location.reload();
        } else {
            setTimeout(() => {
                const isHomePage = (newPathname === '/' || newPathname.includes('/feed/subscriptions'));
                document.body.classList.toggle('cinematic-home', isHomePage);
            }, 500);
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
            
            this._simulateHover(nextVideo).then(() => {
                this._syncMuteState();
            });

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
            window.YPP.sharedObserver.unregister('cinematic-preview-stealer');
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
            const preview = hero.querySelector('ytd-video-preview');
            if (preview) document.body.appendChild(preview); // Safely return preview to DOM
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

        if (this._darkModeObserver) {
            this._darkModeObserver.disconnect();
            this._darkModeObserver = null;
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
