/**
 * Duration Filter Module
 * Hides videos that are shorter than a specified minimum duration.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DurationFilter = class DurationFilter extends window.YPP.features.BaseFeature {
    static SELECTORS = {
        CARDS: 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer',
        SHORTS_LINK: 'a[href*="/shorts/"]',
        DURATION_BADGE: 'ytd-thumbnail-overlay-time-status-renderer span#text, ytd-badge-supported-renderer span'
    };

    constructor() {
        super('DurationFilter');
        this._boundProcessVideos = this._processVideos.bind(this);
        this._startPump = this.utils.debounce(this._startPump.bind(this), 500);
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
        document.querySelectorAll('.ypp-hidden-duration').forEach(el => {
            el.classList.remove('ypp-hidden-duration');
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
        const parts = text.trim().split(':').reverse();
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
        if (!this.settings?.hideShortVideos) return;
        
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
                if (video.querySelector(DurationFilter.SELECTORS.SHORTS_LINK)) return;

                // Find duration badge
                const badge = video.querySelector(DurationFilter.SELECTORS.DURATION_BADGE);
                if (!badge) return;

                const durationText = badge.textContent || badge.innerText;
                if (!durationText || !durationText.includes(':')) return;

                const minutes = this._parseMinutes(durationText);
                
                if (minutes < minDuration) {
                    if (!video.classList.contains('ypp-hidden-duration')) {
                        video.classList.add('ypp-hidden-duration');
                        hiddenCount++;
                    }
                } else {
                    video.classList.remove('ypp-hidden-duration');
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
        window.dispatchEvent(new Event('scroll'));
        this.utils.log('Triggered scroll pump to load more videos.', 'DURATION', 'debug');
    }
};
