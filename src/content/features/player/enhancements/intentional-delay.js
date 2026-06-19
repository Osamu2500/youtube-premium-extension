window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.IntentionalDelay = class IntentionalDelay extends window.YPP.features.BaseFeature {
    constructor() {
        super('IntentionalDelay');
        this._boundCheck = this._onPageChange.bind(this);
        this._overlay = null;
        this._activeVideoId = null;
        this._countdownInterval = null;
    }
    getConfigKey() { return 'intentionalDelay'; }
    async enable() {
        await super.enable();
        this._onPageChange();
        window.YPP.events?.on('page:changed', this._boundCheck);
    }
    async disable() {
        await super.disable();
        this._removeOverlay();
        window.YPP.events?.off('page:changed', this._boundCheck);
    }
    _onPageChange() {
        if (!this.settings?.intentionalDelay) return;
        if (!location.pathname.startsWith('/watch')) return;
        
        // Skip delay if the video was opened in a background tab
        if (document.hidden) return;
        
        const videoId = new URL(location.href).searchParams.get('v');
        if (!videoId || this._activeVideoId === videoId) return;
        
        this._activeVideoId = videoId;
        this._showOverlay();
    }
    _showOverlay() {
        this._removeOverlay();
        
        // Safely pause using YouTube's native API via inline script injection
        // Calling .pause() directly on the <video> element during SPA navigation crashes the player (Playback ID error)
        const pauseScript = document.createElement('script');
        pauseScript.textContent = `
            try {
                const player = document.getElementById('movie_player');
                if (player && player.pauseVideo) player.pauseVideo();
            } catch(e) {}
        `;
        document.body.appendChild(pauseScript);
        pauseScript.remove();

        const duration = this.settings?.intentionalDelayTime ?? 3;

        this._overlay = document.createElement('div');
        this._overlay.className = 'ypp-intentional-delay-overlay';
        this._overlay.innerHTML = `
            <div class="ypp-id-content">
                <h2>Take a breath.</h2>
                <p>Is this video intentional, or are you just scrolling?</p>
                <div class="ypp-id-timer">${duration}</div>
                <button class="ypp-id-skip" style="display:none;">Proceed to Video</button>
            </div>
        `;
        document.body.appendChild(this._overlay);

        let count = duration;
        const timerEl = this._overlay.querySelector('.ypp-id-timer');
        const btn = this._overlay.querySelector('.ypp-id-skip');
        
        this._countdownInterval = setInterval(() => {
            if (document.hidden) return;
            count--;
            if (count <= 0) {
                clearInterval(this._countdownInterval);
                this._countdownInterval = null;
                timerEl.style.display = 'none';
                btn.style.display = 'block';
            } else {
                timerEl.textContent = count;
            }
        }, 1000);

        this.addListener(btn, 'click', () => {
            this._removeOverlay();
            // Safely play using YouTube's native API
            const playScript = document.createElement('script');
            playScript.textContent = `
                try {
                    const player = document.getElementById('movie_player');
                    if (player && player.playVideo) player.playVideo();
                } catch(e) {}
            `;
            document.body.appendChild(playScript);
            playScript.remove();
        });
    }
    _removeOverlay() {
        if (this._countdownInterval) {
            clearInterval(this._countdownInterval);
            this._countdownInterval = null;
        }
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
