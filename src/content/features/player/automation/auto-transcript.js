window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoTranscript = class AutoTranscript extends window.YPP.features.BaseFeature {
    constructor() {
        super('AutoTranscript');
    }

    getConfigKey() {
        return 'enableTranscript';
    }

    async enable() {
        await super.enable();
        
        if (window.YPP.sharedObserver) {
            // Watch for the video description/actions menu to load, where the transcript button lives
            window.YPP.sharedObserver.register('auto-transcript', 'ytd-video-secondary-info-renderer, ytd-watch-metadata', (elements) => {
                this._openTranscript();
            }, true);
        }
        
        this._openTranscript();
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('auto-transcript');
        }
    }

    _openTranscript() {
        if (!this.isEnabled) return;
        
        // If transcript panel is already open, do nothing
        if (document.querySelector('ytd-transcript-renderer') || document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]')) {
            return;
        }

        // Try to find the "Show Transcript" button and click it
        const buttons = Array.from(document.querySelectorAll('button, tp-yt-paper-button'));
        const transcriptBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes('show transcript'));
        
        if (transcriptBtn && transcriptBtn.offsetParent !== null) {
            transcriptBtn.click();
            this.utils?.log('Auto-opened transcript', 'TRANSCRIPT', 'debug');
            
            // Unregister so we don't keep clicking it every mutation
            if (window.YPP.sharedObserver) {
                window.YPP.sharedObserver.unregister('auto-transcript');
            }
        }
    }
};
