/**
 * Duration Filter Module
 * Hides videos that are shorter than a specified minimum duration.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DurationFilter = class DurationFilter extends window.YPP.features.BaseFilterFeature {
    static SELECTORS = {
        CARDS: 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer',
        SHORTS_LINK: 'a[href*="/shorts/"]',
        DURATION_BADGE: 'ytd-thumbnail-overlay-time-status-renderer span#text, ytd-badge-supported-renderer span'
    };

    constructor() {
        super('DurationFilter');
        this._boundProcessVideos = this._processVideos.bind(this);
        this._startPump = this.utils.debounce(this._startPump.bind(this), 500);
        this._pumpCount = 0;
        this._maxPumps = 5;
        this._pumpResetTimer = null;
    }

    getConfigKey() { return 'hideShortVideos'; }

    /**
     * Enable the feature.
     * @returns {Promise<void>}
     */
    async enable() {
        await super.enable();
        this._applyFilter();
        
        // Monitor standard video cards
        this.observer.register('duration-filter', DurationFilter.SELECTORS.CARDS, this._boundProcessVideos);
    }

    /**
     * Disable the feature.
     * @returns {Promise<void>}
     */
    async disable() {
        await super.disable();
        this.observer.unregister('duration-filter');
        this._cleanupDOM();
    }

    /**
     * Called when settings are updated.
     * @returns {Promise<void>}
     */
    async onUpdate() {
        this._applyFilter();
    }

    /**
     * Remove duration filter classes and stamps from the DOM.
     * @private
     */
    _cleanupDOM() {
        this._unhideAll();
        document.querySelectorAll('[data-ypp-duration-filtered]').forEach(el => {
            delete el.dataset.yppDurationFiltered;
        });
    }

    /**
     * Apply the duration filter to the current DOM.
     * @private
     */
    _applyFilter() {
        if (!this.settings?.hideShortVideos) {
            this._cleanupDOM();
            return;
        }
        
        // Clear processed stamps if settings changed so they can be re-evaluated
        const minDuration = String(parseInt(this.settings?.minVideoDuration || 5, 10));
        document.querySelectorAll(`[data-ypp-duration-filtered]:not([data-ypp-duration-filtered="${minDuration}"])`).forEach(el => {
            delete el.dataset.yppDurationFiltered;
        });

        this._processVideos(document.querySelectorAll(DurationFilter.SELECTORS.CARDS));
    }

    /**
     * Parse duration text like "14:20" or "1:05:10" into total minutes.
     * @param {string} text 
     * @returns {number}
     */
    _parseMinutes(text) {
        if (!text) return 0;
        
        // Skip live streams and premieres
        if (/\b(live|premiere|upcoming|scheduled)\b/i.test(text)) {
            return Infinity; // Never hide live/premiere videos
        }
        
        const parts = text.trim().split(':').reverse();
        if (parts.length < 2) return 0; // Not a valid duration format
        
        let totalMinutes = 0;
        
        // parts[0] = seconds
        // parts[1] = minutes
        // parts[2] = hours
        
        if (parts[1]) {
            totalMinutes += parseInt(parts[1], 10);
        }
        if (parts[2]) {
            totalMinutes += parseInt(parts[2], 10) * 60;
        }
        
        return totalMinutes;
    }

    /**
     * Process a batch of video elements and apply the duration filter.
     * @param {NodeList|Array} elements 
     * @private
     */
    _processVideos(elements) {
        if (!this.isEnabled || !this.settings?.hideShortVideos || !this._shouldRunOnCurrentPage()) return;
        
        const minDuration = parseInt(this.settings?.minVideoDuration || 5, 10);
        const minDurationStr = String(minDuration);
        let hiddenCount = 0;
        
        const nodes = Array.isArray(elements) || elements instanceof NodeList ? elements : [elements];

        nodes.forEach(video => {
            try {
                if (!video || !video.querySelector) return;
                
                // PERFORMANCE: DOM Stamping guard
                if (video.dataset.yppDurationFiltered === minDurationStr) return;
                
                // PERFORMANCE: DOM Stamping - Mark as processed for this specific threshold
                video.dataset.yppDurationFiltered = minDurationStr;
                
                // Skip Shorts completely (handled by Shorts blocker)
                const isShorts = (
                    video.querySelector(DurationFilter.SELECTORS.SHORTS_LINK) ||
                    video.tagName.toLowerCase() === 'ytd-reel-item-renderer' ||
                    video.closest('ytd-reel-shelf-renderer') !== null ||
                    video.closest('ytd-shorts') !== null
                );
                if (isShorts) return;

                // Find duration badge
                const badge = video.querySelector(DurationFilter.SELECTORS.DURATION_BADGE);
                if (!badge) return;

                const durationText = badge.textContent || badge.innerText;
                if (!durationText || !durationText.includes(':')) return;

                const minutes = this._parseMinutes(durationText);
                
                if (minutes < minDuration) {
                    if (!video.classList.contains('ypp-hidden')) {
                        this._hideElement(video, 'duration');
                        hiddenCount++;
                    }
                } else {
                    this._unhideElement(video);
                }
            } catch (err) {
                this.utils.log(err.message, 'DURATION', 'error');
            }
        });

        // Trigger scroll pump if we hid many videos to prevent the feed from stalling
        if (hiddenCount > 0) {
            this._startPump();
        }
    }

    /**
     * Dispatch a scroll event to force YouTube to load more videos.
     * Critical when filtering large amounts of videos to prevent infinite scroll from stalling.
     * @private
     */
    _startPump() {
        if (!this.settings?.hideShortVideos) return;
        
        if (this._pumpCount >= this._maxPumps) {
            this.utils.log('Max scroll pumps reached. Stopping to prevent loop.', 'DURATION', 'warn');
            return;
        }
        
        this._pumpCount++;
        window.dispatchEvent(new Event('scroll'));
        this.utils.log('Triggered scroll pump to load more videos.', 'DURATION', 'debug');
        
        // Reset pump count after 5 seconds of no activity
        clearTimeout(this._pumpResetTimer);
        this._pumpResetTimer = setTimeout(() => { this._pumpCount = 0; }, 5000);
    }
};
