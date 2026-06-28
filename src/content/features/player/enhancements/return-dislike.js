/**
 * Feature: Return YouTube Dislike
 * Fetches and displays dislike counts using the Return YouTube Dislike API.
 * API: https://returnyoutubedislikeapi.com/
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ReturnDislike = class ReturnDislike extends window.YPP.features.BaseFeature {
    constructor() {
        super('ReturnDislike');
        this.isActive = false;
        this.videoId = null;
        this.abortController = null;
        this.cache = new Map(); // Simple LRU-lite cache (max 50 entries)
        this._cacheMax = 50;
        
        this.currentDislikesData = null;
        this.buttonsElement = null;
        
        // Binds
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    getConfigKey() { return 'returnYouTubeDislike'; }

    run(settings) {
        if (settings.returnYouTubeDislike) {
            this.enable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        
        // Listen for navigation
        this.addListener(window, 'yt-navigate-finish', this.handleNavigation);
        
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('return-dislike-buttons', '#top-level-buttons-computed', (elements) => {
                this.buttonsElement = elements[0];
                this.renderDislikes();
            }, false); // don't disconnect on first find, buttons might re-render
        }
        
        // Initial check
        if (this.isWatchPage()) {
            this.handleNavigation();
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('return-dislike-buttons');
        }
        this.buttonsElement = null;
        this.currentDislikesData = null;
        super.disable();
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        if (!this.isActive || !this.isWatchPage()) return;
        
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId && videoId !== this.videoId) {
            this.videoId = videoId;
            this.currentDislikesData = null; // Clear old data
            this.fetchDislikes(videoId);
        }
    }

    async fetchDislikes(videoId) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        // Check cache
        if (this.cache.has(videoId)) {
            this.currentDislikesData = this.cache.get(videoId);
            this.renderDislikes();
            return;
        }

        const url = `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`;

        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'FETCH_API', url }, resolve);
            });
            
            if (this.abortController.signal.aborted) return;

            if (response && response.status === 200 && response.data) {
                const data = response.data;
                // LRU eviction: drop oldest entry when cache is at capacity
                if (this.cache.size >= this._cacheMax) {
                    this.cache.delete(this.cache.keys().next().value);
                }
                this.cache.set(videoId, data);
                
                if (this.videoId === videoId) { // Check if we haven't navigated away
                    this.currentDislikesData = data;
                    this.renderDislikes();
                }
            } else {
                throw new Error(response?.error || 'API Error');
            }
        } catch (e) {
            if (e.name !== 'AbortError' && !e.message?.includes('Extension context invalidated')) {
                this.utils?.log(`Fetch error: ${e.message}`, 'ReturnDislike', 'debug');
            }
        }
    }

    renderDislikes() {
        if (!this.isActive || !this.currentDislikesData || !this.buttonsElement) return;

        const data = this.currentDislikesData;
        const buttons = this.buttonsElement;

        // Find the dislike button
        // 1. Try finding by specific icon path or aria-label if possible, but structure varies.
        // 2. Fallback: assumption that it's the 2nd button in the segmented button group.
        
        // Modern YouTube uses dislike-button-view-model or segmented-dislike-button
        let dislikeButton = buttons.querySelector('dislike-button-view-model, #segmented-dislike-button-renderer, #segmented-dislike-button');
        
        // Classic fallback
        if (!dislikeButton) {
            dislikeButton = buttons.querySelector('ytd-toggle-button-renderer:nth-child(2)');
        }
        
        if (!dislikeButton) {
             const allButtons = buttons.querySelectorAll('ytd-toggle-button-renderer, button');
             if (allButtons.length >= 2) dislikeButton = allButtons[1];
        }

        if (!dislikeButton) return;

        if (dislikeButton.hasAttribute('data-ypp-processed-dislikes')) {
            // If stamped but our text was destroyed by SPA navigation/re-render, we need to recover it
            if (!dislikeButton.querySelector('.ypp-dislike-text')) {
                dislikeButton.removeAttribute('data-ypp-processed-dislikes');
            } else {
                // Just update the text if it exists
                const existingText = dislikeButton.querySelector('.ypp-dislike-text');
                existingText.textContent = this.formatNumber(data.dislikes);
                existingText.title = data.dislikes.toLocaleString();
                return;
            }
        }

        dislikeButton.setAttribute('data-ypp-processed-dislikes', 'true');

        // --- 1. Text Update ---
        let textEl = document.createElement('span');
        textEl.className = 'ypp-dislike-text';
        
        // Ensure our CSS is injected (BaseFeature handles deduplication)
        this.addStyle(`
            .ypp-dislike-text {
                margin-left: 6px;
                font-size: 14px;
                font-weight: 500;
                line-height: normal;
                opacity: 0.9;
                display: inline-flex;
                align-items: center;
            }
        `);
        
        // Insert into the button content
        const buttonContent = dislikeButton.querySelector('button') || dislikeButton.querySelector('a') || dislikeButton;
        const icon = buttonContent.querySelector('yt-icon') || buttonContent.querySelector('.yt-spec-button-shape-next__icon');
        
        if (icon && icon.parentNode) {
            icon.parentNode.insertBefore(textEl, icon.nextSibling);
        } else {
            buttonContent.appendChild(textEl);
        }

        const formattedDate = this.formatNumber(data.dislikes);
        textEl.textContent = formattedDate;
        textEl.title = data.dislikes.toLocaleString(); // Exact count on hover
        dislikeButton.title = `${data.dislikes.toLocaleString()} dislikes`; // Button tooltip

    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};
