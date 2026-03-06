/**
 * Reverse Playlist Feature
 * Adds a button to reverse the order of videos in the playlist panel.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ReversePlaylist = class ReversePlaylist {
    constructor() {
        this.isActive = false;
        this.observer = null;
        this.isReversed = false;
        
        this.handleNavigation = this.handleNavigation.bind(this);
    }

    enable(settings) {
        if (this.isActive) return;
        this.isActive = true;
        this.settings = settings;

        this.init();
        window.addEventListener('yt-navigate-finish', this.handleNavigation);
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.removeUI();
        window.removeEventListener('yt-navigate-finish', this.handleNavigation);
    }

    run(settings) {
        this.settings = settings;
        if (settings.reversePlaylist) {
            this.enable(settings);
        }
    }

    update(settings) {
        this.settings = settings;
        if (settings.reversePlaylist) {
            this.enable(settings);
        } else {
            this.disable();
        }
    }

    handleNavigation() {
        if (this.isActive) {
            this.isReversed = false; // Reset state on nav
            setTimeout(() => this.init(), 1000);
        }
    }

    init() {
        // Check if we are in a playlist context
        // Try #playlist-actions or #header on ytd-playlist-panel-renderer
        const playlistFunctions = setInterval(() => {
            if (!this.isActive) { clearInterval(playlistFunctions); return; }

            const header = document.querySelector('ytd-playlist-panel-renderer #header-contents #playlist-action-menu .ytd-playlist-panel-renderer') 
                        || document.querySelector('ytd-playlist-panel-renderer #header-contents'); // fallback
            
            if (header) {
                clearInterval(playlistFunctions);
                this.injectButton(header);
            }
        }, 1000);

        // Timeout 10s
        setTimeout(() => clearInterval(playlistFunctions), 10000);
    }

    injectButton(header) {
        if (header.querySelector('#ypp-reverse-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ypp-reverse-btn';
        btn.textContent = 'Reverse';
        // Style to look somewhat native (text button)
        Object.assign(btn.style, {
            background: 'transparent',
            border: 'none',
            color: 'var(--yt-spec-text-secondary)',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '14px',
            marginLeft: '10px',
            padding: '5px'
        });

        btn.onclick = (e) => {
            e.stopPropagation();
            this.toggleReverse(btn);
        };

        header.appendChild(btn);
    }

    toggleReverse(btn) {
        const itemsContainer = document.querySelector('ytd-playlist-panel-renderer #items');
        if (!itemsContainer) return;

        // Get all item elements
        const items = Array.from(itemsContainer.children);
        if (items.length < 2) return;

        // Reverse
        items.reverse();

        // Re-append
        items.forEach(item => itemsContainer.appendChild(item));

        this.isReversed = !this.isReversed;
        btn.textContent = this.isReversed ? 'Original' : 'Reverse';
        btn.style.color = this.isReversed ? 'var(--yt-spec-text-primary)' : 'var(--yt-spec-text-secondary)';
    }

    removeUI() {
        const btn = document.getElementById('ypp-reverse-btn');
        if (btn) btn.remove();
    }
};
