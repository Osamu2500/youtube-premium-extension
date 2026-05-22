/**
 * Mini Player Feature
 * Automatically switches to Picture-in-Picture mode when scrolling down.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.MiniPlayer = class MiniPlayer extends window.YPP.features.BaseFeature {
    constructor() {
        super('MiniPlayer');
        
        this.miniplayer = null;
        this.resizeHandle = null;
        this.isDragging = false;
        
        // Default miniplayer dimensions
        this.startWidth = 0;
        this.startHeight = 0;
        this.startX = 0;
        this.startY = 0;
        
        this.observer = null;

        this.onDragStart = this.onDragStart.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.checkMiniplayerState = this.checkMiniplayerState.bind(this);
    }

    getConfigKey() {
        return 'enableMiniPlayer'; // Update config key to match if needed, or keep 'enablePiP' if you want backward compat
    }

    async enable() {
        await super.enable();
        
        try {
            // Listen to SPA navigations and DOM mutations to catch miniplayer activation
            this.addListener(window, 'yt-navigate-finish', this.checkMiniplayerState);
            this.addListener(document, 'click', () => setTimeout(this.checkMiniplayerState, 500));
            
            // Also poll every few seconds just in case
            this.pollInterval = setInterval(this.checkMiniplayerState, 2000);
            this.checkMiniplayerState();
        } catch (e) {
            this.utils?.log('Error enabling MiniPlayer', 'MINIPLAYER', 'error', e);
        }
    }

    async disable() {
        await super.disable();
        if (this.pollInterval) clearInterval(this.pollInterval);
        
        if (this.resizeHandle) {
            this.resizeHandle.remove();
            this.resizeHandle = null;
        }
        
        if (this.miniplayer) {
            this.miniplayer.style.width = '';
            this.miniplayer.style.height = '';
            this.miniplayer = null;
        }
    }

    checkMiniplayerState() {
        if (!this.isEnabled) return;
        
        // Find the native youtube miniplayer
        const player = document.querySelector('ytd-miniplayer[active]');
        
        if (player && !this.resizeHandle) {
            this.miniplayer = player;
            this.injectResizeHandle();
        } else if (!player && this.resizeHandle) {
            this.resizeHandle.remove();
            this.resizeHandle = null;
            this.miniplayer = null;
        }
    }

    injectResizeHandle() {
        if (!this.miniplayer || this.resizeHandle) return;
        
        // Ensure container is relative so absolute handle works
        this.miniplayer.style.position = 'fixed'; // It's usually fixed or absolute anyway
        
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'ypp-miniplayer-resizer';
        this.resizeHandle.title = 'Drag to resize';
        this.resizeHandle.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            width: 24px;
            height: 24px;
            cursor: nwse-resize;
            background: linear-gradient(135deg, rgba(255,0,0,0.8) 0%, rgba(255,0,0,0) 50%);
            border-top-left-radius: 4px;
            z-index: 9999;
            opacity: 0.5;
            transition: opacity 0.2s;
        `;
        
        this.resizeHandle.addEventListener('mouseenter', () => this.resizeHandle.style.opacity = '1');
        this.resizeHandle.addEventListener('mouseleave', () => this.resizeHandle.style.opacity = '0.5');
        
        this.addListener(this.resizeHandle, 'mousedown', this.onDragStart);
        
        this.miniplayer.appendChild(this.resizeHandle);
    }

    onDragStart(e) {
        if (!this.miniplayer) return;
        e.preventDefault();
        
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        
        const rect = this.miniplayer.getBoundingClientRect();
        this.startWidth = rect.width;
        this.startHeight = rect.height;
        
        document.addEventListener('mousemove', this.onDrag);
        document.addEventListener('mouseup', this.onDragEnd);
        
        // Add a class to prevent pointer events on iframe/video while dragging
        this.miniplayer.style.pointerEvents = 'none';
    }

    onDrag(e) {
        if (!this.isDragging || !this.miniplayer) return;
        
        // Calculate new dimensions (dragging from top-left expands up and left)
        const dx = this.startX - e.clientX;
        const dy = this.startY - e.clientY;
        
        // Maintain 16:9 aspect ratio roughly
        const newWidth = Math.max(300, Math.min(1200, this.startWidth + dx));
        const newHeight = newWidth * (9/16);
        
        this.miniplayer.style.width = `${newWidth}px`;
        this.miniplayer.style.height = `${newHeight}px`;
        
        // We also need to force the internal video container to match
        const container = this.miniplayer.querySelector('#player-container');
        if (container) {
            container.style.width = '100%';
            container.style.height = '100%';
        }
    }

    onDragEnd() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.onDragEnd);
        
        if (this.miniplayer) {
            this.miniplayer.style.pointerEvents = '';
        }
    }
};
