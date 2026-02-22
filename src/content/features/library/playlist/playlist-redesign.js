/**
 * Feature: Playlist Page Redesign
 * Modernizes the playlist interface and integrates the Duration Card.
 */
class PlaylistRedesign {
    constructor() {
        this.isInitialized = false;
        this.styleElement = null;
    }

    run(settings) {
        if (location.pathname.includes('/playlist')) {
            this.init();
        }
    }

    init() {
        if (this.isInitialized) return;
        this.injectStyles();
        this.isInitialized = true;
    }

    injectStyles() {
        if (document.getElementById('ypp-playlist-styles')) return;

        const css = `
            /* Playlist Page Modernization */
            
            /* Enhanced Header (Glassmorphism) */
            ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer {
                background: transparent !important; /* Let the blur show */
                border-radius: 20px !important;
                margin: 20px !important;
                overflow: hidden;
                position: relative;
            }

            /* Sidebar container background */
            ytd-browse[page-subtype="playlist"] .immersive-header-container {
                border-radius: 20px;
                /* Add a subtle gradient */
                background: linear-gradient(180deg, rgba(30,30,30,0.8) 0%, rgba(15,15,15,1) 100%) !important;
                border: 1px solid rgba(255,255,255,0.05);
            }

            /* Video List Styling */
            ytd-browse[page-subtype="playlist"] ytd-playlist-video-renderer {
                border-radius: 12px;
                margin-bottom: 8px;
                padding: 12px !important;
                background: transparent;
                transition: background 0.2s, transform 0.2s;
                border: 1px solid transparent;
            }

            ytd-browse[page-subtype="playlist"] ytd-playlist-video-renderer:hover {
                background: rgba(255, 255, 255, 0.05) !important;
                border-color: rgba(255,255,255,0.1);
                transform: scale(1.005);
            }

            /* Better Index Number */
            ytd-browse[page-subtype="playlist"] #index-container {
                color: #3ea6ff !important;
                font-weight: 700 !important;
                font-size: 1.4rem !important;
            }

            /* Improved Thumbnail radius */
            ytd-browse[page-subtype="playlist"] ytd-thumbnail {
                border-radius: 8px !important;
                overflow: hidden;
            }

            /* Hide some clutter */
            ytd-browse[page-subtype="playlist"] .metadata-stats {
                /* We might replace this with our card, but for now simple styling */
                color: #aaa !important;
            }
        `;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'ypp-playlist-styles';
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }
}

// Attach
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};
window.YPP.features.PlaylistRedesign = PlaylistRedesign;
