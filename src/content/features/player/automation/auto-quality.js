/**
 * Auto Quality feature
 * Automatically forces high playback quality and prevents YouTube from dynamically downgrading.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AutoQuality = class AutoQuality extends window.YPP.features.BaseFeature {
    constructor() {
        super('AutoQuality');
        this.enforcerInterval = null;
    }

    getConfigKey() { return 'autoQuality'; }

    enable() {
        try {
            this.forceInitialQuality();
            this.startEnforcer();
        } catch (e) {
            this.utils?.log('Error enabling AutoQuality', 'QUALITY', 'error', e);
        }
    }

    onUpdate() {
        this.forceInitialQuality();
        this.startEnforcer();
    }

    disable() {
        super.disable();
        this.stopEnforcer();
    }

    onPageChange() {
        this.forceInitialQuality();
    }

    forceInitialQuality() {
        if (!this.settings?.autoQuality || this.settings.autoQuality === 'off') return;

        // 1. Native Integration: Inject directly into YouTube's localStorage.
        try {
            const qualityPayload = JSON.stringify({
                data: this.settings.autoQuality, 
                expiration: Date.now() + 31536000000, 
                creation: Date.now()
            });
            window.localStorage.setItem('yt-player-quality', qualityPayload);
            this.utils?.log(`Injected yt-player-quality (${this.settings.autoQuality}) into localStorage`, this.name, 'debug');
        } catch (e) {
            this.utils?.log('Failed to write localStorage', this.name, 'warn', e);
        }

        // 2. Fallback: Player might not have quality levels ready immediately
        this.pollFor(() => {
            if (!this.settings?.autoQuality || this.settings.autoQuality === 'off') return true; 
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

    startEnforcer() {
        if (this.enforcerInterval) return;
        
        // Every 5 seconds, ensure YouTube hasn't auto-downgraded the quality
        this.enforcerInterval = setInterval(() => {
            if (!this.settings?.autoQuality || this.settings.autoQuality === 'off') {
                this.stopEnforcer();
                return;
            }
            const player = document.getElementById('movie_player');
            if (!player || typeof player.getPlaybackQuality !== 'function') return;
            
            const currentQuality = player.getPlaybackQuality();
            if (currentQuality === 'auto' || currentQuality === 'unknown') {
                this.applyAutoQuality(player);
            }
        }, 5000);
    }

    stopEnforcer() {
        if (this.enforcerInterval) {
            clearInterval(this.enforcerInterval);
            this.enforcerInterval = null;
        }
    }

    applyAutoQuality(player) {
        if (typeof player.getAvailableQualityLevels !== 'function') return;
        const available = player.getAvailableQualityLevels();
        
        // Full hierarchy of qualities
        const hierarchy = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
        
        // If user picked a specific target, we start looking from that index downwards
        let targetIndex = hierarchy.indexOf(this.settings.autoQuality);
        if (targetIndex === -1) targetIndex = 0; // Default to top if something weird happened
        
        const preferred = hierarchy.slice(targetIndex);
        const best = preferred.find(q => available.includes(q));
        
        if (best) {
            // CRITICAL FIX: setPlaybackQualityRange requires (minQuality, maxQuality).
            // Passing only one argument causes modern YouTube to default the max to the lowest available.
            if (typeof player.setPlaybackQualityRange === 'function') {
                player.setPlaybackQualityRange(best, best);
            }
            if (typeof player.setPlaybackQuality === 'function') {
                player.setPlaybackQuality(best);
            }
        }
    }
};
