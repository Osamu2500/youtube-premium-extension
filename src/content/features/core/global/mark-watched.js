/**
 * Mark as Watched Feature
 * Adds a hover icon to video thumbnails to manually mark videos as watched
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MarkWatched = class MarkWatched {
    constructor() {
        this.name = 'MarkWatched';
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.settings = null;
        this.observer = null;
        this.STORAGE_KEY = 'ypp_manual_watched';
        this.watchedVideoIds = new Set();
        this.initialized = false;
        
        // The eye icon SVG path
        this.ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';
    }

    async update(settings) {
        this.settings = settings;
        
        if (this.settings.enableMarkWatched) {
            await this.enable();
        } else {
            this.disable();
        }
    }

    async enable() {
        if (!this.initialized) {
            await this.loadWatchedData();
            this.setupObserver();
            // Hook into SPA navigation
            window.addEventListener('yt-navigate-finish', () => this.scanDOM());
            this.initialized = true;
        }
        this.scanDOM();
    }

    disable() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Remove added icons and classes
        document.querySelectorAll(`.${this.CONSTANTS.CSS_CLASSES.WATCHED_ICON}`).forEach(el => el.remove());
        document.querySelectorAll(`.${this.CONSTANTS.CSS_CLASSES.MANUALLY_WATCHED}`).forEach(el => {
            el.classList.remove(this.CONSTANTS.CSS_CLASSES.MANUALLY_WATCHED);
        });
        
        this.initialized = false;
    }

    async loadWatchedData() {
        try {
            const data = await chrome.storage.local.get(this.STORAGE_KEY);
            if (data[this.STORAGE_KEY] && Array.isArray(data[this.STORAGE_KEY])) {
                this.watchedVideoIds = new Set(data[this.STORAGE_KEY]);
            }
        } catch (e) {
            this.Utils.log(`Failed to load watched data: ${e.message}`, 'MARK_WATCHED', 'error');
        }
    }

    async saveWatchedData() {
        try {
            await chrome.storage.local.set({ 
                [this.STORAGE_KEY]: Array.from(this.watchedVideoIds) 
            });
            // Emit an event so Theme can pick it up if needed immediately
            if (window.YPP.events) {
                window.YPP.events.emit('manual_watched_updated', this.watchedVideoIds);
            }
        } catch (e) {
            this.Utils.log(`Failed to save watched data: ${e.message}`, 'MARK_WATCHED', 'error');
        }
    }

    setupObserver() {
        if (this.observer) return;

        const process = () => this.scanDOM();
        const debouncedProcess = this.Utils.debounce?.(process, 300) || (() => setTimeout(process, 300));
        
        this.observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) debouncedProcess();
        });

        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    scanDOM() {
        if (!this.settings?.enableMarkWatched) return;

        const thumbnails = document.querySelectorAll(this.CONSTANTS.SELECTORS.THUMBNAIL_CONTAINER);
        thumbnails.forEach(thumbnail => {
            this.processThumbnail(thumbnail);
        });
    }

    processThumbnail(thumbnail) {
        // Skip if already processed
        if (thumbnail.dataset.yppMarkWatchedProcessed) return;

        // Try to get video ID from the parent link
        const aTag = thumbnail.closest('a[href*="/watch?v="]');
        if (!aTag) return;
        
        const urlParams = new URLSearchParams(aTag.href.split('?')[1]);
        const videoId = urlParams.get('v');
        if (!videoId) return;

        // Apply state if previously watched
        if (this.watchedVideoIds.has(videoId)) {
            thumbnail.classList.add(this.CONSTANTS.CSS_CLASSES.MANUALLY_WATCHED);
            
            // Also add the 'is-watched' attribute for existing CSS compatibility
            const container = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
            if (container) {
                container.setAttribute('is-watched', '');
            }
        }

        // Inject the icon
        this.injectIcon(thumbnail, videoId);
        thumbnail.dataset.yppMarkWatchedProcessed = 'true';
    }

    injectIcon(thumbnail, videoId) {
        // Don't inject if it already exists
        if (thumbnail.querySelector(`.${this.CONSTANTS.CSS_CLASSES.WATCHED_ICON}`)) return;

        const iconBtn = document.createElement('div');
        iconBtn.className = this.CONSTANTS.CSS_CLASSES.WATCHED_ICON;
        iconBtn.innerHTML = this.ICON_SVG;
        iconBtn.title = "Mark as Watched";
        
        // Add click listener
        iconBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleWatchedStatus(videoId, thumbnail);
        });

        // Add to the overlays container structure
        const overlaysContainer = thumbnail.querySelector('#overlays');
        if (overlaysContainer) {
            overlaysContainer.appendChild(iconBtn);
        } else {
            thumbnail.appendChild(iconBtn);
        }
    }

    async toggleWatchedStatus(videoId, thumbnail) {
        const isWatched = this.watchedVideoIds.has(videoId);
        const container = thumbnail.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
        
        if (isWatched) {
            this.watchedVideoIds.delete(videoId);
            thumbnail.classList.remove(this.CONSTANTS.CSS_CLASSES.MANUALLY_WATCHED);
            if (container) container.removeAttribute('is-watched');
        } else {
            this.watchedVideoIds.add(videoId);
            thumbnail.classList.add(this.CONSTANTS.CSS_CLASSES.MANUALLY_WATCHED);
            if (container) container.setAttribute('is-watched', '');
        }

        await this.saveWatchedData();
    }
};
