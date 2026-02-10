/**
 * Video Filter Module
 * Provides functionality to filter YouTube videos by subscription status
 * @module videoFilter
 */

import { SELECTORS, STORAGE_KEYS, FILTER_STATES, FILTER_LABELS, LOG_PREFIX } from '../constants.js';

/**
 * Manages video filtering by subscription status
 * @class
 */
export class VideoFilter {
    /**
     * Creates a new VideoFilter instance
     */
    constructor() {
        /** @type {number} Current filter state (0=All, 1=Subscribed, 2=Non-Subscribed) */
        this.state = FILTER_STATES.ALL;

        /** @type {HTMLElement|null} Filter button element */
        this.button = null;

        /** @type {MutationObserver|null} Observes DOM changes for new videos */
        this.observer = null;

        /** @type {boolean} Prevents concurrent filter processing */
        this.processingVideos = false;
    }

    /**
     * Initialize the video filter
     * @returns {Promise<void>}
     */
    async init() {
        console.log(`${LOG_PREFIX.FILTER} Initializing...`);

        try {
            await this.loadState();
            await this.injectFilterButton();
            this.setupObserver();

            // Apply initial filter with delay
            setTimeout(() => this.applyFilter(), 1000);
        } catch (error) {
            console.error(`${LOG_PREFIX.FILTER} Initialization error:`, error);
        }
    }

    /**
     * Load saved filter state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.FILTER_STATE);
            if (saved !== null) {
                this.state = parseInt(saved, 10);
                console.log(`${LOG_PREFIX.FILTER} Loaded state:`, this.state);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX.FILTER} Error loading state:`, error);
        }
    }

    /**
     * Save current filter state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.FILTER_STATE, this.state.toString());
        } catch (error) {
            console.error(`${LOG_PREFIX.FILTER} Error saving state:`, error);
        }
    }

    /**
     * Inject filter button into the chips bar
     * @returns {Promise<void>}
     */
    async injectFilterButton() {
        console.log(`${LOG_PREFIX.FILTER} Waiting for chips bar...`);

        const chipsBar = await this._waitForElement(SELECTORS.CHIPS_BAR, 10000);

        if (!chipsBar) {
            console.log(`${LOG_PREFIX.FILTER} Chips bar not found`);
            return;
        }

        // Legacy: Filter Button Injection Disabled for Glass UI
        return;

        // Check if button already exists
        if (document.querySelector('.ypp-filter-btn')) {
            console.log(`${LOG_PREFIX.FILTER} Button already exists`);
            return;
        }

        console.log(`${LOG_PREFIX.FILTER} Injecting button...`);

        // Create filter button
        this.button = document.createElement('button');
        this.button.className = 'ypp-filter-btn';
        this.button.setAttribute('data-state', this.state);
        this.button.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
            </svg>
            <span class="ypp-filter-label">${this._getStateLabel()}</span>
        `;

        this.button.addEventListener('click', () => this.cycleState());

        // Insert at beginning of chips bar
        const chipsContainer = chipsBar.querySelector(SELECTORS.CHIPS_WRAPPER) || chipsBar;
        chipsContainer.insertBefore(this.button, chipsContainer.firstChild);

        this._updateButtonStyle();
        console.log(`${LOG_PREFIX.FILTER} Button injected`);
    }

    /**
     * Cycle through filter states
     */
    cycleState() {
        this.state = (this.state + 1) % 3;
        this.saveState();
        this._updateButtonStyle();
        this.applyFilter();
        this._showToast();
        console.log(`${LOG_PREFIX.FILTER} State changed to:`, this.state);
    }

    /**
     * Get label for current state
     * @returns {string} State label
     * @private
     */
    _getStateLabel() {
        return FILTER_LABELS[this.state] || 'Filter';
    }

    /**
     * Update button visual style based on current state
     * @private
     */
    _updateButtonStyle() {
        if (!this.button) return;

        this.button.setAttribute('data-state', this.state);
        const label = this.button.querySelector('.ypp-filter-label');
        if (label) {
            label.textContent = this._getStateLabel();
        }
    }

    /**
     * Show toast notification for state change
     * @private
     */
    _showToast() {
        const messages = [
            'Filter: All Videos',
            'Filter: Subscribed Channels Only',
            'Filter: Non-Subscribed Channels Only'
        ];

        const toast = document.createElement('div');
        toast.className = 'ypp-toast show';
        toast.textContent = messages[this.state];
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Apply current filter to all videos
     * @returns {Promise<void>}
     */
    async applyFilter() {
        if (this.processingVideos) return;

        this.processingVideos = true;

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const videoSelectors = [
                SELECTORS.VIDEO_ITEM,
                'ytd-grid-video-renderer',
                'ytd-video-renderer',
                'ytd-compact-video-renderer'
            ];

            let totalVideos = 0;
            let filteredCount = 0;

            videoSelectors.forEach(selector => {
                const videos = document.querySelectorAll(selector);
                totalVideos += videos.length;
                videos.forEach(video => {
                    const wasFiltered = this._filterVideo(video);
                    if (wasFiltered) filteredCount++;
                });
            });

            console.log(`${LOG_PREFIX.FILTER} Applied: ${filteredCount}/${totalVideos} videos`);
        } catch (error) {
            console.error(`${LOG_PREFIX.FILTER} Error applying filter:`, error);
        } finally {
            this.processingVideos = false;
        }
    }

    /**
     * Filter a single video element
     * @param {HTMLElement} videoElement - Video element to filter
     * @returns {boolean} True if video was filtered
     * @private
     */
    _filterVideo(videoElement) {
        if (this.state === FILTER_STATES.ALL) {
            videoElement.style.display = '';
            return false;
        }

        const isSubscribed = this._isSubscribedChannel(videoElement);

        if (this.state === FILTER_STATES.SUBSCRIBED_ONLY) {
            videoElement.style.display = isSubscribed ? '' : 'none';
        } else if (this.state === FILTER_STATES.NON_SUBSCRIBED_ONLY) {
            videoElement.style.display = isSubscribed ? 'none' : '';
        }

        return true;
    }

    /**
     * Check if video is from a subscribed channel
     * @param {HTMLElement} videoElement - Video element to check
     * @returns {boolean} True if subscribed
     * @private
     */
    _isSubscribedChannel(videoElement) {
        // Method 1: Check subscribe button
        const subscribeButton = videoElement.querySelector('ytd-subscribe-button-renderer');
        if (subscribeButton) {
            const button = subscribeButton.querySelector('button, yt-button-shape button');
            if (button) {
                const ariaLabel = button.getAttribute('aria-label') || '';
                const buttonText = button.textContent || '';

                if (ariaLabel.toLowerCase().includes('unsubscribe') ||
                    buttonText.toLowerCase().includes('unsubscribe')) {
                    return true;
                }

                if (ariaLabel.toLowerCase().includes('subscribe') &&
                    !ariaLabel.toLowerCase().includes('unsubscribe')) {
                    return false;
                }
            }

            if (subscribeButton.hasAttribute('subscribed') ||
                subscribeButton.getAttribute('subscribed') === 'true') {
                return true;
            }
        }

        // Method 2: Check for notification bell
        const notificationBell = videoElement.querySelector('[aria-label*="notifications"]');
        if (notificationBell) {
            return true;
        }

        // Method 3: Check for hidden subscribe button
        const hiddenSubButton = videoElement.querySelector('ytd-subscribe-button-renderer[subscribe-button-hidden]');
        if (hiddenSubButton) {
            return true;
        }

        return false;
    }

    /**
     * Setup mutation observer to watch for new videos
     */
    setupObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldRefilter = false;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && this._isVideoNode(node)) {
                        shouldRefilter = true;
                        break;
                    }
                }
                if (shouldRefilter) break;
            }

            if (shouldRefilter) {
                this.applyFilter();
            }
        });

        const target = document.querySelector('ytd-app') || document.body;
        this.observer.observe(target, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Check if node is a video element or contains videos
     * @param {HTMLElement} node - Node to check
     * @returns {boolean}
     * @private
     */
    _isVideoNode(node) {
        if (!node.matches || !node.querySelector) return false;

        const isVideo = node.matches('ytd-rich-item-renderer') ||
            node.matches('ytd-grid-video-renderer') ||
            node.matches('ytd-video-renderer') ||
            node.matches('ytd-compact-video-renderer');

        const hasVideos = node.querySelector('ytd-rich-item-renderer') ||
            node.querySelector('ytd-grid-video-renderer') ||
            node.querySelector('ytd-video-renderer') ||
            node.querySelector('ytd-compact-video-renderer');

        return isVideo || Boolean(hasVideos);
    }

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<HTMLElement|null>}
     * @private
     */
    _waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`${LOG_PREFIX.FILTER} Element found immediately:`, selector);
                return resolve(element);
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`${LOG_PREFIX.FILTER} Element found:`, selector);
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                console.log(`${LOG_PREFIX.FILTER} Timeout waiting for:`, selector);
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.button) {
            this.button.remove();
            this.button = null;
        }
    }
}
