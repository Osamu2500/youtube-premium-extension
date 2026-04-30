/**
 * Auto Quality & Theater feature
 * Automatically forces high playback quality and theater mode if enabled.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoQuality = class AutoQuality extends window.YPP.features.BaseFeature {
    constructor() {
        super('AutoQuality');
        this.hasEnforcedTheater = false;
    }

    getConfigKey() { return 'autoQuality'; }

    // Override update to handle both autoQuality and autoCinema settings
    async update(settings) {
        this.settings = settings;
        
        const shouldBeEnabled = !!(settings.autoQuality || settings.autoCinema);
        
        if (shouldBeEnabled && !this.isEnabled) {
            this.utils?.log(`Enabling feature: ${this.name}`, 'MAIN', 'debug');
            this.abortController = new AbortController();
            await this.enable();
            this.isEnabled = true;
        } else if (!shouldBeEnabled && this.isEnabled) {
            this.utils?.log(`Disabling feature: ${this.name}`, 'MAIN', 'debug');
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            await this.disable();
            this.isEnabled = false;
        } else if (this.isEnabled) {
            this.runAutoTasks();
        }
    }

    async enable() {
        this.runAutoTasks();
    }

    async disable() {
        super.disable();
        this.hasEnforcedTheater = false;
    }

    onVideoChange() {
        this.hasEnforcedTheater = false; // Reset for new video
        if (this.isEnabled) {
            this.runAutoTasks();
        }
    }

    runAutoTasks() {
        if (!this.settings) return;

        if (this.settings.autoQuality) {
            // Player might not have quality levels ready immediately
            this.pollFor(() => {
                const player = document.getElementById('movie_player');
                if (player && typeof player.getAvailableQualityLevels === 'function') {
                    const available = player.getAvailableQualityLevels();
                    if (available && available.length > 0 && available[0] !== 'auto') {
                        this.applyAutoQuality(player);
                        return true; // Stop polling
                    }
                }
                return false;
            }, 5000, 500).catch(() => {});
        }

        if (this.settings.autoCinema && !this.hasEnforcedTheater) {
            this.pollFor(() => {
                if (this.hasEnforcedTheater) return true;
                const controls = document.querySelector('.ytp-right-controls');
                if (controls) {
                    this.enforceTheaterMode(controls);
                    return this.hasEnforcedTheater;
                }
                return false;
            }, 10000, 1000).catch(() => {});
        }
    }

    applyAutoQuality(player) {
        const available = player.getAvailableQualityLevels();
        const preferred = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
        const best = preferred.find(q => available.includes(q));
        
        if (best) {
            if (typeof player.setPlaybackQualityRange === 'function') {
                player.setPlaybackQualityRange(best);
            }
            if (typeof player.setPlaybackQuality === 'function') {
                player.setPlaybackQuality(best);
            }
            this.utils?.log(`Set quality to ${best}`, this.name, 'debug');
        }
    }

    enforceTheaterMode(controls) {
        if (this.hasEnforcedTheater) return;
        const sizeBtn = controls.querySelector('.ytp-size-button');
        if (!sizeBtn) return;
        const ytdWatch = document.querySelector('ytd-watch-flexy');
        if (ytdWatch && !ytdWatch.hasAttribute('theater')) {
            sizeBtn.click();
            this.hasEnforcedTheater = true;
            document.cookie = "wide=1;domain=.youtube.com;path=/";
            this.utils?.log(`Enforced Theater Mode`, this.name, 'debug');
        } else if (ytdWatch && ytdWatch.hasAttribute('theater')) {
            this.hasEnforcedTheater = true;
        }
    }
};
