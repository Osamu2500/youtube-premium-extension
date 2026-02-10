/**
 * Video Filter Module
 * 
 * Manages the "Subscribed / Unsubscribed" filter button in the YouTube chips bar.
 * Improved for performance (incremental DOM observation) and robustness (better selectors).
 */
class VideoFilter {
    /**
     * Static configuration and selectors to avoid magic strings.
     */
    static CONSTANTS = {
        STORAGE_KEY: 'ypp-filter-state',
        STATES: {
            ALL: 0,
            SUBSCRIBED: 1,
            UNSUBSCRIBED: 2
        },
        SELECTORS: {
            CHIPS_BAR: 'ytd-feed-filter-chip-bar-renderer',
            CHIPS_WRAPPER: '#chips-wrapper',
            // Video Renderers
            VIDEO_ITEMS: [
                'ytd-rich-item-renderer',
                'ytd-grid-video-renderer',
                'ytd-video-renderer',
                'ytd-compact-video-renderer'
            ].join(','),
            // Subscription Indicators
            SUBSCRIBE_BUTTON: 'ytd-subscribe-button-renderer',
            BUTTON_INNER: 'button, yt-button-shape button',
            NOTIFICATION_BELL: '[aria-label*="notifications"]',
            CHANNEL_INFO: '#metadata, ytd-channel-name',
            HIDDEN_SUB_BUTTON: 'ytd-subscribe-button-renderer[subscribe-button-hidden]'
        },
        CLASSES: {
            BUTTON: 'ypp-filter-btn',
            LABEL: 'ypp-filter-label',
            TOAST: 'ypp-toast',
            SHOW: 'show'
        },
        ATTRS: {
            FILTERED: 'data-ypp-filtered',
            FILTER_STATE: 'data-ypp-filter-state',
            SUBSCRIBED: 'subscribed'
        }
    };

    constructor() {
        this.state = VideoFilter.CONSTANTS.STATES.ALL;
        this.button = null;
        this.observer = null;
        this.processingDebounce = null;
    }

    /**
     * Initializes the filter module.
     */
    init() {
        try {
            this.loadState();
            // Start observing immediately to catch early loads
            this.setupObserver();
            // Inject UI asynchronously
            this.injectFilterButton().catch(err => {
                console.warn('[VideoFilter] Failed to inject button:', err);
            });
            // Initial pass
            this.applyFilterGlobal();
        } catch (e) {
            console.error('[VideoFilter] Init failed:', e);
        }
    }

    /**
     * Loads the saved filter state from localStorage.
     */
    loadState() {
        try {
            const saved = localStorage.getItem(VideoFilter.CONSTANTS.STORAGE_KEY);
            if (saved !== null) {
                const parsed = parseInt(saved, 10);
                if ([0, 1, 2].includes(parsed)) {
                    this.state = parsed;
                }
            }
        } catch (e) {
            console.error('[VideoFilter] Load state failed:', e);
        }
    }

    /**
     * Saves the current state to localStorage.
     */
    saveState() {
        try {
            localStorage.setItem(VideoFilter.CONSTANTS.STORAGE_KEY, this.state.toString());
        } catch (e) {
            console.error('[VideoFilter] Save state failed:', e);
        }
    }

    /**
     * Injects the filter button into the YouTube chips bar.
     */
    async injectFilterButton() {
        const chipsBar = await this.waitForElement(VideoFilter.CONSTANTS.SELECTORS.CHIPS_BAR);

        if (!chipsBar) {
            throw new Error('Chips bar not found after timeout');
        }

        if (document.querySelector(`.${VideoFilter.CONSTANTS.CLASSES.BUTTON}`)) {
            return; // Prevention against duplicate injection
        }

        this.button = document.createElement('button');
        this.button.className = VideoFilter.CONSTANTS.CLASSES.BUTTON;
        this.button.setAttribute('aria-label', this.getStateLabel());
        this.button.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <span class="${VideoFilter.CONSTANTS.CLASSES.LABEL}">${this.getStateLabel()}</span>
        `;

        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.cycleState();
        });

        // Insert at the start of the chips container
        const chipsContainer = chipsBar.querySelector(VideoFilter.CONSTANTS.SELECTORS.CHIPS_WRAPPER) || chipsBar;
        chipsContainer.insertBefore(this.button, chipsContainer.firstChild);

        this.updateButtonStyle();
    }

    /**
     * Cycles through the filter states (All -> Subscribed -> Unsubscribed).
     */
    cycleState() {
        this.state = (this.state + 1) % 3;
        this.saveState();
        this.updateButtonStyle();
        this.applyFilterGlobal(); // Must re-apply globally when state changes
        this.showToast();

        // Reset processed flags to force re-evaluation if needed
        this.resetProcessedFlags();
    }

    /**
     * Resets the 'processed' flags on videos to force a re-check.
     * Useful when switching filter modes.
     */
    resetProcessedFlags() {
        const videos = document.querySelectorAll(`[${VideoFilter.CONSTANTS.ATTRS.FILTERED}]`);
        videos.forEach(v => v.removeAttribute(VideoFilter.CONSTANTS.ATTRS.FILTERED));
        this.applyFilterGlobal();
    }

    /**
     * Returns the human-readable label for the current state.
     */
    getStateLabel() {
        switch (this.state) {
            case VideoFilter.CONSTANTS.STATES.ALL: return 'All Videos';
            case VideoFilter.CONSTANTS.STATES.SUBSCRIBED: return 'Subscribed';
            case VideoFilter.CONSTANTS.STATES.UNSUBSCRIBED: return 'Not Subscribed';
            default: return 'Filter';
        }
    }

    /**
     * Updates the button's visual state and label.
     */
    updateButtonStyle() {
        if (!this.button) return;

        this.button.setAttribute('data-state', this.state);
        this.button.setAttribute('aria-label', this.getStateLabel());

        const label = this.button.querySelector(`.${VideoFilter.CONSTANTS.CLASSES.LABEL}`);
        if (label) {
            label.textContent = this.getStateLabel();
        }
    }

    /**
     * Shows a temporary toast message indicating the current filter state.
     */
    showToast() {
        const messages = [
            'Filter: All Videos',
            'Filter: Subscribed Channels Only',
            'Filter: Non-Subscribed Channels Only'
        ];

        const existingToast = document.querySelector(`.${VideoFilter.CONSTANTS.CLASSES.TOAST}`);
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `${VideoFilter.CONSTANTS.CLASSES.TOAST} ${VideoFilter.CONSTANTS.CLASSES.SHOW}`;
        toast.textContent = messages[this.state];
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove(VideoFilter.CONSTANTS.CLASSES.SHOW);
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Applies the filter to ALL existing videos on the page.
     * This is expensive O(N) and should only be used on init or state change.
     */
    applyFilterGlobal() {
        const videos = document.querySelectorAll(VideoFilter.CONSTANTS.SELECTORS.VIDEO_ITEMS);
        videos.forEach(video => this.filterVideo(video));
    }

    /**
     * Applies filter logic to a single video element.
     * @param {HTMLElement} videoElement 
    */
    filterVideo(videoElement) {
        if (!videoElement || !videoElement.style) return;

        // Optimization: Skip if already processed for this specific state
        // We use attributes to track optimization status
        if (videoElement.hasAttribute(VideoFilter.CONSTANTS.ATTRS.FILTERED)) {
            const lastState = parseInt(videoElement.getAttribute(VideoFilter.CONSTANTS.ATTRS.FILTER_STATE), 10);
            if (lastState === this.state) {
                return;
            }
        }

        // Mark as processed
        videoElement.setAttribute(VideoFilter.CONSTANTS.ATTRS.FILTERED, 'true');
        videoElement.setAttribute(VideoFilter.CONSTANTS.ATTRS.FILTER_STATE, this.state);

        // State 0: Show All
        if (this.state === VideoFilter.CONSTANTS.STATES.ALL) {
            videoElement.style.display = '';
            return;
        }

        // Determine subscription status
        const isSubscribed = this.isSubscribedChannel(videoElement);

        if (this.state === VideoFilter.CONSTANTS.STATES.SUBSCRIBED) {
            // Show only subscribed
            videoElement.style.display = isSubscribed ? '' : 'none';
        } else if (this.state === VideoFilter.CONSTANTS.STATES.UNSUBSCRIBED) {
            // Show only non-subscribed
            videoElement.style.display = isSubscribed ? 'none' : '';
        }
    }

    /**
     * Determines if a video element belongs to a subscribed channel.
     * Uses multiple heuristics for robustness.
     * @param {HTMLElement} videoElement 
     * @returns {boolean}
     */
    isSubscribedChannel(videoElement) {
        try {
            // Method 1: Check native "subscribed" attribute (Most Reliable)
            const subscribeButton = videoElement.querySelector(VideoFilter.CONSTANTS.SELECTORS.SUBSCRIBE_BUTTON);
            if (subscribeButton) {
                if (subscribeButton.hasAttribute(VideoFilter.CONSTANTS.ATTRS.SUBSCRIBED) ||
                    subscribeButton.getAttribute(VideoFilter.CONSTANTS.ATTRS.SUBSCRIBED) === 'true') {
                    return true;
                }

                // Sub-check: Button Text/Label fallback (Fragile due to localization)
                const button = subscribeButton.querySelector(VideoFilter.CONSTANTS.SELECTORS.BUTTON_INNER);
                if (button) {
                    const label = (button.getAttribute('aria-label') || '').toLowerCase();
                    const text = (button.textContent || '').toLowerCase();

                    // Logic: If it says "Unsubscribe", you ARE subscribed.
                    if (label.includes('unsubscribe') || text.includes('unsubscribe')) return true;
                }
            }

            // Method 2: Check for hidden subscribe button (often implies subscribed state in some views)
            if (videoElement.querySelector(VideoFilter.CONSTANTS.SELECTORS.HIDDEN_SUB_BUTTON)) {
                return true;
            }

            // Method 3: Check for Notification Bell (Only appears for subscribed channels)
            if (videoElement.querySelector(VideoFilter.CONSTANTS.SELECTORS.NOTIFICATION_BELL)) {
                return true;
            }

            // Method 4: Metadata text fallback (Last resort)
            const channelInfo = videoElement.querySelector(VideoFilter.CONSTANTS.SELECTORS.CHANNEL_INFO);
            if (channelInfo && channelInfo.textContent.toLowerCase().includes('subscribed')) {
                return true;
            }

            return false;
        } catch (e) {
            console.warn('[VideoFilter] Error checking subscription:', e);
            return false; // Fail safe to not hiding logic
        }
    }

    /**
     * Sets up a MutationObserver to handle dynamically loaded content.
     * Optimized to only process added nodes matching video selectors.
     */
    setupObserver() {
        if (this.observer) this.observer.disconnect();

        this.observer = new MutationObserver((mutations) => {
            requestAnimationFrame(() => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length === 0) continue;

                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue; // Skip non-elements

                        // Check if the node itself is a video
                        // We convert the comma-separated selector string to an array for checking
                        const selectorList = VideoFilter.CONSTANTS.SELECTORS.VIDEO_ITEMS.split(',');
                        const isVideo = selectorList.some(s => node.matches && node.matches(s));

                        if (isVideo) {
                            this.filterVideo(node);
                        } else {
                            // Check for nested videos inside the added node (e.g. a new row or section)
                            const nestedVideos = node.querySelectorAll(VideoFilter.CONSTANTS.SELECTORS.VIDEO_ITEMS);
                            if (nestedVideos.length > 0) {
                                nestedVideos.forEach(v => this.filterVideo(v));
                            }
                        }
                    }
                }
            });
        });

        // Observe the main app container for robust detection
        const target = document.querySelector('ytd-app') || document.body;
        this.observer.observe(target, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Waits for an element to appear in the DOM.
     * @param {string} selector 
     * @param {number} timeout 
     * @returns {Promise<HTMLElement|null>}
     */
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const existing = document.querySelector(selector);
            if (existing) return resolve(existing);

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    destroy() {
        if (this.observer) this.observer.disconnect();
        if (this.button) this.button.remove();
        this.observer = null;
        this.button = null;
    }
}

// Global Export
window.VideoFilter = new VideoFilter();
window.VideoFilter.init();
