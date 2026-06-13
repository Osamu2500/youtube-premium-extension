// This script is injected into the MAIN world (page context)
// to perfectly intercept and block native YouTube scripts from overriding the playback rate.

(function() {
    if (window.__ypp_vsc_injected) return;
    window.__ypp_vsc_injected = true;

    let forcedSpeed = null;
    let isForcing = false;

    // Listen for commands from the content script
    window.addEventListener('ypp-vsc-force-speed', (e) => {
        forcedSpeed = e.detail.speed;
        isForcing = !!e.detail.enabled;
        
        // Immediately apply to all existing media elements if enabled
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
                // Determine if the call came from user interaction vs YouTube's internal SPA logic
                // If the user interacted with native UI, YouTube dispatches events or we can rely on our content script
                // We'll block all native sets unless it perfectly matches our forced speed
                if (Math.abs(val - forcedSpeed) > 0.01) {
                    // Blocked!
                    return;
                }
            }
            // Allow
            return originalSet.call(this, val);
        },
        configurable: true,
        enumerable: true
    });
})();
