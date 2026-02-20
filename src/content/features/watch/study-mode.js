/**
 * Study Mode Feature - Optimized playback for learning
 * @description Custom playback speed, captions, and learning-focused controls
 * @class StudyMode
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StudyMode = class StudyMode {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.studyInterval = null;
        this.speedPanel = null;
        this.controlBtn = null;
        
        // Configuration - load from storage or use defaults
        this.config = {
            speed: 1.25,
            enableCaptions: true,
            enforceInterval: 5000 // ms
        };
        
        // Speed presets
        this.SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        
        // Load saved config
        this.loadConfig();
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
            this.Utils?.createToast(`Study Mode: ${this.config.speed}x Speed ${this.config.enableCaptions ? '+ Captions' : ''}`);

            // Initial enforcement
            this._enforceState();

            // Add UI controls
            this.injectSpeedControl();

            // Periodic enforcement to handle ads and manual changes
            this.studyInterval = setInterval(() => this._enforceState(), this.config.enforceInterval);
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

            // Remove UI
            this.removeUI();

            // Revert playback speed
            const video = document.querySelector('video');
            if (video?.playbackRate === this.config.speed) {
                video.playbackRate = 1.0;
                this.Utils?.createToast('Study Mode Disabled');
            }
        } catch (error) {
            this.Utils?.log(`Error disabling study mode: ${error.message}`, 'STUDY', ' error');
        }
    }

    /**
     * Inject speed control UI into player
     * @private
     */
    async injectSpeedControl() {
        const Utils = window.YPP.Utils;
        if (!Utils) return;

        try {
            // Wait for player controls
            const rightControls = await Utils.pollFor(() => document.querySelector('.ytp-right-controls'), 10000, 500);
            
            if (!rightControls || document.getElementById('ypp-study-btn')) return;

            // Create button
            const btn = document.createElement('button');
            btn.id = 'ypp-study-btn';
            btn.className = 'ytp-button';
            btn.title = 'Study Mode Speed';
            btn.innerHTML = `<span style="font-size: 13px; font-weight: 500; color: #3ea6ff;">${this.config.speed}x</span>`;
            btn.onclick = (e) => {
                e.stopPropagation();
                this.toggleSpeedPanel();
            };

            rightControls.insertBefore(btn, rightControls.firstChild);
            this.controlBtn = btn;
        } catch (error) {
            console.error('Study Mode: Failed to inject controls:', error);
        }
    }

    /**
     * Toggle speed panel
     * @private
     */
    toggleSpeedPanel() {
        if (this.speedPanel) {
            this.removeSpeedPanel();
        } else {
            this.createSpeedPanel();
        }
    }

    /**
     * Create speed control panel
     * @private
     */
    createSpeedPanel() {
        const panel = document.createElement('div');
        panel.id = 'ypp-study-panel';
        panel.style.cssText = `
            position: absolute;
            bottom: 50px;
            right: 20px;
            background: rgba(28, 28, 28, 0.98);
            padding: 16px;
            border-radius: 12px;
            z-index: 6000;
            width: 280px;
            color: #fff;
            font-family: Roboto, sans-serif;
            box-shadow: 0 8px 24px rgba(0,0,0,0.6);
            backdropFilter: blur(10px);
        `;

        // Title
        const title = document.createElement('div');
        title.textContent = '📚 Study Mode';
        title.style.cssText = 'font-size: 15px; font-weight: 500; margin-bottom: 12px;';
        panel.appendChild(title);

        // Speed presets
        const presetsContainer = document.createElement('div');
        presetsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;';
        
        this.SPEED_PRESETS.forEach(speed => {
            const btn = document.createElement('button');
            btn.textContent = `${speed}x`;
            btn.style.cssText = `
                background: ${this.config.speed === speed ? 'rgba(62, 166, 255, 0.3)' : 'rgba(255,255,255,0.1)'};
                border: 1px solid ${this.config.speed === speed ? '#3ea6ff' : 'rgba(255,255,255,0.2)'};
                color: #fff;
                padding: 6px 4px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            `;
            btn.onclick = () => this.setSpeed(speed);
            presetsContainer.appendChild(btn);
        });
        panel.appendChild(presetsContainer);

        // Custom speed slider
        const sliderLabel = document.createElement('div');
        sliderLabel.textContent = '🎚️ Custom Speed';
        sliderLabel.style.cssText = 'font-size: 12px; color: #ddd; margin-bottom: 8px;';
        panel.appendChild(sliderLabel);

        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.25';
        slider.max = '3.0';
        slider.step = '0.05';
        slider.value = this.config.speed;
        slider.style.cssText = 'flex: 1; cursor: pointer;';

        const speedValue = document.createElement('span');
        speedValue.textContent = `${this.config.speed}x`;
        speedValue.style.cssText = 'font-size: 12px; color: #3ea6ff; font-weight: 500; min-width: 40px;';

        slider.oninput = (e) => {
            const newSpeed = parseFloat(e.target.value);
            speedValue.textContent = `${newSpeed}x`;
            this.setSpeed(newSpeed);
        };

        sliderRow.appendChild(slider);
        sliderRow.appendChild(speedValue);
        panel.appendChild(sliderRow);

        // Divider
        const divider = document.createElement('div');
        divider.style.cssText = 'height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;';
        panel.appendChild(divider);

        // Caption toggle
        const captionToggle = document.createElement('div');
        captionToggle.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0;';
        
        const captionLabel = document.createElement('span');
        captionLabel.textContent = '📝 Auto Captions';
        captionLabel.style.cssText = 'font-size: 12px;';

        const toggleSwitch = document.createElement('input');
        toggleSwitch.type = 'checkbox';
        toggleSwitch.checked = this.config.enableCaptions;
        toggleSwitch.style.cursor = 'pointer';
        toggleSwitch.onchange = (e) => {
            this.config.enableCaptions = e.target.checked;
            this.saveConfig();
            if (this.config.enableCaptions) {
                this._enableCaptions();
            }
        };

        captionToggle.appendChild(captionLabel);
        captionToggle.appendChild(toggleSwitch);
        panel.appendChild(captionToggle);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: #aaa;
            font-size: 24px;
            cursor: pointer;
            width: 20px;
            height: 20px;
            line-height: 16px;
            padding: 0;
        `;
        closeBtn.onclick = () => this.removeSpeedPanel();
        panel.appendChild(closeBtn);

        const container = document.getElementById('movie_player') || document.body;
        container.appendChild(panel);
        this.speedPanel = panel;
    }

    /**
     * Remove speed panel
     * @private
     */
    removeSpeedPanel() {
        if (this.speedPanel) {
            this.speedPanel.remove();
            this.speedPanel = null;
        }
    }

    /**
     * Remove all UI elements
     * @private
     */
    removeUI() {
        if (this.controlBtn) {
            this.controlBtn.remove();
            this.controlBtn = null;
        }
        this.removeSpeedPanel();
    }

    /**
     * Set playback speed
     * @param {number} speed - Playback speed
     * @private
     */
    setSpeed(speed) {
        this.config.speed = speed;
        this.saveConfig();
        
        const video = document.querySelector('video');
        if (video) {
            video.playbackRate = speed;
        }

        // Update button label
        if (this.controlBtn) {
            this.controlBtn.innerHTML = `<span style="font-size: 13px; font-weight: 500; color: #3ea6ff;">${speed}x</span>`;
        }

        //Refresh panel to show selection
        if (this.speedPanel) {
            this.removeSpeedPanel();
            this.createSpeedPanel();
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
                if (video.playbackRate !== this.config.speed) {
                    video.playbackRate = this.config.speed;
                }
                if (this.config.enableCaptions) {
                    this._enableCaptions();
                }
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

    /**
     * Load saved configuration
     * @private
     */
    async loadConfig() {
        try {
            const result = await chrome.storage.local.get('ypp_study_mode');
            if (result.ypp_study_mode) {
                this.config = { ...this.config, ...result.ypp_study_mode };
            }
        } catch (error) {
            console.error('Study Mode: Failed to load config:', error);
        }
    }

    /**
     * Save configuration
     * @private
     */
    async saveConfig() {
        try {
            await chrome.storage.local.set({ ypp_study_mode: this.config });
        } catch (error) {
            console.error('Study Mode: Failed to save config:', error);
        }
    }
};
