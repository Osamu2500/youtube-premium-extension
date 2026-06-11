// @ts-nocheck
/**
 * Feature: Audio Compressor
 * Uses the Web Audio API DynamicsCompressorNode to normalize volume levels,
 * boosting quiet sounds (whispers) and clamping loud noises (explosions).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AudioCompressor = class AudioCompressor extends window.YPP.features.BaseFeature {
    constructor() {
        super('AudioCompressor');
        
        this.audioContext = null;
        this.sourceNode = null;
        this.compressorNode = null;
        this.gainNode = null;
        this.videoElement = null;
        this.isProcessing = false;
        
        this.handleVideoLoaded = this.handleVideoLoaded.bind(this);
    }

    getConfigKey() {
        return 'audioCompressor';
    }

    async enable() {
        if (!this.utils.isWatchPage()) return;
        await super.enable();
        
        this.init();

        this.addListener(window, 'yt-navigate-finish', () => {
            if (this.utils.isWatchPage() && this.isEnabled) {
                this.init();
            }
        });
    }

    async disable() {
        await super.disable();
        this.disconnectAudio();
    }

    async onUpdate() {
        if (this.utils.isWatchPage() && !this.isProcessing) {
            this.init();
        }
    }

    disconnectAudio() {
        if (!this.isProcessing) return;
        
        try {
            if (this.sourceNode && this.audioContext) {
                this.sourceNode.disconnect();
                // Route audio directly to destination again
                this.sourceNode.connect(this.audioContext.destination);
            }
        } catch(e) {
            this.utils.log?.('Failed to disconnect audio compressor', 'AUDIO', 'warn');
        }
        
        this.isProcessing = false;
        if (this.utils.createToast) this.utils.createToast('Audio normalization disabled');
    }

    async init() {
        if (this.isProcessing) return;

        try {
            const video = await this.waitForElement('video.video-stream.html5-main-video', 10000);
            if (video) {
                this.videoElement = video;
                // Wait for an actual user interaction / play event to start context (browser policies)
                // Doing this on loadeddata or readyState blocks the video pipeline and causes massive load delays.
                const tryStart = () => {
                    this.setupAudioNodes();
                    this.videoElement.removeEventListener('play', tryStart);
                };
                
                if (!this.videoElement.paused) {
                    tryStart();
                } else {
                    this.videoElement.addEventListener('play', tryStart);
                }
            }
        } catch (error) {
            this.utils.log?.('AudioCompressor initialization timed out', 'AUDIO', 'warn');
        }
    }

    handleVideoLoaded() {
        this.setupAudioNodes();
    }

    setupAudioNodes() {
        if (!this.videoElement || this.isProcessing || !this.isEnabled) return;
        
        // Browsers block AudioContext creation until user gesture
        // We might fail here if the user hasn't interacted with the page yet
        try {
            if (!this.audioContext) {
                // AudioContext can only be instantiated once per page realistically without memory leaks
                // Reusing a global one if possible
                window.YPP.audioContext = window.YPP.audioContext || new (window.AudioContext || window.webkitAudioContext)();
                this.audioContext = window.YPP.audioContext;
            }

            // Create media element source if not already created
            if (!this.videoElement._yppAudioSource) {
                this.videoElement._yppAudioSource = this.audioContext.createMediaElementSource(this.videoElement);
            }
            this.sourceNode = this.videoElement._yppAudioSource;

            // Disconnect whatever was connected (e.g. previous runs)
            this.sourceNode.disconnect();

            // Create compressor
            if (!this.compressorNode) {
                this.compressorNode = this.audioContext.createDynamicsCompressor();
                this.compressorNode.threshold.value = -35; 
                this.compressorNode.knee.value = 30; // Soft knee
                this.compressorNode.ratio.value = 10;
                this.compressorNode.attack.value = 0.005;
                this.compressorNode.release.value = 0.050;
            }

            // Create a makeup gain node to compensate for volume reduction
            if (!this.gainNode) {
                this.gainNode = this.audioContext.createGain();
                this.gainNode.gain.value = 2.5; // Boost the overall normalized signal
            }

            // Dynamic clipping prevention
            // A limiter node (another compressor) just before destination
            if (!this.limiterNode) {
                this.limiterNode = this.audioContext.createDynamicsCompressor();
                this.limiterNode.threshold.value = -1.0; 
                this.limiterNode.knee.value = 0.0; // Hard knee for absolute limiting
                this.limiterNode.ratio.value = 20.0;
                this.limiterNode.attack.value = 0.001;
                this.limiterNode.release.value = 0.050;
            }

            // Route audio: Source -> Compressor -> Gain -> Limiter -> Speakers
            this.sourceNode.connect(this.compressorNode);
            this.compressorNode.connect(this.gainNode);
            this.gainNode.connect(this.limiterNode);
            this.limiterNode.connect(this.audioContext.destination);

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            // Health Checks & Device Changes
            this.audioContext.onstatechange = () => {
                if (this.audioContext.state === 'suspended' && this.isEnabled && this.isProcessing) {
                    this.utils.log?.('AudioContext suspended unexpectedly. Resuming...', 'AUDIO', 'warn');
                    this.audioContext.resume();
                } else if (this.audioContext.state === 'closed') {
                    this.isProcessing = false;
                    this.audioContext = null;
                }
            };

            if (navigator.mediaDevices && !this._deviceChangeListenerBound) {
                this._deviceChangeListenerBound = true;
                navigator.mediaDevices.addEventListener('devicechange', () => {
                    this.utils.log?.('Audio output device changed. Re-initializing compressor graph...', 'AUDIO', 'warn');
                    if (this.isEnabled && this.isProcessing) {
                        this.disconnectAudio();
                        setTimeout(() => this.setupAudioNodes(), 500);
                    }
                });
            }

            this.isProcessing = true;
            if (this.utils.createToast) this.utils.createToast('Audio normalization enabled');
            
        } catch (e) {
            this.utils.log?.(`Failed to setup AudioContext: ${e.message}`, 'AUDIO', 'error');
            // If it failed because of user interaction policies, we'll try again on play
            const tryResume = () => {
                if (this.isEnabled && !this.isProcessing) {
                    this.setupAudioNodes();
                    this.videoElement.removeEventListener('play', tryResume);
                }
            };
            this.videoElement.addEventListener('play', tryResume, { once: true });
        }
    }
};
