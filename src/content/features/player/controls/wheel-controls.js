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
        this.isActive = true;
        await super.enable();
        
        try {
            // Wait for player container to establish bounds
            this.playerContainer = await this.waitForElement('#movie_player', 10000);
            
            // If disabled while waiting, abort
            if (!this.isActive) return;
            
            // Attach listener globally to ensure we catch edge-cases
            // Need `{ passive: false }` to prevent default scroll
            window.addEventListener('wheel', this.handleWheel, { passive: false });
        } catch (e) {
            this.utils?.log('Error enabling WheelControls', 'WHEEL', 'error', e);
        }
    }

    async disable() {
        this.isActive = false;
        await super.disable();
        window.removeEventListener('wheel', this.handleWheel);
        this.playerContainer = null;
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
        if (!video || !this.playerContainer) return;

        // Ensure cursor is physically over the player
        const rect = this.playerContainer.getBoundingClientRect();
        const isOverPlayer = (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
        );
        
        if (!isOverPlayer) return;

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
