window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.IntentionalDelay = class IntentionalDelay extends window.YPP.features.BaseFeature {
    constructor() {
        super('IntentionalDelay');
        this._boundCheck = this._onPageChange.bind(this);
        this._overlay = null;
        this._activeVideoId = null;
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
        
        const videoId = new URL(location.href).searchParams.get('v');
        if (!videoId || this._activeVideoId === videoId) return;
        
        this._activeVideoId = videoId;
        this._showOverlay();
    }
    _showOverlay() {
        this._removeOverlay();
        
        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoElement.pause();
        }

        this._overlay = document.createElement('div');
        this._overlay.className = 'ypp-intentional-delay-overlay';
        this._overlay.innerHTML = `
            <div class="ypp-id-content">
                <h2>Take a breath.</h2>
                <p>Is this video intentional, or are you just scrolling?</p>
                <div class="ypp-id-timer">3</div>
                <button class="ypp-id-skip" style="display:none;">Proceed to Video</button>
            </div>
        `;
        document.body.appendChild(this._overlay);

        let count = 3;
        const timerEl = this._overlay.querySelector('.ypp-id-timer');
        const btn = this._overlay.querySelector('.ypp-id-skip');
        
        const interval = setInterval(() => {
            count--;
            if (count <= 0) {
                clearInterval(interval);
                timerEl.style.display = 'none';
                btn.style.display = 'block';
            } else {
                timerEl.textContent = count;
            }
        }, 1000);

        btn.addEventListener('click', () => {
            this._removeOverlay();
            const v = document.querySelector('video');
            if (v) v.play();
        });
    }
    _removeOverlay() {
        if (this._overlay) {
            this._overlay.remove();
            this._overlay = null;
        }
    }
};
