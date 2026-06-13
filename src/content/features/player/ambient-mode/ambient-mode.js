window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AmbientMode = class AmbientMode extends window.YPP.features.BaseFeature {
    constructor() {
        super('AmbientMode');
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.animationFrame = null;
        this.video = null;
        this.container = null;
        this._playerVisible = true;
        this._intersectionObserver = null;
        this._visibilityHandler = this._onVisibilityChange.bind(this);
        
        // V2 Features
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        
        this.motionCanvas = document.createElement('canvas');
        this.motionCtx = this.motionCanvas.getContext('2d', { willReadFrequently: true });
        this.motionCanvas.width = 16;
        this.motionCanvas.height = 16;
        this.lastMotionData = null;
        this.currentBlur = 120;
        this.targetBlur = 120;
    }

    getConfigKey() {
        return 'ambientMode';
    }

    async enable() {
        // Only run on watch page
        if (!this.utils.isWatchPage()) return;
        
        await super.enable();
        
        this.initDOM();
        this.startLoop();
    }

    async disable() {
        await super.disable();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }
        
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('ambient-mode-btn');
        }

        document.removeEventListener('visibilitychange', this._visibilityHandler);

        if (this.gl) {
            if (this.program) this.gl.deleteProgram(this.program);
            if (this.texture) this.gl.deleteTexture(this.texture);
            const ext = this.gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
            this.gl = null;
        }

        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }

    async onUpdate() {
        if (this.isEnabled && this.canvas && this.container) {
            const intensity = this.settings?.ambientIntensity ?? 0.6;
            this.container.style.opacity = intensity;
        }
    }

    async onPageChange(url) {
        if (!this.isEnabled) return;
        
        if (this.utils.isWatchPage()) {
            // Wait a tick for YouTube's DOM to settle
            await new Promise(r => setTimeout(r, 100));
            await this.disable();
            this.isEnabled = true; // keep logical state true
            await this.enable();
        } else {
            await this.disable();
            this.isEnabled = true; // keep logical state true
        }
    }

    async onVideoChange(videoId) {
        if (!this.isEnabled || !this.utils.isWatchPage()) return;
        
        // Re-initialize for the new video
        await this.disable();
        this.isEnabled = true;
        await this.enable();
    }

    initDOM() {
        this.video = document.querySelector('video');
        if (!this.video) return;

        // ytd-player wraps the video in both default and theater modes
        const playerContainer = document.querySelector('ytd-player') || document.querySelector('#player-container-outer') || document.querySelector('ytd-watch-flexy');
        if (!playerContainer) return;

        // Create container for the massive glow
        this.container = document.createElement('div');
        this.container.id = 'ypp-massive-ambient-container';
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1; /* Behind the player content */
            pointer-events: none;
            overflow: visible;
            transform: translateZ(0); /* Hardware acceleration */
            opacity: ${this.settings?.ambientIntensity || 0.6};
            transition: opacity 0.5s ease;
        `;

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'ypp-massive-ambient-canvas';
        
        const blurAmount = this.settings?.ambientBlur || 120;
        
        this.canvas.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1.3);
            width: 100%;
            height: 100%;
            image-rendering: auto;
            mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
        `;
        
        this.container.appendChild(this.canvas);
        
        playerContainer.style.position = 'relative';
        playerContainer.style.zIndex = '0';
        
        playerContainer.insertBefore(this.container, playerContainer.firstChild);

        this.initWebGL();
    }

    initWebGL() {
        // Very small canvas to let native GPU bilinear + CSS blur do the heavy lifting
        this.canvas.width = 32;
        this.canvas.height = 32;

        const gl = this.canvas.getContext('webgl2', { alpha: false, depth: false, antialias: false, powerPreference: 'low-power' }) || 
                   this.canvas.getContext('webgl', { alpha: false, depth: false, antialias: false, powerPreference: 'low-power' });
        
        if (!gl) {
            this.utils?.log?.('WebGL not supported, ambient mode disabled', 'AMBIENT', 'error');
            return;
        }
        this.gl = gl;

        // Vertex Shader
        const vsSource = `
            attribute vec2 aPosition;
            varying vec2 vTexCoord;
            void main() {
                vTexCoord = aPosition * 0.5 + 0.5;
                vTexCoord.y = 1.0 - vTexCoord.y; // Flip Y
                gl_Position = vec4(aPosition, 0.0, 1.0);
            }
        `;

        // Fragment Shader: Native WebGL Blur, saturation and brightness boost
        const fsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uSampler;
            uniform float uSaturationBoost;
            uniform float uBrightnessBoost;
            uniform float uBlurIntensity;

            void main() {
                vec4 color = vec4(0.0);
                float total = 0.0;
                
                // 9-tap simple blur
                for(float x = -1.0; x <= 1.0; x++) {
                    for(float y = -1.0; y <= 1.0; y++) {
                        vec2 offset = vec2(x, y) * uBlurIntensity;
                        color += texture2D(uSampler, vTexCoord + offset);
                        total += 1.0;
                    }
                }
                color /= total;
                
                // Boost saturation and brightness
                float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                vec3 boosted = mix(vec3(luminance), color.rgb, uSaturationBoost);
                boosted = boosted * uBrightnessBoost;
                
                gl_FragColor = vec4(boosted, 1.0);
            }
        `;

        const compileShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        gl.useProgram(this.program);

        this.uSaturationBoost = gl.getUniformLocation(this.program, 'uSaturationBoost');
        this.uBrightnessBoost = gl.getUniformLocation(this.program, 'uBrightnessBoost');
        this.uBlurIntensity = gl.getUniformLocation(this.program, 'uBlurIntensity');
        
        gl.uniform1f(this.uSaturationBoost, 2.0);
        gl.uniform1f(this.uBrightnessBoost, 0.85);

        // Setup geometry (full screen quad)
        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(this.program, 'aPosition');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        // Setup texture
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    startLoop() {
        let lastTime = 0;
        const fpsInterval = 1000 / 30; // 30 FPS for WebGL is cheap and perfectly smooth

        if (this.video) {
            this._intersectionObserver = new IntersectionObserver(
                ([entry]) => { this._playerVisible = entry.isIntersecting; },
                { threshold: 0.05 }
            );
            this._intersectionObserver.observe(this.video);
        }

        document.addEventListener('visibilitychange', this._visibilityHandler);

        const loop = (timestamp) => {
            if (!this.isEnabled) return;

            const elapsed = timestamp - lastTime;

            if (elapsed > fpsInterval) {
                lastTime = timestamp - (elapsed % fpsInterval);

                const shouldDraw =
                    this.video &&
                    !this.video.paused &&
                    !this.video.ended &&
                    this.video.readyState >= 2 &&
                    !document.hidden &&
                    this._playerVisible &&
                    this.gl;

                if (shouldDraw) {
                    this._initAudioContextSafe();
                    
                    // 1. Calculate Audio Reactivity (Bass)
                    let audioBoost = 0;
                    if (this.analyser && this.dataArray) {
                        this.analyser.getByteFrequencyData(this.dataArray);
                        // Average lower frequencies (bass)
                        let sum = 0;
                        for (let i = 0; i < 10; i++) sum += this.dataArray[i];
                        audioBoost = (sum / 10) / 255.0; // 0.0 to 1.0
                    }

                    // 2. Calculate Motion-Adaptive Blur
                    this.motionCtx.drawImage(this.video, 0, 0, 16, 16);
                    const currentFrame = this.motionCtx.getImageData(0, 0, 16, 16).data;
                    let diff = 0;
                    if (this.lastMotionData) {
                        for (let i = 0; i < currentFrame.length; i += 4) {
                            diff += Math.abs(currentFrame[i] - this.lastMotionData[i]) +
                                    Math.abs(currentFrame[i+1] - this.lastMotionData[i+1]) +
                                    Math.abs(currentFrame[i+2] - this.lastMotionData[i+2]);
                        }
                    }
                    this.lastMotionData = currentFrame;
                    
                    // Normalize difference
                    const motionScore = Math.min(1.0, diff / (16 * 16 * 3 * 255));
                    
                    // High motion = sharper light (lower blur)
                    // Low motion = soft spread (higher blur)
                    const baseBlur = this.settings?.ambientBlur || 120;
                    this.targetBlur = baseBlur - (motionScore * 80); // Drops down to base-80 on high motion
                    
                    // Lerp blur for smoothness
                    this.currentBlur += (this.targetBlur - this.currentBlur) * 0.1;

                    // 3. Render WebGL with Dynamic Boosts
                    const gl = this.gl;
                    gl.useProgram(this.program);
                    
                    // WebGL Blur Intensity mapping (canvas is tiny, offset should be small)
                    gl.uniform1f(this.uBlurIntensity, this.currentBlur / 1500.0);
                    
                    // Base sat 2.0, max 3.5 with audio
                    gl.uniform1f(this.uSaturationBoost, 2.0 + (audioBoost * 1.5));
                    // Base bright 0.85, max 1.25 with audio
                    gl.uniform1f(this.uBrightnessBoost, 0.85 + (audioBoost * 0.4));
                    
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                    // Upload video frame to GPU
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
                    
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }
            }
            
            this.animationFrame = requestAnimationFrame(loop);
        };

        this.animationFrame = requestAnimationFrame(loop);
    }

    _initAudioContextSafe() {
        if (!this.video || window.YPP.audioContextInitialized) return;
        
        try {
            window.YPP.audioContextInitialized = true;
            window.YPP.audioContext = window.YPP.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            
            // Only create source if not already created
            if (!window.YPP.audioSource) {
                // IMPORTANT: Some DRM videos block this. We wrap in try-catch.
                window.YPP.audioSource = window.YPP.audioContext.createMediaElementSource(this.video);
                window.YPP.audioAnalyser = window.YPP.audioContext.createAnalyser();
                window.YPP.audioAnalyser.fftSize = 64; // Small FFT size for fast bass detection
                
                window.YPP.audioSource.connect(window.YPP.audioAnalyser);
                window.YPP.audioAnalyser.connect(window.YPP.audioContext.destination);
            }
            
            this.audioContext = window.YPP.audioContext;
            this.analyser = window.YPP.audioAnalyser;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        } catch (e) {
            this.utils?.log('Failed to init Audio Context (likely DRM/CORS)', 'AMBIENT', 'warn');
        }
    }

    _onVisibilityChange() {
        this.utils?.log?.(
            `Tab visibility: ${document.hidden ? 'hidden (paused)' : 'visible (resumed)'}`,
            'AMBIENT', 'debug'
        );
    }
};
