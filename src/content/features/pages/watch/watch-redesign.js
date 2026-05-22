/**
 * Watch Redesign Feature
 * Handles Glassmorphic Player UI and Sidebar Comments
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.WatchRedesign = class WatchRedesign extends (window.YPP.features.BaseFeature || Object) {
    constructor() {
        super('WatchRedesign');
        this.configKey = null; // Controlled by multiple settings (glassPlayerUI, sidebarComments)
        this.isWatchPage = false;
        
        // Settings state
        this.glassPlayerEnabled = false;
        this.glassPlayerEnabled = false;
        this.sidebarCommentsEnabled = false;
        this._mountInterval = null; // Track interval
    }

    /**
     * Initializes the feature (called by FeatureManager)
     */
    init() {
        this._injectCSS();
        this._checkRoute();
    }

    /**
     * Handles enabling/disabling parts of the feature when settings change
     */
    enable(settings) {
        if (!settings) return;
        
        try {
            this.glassPlayerEnabled = !!settings.glassPlayerUI;
            this.sidebarCommentsEnabled = !!settings.sidebarComments;
            
            this._applyFeatures();
        } catch (e) {
            console.error('Error enabling WatchRedesign', e);
        }
    }

    /**
     * Disables all features
     */
    disable() {
        this.glassPlayerEnabled = false;
        this.sidebarCommentsEnabled = false;
        if (this._mountInterval) {
            clearInterval(this._mountInterval);
            this._mountInterval = null;
        }
        this._applyFeatures();
    }

    /**
     * Injects the required CSS
     */
    _injectCSS() {
        if (document.getElementById('ypp-watch-redesign-style')) return;
        
        const style = document.createElement('style');
        style.id = 'ypp-watch-redesign-style';
        style.textContent = `
            /* ========================================================
               PHASE 1: GLASS PLAYER UI
               ======================================================== */
            html.ypp-glass-player-active ytd-watch-flexy .html5-video-player {
                border-radius: 16px !important;
                overflow: hidden !important;
                box-shadow: 0 12px 48px rgba(0,0,0,0.5) !important;
            }

            /* Glassmorphic Bottom Control Bar */
            html.ypp-glass-player-active .ytp-chrome-bottom {
                background: rgba(10, 10, 12, 0.6) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 0 0 16px 16px !important;
                padding-bottom: 4px !important;
                text-shadow: none !important;
                width: 100% !important;
                left: 0 !important;
                padding-left: 12px !important;
                padding-right: 12px !important;
                box-sizing: border-box !important;
            }

            /* Player Controls Hover Glow */
            html.ypp-glass-player-active .ytp-chrome-controls .ytp-button:hover {
                background: rgba(255, 255, 255, 0.1) !important;
                border-radius: 8px !important;
                transform: scale(1.05) !important;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            html.ypp-glass-player-active .ytp-chrome-controls .ytp-button {
                transition: all 0.2s ease !important;
            }

            /* Progress Bar Re-styling */
            html.ypp-glass-player-active .ytp-swatch-background-color {
                background-color: var(--ypp-accent-color, #ff4e45) !important;
            }
            
            html.ypp-glass-player-active .ytp-play-progress {
                background: linear-gradient(90deg, var(--ypp-accent-color, #ff4e45), #ff8a84) !important;
                box-shadow: 0 0 10px var(--ypp-accent-color, rgba(255, 78, 69, 0.5)) !important;
            }

            /* Glassmorphic Menus (Settings, Tooltips) */
            html.ypp-glass-player-active .ytp-popup {
                background: rgba(20, 20, 24, 0.75) !important;
                backdrop-filter: blur(24px) !important;
                -webkit-backdrop-filter: blur(24px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px !important;
                box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
            }
            html.ypp-glass-player-active .ytp-panel-menu {
                background: transparent !important;
            }

            /* Action Buttons under player (Like, Share, etc.) */
            html.ypp-glass-player-active ytd-watch-metadata #actions ytd-button-renderer button,
            html.ypp-glass-player-active ytd-watch-metadata #actions ytd-toggle-button-renderer button,
            html.ypp-glass-player-active ytd-watch-metadata #actions yt-button-shape button {
                background: rgba(255, 255, 255, 0.08) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(8px) !important;
                border-radius: 24px !important;
                transition: all 0.2s ease !important;
            }
            
            html.ypp-glass-player-active ytd-watch-metadata #actions yt-button-shape button:hover {
                background: rgba(255, 255, 255, 0.15) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            }

            /* ========================================================
               PHASE 2: SIDEBAR COMMENTS
               ======================================================== */
            
            /* Hide the original comments section in the main column */
            html.ypp-sidebar-comments-active ytd-watch-flexy #primary-inner > #comments {
                display: none !important;
            }

            /* Style the cloned comments in the sidebar */
            html.ypp-sidebar-comments-active #secondary-inner #ypp-sidebar-comments-container {
                display: flex;
                flex-direction: column;
                background: var(--ypp-card-bg, rgba(20, 19, 24, 0.6));
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                padding: 16px;
                margin-top: 16px;
                margin-bottom: 24px;
                max-height: 800px; /* Make it scrollable independently */
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
            
            /* Custom scrollbar for sidebar comments */
            html.ypp-sidebar-comments-active #secondary-inner #ypp-sidebar-comments-container::-webkit-scrollbar {
                width: 6px;
            }
            html.ypp-sidebar-comments-active #secondary-inner #ypp-sidebar-comments-container::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
            
            html.ypp-sidebar-comments-active #secondary-inner #ypp-sidebar-comments-container > ytd-item-section-renderer {
                margin-top: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Handles SPA navigation (called by BaseFeature)
     */
    onPageChange(data) {
        this._checkRoute();
    }

    /**
     * Checks if current route is the watch page
     */
    _checkRoute() {
        this.isWatchPage = window.location.pathname === '/watch';
        if (this.isWatchPage) {
            this._applyFeatures();
            if (this.sidebarCommentsEnabled) {
                this._mountSidebarComments();
            }
        } else {
            this._cleanup();
        }
    }

    /**
     * Applies the selected features if on the watch page
     */
    _applyFeatures() {
        if (!this.isWatchPage) return;
        
        // Phase 1: Glass Player UI
        if (this.glassPlayerEnabled) {
            document.documentElement.classList.add('ypp-glass-player-active');
        } else {
            document.documentElement.classList.remove('ypp-glass-player-active');
        }

        // Phase 2: Sidebar Comments
        if (this.sidebarCommentsEnabled) {
            document.documentElement.classList.add('ypp-sidebar-comments-active');
            this._mountSidebarComments();
        } else {
            document.documentElement.classList.remove('ypp-sidebar-comments-active');
            this._unmountSidebarComments();
        }
    }

    /**
     * Logic to move the comments element into the sidebar
     */
    _mountSidebarComments() {
        if (!this.isWatchPage || !this.sidebarCommentsEnabled) return;
        
        // Use an interval to wait for both the comments and the sidebar to render
        let attempts = 0;
        
        if (this._mountInterval) clearInterval(this._mountInterval);
        
        this._mountInterval = setInterval(() => {
            attempts++;
            
            // Abort if feature disabled or page changed during wait
            if (!this.sidebarCommentsEnabled || !this.isWatchPage) {
                clearInterval(this._mountInterval);
                this._mountInterval = null;
                return;
            }
            
            if (attempts > 50) { 
                clearInterval(this._mountInterval); 
                this._mountInterval = null;
                return; 
            } // Give up after 10s
            
            const originalComments = document.querySelector('ytd-watch-flexy #primary-inner > #comments');
            const secondaryInner = document.querySelector('ytd-watch-flexy #secondary-inner');
            
            if (originalComments && secondaryInner) {
                clearInterval(this._mountInterval);
                this._mountInterval = null;
                
                // Check if already mounted
                if (document.getElementById('ypp-sidebar-comments-container')) return;
                
                const container = document.createElement('div');
                container.id = 'ypp-sidebar-comments-container';
                
                // Move the actual comments node!
                // We move the original instead of cloning it so YouTube's internal event listeners keep working
                container.appendChild(originalComments);
                
                // Insert it at the top of the sidebar, above recommendations
                secondaryInner.insertBefore(container, secondaryInner.firstChild);
            }
        }, 200);
    }

    /**
     * Restores comments to their original position
     */
    _unmountSidebarComments() {
        const container = document.getElementById('ypp-sidebar-comments-container');
        const primaryInner = document.querySelector('ytd-watch-flexy #primary-inner');
        
        if (container && primaryInner) {
            const comments = container.querySelector('#comments');
            if (comments) {
                primaryInner.appendChild(comments);
            }
            container.remove();
        }
    }

    /**
     * Cleans up DOM modifications when leaving watch page
     */
    _cleanup() {
        document.documentElement.classList.remove('ypp-glass-player-active');
        document.documentElement.classList.remove('ypp-sidebar-comments-active');
    }
}
