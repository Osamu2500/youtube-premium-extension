/**
 * Global Player Bar — Orchestrator
 * Detects external <video> tags (non-YouTube) and injects a custom floating
 * player bar for speed/filters/PiP. Relies on GlobalBarUI and FilterPresets.
 */
import css from './global-bar.css?inline';

if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'ypp-global-bar-css';
    style.textContent = css;
    if (!document.getElementById('ypp-global-bar-css')) {
        document.head.appendChild(style);
    }
}
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

        this._repositionListener = () => this.ui.updatePosition();
    }

    onUpdate() {
        if (this.ui) {
            this.ui.updateSettings(this.settings);
        }
    }

    getConfigKey() {
        return 'enableGlobalPlayerBar';
    }

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    async enable() {
        if (this.isYouTube) return; // Skip YouTube (handled by native integration)

        try {
            this.utils?.log('Enabling Global Player Bar', 'GlobalPlayerBar');
            
            this.scanForVideos();
            this.startObserver();
        } catch (e) {
            this.utils?.log('Error enabling GlobalPlayerBar', 'GLOBAL', 'error', e);
        }
    }

    async disable() {
        await super.disable();
        this.stopObserver();
        this.ui.removeAll();
        this.utils?.removeStyle('ypp-global-bar-css');
        
        // Clean up DOM stamps so the feature can cleanly restart if re-enabled
        document.querySelectorAll('video[data-ypp-processed]').forEach(v => {
            v.removeAttribute('data-ypp-processed');
        });
    }

    // =========================================================================
    // OBSERVATION & SCANNING
    // =========================================================================

    startObserver() {
        if (this._isObserving) return;
        this._isObserving = true;
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.register('global-bar-scanner', 'video', () => {
                this.scanForVideos();
            });
        } else {
            // Fallback for external sites where sharedObserver is not loaded
            this._fallbackVideoScanner = (e) => {
                if (e.target && e.target.tagName === 'VIDEO') {
                    this.scanForVideos();
                }
            };
            this.addListener(document, 'play', this._fallbackVideoScanner, true);
            this.addListener(document, 'loadeddata', this._fallbackVideoScanner, true);
        }
    }

    stopObserver() {
        if (this._isObserving) {
            this._isObserving = false;
            if (window.YPP?.sharedObserver) {
                window.YPP.sharedObserver.unregister('global-bar-scanner');
            }
            if (this._fallbackVideoScanner) {
                // this.addListener will be cleaned up automatically by BaseFeature
                this._fallbackVideoScanner = null;
            }
        }
    }

    scanForVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (video.hasAttribute('data-ypp-processed') || this.ui.hasVideo(video)) return;
            
            // Wait for video to have layout dimensions
            if (video.offsetWidth > 0 && video.offsetHeight > 0) {
                video.setAttribute('data-ypp-processed', 'true');
                this.ui.trackVideo(video);
                this._notifyFeaturesOfNewVideo(video);
            } else {
                this.pollFor(() => video.isConnected && video.offsetWidth > 0 ? video : null, 5000, 500)
                    .then(v => {
                        if (v && !v.hasAttribute('data-ypp-processed') && !this.ui.hasVideo(v)) {
                            v.setAttribute('data-ypp-processed', 'true');
                            this.ui.trackVideo(v);
                            this._notifyFeaturesOfNewVideo(v);
                        }
                    })
                    .catch(() => {});
            }
        });
    }

    _notifyFeaturesOfNewVideo(video) {
        if (this.isYouTube) return; // YouTube handles this natively via app:videoChange
        if (!window.YPP.featureManager) return;
        
        ['volumeBoost', 'videoFilters', 'videoSpeedController'].forEach(name => {
            const feature = window.YPP.featureManager.getFeature(name);
            if (feature && feature.isEnabled && typeof feature.onVideoChange === 'function') {
                feature.onVideoChange(video);
            }
        });
    }
};
