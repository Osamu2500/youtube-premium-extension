/**
 * Feature: Mouse Wheel Controls
 * Allows scrolling over the video player while holding modifiers (Shift/Alt) to change Speed and Volume.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.WheelControls = class WheelControls extends window.YPP.features.BaseFeature {
    constructor() {
        super('WheelControls');
        this.playerContainer = null;
        this.videoElement = null;
        this.handleWheel = this.handleWheel.bind(this);
    }

    getConfigKey() {
        return 'wheelControls';
    }

    async enable() {
        await super.enable();
        
        // Wait for player container to attach listener
        this.playerContainer = await this.waitForElement('#movie_player', 10000);
        if (this.playerContainer) {
            // Need `{ passive: false }` to prevent default scroll
            this.playerContainer.addEventListener('wheel', this.handleWheel, { passive: false });
        }
    }

    async disable() {
        await super.disable();
        if (this.playerContainer) {
            this.playerContainer.removeEventListener('wheel', this.handleWheel);
            this.playerContainer = null;
        }
    }

    getVideoElement() {
        this.videoElement = document.querySelector('video.video-stream.html5-main-video');
        return this.videoElement;
    }

    handleWheel(e) {
        // If holding purely Shift -> Speed Control
        // If holding purely Alt -> Volume Control
        const isSpeed = e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
        const isVolume = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey;

        if (!isSpeed && !isVolume) return; // Do nothing normally
        
        const video = this.getVideoElement();
        if (!video) return;

        // Prevent page scroll when executing our shortcuts
        e.preventDefault();
        e.stopPropagation();

        const scrollingUp = e.deltaY < 0;

        if (isSpeed) {
            let currentSpeed = video.playbackRate;
            let nextSpeed = scrollingUp ? currentSpeed + 0.25 : currentSpeed - 0.25;
            
            // Clamp
            nextSpeed = Math.max(0.25, Math.min(nextSpeed, 10)); // YouTube max is naturally bounded by API, but HTML5 limit is 16
            
            // Align to 0.25 tick marks to prevent floating point drift
            nextSpeed = Math.round(nextSpeed * 4) / 4;
            
            video.playbackRate = nextSpeed;

            if (this.utils.createToast) {
                this.utils.createToast(`Speed: ${nextSpeed}x`, 'info');
            }
        } 
        else if (isVolume) {
            let currentVol = video.volume;
            let nextVol = scrollingUp ? currentVol + 0.05 : currentVol - 0.05;
            
            nextVol = Math.max(0, Math.min(nextVol, 1));
            video.volume = nextVol;
            video.muted = nextVol === 0 ? true : false;
            
            if (this.utils.createToast) {
                this.utils.createToast(`Volume: ${Math.round(nextVol * 100)}%`, 'info');
            }
        }
    }
};
