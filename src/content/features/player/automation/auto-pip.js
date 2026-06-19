/**
 * Auto PiP — YouTube Premium Plus
 * Enters Picture-in-Picture automatically when the user switches tabs,
 * and exits PiP when the user comes back.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoPiP = class AutoPiP extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'autoPiP'; }

    constructor() {
        super('AutoPiP');
        this._boundAutoPiP = null;
    }

    async enable() {
        await super.enable();
        if (this._boundAutoPiP) return; // Already enabled
        
        this._boundAutoPiP = async () => {
            const video = document.querySelector('video');
            if (!video) return;
            
            if (document.hidden && !video.paused && !video.ended) {
                // Tab hidden → enter PiP
                if (document.pictureInPictureEnabled && !document.pictureInPictureElement) {
                    try { 
                        await video.requestPictureInPicture(); 
                        
                        // Listen for video end to auto-close PiP
                        const onEnded = async () => {
                            if (document.pictureInPictureElement) {
                                try { await document.exitPictureInPicture(); } catch (_) {}
                            }
                            this.removeListener(video, 'ended', onEnded);
                        };
                        this.addListener(video, 'ended', onEnded);
                    } catch (_) {}
                }
            } else if (!document.hidden && document.pictureInPictureElement) {
                // Tab visible again → exit PiP
                try { await document.exitPictureInPicture(); } catch (_) {}
            }
        };
        
        this.addListener(document, 'visibilitychange', this._boundAutoPiP);
        this.utils?.log?.('Auto PiP enabled', 'AUTO_PIP');
    }

    async disable() {
        await super.disable();
        
        this._boundAutoPiP = null;
        
        // Exit PiP if currently active
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture().catch(() => {});
        }
        
        this.utils?.log?.('Auto PiP disabled', 'AUTO_PIP');
    }
};
