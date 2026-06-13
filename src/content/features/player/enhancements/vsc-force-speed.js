/**
 * Video Speed Controller: Force Speed
 * Prevents YouTube's SPA logic from fighting back and resetting custom playback rates.
 * Managed passively as a sub-setting, isolated here per architectural rules.
 */
class VSCForceSpeed extends window.YPP.features.BaseFeature {
    getConfigKey() { return 'vscForceSpeed'; }
    constructor() { 
        super('VSCForceSpeed'); 
        this._injected = false;
    }

    async enable() {
        if (!this.settings || this.settings.vscForceSpeed === false) return;
        this.injectPageScript();
        this.syncSpeedToPage();
    }

    async disable() {
        this.disablePageScript();
    }

    injectPageScript() {
        if (this._injected) return;
        if (document.getElementById('ypp-vsc-page-script')) return;

        const scriptContent = `
            (function() {
                if (window.__ypp_vsc_injected) return;
                window.__ypp_vsc_injected = true;
            
                let forcedSpeed = null;
                let isForcing = false;
            
                window.addEventListener('ypp-vsc-force-speed', (e) => {
                    forcedSpeed = e.detail.speed;
                    isForcing = !!e.detail.enabled;
                    
                    if (isForcing && forcedSpeed) {
                        const medias = document.querySelectorAll('video, audio');
                        medias.forEach(media => {
                            if (Math.abs(media.playbackRate - forcedSpeed) > 0.01) {
                                try {
                                    const originalSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate').set;
                                    originalSetter.call(media, forcedSpeed);
                                } catch (err) {}
                            }
                        });
                    }
                });
            
                const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
                if (!originalDescriptor) return;
            
                const originalSet = originalDescriptor.set;
                
                Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
                    get: originalDescriptor.get,
                    set: function(val) {
                        if (isForcing && forcedSpeed !== null) {
                            if (Math.abs(val - forcedSpeed) > 0.01) {
                                return; // Blocked
                            }
                        }
                        return originalSet.call(this, val);
                    },
                    configurable: true,
                    enumerable: true
                });
            })();
        `;

        const script = document.createElement('script');
        script.id = 'ypp-vsc-page-script';
        script.textContent = scriptContent;
        (document.head || document.documentElement).appendChild(script);
        this._injected = true;
    }

    syncSpeedToPage() {
        if (!this.settings?.vscForceSpeed) return;
        const speed = this.settings.vscLastSpeed || 1.0;
        window.dispatchEvent(new CustomEvent('ypp-vsc-force-speed', {
            detail: { enabled: true, speed: speed }
        }));
    }

    disablePageScript() {
        window.dispatchEvent(new CustomEvent('ypp-vsc-force-speed', {
            detail: { enabled: false, speed: null }
        }));
    }
}
window.YPP.features.VSCForceSpeed = VSCForceSpeed;
