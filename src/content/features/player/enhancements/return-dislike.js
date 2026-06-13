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

        // Fast path: if we already injected the text span, just update the number and return.
        // Skips all the expensive DOM walking below on subsequent navigations to the same video.
        const existingText = buttons.querySelector('.ypp-dislike-text');
        if (existingText) {
            existingText.textContent = this.formatNumber(data.dislikes);
            existingText.title = data.dislikes.toLocaleString();
            return;
        }

        // Find the dislike button
        // 1. Try finding by specific icon path or aria-label if possible, but structure varies.
        // 2. Fallback: assumption that it's the 2nd button in the segmented button group.
        
        let dislikeButton = buttons.querySelector('ytd-toggle-button-renderer:nth-child(2)'); // Classic
        
        // If not found, try searching children for specific attributes
        if (!dislikeButton) {
             const allButtons = buttons.querySelectorAll('ytd-toggle-button-renderer, button, #segmented-dislike-button-renderer');
             // Often it's in a segmented container now
             const segment = buttons.querySelector('#segmented-dislike-button-renderer');
             if (segment) dislikeButton = segment;
             else if (allButtons.length >= 2) dislikeButton = allButtons[1];
        }

        if (!dislikeButton) return;

        // --- 1. Text Update ---
        let textEl = dislikeButton.querySelector('.ypp-dislike-text');
        if (!textEl) {
            textEl = document.createElement('span');
            textEl.className = 'ypp-dislike-text';
            Object.assign(textEl.style, {
                marginLeft: '6px',
                fontSize: '13px',
                fontWeight: '500',
                lineHeight: '1.5rem' // Match YouTube's line height
            });
            
            // Insert into the button content
            const buttonContent = dislikeButton.querySelector('button') || dislikeButton.querySelector('a') || dislikeButton;
            const icon = buttonContent.querySelector('yt-icon') || buttonContent.querySelector('.yt-spec-button-shape-next__icon');
            
            if (icon && icon.parentNode) {
                icon.parentNode.insertBefore(textEl, icon.nextSibling);
            } else {
                buttonContent.appendChild(textEl);
            }
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
