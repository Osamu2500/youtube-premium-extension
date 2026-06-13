window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.AdSkipper = class AdSkipper extends window.YPP.features.BaseFeature {
    constructor() {
        super('AdSkipper');
        this.selectors = [
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button',
            '.ytp-skip-ad-button',
            '.videoAdUiSkipButton'
        ];
        
        // Use a bound method for the observer callback
        this._boundHandleMutations = this._handleMutations.bind(this);
        this._interval = null;
    }

    getConfigKey() {
        // Run if the master switch or any sub-switches are on
        return 'adSkipper';
    }

    async enable() {
        await super.enable();
        
        if (window.YPP.sharedObserver) {
            // Register for any DOM mutations inside the player
            window.YPP.sharedObserver.register('ad-skipper', 'ytd-player, #player-container', (elements) => {
                const player = elements[0];
                if (player) {
                    this._checkForAds(player);
                }
            }, true);
            
            // Catch dynamically added overlays/promos
            this.addListener(document.body, 'DOMNodeInserted', this._boundHandleMutations);
        }

        if (this._interval) clearInterval(this._interval);
        this._interval = setInterval(() => {
            if (document.hidden) return;
            this._checkPromosAndNext();
        }, 500);
        
        // Initial check
        this._checkForAds();
        this._checkPromosAndNext();
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('ad-skipper');
        }
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    _handleMutations(e) {
        if (!this.isEnabled) return;
        if (e.target && e.target.className && typeof e.target.className === 'string') {
            if (e.target.className.includes('ad')) {
                this._checkForAds();
            }
        }
    }

    _checkForAds(container = document) {
        if (this.settings?.autoSkipAds === false && this.settings?.adSkipper === false) return;

        // 1. Click skip buttons
        for (const selector of this.selectors) {
            const btn = container.querySelector(selector);
            if (btn && btn.offsetParent !== null) { // is visible
                btn.click();
                this.utils?.log?.('Skipped Ad via Button Click', 'AD_SKIPPER', 'debug');
                return;
            }
        }

        // 2. Fast forward unskippable ads
        const player = document.querySelector('.html5-video-player');
        if (player && player.classList.contains('ad-showing')) {
            const video = player.querySelector('video');
            if (video && !video.paused) {
                // If it's a long ad without skip button, speed it up
                if (video.playbackRate !== 16) {
                    video.playbackRate = 16;
                    // Optional: mute the ad
                    if (!video.muted) video.muted = true;
                    this.utils?.log?.('Fast-forwarding unskippable ad', 'AD_SKIPPER', 'debug');
                }
            }
        }
    }

    _checkPromosAndNext() {
        if (!this.settings) return;

        // --- Skip Promos / Banners ---
        if (this.settings.autoSkipPromos || this.settings.adSkipper) {
            // Overlay ads in player
            const overlayCloseBtns = document.querySelectorAll('.ytp-ad-overlay-close-button');
            overlayCloseBtns.forEach(btn => btn.click());

            // Generic YT Promos (Premium, Music, etc.)
            const promoDismissBtns = document.querySelectorAll('#dismiss-button.ytd-button-renderer');
            promoDismissBtns.forEach(btn => {
                if (btn.closest('ytd-mealbar-promo-renderer') || btn.closest('ytd-popup-container')) {
                    btn.click();
                    this.utils?.log?.('Dismissed promo', 'AD_SKIPPER', 'debug');
                }
            });
        }

        // --- Skip Sponsor Banners (native) ---
        if (this.settings.autoSkipSponsors) {
            // YouTube occasionally natively labels paid promotions.
            const paidPromo = document.querySelector('.ytp-paid-content-overlay');
            if (paidPromo && paidPromo.style.display !== 'none') {
                paidPromo.style.display = 'none';
            }
        }

        // --- Auto Play Next ---
        if (this.settings.autoPlayNext) {
            const video = document.querySelector('video');
            if (video && video.ended) {
                const nextBtn = document.querySelector('.ytp-next-button');
                const upNextCancel = document.querySelector('.ytp-autonav-cancel-button');
                if (nextBtn && !upNextCancel) {
                    nextBtn.click();
                    this.utils?.log?.('Triggered auto play next', 'AD_SKIPPER', 'debug');
                }
            }
        }
    }
};
