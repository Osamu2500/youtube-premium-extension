/**
 * Feature: Return YouTube Dislike
 * Restores the dislike count on YouTube videos using the Return YouTube Dislike API.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ReturnYouTubeDislike = class ReturnYouTubeDislike {
    constructor() {
        this.isActive = false;
        this.observer = null;
        this.videoId = null;
        this.abortController = null;
        this.cache = new Map(); // Simple memory cache for session (could use sessionStorage)
        
        // Binds
        this.checkForButton = this.checkForButton.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;
        
        // Start observation if we are on a watch page
        if (this.isWatchPage()) {
            this.init();
        }
        
        // Listen for navigation internally if Manager doesn't re-init us
        // (But Manager disableAll() -> enable() pattern is preferred)
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.stop();
    }

    update(settings) {
        // No settings yet, but standard interface
    }

    run(settings) {
        this.enable(settings);
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch') || location.pathname.startsWith('/shorts');
    }

    init() {
        this.videoId = this.getVideoId();
        if (!this.videoId) return;

        // Uses the shared DOMObserver if available, otherwise falls back to local (or specific logic)
        // For buttons, we might need tight polling or specific observation
        this.startObserver();
        this.process();
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        // Remove injected UI
        const injected = document.querySelectorAll('.ypp-ryd-count');
        injected.forEach(el => el.remove());
    }

    getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || location.pathname.split('/shorts/')[1];
    }

    startObserver() {
        if (this.observer) this.observer.disconnect();
        
        const target = document.querySelector('ytd-app') || document.body;
        this.observer = new MutationObserver(this.checkForButton);
        this.observer.observe(target, { childList: true, subtree: true });
    }

    checkForButton() {
        if (!this.isActive) return;
        
        // Check if we need to re-inject
        const dislikeBtn = document.querySelector('#top-level-buttons-computed ytd-toggle-button-renderer:nth-child(2), #segmented-dislike-button, ytd-reel-player-header-renderer #dislike-button');
        
        if (dislikeBtn && !dislikeBtn.querySelector('.ypp-ryd-count')) {
            this.process();
        }
    }

    async process() {
        if (!this.videoId) return;

        // 1. Get Data
        let data = this.cache.get(this.videoId);
        if (!data) {
            data = await this.fetchDislikes(this.videoId);
            if (data) this.cache.set(this.videoId, data);
        }

        if (data) {
            this.injectUI(data);
        }
    }

    async fetchDislikes(videoId) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            const response = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`, {
                signal: this.abortController.signal
            });
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (e) {
            if (e.name !== 'AbortError') console.error('[YPP RYD] Fetch failed', e);
            return null;
        }
    }

    injectUI(data) {
        if (!this.isActive) return;

        const count = data.dislikes;
        if (count === undefined || count === null) return;
        
        const formatted = this.formatNumber(count);

        // 1. Segmented Dislike Button (Modern)
        const segmentedBtn = document.querySelector('#segmented-dislike-button ytd-toggle-button-renderer');
        if (segmentedBtn) {
            this.injectIntoSegmented(segmentedBtn, formatted, count);
            return;
        }

        // 2. Shorts Action Button
        const shortsBtn = document.querySelector('ytd-reel-player-header-renderer #dislike-button');
        if (shortsBtn) {
            this.injectIntoShorts(shortsBtn, formatted, count);
            return;
        }

        // 3. Classic/Fallback
        const classicalBtn = document.querySelectorAll('#top-level-buttons-computed ytd-toggle-button-renderer')[1];
        if (classicalBtn) {
            this.injectIntoClassic(classicalBtn, formatted, count);
        }
    }

    injectIntoSegmented(btn, text, fullCount) {
        if (btn.querySelector('.ypp-ryd-count')) return;

        // The segmented button usually has a specific structure.
        // We want to insert a span after the icon/text.
        // Often the button has `yt-button-shape`.
        
        const buttonShape = btn.querySelector('yt-button-shape button');
        if (!buttonShape) return;

        const span = document.createElement('span');
        span.className = 'ypp-ryd-count';
        span.textContent = text;
        span.title = `${fullCount.toLocaleString()} dislikes`;
        span.style.cssText = `
            margin-left: 6px;
            font-family: "Roboto","Arial",sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            color: inherit;
        `;
        
        // Find the icon and insert text after it
        // Or append to the button content container
        buttonShape.appendChild(span);
        
        // Ensure the button allows width expansion
        btn.style.width = 'auto';
        buttonShape.style.width = 'auto';
        buttonShape.style.paddingRight = '12px'; // Add some padding
    }

    injectIntoShorts(btn, text, fullCount) {
        if (btn.querySelector('.ypp-ryd-count')) return;
        
        const buttonContent = btn.querySelector('button');
        if (!buttonContent) return;

        const span = document.createElement('span');
        span.className = 'ypp-ryd-count';
        span.textContent = text;
        span.title = `${fullCount.toLocaleString()} dislikes`;
         span.style.cssText = `
            display: block;
            font-size: 12px;
            font-weight: 500;
            text-align: center;
            margin-top: -4px;
        `;
        
        // Shorts buttons determine layout differently
        btn.appendChild(span);
    }

    injectIntoClassic(btn, text, fullCount) {
        if (btn.querySelector('.ypp-ryd-count')) return;
        
        const span = document.createElement('span');
        span.className = 'ypp-ryd-count';
        span.textContent = text;
        span.title = `${fullCount.toLocaleString()} dislikes`;
        span.style.marginLeft = '6px';
        
        const d = btn.querySelector('a') || btn.querySelector('button');
        if (d) d.appendChild(span);
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};
