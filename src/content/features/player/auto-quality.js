/**
 * Auto Quality & Theater feature
 * Automatically forces high playback quality and theater mode if enabled.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoQuality = class AutoQuality {
    constructor() {
        this.name = 'AutoQuality';
        this.settings = null;
        this.hasEnforcedTheater = false;
        this._pollInterval = null;
    }

    getConfigKey() { return 'autoQuality'; }

    enable(settings) {
        this.settings = settings;
        this.run();
    }

    disable() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
        this.hasEnforcedTheater = false;
    }

    update(settings) {
        this.settings = settings;
        if (settings.autoQuality || settings.autoCinema) {
            this.run();
        } else {
            this.disable();
        }
    }

    run() {
        if (!this.settings) return;

        // Apply once
        if (this.settings.autoQuality) {
            this.applyAutoQuality();
        }

        // Continually check for controls/theater if needed, or wait for ready
        if (this.settings.autoCinema && !this.hasEnforcedTheater) {
            this._pollInterval = setInterval(() => {
                const controls = document.querySelector('.ytp-right-controls');
                if (controls) {
                    this.enforceTheaterMode(controls);
                    if (this.hasEnforcedTheater) {
                        clearInterval(this._pollInterval);
                        this._pollInterval = null;
                    }
                }
            }, 1000);
        }
    }

    applyAutoQuality() {
        const player = document.getElementById('movie_player');
        if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
        const available = player.getAvailableQualityLevels();
        const preferred = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
        const best = preferred.find(q => available.includes(q));
        if (best && typeof player.setPlaybackQualityRange === 'function') {
            const current = player.getPlaybackQuality();
            if (current !== best) {
                player.setPlaybackQualityRange(best);
            }
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
        } else if (ytdWatch && ytdWatch.hasAttribute('theater')) {
            this.hasEnforcedTheater = true;
        }
    }
};
