// Study Mode Feature
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StudyMode = class StudyMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.studyInterval = null;
    }

    run(settings) {
        if (settings.studyMode) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.studyInterval) return;

        this.Utils.createToast('Study Mode: Speed 1.25x & Captions');

        // Initial set
        this._enforceState();

        // Enforce periodically (robustness against manual changes/ads)
        this.studyInterval = setInterval(() => this._enforceState(), 5000);
    }

    disable() {
        if (this.studyInterval) {
            clearInterval(this.studyInterval);
            this.studyInterval = null;

            // Revert Speed
            const video = document.querySelector('video');
            if (video && video.playbackRate === 1.25) {
                video.playbackRate = 1.0;
                this.Utils.createToast('Study Mode Disabled');
            }
        }
    }

    _enforceState() {
        const video = document.querySelector('video');
        if (video) {
            if (video.playbackRate !== 1.25) video.playbackRate = 1.25;
            this._enableCaptions();
        }
    }

    _enableCaptions() {
        const subtitlesBtn = document.querySelector('.ytp-subtitles-button');
        if (subtitlesBtn && subtitlesBtn.getAttribute('aria-pressed') === 'false') {
            subtitlesBtn.click();
        }
    }
};
