/**
 * Feature: Return YouTube Dislike
 * Fetches and displays dislike counts using the Return YouTube Dislike API.
 * API: https://returnyoutubedislikeapi.com/
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ReturnDislike = class ReturnDislike {
    constructor() {
        this.isActive = false;
        this.videoId = null;
        this.abortController = null;
        this.cache = new Map(); // Simple cache to avoid re-fetching
        
        // Binds
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    run(settings) {
        if (settings.returnYouTubeDislike) {
            this.enable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        
        // Listen for navigation
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
        
        // Initial check
        if (this.isWatchPage()) {
            this.handleNavigation();
        }
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
    }

    isWatchPage() {
        return location.pathname.startsWith('/watch');
    }

    handleNavigation() {
        if (!this.isActive || !this.isWatchPage()) return;
        
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (videoId && videoId !== this.videoId) {
            this.videoId = videoId;
            this.fetchDislikes(videoId);
        }
    }

    async fetchDislikes(videoId) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        // Check cache
        if (this.cache.has(videoId)) {
            this.updateUI(this.cache.get(videoId));
            return;
        }

        const url = `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`;

        try {
            const response = await fetch(url, { signal: this.abortController.signal });
            if (!response.ok) throw new Error('API Error');
            
            const data = await response.json();
            this.cache.set(videoId, data);
            this.updateUI(data);
        } catch (e) {
            if (e.name !== 'AbortError') {
                console.warn('[YPP ReturnDislike] Fetch error:', e);
            }
        }
    }

    async updateUI(data) {
        if (!data || !this.isActive) return;

        // Wait for the like/dislike buttons to appear
        const buttons = await window.YPP.Utils.waitForElement('#top-level-buttons-computed', 10000);
        if (!buttons) return;

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

        // --- 2. Rating Bar ---
        // this.updateRatingBar(buttons, data); // Disabled per user request (unwanted blue line)
    }

    updateRatingBar(container, data) {
        let bar = container.querySelector('.ypp-rating-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'ypp-rating-bar';
            Object.assign(bar.style, {
                height: '2px',
                width: '100%',
                marginTop: '6px',
                display: 'flex',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative' // Position relative to container if needed, usually just flow
            });
            // Try to append below the buttons container
            // YouTube's layout is tricky, usually #top-level-buttons-computed is a flex row.
            // We might need to wrap it or append to parent. 
            // Actually, inserting it into the button renderer is messy.
            // Let's attach it to the bottom of the dislike button or the whole segment.
            
            // Better approach: Find the segmented container and add it underneath? 
            // Or simple: Just add it to the Like/Dislike pair container if it exists.
            
            const segmentContainer = container.querySelector('ytd-segmented-like-dislike-button-renderer') || container;
             // Only append if we haven't already
            if (!segmentContainer.querySelector('.ypp-rating-bar')) {
                // Determine insertion point. YouTube changes DOM often. 
                // Safest is absolute positioning relative to the button group?
                segmentContainer.style.position = 'relative'; 
                segmentContainer.style.marginBottom = '4px'; // Make space
                
                Object.assign(bar.style, {
                    position: 'absolute',
                    bottom: '-4px',
                    left: '0',
                    right: '0'
                });
                segmentContainer.appendChild(bar);
            } else {
                bar = segmentContainer.querySelector('.ypp-rating-bar');
            }
        }

        // Calculate ratio
        // If data.likes is not provided by API (sometimes null), we accept incomplete data or try to parse UI
        const likes = data.likes || 0;
        const dislikes = data.dislikes || 0;
        let total = likes + dislikes;
        
        if (total === 0) return;

        const likePercentage = (likes / total) * 100;
        
        // Clear old
        bar.innerHTML = '';
        
        const likeBar = document.createElement('div');
        likeBar.style.width = `${likePercentage}%`;
        likeBar.style.background = '#3EA6FF'; // YouTube Blue/Green
        likeBar.style.height = '100%';
        
        const dislikeBar = document.createElement('div');
        dislikeBar.style.width = `${100 - likePercentage}%`;
        dislikeBar.style.background = '#aaa'; // Grey for dislikes
        dislikeBar.style.height = '100%';

        bar.appendChild(likeBar);
        bar.appendChild(dislikeBar);
        
        // Tooltip for the bar
        bar.title = `${likes.toLocaleString()} / ${dislikes.toLocaleString()}`;
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};
