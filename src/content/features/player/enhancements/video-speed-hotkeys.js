export class VideoSpeedHotkeys {
    constructor(controller) {
        this.controller = controller; // Reference to VideoSpeedController
    }

    handleKeyDown(e, video, state, shortcuts) {
        if (!shortcuts || shortcuts.length === 0) return false;

        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.metaKey) keys.push('Meta');
        
        let keyName = e.key;
        if (e.shiftKey) {
            const shiftMap = { '<': ',', '>': '.', ':': ';', '"': "'", '{': '[', '}': ']', '|': '\\', '?': '/', '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=' };
            if (shiftMap[keyName]) keyName = shiftMap[keyName];
        }
        if (keyName === ' ') keyName = 'Space';
        
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) return false; // Ignore standalone modifiers
        
        keyName = keyName.length === 1 ? keyName.toUpperCase() : keyName;
        keys.push(keyName);
        const comboKey = keys.join('+').toUpperCase();

        console.log('[VSC Hotkeys] Pressed:', comboKey, 'Shortcuts:', shortcuts);

        let handled = false;

        for (const sc of shortcuts) {
            if (!sc.key) continue;
            const scKey = sc.key.toUpperCase();
            if (comboKey !== scKey) continue;
            
            console.log('[VSC Hotkeys] Matched action:', sc.action);
            
            if (!handled) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            const val = parseFloat(sc.value) || 0;
            switch (sc.action) {
                case 'showHide':
                    const controllerEl = video.parentElement?.querySelector('ypp-vsc-controller');
                    if (controllerEl) {
                        controllerEl.style.display = controllerEl.style.display === 'none' ? 'block' : 'none';
                    }
                    handled = true;
                    break;
                case 'decrease':
                    this.controller.adjustSpeed(video, -val);
                    handled = true;
                    break;
                case 'increase':
                    this.controller.adjustSpeed(video, val);
                    handled = true;
                    break;
                case 'rewind':
                    video.currentTime -= val;
                    handled = true;
                    break;
                case 'advance':
                    video.currentTime += val;
                    handled = true;
                    break;
                case 'reset':
                    this.controller.setSpeed(video, val);
                    handled = true;
                    break;
                case 'preferred':
                    this.controller.setSpeed(video, val);
                    handled = true;
                    break;
                case 'mute':
                    video.muted = !video.muted;
                    handled = true;
                    break;
                case 'decreaseVolume':
                    video.volume = Math.max(0, video.volume - 0.1);
                    handled = true;
                    break;
                case 'increaseVolume':
                    video.volume = Math.min(1, video.volume + 0.1);
                    handled = true;
                    break;
                case 'pause':
                    if (video.paused) video.play();
                    else video.pause();
                    handled = true;
                    break;
                case 'setMarker':
                    this.controller.markers.set(video, video.currentTime);
                    handled = true;
                    break;
                case 'jumpMarker':
                    if (this.controller.markers.has(video)) {
                        video.currentTime = this.controller.markers.get(video);
                    }
                    handled = true;
                    break;
            }
        }
        
        return handled;
    }
}
