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

    getConfigKey() { return null; }

    /**
     * Handles enabling/disabling parts of the feature when settings change
     */
    enable() {
        if (!this.settings) return;
        
        try {
            this._injectCSS();
            this._checkRoute();
            
            this.glassPlayerEnabled = !!this.settings.glassPlayerUI;
            this.sidebarCommentsEnabled = !!this.settings.sidebarComments;
            
            this._applyFeatures();
        } catch (e) {
            this.utils?.log?.('Error enabling WatchRedesign: ' + e.message, 'WATCH_REDESIGN', 'error');
        }
    }

    onUpdate() {
        this.enable();
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
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('watch-redesign-comments');
        }
        this._applyFeatures();
        this._cleanup();
        this.cleanupEvents();
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
               
            /* ========================================================
               PHASE 3: LIVE CHAT GLASSMORPHISM
               ======================================================== */
            html.ypp-glass-player-active ytd-live-chat-frame {
                border-radius: 16px !important;
                overflow: hidden !important;
                box-shadow: 0 12px 48px rgba(0,0,0,0.5) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            
            /* Apply glass to iframe interior by targeting wrapper, but we only have CSS on host.
               YouTube's live chat is an iframe. We can style the container. */
            html.ypp-glass-player-active #chat {
                border-radius: 16px !important;
            }
            
            /* THEATER MODE OVERLAY FOR LIVE CHAT */
            html.ypp-glass-player-active ytd-watch-flexy[flexy][theater] #chat {
                position: absolute !important;
                top: 24px !important;
                right: 24px !important;
                bottom: 120px !important; /* space for controls */
                z-index: 1000 !important;
                background: rgba(10, 10, 12, 0.6) !important;
                backdrop-filter: blur(16px) !important;
                -webkit-backdrop-filter: blur(16px) !important;
                border-radius: 16px !important;
                min-height: 400px !important;
                max-height: calc(100vh - 150px) !important;
                box-shadow: 0 16px 64px rgba(0,0,0,0.6) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                opacity: 0.9 !important;
                transition: opacity 0.3s ease, transform 0.3s ease !important;
            }
            
            html.ypp-glass-player-active ytd-watch-flexy[flexy][theater] #chat:hover {
                opacity: 1 !important;
            }
            
            /* CSS-only Sidebar Comments via CSS Grid and display: contents */
            
            /* Convert the main wrapper into a Grid layout */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #columns {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) var(--ytd-watch-flexy-sidebar-width, 402px) !important;
                grid-template-rows: auto auto auto !important;
                column-gap: 24px !important;
                align-items: start !important;
            }

            /* Flatten the hierarchy so children can participate in the Grid */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #primary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #primary-inner,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #secondary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #secondary-inner {
                display: contents !important;
            }

            /* Place the elements into their grid cells */
            
            /* Left column: Video player and description */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player-container-outer,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #player-wide {
                grid-column: 1 !important;
                grid-row: 1 !important;
                width: 100% !important;
                max-width: 100% !important;
            }
            
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #below {
                grid-column: 1 !important;
                grid-row: 2 / span 2 !important;
            }

            /* Right column: Comments */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments {
                grid-column: 2 !important;
                grid-row: 1 !important;
                
                /* Glassmorphic styling for comments */
                background: var(--ypp-card-bg, rgba(20, 19, 24, 0.6)) !important;
                backdrop-filter: blur(12px) !important;
                -webkit-backdrop-filter: blur(12px) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 16px !important;
                padding: 16px !important;
                margin-top: 16px !important;
                margin-bottom: 24px !important;
                max-height: calc(100vh - 120px) !important;
                overflow-y: auto !important;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
            }

            /* Right column: Related Videos (moved below comments) */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #related {
                grid-column: 2 !important;
                grid-row: 2 !important;
                margin-top: 24px !important;
            }
            
            /* Custom scrollbar for sidebar comments */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments::-webkit-scrollbar {
                width: 6px;
            }
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #comments::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
            }
            
            /* Chat integration (if active) */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy] #chat {
                grid-column: 2 !important;
                grid-row: 1 !important;
            }

            /* Theater mode override: revert grid layout so comments don't go off-screen.
               YouTube's theater mode takes the full width — sidebar comments don't fit. */
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #columns {
                display: flex !important;
                flex-direction: column !important;
            }
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #primary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #primary-inner,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #secondary,
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #secondary-inner {
                display: block !important;
            }
            html.ypp-sidebar-comments-active ytd-watch-flexy[flexy][theater] #comments {
                grid-column: unset !important;
                grid-row: unset !important;
                max-height: unset !important;
                overflow-y: unset !important;
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
        
        // Track video ratio for progress bar alignment (Unconditional on watch page)
        this._startTrackingVideoRatio();

        // Phase 2: Sidebar Comments
        if (this.sidebarCommentsEnabled) {
            document.documentElement.classList.add('ypp-sidebar-comments-active');
        } else {
            document.documentElement.classList.remove('ypp-sidebar-comments-active');
        }
    }

    /**
     * Cleans up DOM modifications when leaving watch page
     */
    _cleanup() {
        document.documentElement.classList.remove('ypp-glass-player-active');
        document.documentElement.classList.remove('ypp-sidebar-comments-active');
        this._stopTrackingVideoRatio();
    }

    _startTrackingVideoRatio() {
        // Removed: Letterbox tracking causes player controls to overlap and breaks autohide.
    }

    _stopTrackingVideoRatio() {
        // Removed.
    }
}
