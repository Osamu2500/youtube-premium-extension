/**
 * Global Player Bar — Orchestrator
 * Detects external <video> tags (non-YouTube) and injects a custom floating
 * player bar for speed/filters/PiP. Relies on GlobalBarUI and FilterPresets.
 */
import './global-bar.css';

window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.GlobalPlayerBar = class GlobalPlayerBar extends window.YPP.features.BaseFeature {

    constructor() {
        super('GlobalPlayerBar');
        
        this.isYouTube = window.location.hostname.includes('youtube.com');
        this.observer = null;
        
        // ── Sub-modules ────────────────────────────────────────────────────
        this.ui = new window.YPP.features.GlobalBarUI(
            window.YPP.features.FilterPresets?.PRESETS || []
        );

        this._repositionListener = () => this.ui.repositionAll();
    }

    getConfigKey() {
        return 'enableGlobalPlayerBar';
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    async enable() {
        if (this.isYouTube) return; // Skip YouTube (handled by native integration)

        this.utils?.log('Enabling Global Player Bar', 'GlobalPlayerBar');
        this.utils?.injectCSS('src/content/features/player/global-bar.css', 'ypp-global-bar-css');
        
        this.scanForVideos();
        this.startObserver();

        window.addEventListener('resize', this._repositionListener);
        window.addEventListener('scroll', this._repositionListener);
    }

    async disable() {
        this.stopObserver();
        this.ui.removeAll();
        this.utils?.removeStyle('ypp-global-bar-css');

        window.removeEventListener('resize', this._repositionListener);
        window.removeEventListener('scroll', this._repositionListener);
    }

    // =========================================================================
    // OBSERVATION & SCANNING
    // =========================================================================

    startObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) this.scanForVideos();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    scanForVideos() {
        const videos = document.querySelectorAll('video');
        
        videos.forEach(video => {
            if (this.ui.hasBar(video)) return;
            
            // Wait for video to have layout dimensions
            if (video.offsetWidth > 0 && video.offsetHeight > 0) {
                this.ui.attachBar(video);
            } else {
                setTimeout(() => {
                    if (video.isConnected && !this.ui.hasBar(video) && video.offsetWidth > 0) {
                        this.ui.attachBar(video);
                    }
                }, 2000);
            }
        });
    }
};
