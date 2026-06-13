/**
 * Study Mode Feature - Optimized playback for learning
 * @description Custom playback speed, captions, and learning-focused controls
 * @class StudyMode
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.StudyMode = class StudyMode extends window.YPP.features.DistractionFreeBase {
    getConfigKey() { return 'studyMode'; }
    constructor() {
        super('StudyMode');
        this.speedPanel = null;
        this.controlBtn = null;
        
        // Configuration - load from storage or use defaults
        this.config = {
            speed: this.settings?.studySpeed || 1.0,
            forceSubtitles: this.settings?.studyCaptions || false
        };

        this.sessionStart = null;
        this.sessionTimer = null;
        this.elapsedSeconds = 0;
        this.timerDisplay = null;
        
        this._visibilityHandler = this._onVisibilityChange.bind(this);
        this.captionObserver = null;
        this.originalSpeed = null;
        
        // Speed presets
        this.SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
        
        // Load saved config
        this.loadConfig();
    }

    /**
     * Enable study mode with speed and captions
     */
    enable() {

        try {
            this.utils?.createToast(`Study Mode: ${this.config.speed}x Speed ${this.config.enableCaptions ? '+ Captions' : ''}`);

            this._boundEnforceState = () => this._enforceState();

            if (window.YPP && window.YPP.sharedObserver) {
                window.YPP.sharedObserver.register('study-mode-video', 'video', (elements) => {
                    const video = elements[0];
                    if (video) {
                        video.removeEventListener('ratechange', this._boundEnforceState);
                        this.addListener(video, 'ratechange', this._boundEnforceState);
                        this._enforceState();
                    }
                }, true);
            }

            // Add UI controls
            this.injectSpeedControl();

            // Apply distraction-free study layout
            this.enableDistractionFreeLayout('ypp-study-mode', {
                hideSidebar: true,
                hideComments: true,
                hideRelated: true,
                hideShorts: true,
                playerMaxWidth: '1000px'
            });

            // Start session timer
            this._startSessionTimer();

            // Setup Auto-Pause
            document.addEventListener('visibilitychange', this._visibilityHandler);

            // Inject Notes Panel
            this._injectNotePanel();

            // Init Smart Captions
            this._initSmartCaptions();
        } catch (error) {
            this.utils?.log(`Error enabling study mode: ${error.message}`, 'STUDY', 'error');
        }
    }

    disable() {

        try {
            if (window.YPP && window.YPP.sharedObserver) {
                window.YPP.sharedObserver.unregister('study-mode-video');
                window.YPP.sharedObserver.unregister('study-mode-controls');
            }

            const video = document.querySelector('video');
            if (video && this._boundEnforceState) {
                video.removeEventListener('ratechange', this._boundEnforceState);
            }

            // Remove UI
            this.removeUI();

            // Revert playback speed
            if (video?.playbackRate === this.config.speed) {
                video.playbackRate = 1.0;
                this.utils?.createToast('Study Mode Disabled');
            }

            // Remove distraction-free layout
            this.disableDistractionFreeLayout('ypp-study-mode', {
                hideSidebar: true,
                hideComments: true,
                hideRelated: true,
                hideShorts: true,
                playerMaxWidth: '1000px'
            });

            // Stop session timer
            this._stopSessionTimer();

            // Cleanup Auto-Pause
            document.removeEventListener('visibilitychange', this._visibilityHandler);

            // Cleanup Note Panel
            this._removeNotePanel();

            if (window.YPP.sharedObserver) {
                window.YPP.sharedObserver.unregister('study-mode-captions');
            }
        } catch (error) {
            this.utils?.log(`Error disabling study mode: ${error.message}`, 'STUDY', 'error');
        }
    }

    /**
     * Inject speed control UI into player
     * @private
     */
    async injectSpeedControl() {
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('study-mode-controls', '.ytp-right-controls', (elements) => {
                const rightControls = elements[0];
                this._createButtonInControls(rightControls);
            }, true);
        }
    }

    async onVideoChange(videoId) {
        if (!this.isEnabled) return;
        
        // Let the DOM settle
        setTimeout(() => {
            const rightControls = document.querySelector('.ytp-right-controls');
            if (rightControls) {
                this._createButtonInControls(rightControls);
            }
            
            const video = document.querySelector('video');
            if (video && this._boundEnforceState) {
                video.removeEventListener('ratechange', this._boundEnforceState);
                this.addListener(video, 'ratechange', this._boundEnforceState);
                this._enforceState();
            }

            // Reload notes for new video
            if (this.notesPanel) {
                this._loadNotes();
            }
        }, 300);
    }

    _createButtonInControls(rightControls) {
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

        // Title Row with Timer
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';
        
        const title = document.createElement('div');
        title.textContent = '📚 Study Mode';
        title.style.cssText = 'font-size: 15px; font-weight: 500;';
        
        this.timerDisplay = document.createElement('div');
        this.timerDisplay.textContent = this._formatTime(this.elapsedSeconds);
        this.timerDisplay.style.cssText = 'font-size: 13px; font-weight: 500; color: #4ade80; background: rgba(74, 222, 128, 0.15); padding: 4px 8px; border-radius: 6px; font-variant-numeric: tabular-nums;';
        
        titleRow.appendChild(title);
        titleRow.appendChild(this.timerDisplay);
        panel.appendChild(titleRow);

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
            const configData = await window.YPP.StorageManager.get('ypp_study_mode');
            if (configData) {
                this.config = { ...this.config, ...configData };
            }
        } catch (error) {
            this.utils?.log('Failed to load config: ' + error.message, 'STUDY', 'error');
        }
    }

    /**
     * Save configuration
     * @private
     */
    async saveConfig() {
        try {
            await window.YPP.StorageManager.set('ypp_study_mode', this.config);
        } catch (error) {
            this.utils?.log('Failed to save config: ' + error.message, 'STUDY', 'error');
        }
    }

    // =========================================================================
    // SESSION TIMER
    // =========================================================================

    _startSessionTimer() {
        if (!this.sessionStart) {
            this.sessionStart = Date.now() - (this.elapsedSeconds * 1000);
        }
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
        }
        
        this.sessionTimer = setInterval(() => {
            if (document.hidden) return;
            const video = document.querySelector('video');
            if (video && !video.paused) {
                this.elapsedSeconds++;
                if (this.timerDisplay) {
                    this.timerDisplay.textContent = this._formatTime(this.elapsedSeconds);
                }
                
                // Pomodoro 25-min check (1500 seconds)
                if (this.elapsedSeconds > 0 && this.elapsedSeconds % 1500 === 0) {
                    video.pause();
                    this._showBreakNotification();
                }
            }
        }, 1000);
    }

    _showBreakNotification() {
        if (document.getElementById('ypp-study-break-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'ypp-study-break-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
            z-index: 999999; display: flex; align-items: center; justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: rgba(30, 30, 30, 0.9); border: 1px solid rgba(74, 222, 128, 0.3);
            border-radius: 16px; padding: 32px; width: 340px; text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); font-family: 'Inter', sans-serif;
            color: #fff;
        `;

        const pomodoros = Math.floor(this.elapsedSeconds / 1500);

        modal.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 12px;">🍅</div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px; color: #4ade80;">Pomodoro Completed!</div>
            <div style="font-size: 14px; color: #aaa; margin-bottom: 24px;">You've studied for ${pomodoros * 25} minutes. Take a 5 minute break.</div>
            <button id="ypp-break-dismiss" style="
                width: 100%; padding: 12px; border-radius: 8px; border: none; background: rgba(74, 222, 128, 0.2);
                color: #4ade80; cursor: pointer; font-size: 14px; font-weight: 600; transition: background 0.2s;
            " onmouseover="this.style.background='rgba(74, 222, 128, 0.3)'" onmouseout="this.style.background='rgba(74, 222, 128, 0.2)'">Resume Study Session</button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('ypp-break-dismiss').onclick = () => {
            overlay.remove();
        };
    }

    _stopSessionTimer() {
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
    }

    _formatTime(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // =========================================================================
    // AUTO-PAUSE LOGIC
    // =========================================================================

    _onVisibilityChange() {
        const video = document.querySelector('video');
        if (!video) return;

        if (document.hidden) {
            // Tab is hidden, pause video
            if (!video.paused) {
                this._wasPlayingBeforeHide = true;
                video.pause();
                this.utils?.log('Study Mode: Auto-paused video', 'STUDY');
            }
        } else {
            // Tab is visible, resume video if we auto-paused it
            if (this._wasPlayingBeforeHide) {
                video.play();
                this._wasPlayingBeforeHide = false;
                this.utils?.log('Study Mode: Auto-resumed video', 'STUDY');
            }
        }
    }

    // =========================================================================
    // SMART CAPTIONS (AUTO-SLOWDOWN)
    // =========================================================================

    _initSmartCaptions() {
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('study-mode-captions', '.ytp-caption-segment', () => {
                if (!this.config.forceSubtitles) return;
                
                const captionContainer = document.querySelector('.ytp-caption-window-container');
                if (!captionContainer) return;
                
                const text = captionContainer.textContent.trim();
                const video = document.querySelector('video');
                if (!video) return;

                // Define "dense" as more than 80 characters on screen at once
                if (text.length > 80) {
                    if (this.originalSpeed === null) {
                        this.originalSpeed = video.playbackRate;
                        const newSpeed = Math.max(0.25, this.originalSpeed - 0.15); // Slow down by 0.15x
                        
                        video.playbackRate = newSpeed;
                        window.dispatchEvent(new CustomEvent('ypp-vsc-force-speed', {
                            detail: { enabled: true, speed: newSpeed }
                        }));
                    }
                } else {
                    if (this.originalSpeed !== null) {
                        video.playbackRate = this.originalSpeed;
                        window.dispatchEvent(new CustomEvent('ypp-vsc-force-speed', {
                            detail: { enabled: true, speed: this.originalSpeed }
                        }));
                        this.originalSpeed = null;
                    }
                }
            }, false);
        }
    }

    // =========================================================================
    // NOTE-TAKING PANEL
    // =========================================================================

    _injectNotePanel() {
        if (document.getElementById('ypp-study-notes')) return;

        this.notesPanel = document.createElement('div');
        this.notesPanel.id = 'ypp-study-notes';
        this.notesPanel.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            width: 320px;
            height: calc(100vh - 120px);
            background: rgba(28, 28, 28, 0.98);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            z-index: 5000;
            display: flex;
            flex-direction: column;
            color: #fff;
            font-family: Roboto, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            backdrop-filter: blur(12px);
            transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;';
        
        const title = document.createElement('div');
        title.innerHTML = '📝 <b>Study Notes</b>';
        title.style.fontSize = '15px';
        
        const exportBtn = document.createElement('button');
        exportBtn.textContent = 'Export';
        exportBtn.style.cssText = 'background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;';
        exportBtn.onclick = () => this._exportNotes();

        header.appendChild(title);
        header.appendChild(exportBtn);
        this.notesPanel.appendChild(header);

        // Notes List
        this.notesList = document.createElement('div');
        this.notesList.style.cssText = 'flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; scroll-behavior: smooth;';
        this.notesPanel.appendChild(this.notesList);

        // Input Area
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = 'padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); border-radius: 0 0 12px 12px;';
        
        const input = document.createElement('textarea');
        input.placeholder = 'Type a note and press Enter...';
        input.style.cssText = 'width: 100%; height: 60px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 8px; resize: none; font-family: inherit; font-size: 13px; outline: none; box-sizing: border-box;';
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    this._addNote(text);
                    input.value = '';
                }
            }
        });

        inputContainer.appendChild(input);
        this.notesPanel.appendChild(inputContainer);

        document.body.appendChild(this.notesPanel);
        this._loadNotes();
    }

    _removeNotePanel() {
        if (this.notesPanel) {
            this.notesPanel.remove();
            this.notesPanel = null;
        }
    }

    async _loadNotes() {
        if (!this.notesList) return;
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        this.notesList.innerHTML = '';
        try {
            const data = await window.YPP.StorageManager.get(`notes_${videoId}`);
            const notes = data || [];
            notes.forEach(note => this._renderNote(note));
        } catch (error) {
            this.utils?.log('Failed to load notes', 'STUDY', 'error');
        }
    }

    async _addNote(text) {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;

        const video = document.querySelector('video');
        const timestamp = video ? Math.floor(video.currentTime) : 0;

        const note = {
            id: Date.now().toString(),
            text: text,
            timestamp: timestamp,
            formattedTime: this._formatTime(timestamp)
        };

        this._renderNote(note);

        try {
            const data = await window.YPP.StorageManager.get(`notes_${videoId}`);
            const notes = data || [];
            notes.push(note);
            await window.YPP.StorageManager.set(`notes_${videoId}`, notes);
        } catch (error) {
            this.utils?.log('Failed to save note', 'STUDY', 'error');
        }
    }

    _renderNote(note) {
        if (!this.notesList) return;

        const el = document.createElement('div');
        el.style.cssText = 'background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 3px solid #3ea6ff; font-size: 13px; word-break: break-word;';
        
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;';
        
        const timeBtn = document.createElement('button');
        timeBtn.textContent = `⏱️ ${note.formattedTime}`;
        timeBtn.style.cssText = 'background: none; border: none; color: #3ea6ff; cursor: pointer; padding: 0; font-size: 11px; font-weight: 600; font-family: inherit;';
        timeBtn.onclick = () => {
            const video = document.querySelector('video');
            if (video) video.currentTime = note.timestamp;
        };

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '&times;';
        delBtn.style.cssText = 'background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 14px; padding: 0; line-height: 1;';
        delBtn.onclick = async () => {
            el.remove();
            const videoId = new URLSearchParams(window.location.search).get('v');
            if (!videoId) return;
            const data = await window.YPP.StorageManager.get(`notes_${videoId}`);
            if (data) {
                const updated = data.filter(n => n.id !== note.id);
                await window.YPP.StorageManager.set(`notes_${videoId}`, updated);
            }
        };

        header.appendChild(timeBtn);
        header.appendChild(delBtn);

        const content = document.createElement('div');
        content.textContent = note.text;
        content.style.cssText = 'color: #eee; line-height: 1.4;';

        el.appendChild(header);
        el.appendChild(content);
        
        this.notesList.appendChild(el);
        this.notesList.scrollTop = this.notesList.scrollHeight;
    }

    async _exportNotes() {
        const videoId = new URLSearchParams(window.location.search).get('v');
        if (!videoId) return;
        
        const data = await window.YPP.StorageManager.get(`notes_${videoId}`);
        if (!data || data.length === 0) return this.utils?.createToast('No notes to export');
        
        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() || 'YouTube_Notes';
        let text = `# Study Notes: ${title}\n\n`;
        
        data.forEach(n => {
            text += `[${n.formattedTime}] ${n.text}\n`;
        });
        
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
};
