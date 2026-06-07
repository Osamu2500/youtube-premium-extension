/**
 * Auto-Floating Mini Player
 * Automatically transforms the player into a floating mini-player when scrolling past it.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.FloatingPlayer = class FloatingPlayer extends window.YPP.features.BaseFeature {
    constructor() {
        super('FloatingPlayer');
        this.observer = null;
        this.isActive = false;
        
        // Use an IntersectionObserver to detect when the player container leaves the viewport
        this.checkVisibility = this.checkVisibility.bind(this);
    }

    getConfigKey() {
        return 'floatingPlayer';
    }

    async enable() {
        await super.enable();
        
        try {
            // Only runs on watch pages
            this.addListener(window, 'yt-navigate-finish', () => this.initObserver());
            this.initObserver();
        } catch (e) {
            this.utils?.log('Error enabling Floating Player', 'FLOATING_PLAYER', 'error', e);
        }
    }

    async disable() {
        await super.disable();
        this.cleanup();
    }

    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.deactivateFloatingPlayer();
    }

    initObserver() {
        this.cleanup(); // Clear previous observer if it exists
        
        if (!this.isEnabled) return;
        
        // Check if we are on the watch page
        if (!window.location.pathname.startsWith('/watch')) return;

        // Poll for the player container
        this.utils.pollFor(() => document.querySelector('#player-container-outer, #player-container'), 10000, 500)
            .then(playerContainer => {
                if (!playerContainer || !this.isEnabled) return;
                
                // Set up IntersectionObserver
                this.observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => this.checkVisibility(entry));
                }, {
                    root: null, // viewport
                    threshold: 0.1 // Triggers when less than 10% of the player is visible
                });
                
                this.observer.observe(playerContainer);
            }).catch(() => {
                this.utils?.log('Player container not found for Floating Player', 'FLOATING_PLAYER', 'warn');
            });
    }

    checkVisibility(entry) {
        if (!this.isEnabled) return;
        
        // Wait until scroll reveals that the user scrolled *down*
        // entry.boundingClientRect.bottom < 0 means it scrolled up and out of view.
        if (entry.intersectionRatio < 0.1 && entry.boundingClientRect.bottom < window.innerHeight / 2) {
            this.activateFloatingPlayer();
        } else {
            this.deactivateFloatingPlayer();
        }
    }

    activateFloatingPlayer() {
        if (this.isActive) return;
        this.isActive = true;

        requestAnimationFrame(() => {
            document.body.classList.add('ypp-floating-player-active');
            this._injectCloseButton();
            this._enableDrag();
            this.utils?.log('Floating Player Activated', 'FLOATING_PLAYER', 'debug');
        });
    }

    deactivateFloatingPlayer() {
        if (!this.isActive) return;
        this.isActive = false;

        requestAnimationFrame(() => {
            document.body.classList.remove('ypp-floating-player-active');
            document.querySelector('.ypp-float-close-btn')?.remove();
            // Reset any drag-repositioned inline styles
            const player = document.querySelector('#ytd-player, ytd-player[id="ytd-player"]');
            if (player) {
                player.style.removeProperty('bottom');
                player.style.removeProperty('right');
                player.style.removeProperty('top');
                player.style.removeProperty('left');
            }
            this.utils?.log('Floating Player Deactivated', 'FLOATING_PLAYER', 'debug');
        });
    }

    /** Inject a close/dismiss button into the floating player */
    _injectCloseButton() {
        if (document.querySelector('.ypp-float-close-btn')) return;
        const player = document.querySelector('#ytd-player, ytd-player[id="ytd-player"]');
        if (!player) return;

        const btn = document.createElement('button');
        btn.className = 'ypp-float-close-btn';
        btn.title = 'Dismiss floating player';
        btn.innerHTML = '✕';
        // Use addListener so it's cleaned up on disable()
        this.addListener(btn, 'click', (e) => {
            e.stopPropagation();
            this.deactivateFloatingPlayer();
        });
        player.appendChild(btn);
    }

    /** Allow the floating player to be dragged to any corner of the viewport */
    _enableDrag() {
        const player = document.querySelector('#ytd-player, ytd-player[id="ytd-player"]');
        if (!player || player._yppDragEnabled) return;
        player._yppDragEnabled = true;

        let startX, startY, startRight, startBottom;

        const onMouseDown = (e) => {
            // Don't drag when clicking close button or video controls
            if (e.target.closest('.ypp-float-close-btn, .ytp-chrome-bottom')) return;
            e.preventDefault();
            const rect = player.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startRight  = window.innerWidth  - rect.right;
            startBottom = window.innerHeight - rect.bottom;

            const onMouseMove = (ev) => {
                const dx = startX - ev.clientX;
                const dy = startY - ev.clientY;
                const newRight  = Math.max(8, Math.min(window.innerWidth  - 100, startRight  + dx));
                const newBottom = Math.max(8, Math.min(window.innerHeight - 60,  startBottom + dy));
                player.style.setProperty('right',  `${newRight}px`,  'important');
                player.style.setProperty('bottom', `${newBottom}px`, 'important');
                player.style.removeProperty('top');
                player.style.removeProperty('left');
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        this.addListener(player, 'mousedown', onMouseDown);
    }
};
