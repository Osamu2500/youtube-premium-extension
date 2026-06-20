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
        if (this._enforcerBound) return;
        this._enforcerBound = () => {
            if (document.hidden) return;
            if (!this.settings?.autoQuality || this.settings.autoQuality === 'off') return;
            const player = document.getElementById('movie_player');
            if (player && typeof player.getPlaybackQuality === 'function') {
                this.applyAutoQuality(player);
            }
        };
        
        // Listen to navigation and player updates instead of polling
        this.addListener(document, 'yt-navigate-finish', this._enforcerBound);
        this.addListener(document, 'yt-player-updated', this._enforcerBound);
        
        // Handle network changes for smart auto-quality
        if (navigator.connection) {
            this.addListener(navigator.connection, 'change', this._enforcerBound);
        }
    }

    stopEnforcer() {
        this._enforcerBound = null;
    }

    applyAutoQuality(player) {
        if (typeof player.getAvailableQualityLevels !== 'function') return;
        const available = player.getAvailableQualityLevels();
        
        // Full hierarchy of qualities
        const hierarchy = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
        
        // Smart Auto-Quality: Check bandwidth
        let targetQuality = this.settings.autoQuality;
        if (navigator.connection && navigator.connection.downlink) {
            const downlink = navigator.connection.downlink; // in Mbps
            // If connection is slow, downgrade target temporarily
            if (downlink < 1.5 && ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720'].includes(targetQuality)) {
                targetQuality = 'large'; // 480p
                this.utils?.log('Connection is slow (<1.5Mbps), downgrading to 480p', this.name, 'debug');
            } else if (downlink < 3.0 && ['highres', 'hd2160', 'hd1440', 'hd1080'].includes(targetQuality)) {
                targetQuality = 'hd720'; // 720p
                this.utils?.log('Connection is slow (<3.0Mbps), downgrading to 720p', this.name, 'debug');
            }
        }

        // If user picked a specific target, we start looking from that index downwards
        let targetIndex = hierarchy.indexOf(targetQuality);
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
