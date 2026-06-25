/**
 * Reverse Playlist Feature
 * Adds an elegant SVG button to reverse the order of videos in the playlist panel.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.ReversePlaylist = class ReversePlaylist extends window.YPP.features.BaseFeature {
    constructor() {
        super('ReversePlaylist');
        this.isReversed = false;
        this.btn = null;
    }

    getConfigKey() { return 'reversePlaylist'; }

    async enable() {
        await super.enable();
        
        try {
            // Reset state on navigation
            this.addListener(window, 'yt-navigate-finish', () => {
                this.isReversed = false;
                if (this.isEnabled) {
                    this.initUI();
                }
            });
            
            this.initUI();
        } catch (e) {
            this.utils?.log('Error enabling ReversePlaylist', 'PLAYLIST', 'error', e);
        }
    }

    async disable() {
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('reverse-playlist-header');
        }
        this.removeUI();
        this.isReversed = false;
        await super.disable();
    }

    initUI() {
        if (window.YPP && window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('reverse-playlist-header', 'ytd-playlist-panel-renderer #header-contents', (elements) => {
                if (!this.isEnabled) return;
                const header = elements[0];
                if (header) {
                    this.injectButton(header);
                }
            }, false);
        }
    }

    injectButton(header) {
        if (document.getElementById('ypp-reverse-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ypp-reverse-btn';
        btn.title = 'Reverse Playlist Order';
        
        // Beautiful SVG icon matching YouTube's material design
        btn.innerHTML = `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 24px; height: 24px; fill: currentColor;"><g><path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"></path></g></svg>`;
        
        Object.assign(btn.style, {
            background: 'transparent',
            border: 'none',
            color: 'var(--yt-spec-text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            marginLeft: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
        });
        
        btn.onmouseover = () => btn.style.backgroundColor = 'var(--yt-spec-badge-chip-background)';
        btn.onmouseleave = () => btn.style.backgroundColor = 'transparent';

        this.addListener(btn, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleReverse(btn);
        });

        header.appendChild(btn);
        this.btn = btn;
    }

    toggleReverse(btn) {
        const itemsContainer = document.querySelector('ytd-playlist-panel-renderer #items');
        if (!itemsContainer) return;

        const items = Array.from(itemsContainer.children);
        if (items.length < 2) return;

        // Reverse
        items.reverse();

        // Re-append
        items.forEach(item => itemsContainer.appendChild(item));

        this.isReversed = !this.isReversed;
        btn.style.color = this.isReversed ? 'var(--yt-spec-text-primary)' : 'var(--yt-spec-text-secondary)';
        
        if (this.utils.createToast) {
            this.utils.createToast(this.isReversed ? 'Playlist reversed' : 'Playlist restored', 'info', 2000);
        }
    }

    removeUI() {
        if (this.btn) {
            this.btn.remove();
            this.btn = null;
        }
        
        const oldBtn = document.getElementById('ypp-reverse-btn');
        if (oldBtn) oldBtn.remove();
    }
};
