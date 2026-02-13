/**
 * Study Mode Feature - Optimizes playback for learning
 * @description Sets speed to 1.25x and enables captions automatically
 * @class StudyMode
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StudyMode = class StudyMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.studyInterval = null;
        this.STUDY_SPEED = 1.25;
        this.ENFORCE_INTERVAL = 5000; // ms
    }

    /**
     * Apply study mode settings
     * @param {Object} settings - Settings object
     */
    run(settings) {
        if (settings.studyMode) {
            this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Update study mode settings
     * @param {Object} settings - Updated settings
     */
    update(settings) {
        this.run(settings);
    }

    /**
     * Enable study mode with speed and captions
     */
    enable() {
        if (this.studyInterval) return;

        try {
            this.Utils?.createToast('Study Mode: Speed 1.25x & Captions');

            // Initial enforcement
            this._enforceState();

            // Periodic enforcement to handle ads and manual changes
            this.studyInterval = setInterval(() => this._enforceState(), this.ENFORCE_INTERVAL);
        } catch (error) {
            this.Utils?.log(`Error enabling study mode: ${error.message}`, 'STUDY', 'error');
        }
    }

    /**
     * Disable study mode and restore normal playback
     */
    disable() {
        if (!this.studyInterval) return;

        try {
            clearInterval(this.studyInterval);
            this.studyInterval = null;

            // Revert playback speed
            const video = document.querySelector('video');
            if (video?.playbackRate === this.STUDY_SPEED) {
                video.playbackRate = 1.0;
                this.Utils?.createToast('Study Mode Disabled');
            }
        } catch (error) {
            this.Utils?.log(`Error disabling study mode: ${error.message}`, 'STUDY', 'error');
        }
    }

    /**
     * Enforce study mode state (speed and captions)
     * @private
     */
    _enforceState() {
        try {
            const video = document.querySelector('video');
            if (video) {
                if (video.playbackRate !== this.STUDY_SPEED) {
                    video.playbackRate = this.STUDY_SPEED;
                }
                this._enableCaptions();
            }
        } catch (error) {
            // Silently fail - video might not be ready
        }
    }

    /**
     * Enable captions if not already enabled
     * @private
     */
    _enableCaptions() {
        try {
            const subtitlesBtn = document.querySelector('.ytp-subtitles-button');
            if (subtitlesBtn?.getAttribute('aria-pressed') === 'false') {
                subtitlesBtn.click();
            }
        } catch (error) {
            // Silently fail - button might not be available
        }
    }
};
