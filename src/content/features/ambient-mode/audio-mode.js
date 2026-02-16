/**
 * Audio Mode - Hide video, show audio with thumbnail overlay
 * Enhanced with thumbnail fallbacks and improved UX
 */
window.YPP.features.AudioMode = class AudioMode {
    constructor() {
        this.Utils = window.YPP?.Utils || {};
        this.isActive = false;
        this.styleId = 'ypp-audio-mode-style';
        this.overlay = null;
    }

    run(settings) {
        // Audio mode is usually toggled via UI, but we can persist state
        if (settings.audioModeEnabled) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        console.log('YPP Audio Mode: Enabling');
        
        this.injectStyles();
        this.showThumbnailOverlay();
        
        // Show toast notification
        this.Utils.createToast?.('Audio Mode Enabled 🎵');
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        console.log('YPP Audio Mode: Disabling');
        
        const style = document.getElementById(this.styleId);
        if (style) style.remove();
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        this.Utils.createToast?.('Audio Mode Disabled');
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
            
            /* Prevent video from being clickable */
            #ypp-audio-overlay {
                cursor: default;
            }
        `;
        
        if (!document.getElementById(this.styleId)) {
            const style = document.createElement('style');
            style.id = this.styleId;
            style.textContent = css;
            document.head.appendChild(style);
        }
    }

    async showThumbnailOverlay() {
        const player = document.querySelector('.html5-video-player');
        if (!player) {
            console.error('YPP Audio Mode: Player not found');
            return;
        }

        // Get video ID
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) {
            console.error('YPP Audio Mode: Video ID not found');
            return;
        }
        
        // Try multiple thumbnail resolutions with fallbacks
        const thumbUrl = await this.getThumbnailUrl(videoId);

        const overlay = document.createElement('div');
        overlay.id = 'ypp-audio-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            overflow: hidden;
        `;

        overlay.innerHTML = `
            <div style="text-align: center; position: relative; z-index: 2;">
                <div style="position: relative; display: inline-block;">
                    <img id="ypp-audio-thumb" src="${thumbUrl}" 
                         style="max-height: 50vh; max-width: 80vw; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.7); transition: transform 0.3s;"
                         onerror="this.src='https://via.placeholder.com/640x360/1a1a2e/3ea6ff?text=Audio+Mode'">
                    <div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background: rgba(62,166,255,0.2); padding: 8px 16px; border-radius: 20px; backdrop-filter: blur(10px);">
                        <span style="font-size: 14px; color: #3ea6ff; font-weight: 500;">🎵 Audio Only</span>
                    </div>
                </div>
                <div style="margin-top: 35px; font-family: 'YouTube Sans', 'Roboto', sans-serif; font-size: 18px; color: rgba(255,255,255,0.9); font-weight: 400; max-width: 600px; padding: 0 20px;">
                    ${this.getVideoTitle()}
                </div>
                <!-- Animated visualizer -->
                <div class="ypp-audio-waves" style="display: flex; gap: 5px; justify-content: center; margin-top: 25px; height: 40px; align-items: flex-end;">
                    ${[...Array(7)].map((_, i) => `
                        <div style="
                            width: 4px; 
                            background: linear-gradient(to top, #3ea6ff, #00d4ff); 
                            border-radius: 4px 4px 0 0;
                            animation: wave ${0.8 + Math.random() * 0.6}s infinite ease-in-out ${i * 0.1}s;
                        "></div>
                    `).join('')}
                </div>
                <style>
                    @keyframes wave {
                        0%, 100% { height: 15px; opacity: 0.5; }
                        50% { height: 40px; opacity: 1; }
                    }
                    #ypp-audio-thumb:hover {
                        transform: scale(1.02);
                    }
                </style>
            </div>
            <!-- Background blur effect -->
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('${thumbUrl}');
                background-size: cover;
                background-position: center;
                filter: blur(60px) brightness(0.3);
                opacity: 0.5;
                z-index: 1;
            "></div>
        `;

        // Handle clicks on overlay to toggle play/pause
        overlay.onclick = (e) => {
            if (e.target.id !== 'ypp-audio-thumb') {
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                }
            }
        };

        player.prepend(overlay);
        this.overlay = overlay;
    }

    /**
     * Get thumbnail URL with fallbacks
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<string>} - Thumbnail URL
     */
    async getThumbnailUrl(videoId) {
        const thumbnailUrls = [
            `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, // 1920x1080
            `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,      // 640x480
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,      // 480x360
        ];

        // Try each thumbnail URL
        for (const url of thumbnailUrls) {
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    return url;
                }
            } catch (error) {
                // Continue to next fallback
            }
        }

        // Ultimate fallback: first thumbnail variant
        return thumbnailUrls[thumbnailUrls.length - 1];
    }

    /**
     * Get video title from page
     * @returns {string} - Video title
     */
    getVideoTitle() {
        try {
            const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
            if (titleElement) {
                return titleElement.textContent;
            }
        } catch (error) {
            // Fallback
        }
        return 'Listening to Audio';
    }
};
