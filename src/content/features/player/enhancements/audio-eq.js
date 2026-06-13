window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AudioEQ = class AudioEQ extends window.YPP.features.BaseFeature {
    constructor() {
        super('AudioEQ');
        this.audioContext = null;
        this.sourceNode = null;
        this.bassFilter = null;
        this.trebleFilter = null;
        this.gainNode = null;
        
        this._boundHandleRateChange = this._handleRateChange.bind(this);
    }

    getConfigKey() {
        // Runs if any audio setting is defined
        return 'audioModeEnabled'; 
    }

    async enable() {
        await super.enable();
        
        // We actually want to run if bass/treble/transcript are relevant, not just audioModeEnabled.
        // We'll hook into the video element anyway, but only apply EQ if settings exist.
        const video = document.querySelector('video');
        if (video) {
            this._initAudioContext(video);
        }

        // Catch newly injected video elements
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('audio-eq', 'video', (elements) => {
                this._initAudioContext(elements[0]);
            });
        }
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('audio-eq');
        }
        
        if (this.audioContext) {
            // Revert changes
            this.bassFilter.gain.value = 0;
            this.trebleFilter.gain.value = 0;
            
            // Note: Disconnecting the sourceNode from Web Audio API is tricky without breaking the stream.
            // Setting gains to 0 effectively bypasses the EQ.
        }
    }

    onUpdate() {
        this._applyEQ();
    }

    _initAudioContext(video) {
        if (!video || this.audioContext) return;
        
        // YouTube sometimes creates a new AudioContext per page load. We must wait for user interaction
        // to resume AudioContexts if they start suspended.
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
            this.sourceNode = this.audioContext.createMediaElementSource(video);
            
            // Setup Bass (Lowshelf)
            this.bassFilter = this.audioContext.createBiquadFilter();
            this.bassFilter.type = 'lowshelf';
            this.bassFilter.frequency.value = 250; 
            
            // Setup Treble (Highshelf)
            this.trebleFilter = this.audioContext.createBiquadFilter();
            this.trebleFilter.type = 'highshelf';
            this.trebleFilter.frequency.value = 4000;
            
            // Connect: Source -> Bass -> Treble -> Destination
            this.sourceNode.connect(this.bassFilter);
            this.bassFilter.connect(this.trebleFilter);
            this.trebleFilter.connect(this.audioContext.destination);

            // Handle speed change pitch correction issues in Chrome
            video.addEventListener('ratechange', this._boundHandleRateChange);

            this._applyEQ();
            
            this.utils?.log('Audio EQ graph initialized successfully', 'AUDIO', 'debug');
        } catch (e) {
            this.utils?.log(`Failed to init AudioContext: ${e.message}`, 'AUDIO', 'error');
            // MediaElementAudioSourceNode can only be created once per HTMLMediaElement.
        }
    }

    _applyEQ() {
        if (!this.audioContext || !this.settings) return;

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const bass = this.settings.volumeBoostBass || 0;
        const treble = this.settings.volumeBoostTreble || 0;

        // Apply gain directly
        if (this.bassFilter) this.bassFilter.gain.value = bass;
        if (this.trebleFilter) this.trebleFilter.gain.value = treble;
    }

    _handleRateChange(e) {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
};
