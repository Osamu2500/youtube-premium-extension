/**
 * Player Tools
 * Adds Custom Speed and Cinema Filters to the player.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.PlayerTools = class PlayerTools {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.isActive = false;
        this.settings = null;
        this.controlsInjected = false;
        this.videoRef = null;
    }

    run(settings) {
        this.update(settings);
    }

    update(settings) {
        this.settings = settings;
        if (settings.enableCustomSpeed || settings.enableCinemaFilters) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.Utils.log('Enabled Player Tools', 'PLAYER_TOOLS');
        this.startMonitoring();
    }

    disable() {
        this.isActive = false;
        this.removeControls();
    }

    startMonitoring() {
        // Monitor for player initialization
        setInterval(() => {
            if (!this.isActive) return;
            const rightControls = document.querySelector('.ytp-right-controls');
            if (rightControls && !document.querySelector('#ypp-player-tools')) {
                this.injectControls(rightControls);
            }
            this.applyFilters(); // Continuously ensure filters are applied if video changes
        }, 1000);
    }

    injectControls(container) {
        if (this.controlsInjected) return;

        const toolsDiv = document.createElement('div');
        toolsDiv.id = 'ypp-player-tools';
        toolsDiv.style.display = 'flex';
        toolsDiv.style.alignItems = 'center';
        toolsDiv.style.marginRight = '10px';
        toolsDiv.style.verticalAlign = 'top';

        // 1. Custom Speed Input
        if (this.settings.enableCustomSpeed) {
            const speedInput = document.createElement('input');
            speedInput.type = 'number';
            speedInput.step = '0.1';
            speedInput.min = '0.1';
            speedInput.max = '5.0';
            speedInput.value = '1.0';
            speedInput.title = 'Custom Speed (e.g. 2.5)';
            speedInput.style.cssText = `
                width: 40px;
                background: rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                border-radius: 4px;
                padding: 2px 4px;
                margin-right: 8px;
                font-size: 12px;
                text-align: center;
                pointer-events: auto;
            `;

            speedInput.addEventListener('change', (e) => {
                let speed = parseFloat(e.target.value);
                // Validate and clamp input
                if (isNaN(speed) || speed < 0.1) {
                    speed = 0.1;
                    e.target.value = '0.1';
                } else if (speed > 5.0) {
                    speed = 5.0;
                    e.target.value = '5.0';
                }
                this.setSpeed(speed);
            });

            // Listen for regular speed changes to update input
            const video = document.querySelector('video');
            if (video) {
                video.addEventListener('ratechange', () => {
                    if (document.activeElement !== speedInput) {
                        speedInput.value = video.playbackRate.toFixed(1);
                    }
                });
            }

            toolsDiv.appendChild(speedInput);
        }

        // 2. Cinema Filters Toggle
        if (this.settings.enableCinemaFilters) {
            const filterBtn = document.createElement('button');
            filterBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="100%" height="100%" fill="white">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
            `;
            filterBtn.title = 'Cinema Filters';
            filterBtn.className = 'ytp-button';
            filterBtn.style.width = '30px';
            filterBtn.style.opacity = '0.9';

            // Filter Panel
            const panel = this.createFilterPanel();
            document.body.appendChild(panel); // Append to body to avoid clipping

            filterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';

                // Position panel near button
                const rect = filterBtn.getBoundingClientRect();
                panel.style.top = (rect.top - 140) + 'px'; // Above
                panel.style.left = (rect.left - 50) + 'px';
            });

            // Hide panel when clicking elsewhere
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && e.target !== filterBtn) {
                    panel.style.display = 'none';
                }
            });

            toolsDiv.appendChild(filterBtn);
        }

        // Insert before the settings gear (usually index 0 or similar in right-controls)
        container.insertBefore(toolsDiv, container.firstChild);
        this.controlsInjected = true;
    }

    createFilterPanel() {
        const panel = document.createElement('div');
        panel.id = 'ypp-filter-panel';
        panel.style.cssText = `
            position: fixed;
            display: none;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            width: 200px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            color: white;
            font-family: Roboto, Arial;
        `;

        const createSlider = (label, min, max, val, callback) => {
            const container = document.createElement('div');
            container.style.marginBottom = '12px';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.fontSize = '12px';
            header.style.marginBottom = '4px';
            header.innerHTML = `<span>${label}</span><span id="val-${label}">${val}%</span>`;

            const input = document.createElement('input');
            input.type = 'range';
            input.min = min;
            input.max = max;
            input.value = val;
            input.style.width = '100%';
            input.style.cursor = 'pointer';

            input.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                // Validate input
                if (isNaN(value)) return;

                container.querySelector(`#val-${label}`).textContent = value + '%';
                callback(value);
            });

            container.appendChild(header);
            container.appendChild(input);
            return container;
        };

        // Brightness Slider
        panel.appendChild(createSlider('Brightness', 50, 200, 100, (val) => {
            this.settings.filterBrightness = val;
            this.applyFilters();
            this.saveTempSettings();
        }));

        // Contrast Slider
        panel.appendChild(createSlider('Contrast', 50, 200, 100, (val) => {
            this.settings.filterContrast = val;
            this.applyFilters();
            this.saveTempSettings();
        }));

        // Reset Button
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        resetBtn.style.cssText = `
            width: 100%;
            padding: 6px;
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 11px;
        `;
        resetBtn.addEventListener('click', () => {
            // Reset UI sliders
            const inputs = panel.querySelectorAll('input');
            inputs.forEach(i => {
                i.value = 100;
                i.dispatchEvent(new Event('input')); // Trigger update
            });
        });
        panel.appendChild(resetBtn);

        return panel;
    }

    setSpeed(speed) {
        const video = document.querySelector('video');
        if (video) {
            video.playbackRate = Math.max(0.1, Math.min(16, speed));
        }
    }

    applyFilters() {
        const video = document.querySelector('video');
        if (video) {
            // Default checking
            const brightness = this.settings.filterBrightness || 100;
            const contrast = this.settings.filterContrast || 100;

            if (brightness === 100 && contrast === 100) {
                video.style.filter = '';
            } else {
                video.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
            }
        }
    }

    saveTempSettings() {
        // Debounced save would be better, but direct set is okay for now
        chrome.storage.local.set({ settings: this.settings });
    }

    removeControls() {
        const tools = document.querySelector('#ypp-player-tools');
        if (tools) tools.remove();

        const panel = document.querySelector('#ypp-filter-panel');
        if (panel) panel.remove();

        this.controlsInjected = false;

        const video = document.querySelector('video');
        if (video) video.style.filter = '';
    }
};
