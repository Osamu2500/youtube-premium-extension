/**
 * Feature: Continue Watching Label & Prompt
 * Tags previously watched videos in the related sidebar and prompts the user.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ContinueWatching = class ContinueWatching extends window.YPP.features.BaseFeature {
    constructor() {
        super('ContinueWatching');
        this.observer = null;
        this.notifiedVideos = new Set();
    }

    getConfigKey() { return 'continueWatching'; }

    async enable() {
        await super.enable();
        
        try {
            // Reset notified set on new pages
            this.addListener(window, 'yt-navigate-finish', () => {
                this.notifiedVideos.clear();
                if (this.isEnabled) this.startObserver();
            });
            
            this.startObserver();
        } catch (e) {
            this.utils?.log('Error enabling ContinueWatching', 'CONTINUE', 'error', e);
        }
    }

    async disable() {
        await super.disable();
        if (this.observer) {
            this.observer.stop();
            this.observer = null;
        }
    }

    startObserver() {
        if (this.observer) return;

        // Use our robust DOMObserver
        this.observer = window.YPP.sharedObserver || new this.utils.DOMObserver();
        
        // Watch for videos anywhere on the home page or related sidebar
        this.observer.register('related_videos_continue', 
            'ytd-rich-item-renderer, ytd-compact-video-renderer',
            this.handleNewVideo.bind(this)
        );

        const target = document.querySelector('ytd-watch-next-secondary-results-renderer, ytd-rich-grid-renderer') || document.body;
        this.observer.start(target);
    }

    handleNewVideo(videos) {
        if (!this.isEnabled) return;
        
        // Ensure videos is an array (fallback for direct calls)
        const videoArray = Array.isArray(videos) ? videos : [videos];
        
        for (const video of videoArray) {
            // Check if we've already processed this video DOM element
            if (video.hasAttribute('data-ypp-processed')) continue;
            video.setAttribute('data-ypp-processed', 'true');

            // Check if it has the red resume playback bar and it is partially filled
            const resumeBar = video.querySelector("ytd-thumbnail-overlay-resume-playback-renderer #progress");
            if (resumeBar) {
                const width = resumeBar.style.width;
                // Only care if it's partially watched (e.g., between 5% and 95%)
                if (width && width !== '100%') {
                    video.classList.add("previously-watched-video");
                    
                    const titleEl = video.querySelector('#video-title');
                    const title = titleEl ? titleEl.textContent.trim() : 'a video';
                    const linkEl = video.querySelector('a#thumbnail');
                    const url = linkEl ? linkEl.href : null;
                    
                    // Only notify once per video URL to avoid spam
                    if (url && !this.notifiedVideos.has(url) && window.location.pathname === '/') {
                        this.notifiedVideos.add(url);
                        
                        // Show a toast prompt on the home page
                        if (this.utils.createToast) {
                            const toastBtn = document.createElement('button');
                            toastBtn.textContent = 'Resume';
                            toastBtn.className = 'ypp-toast-action-btn';
                            toastBtn.style.cssText = 'margin-left: 15px; background: var(--ypp-accent); border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-weight: bold; color: white;';
                            
                            toastBtn.onclick = () => {
                                window.location.href = url;
                            };
                            
                            const toast = this.utils.createToast(`Resume unfinished video? "${title.substring(0, 30)}..."`, 'info', 10000);
                            
                            // Wait a tick for toast to be in DOM
                            requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                    const toastEl = document.querySelector('.ypp-toast:last-child');
                                    if (toastEl) toastEl.appendChild(toastBtn);
                                });
                            });
                        }
                    }
                }
            }
        }
    }
};
