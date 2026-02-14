window.YPP.features.AudioMode = class AudioMode {
    constructor() {
        this.logger = new window.YPP.Utils.Logger('AudioMode');
        this.isActive = false;
        this.styleId = 'ypp-audio-mode-style';
    }

    run(settings) {
        // Audio mode is usually toggled via UI, not just settings
        // But we can persist state
        if (settings.audioModeEnabled) {
            this.enable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.logger.info('Enabling Audio Mode');
        
        this.injectStyles();
        this.showThumbnailOverlay();
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.logger.info('Disabling Audio Mode');
        
        const style = document.getElementById(this.styleId);
        if (style) style.remove();
        
        const overlay = document.getElementById('ypp-audio-overlay');
        if (overlay) overlay.remove();
    }

    injectStyles() {
        const css = `
            /* Hide the video element but keep it playing */
            .html5-video-player video {
                opacity: 0 !important;
            }
            
            /* Hide ad visuals if possible */
            .ytp-ad-image-overlay {
                display: none !important;
            }

            /* Ensure controls are still visible on hover */
            .html5-video-player:hover .ytp-chrome-bottom {
                opacity: 1 !important;
            }
        `;
        window.YPP.Utils.addStyle(css, this.styleId);
    }

    showThumbnailOverlay() {
        const player = document.querySelector('.html5-video-player');
        if (!player) return;

        // Get high res thumbnail
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;
        
        const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        const overlay = document.createElement('div');
        overlay.id = 'ypp-audio-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; position: relative;">
                <img src="${thumbUrl}" style="max-height: 60vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="margin-top: 20px; font-family: 'YouTube Sans', sans-serif; font-size: 24px; color: #fff; font-weight: 500;">
                    Audio Mode
                </div>
                <!-- Simple visualizer animation -->
                <div class="ypp-audio-waves" style="display: flex; gap: 4px; justify-content: center; margin-top: 15px; height: 30px;">
                    <div class="wave" style="width: 4px; background: #3ea6ff; animation: wave 1s infinite ease-in-out;"></div>
                    <div class="wave" style="width: 4px; background: #3ea6ff; animation: wave 1.2s infinite ease-in-out 0.1s;"></div>
                    <div class="wave" style="width: 4px; background: #3ea6ff; animation: wave 0.8s infinite ease-in-out 0.2s;"></div>
                    <div class="wave" style="width: 4px; background: #3ea6ff; animation: wave 1.4s infinite ease-in-out 0.3s;"></div>
                    <div class="wave" style="width: 4px; background: #3ea6ff; animation: wave 1.1s infinite ease-in-out 0.4s;"></div>
                </div>
                <style>
                    @keyframes wave {
                        0%, 100% { height: 10px; }
                        50% { height: 30px; }
                    }
                </style>
            </div>
        `;

        // Handle clicks on overlay to toggle play/pause
        overlay.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') { // Ignore button clicks if we add them
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) video.play();
                    else video.pause();
                }
            }
        };

        player.prepend(overlay);
    }
};
