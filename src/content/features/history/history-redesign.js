/**
 * Feature: History Page Redesign
 * Transforms the history list into a responsive 5-column grid and adds stats/calendar.
 */
class HistoryRedesign {
    constructor() {
        this.observer = null;
        this.isInitialized = false;
        this.styleElement = null;
        this.currentCalDate = new Date();
        this.selectedCalDateString = null;
    }

    run(settings) {
        // Only run on history page
        if (location.pathname === '/feed/history') {
            this.init();
        }
    }

    init() {
        if (!this.isInitialized) {
            // One-time setup
            this.injectStyles();
            this.injectCalendarModal();

            // Observer to maintain grid and injections
            this.observer = new MutationObserver(() => {
                this.handleMutations();
            });

            const content = document.querySelector('ytd-app');
            if (content) {
                this.observer.observe(content, { childList: true, subtree: true });
            }

            this.isInitialized = true;
        }
        
        // Run logic that needs to happen on navigation/init
        this.apply();
        // this.updateStats(); // Removed
    }

    apply() {
        // Re-inject header if missing (e.g. after nav)
        // this.injectHeaderWidget(); // Removed - logic moved to HistoryTracker
        this.injectStyles(); // Ensure styles are re-injected if needed
    }

    injectStyles() {
        if (document.getElementById('ypp-history-grid-styles')) return;

        const css = `
            /* ==========================================================================
               HISTORY GRID REDESIGN - STACK MATCH WITH SEARCH GRID
               ========================================================================== */

            /* 1. Main Grid Container setup */
            ytd-browse[page-subtype="history"] #contents.ytd-section-list-renderer {
                display: block !important;
                max-width: 1800px; /* Match Search Grid Max Width */
                margin: 0 auto;
                padding: 0 24px !important;
            }

            /* 2. Date Section Headers */
            ytd-browse[page-subtype="history"] ytd-item-section-renderer {
                margin-bottom: 40px !important;
                border-bottom: none !important;
                display: block !important;
            }

            ytd-browse[page-subtype="history"] #subheader {
                margin-bottom: 24px !important;
                font-family: 'Inter', 'Roboto', sans-serif;
                font-size: 2.2rem !important;
                line-height: 1.3 !important;
                color: #fff !important;
                font-weight: 700 !important;
                letter-spacing: -0.5px !important;
                padding-bottom: 16px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            /* 3. Grid Layout Properties */
            ytd-browse[page-subtype="history"] ytd-item-section-renderer #contents {
                display: grid !important;
                /* Exact match to Search Grid columns */
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
                gap: 24px 16px !important;
                padding-top: 8px !important;
            }

            /* Responsive Breakpoints (matching Search Grid) */
            @media (max-width: 1600px) {
                ytd-browse[page-subtype="history"] ytd-item-section-renderer #contents {
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
                }
            }
            @media (max-width: 1200px) {
                ytd-browse[page-subtype="history"] ytd-item-section-renderer #contents {
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important;
                }
            }
            @media (max-width: 900px) {
                ytd-browse[page-subtype="history"] ytd-item-section-renderer #contents {
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
                }
            }

            /* ==========================================================================
               VIDEO CARD STYLING (1:1 COPY FROM SEARCH GRID MODE)
               ========================================================================== */

            ytd-browse[page-subtype="history"] ytd-video-renderer {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                margin: 0 !important;
                padding: 16px !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                
                /* Glassmorphism Surface */
                background: rgba(25, 25, 25, 0.6);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px; /* var(--ypp-radius-lg) */
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
                
                overflow: hidden;
                transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), 
                            box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                            border-color 0.3s ease;
                box-sizing: border-box !important;
                position: relative;
            }

            /* Card Hover Effect */
            ytd-browse[page-subtype="history"] ytd-video-renderer:hover {
                transform: translateY(-4px);
                border-color: rgba(62, 166, 255, 0.4);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(62, 166, 255, 0.3);
                z-index: 10;
                background: rgba(30,30,30,0.8);
            }

            /* Thumbnail Styling */
            ytd-browse[page-subtype="history"] ytd-video-renderer ytd-thumbnail {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 100% !important;
                height: auto !important;
                aspect-ratio: 16/9 !important;
                flex: none !important;
                border-radius: 12px; /* var(--ypp-radius-md) */
                margin-right: 0 !important;
                margin-bottom: 12px !important;
                box-shadow: none !important;
                overflow: hidden !important;
            }

            ytd-browse[page-subtype="history"] ytd-video-renderer ytd-thumbnail img {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
            }

            /* Glass Time Status (Duration) */
            ytd-browse[page-subtype="history"] ytd-thumbnail-overlay-time-status-renderer {
                background: rgba(0, 0, 0, 0.6) !important;
                backdrop-filter: blur(4px) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 6px !important;
                padding: 2px 4px !important;
                margin: 4px !important;
            }
            ytd-browse[page-subtype="history"] ytd-thumbnail-overlay-time-status-renderer span {
                font-family: 'Roboto', sans-serif !important;
                font-weight: 500 !important;
                font-size: 1.1rem !important;
            }

            /* Text Wrapper */
            ytd-browse[page-subtype="history"] ytd-video-renderer .text-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                flex: 1 !important;
                min-width: 0 !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                background: transparent !important;
            }

            /* Title Typography */
            ytd-browse[page-subtype="history"] #video-title {
                font-family: 'Roboto', sans-serif !important;
                font-size: 1.6rem !important;
                line-height: 2.2rem !important;
                font-weight: 500 !important;
                margin: 0 0 4px 0 !important;
                color: #fff !important;
                text-shadow: none !important;
                max-height: 4.4rem !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
                overflow: hidden !important;
            }

            /* Metadata Area */
            ytd-browse[page-subtype="history"] .ytd-video-renderer #metadata-line {
                display: flex !important;
                flex-wrap: wrap !important;
                font-size: 1.2rem !important;
                font-weight: 400 !important;
                color: rgba(255, 255, 255, 0.5) !important;
                margin-top: 4px !important;
                line-height: 1.4 !important;
            }

            ytd-browse[page-subtype="history"] .ytd-video-renderer .ytd-channel-name {
                font-size: 1.3rem !important;
                font-weight: 500 !important;
                color: rgba(255, 255, 255, 0.75) !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.5 !important;
            }

            /* Hide Clutter */
            ytd-browse[page-subtype="history"] .metadata-snippet-container {
                display: none !important;
            }
            ytd-browse[page-subtype="history"] .ytd-badge-supported-renderer {
                display: none !important;
            }
            ytd-browse[page-subtype="history"] #description-text {
                display: none !important;
            }

            /* Menu Buttons */
            ytd-browse[page-subtype="history"] ytd-video-renderer #dismissible .dropdown-trigger,
            ytd-browse[page-subtype="history"] ytd-video-renderer ytd-menu-renderer yt-icon-button {
                width: 32px !important;
                height: 32px !important;
                padding: 4px !important;
                background: rgba(0,0,0,0.4) !important;
                backdrop-filter: blur(4px);
                border-radius: 50% !important;
                opacity: 0;
                transition: opacity 0.2s ease;
                top: 8px; right: 8px; position: absolute; margin: 0 !important;
            }
            ytd-browse[page-subtype="history"] ytd-video-renderer:hover #dismissible .dropdown-trigger,
            ytd-browse[page-subtype="history"] ytd-video-renderer:hover ytd-menu-renderer {
                opacity: 1 !important;
            }

            /* Remove old history header positioning */
            ytd-browse[page-subtype="history"] #primary .ypp-history-header-widget {
                /* ensure new widget flows correctly */
            }
        `;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'ypp-history-grid-styles';
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    /* Mutation Handler */
    handleMutations() {
        if (location.pathname === '/feed/history') {
             this.apply();
        }
    }
}

// Attach
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.HistoryRedesign = HistoryRedesign;
