window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * AccountMenu — replaces YouTube's native account dropdown with an
 * orbital-style panel: active account centered, other accounts as
 * clickable satellite disks around it.
 *
 * Architecture:
 *  1. MutationObserver detects when the native menu appears in DOM.
 *  2. A polling loop waits until YouTube has hydrated account data.
 *  3. _doInject() hides native children, appends our panel, wires events.
 *  4. Data extraction is delegated to AccountMenuData.
 *  5. UI generation is delegated to AccountMenuUI.
 */
window.YPP.features.AccountMenu = class AccountMenu extends window.YPP.features.BaseFeature {

    constructor() {
        super('AccountMenu');
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._pollTimer = null;
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._avatarPollTimer = null;
        /** @type {MutationObserver|null} */
        this._observer = null;
        /** @type {boolean} */
        this._injected = false;
        /** @type {Function|null} — stored so we can remove it on disable */
        this._pageChangedHandler = null;
    }

    getConfigKey() { return 'enableAccountMenu'; }

    // ─── Lifecycle ─────────────────────────────────────────────────────────────

    async enable() {
        await super.enable();

        this._observer = new MutationObserver(() => this._onMutation());
        this._observer.observe(document.body, { childList: true, subtree: true });

        this._pageChangedHandler = () => this._cleanup();
        window.YPP.events?.on('page:changed', this._pageChangedHandler);
    }

    async disable() {
        await super.disable();
        this._observer?.disconnect();
        this._observer = null;
        if (this._pageChangedHandler) {
            window.YPP.events?.off('page:changed', this._pageChangedHandler);
            this._pageChangedHandler = null;
        }
        this._cleanup();
    }

    // ─── Mutation handling ─────────────────────────────────────────────────────

    _onMutation() {
        if (this._injected) return;

        const menu = this._findMenu();
        if (menu) this._startPolling(menu);
    }

    _findMenu() {
        const candidates = document.querySelectorAll(
            'ytd-multi-page-menu-renderer[slot="menu"],' +
            'tp-yt-iron-dropdown ytd-multi-page-menu-renderer'
        );
        for (const el of candidates) {
            if (
                el.querySelector('ytd-active-account-header-renderer') ||
                el.querySelector('ytd-account-item-renderer')
            ) {
                return el;
            }
        }
        return null;
    }

    // ─── Polling ──────────────────────────────────────────────────────────────

    _startPolling(menu) {
        if (this._pollTimer) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 80; // 80 × 50ms = 4s max wait
        let clickedSwitch = false;

        const tick = () => {
            attempts++;

            if (!menu.isConnected || attempts > MAX_ATTEMPTS) {
                this._clearPollTimer();
                return;
            }

            if (!clickedSwitch) {
                clickedSwitch = true;
                const switchBtn = Array.from(menu.querySelectorAll('ytd-compact-link-renderer, ytd-menu-navigation-item-renderer, tp-yt-paper-item')).find(el => {
                    const text = el.textContent || '';
                    return /(switch account|cambiar de|切り替える|wechseln|changer de|trocar de|cambia account|zmień konto|byta konto|skift konto|vaihda tili|mudar de|chuyển đổi|ganti akun|сменить аккаунт|змінити обліковий|تبديل الحساب|खाता बदलें)/i.test(text);
                });
                
                const currentAccounts = menu.querySelectorAll('ytd-account-item-renderer, ytd-account-item').length;
                if (switchBtn && currentAccounts === 0) {
                    switchBtn.click();
                    this._waitingForAccounts = true;
                } else {
                    this._waitingForAccounts = false;
                }
            }

            const data = window.YPP.features.AccountMenuData.extractData(menu);
            const hasAnyAccount = data.accounts.some(a => a.name);

            if (!hasAnyAccount) {
                this._pollTimer = setTimeout(tick, 50);
                return;
            }

            const nativeCount = menu.querySelectorAll('ytd-account-item-renderer, ytd-account-item').length;
            const parsedOtherCount = data.accounts.filter(a => !a.isActive).length;

            if (this._waitingForAccounts && nativeCount === 0 && attempts < 40) {
                this._pollTimer = setTimeout(tick, 50);
                return;
            }

            if (nativeCount > 0 && parsedOtherCount === 0 && attempts < 40) {
                this._pollTimer = setTimeout(tick, 50);
                return;
            }

            this._clearPollTimer();
            this._doInject(menu, data);
        };

        this._pollTimer = setTimeout(tick, 30);
    }

    _clearPollTimer() {
        clearTimeout(this._pollTimer);
        this._pollTimer = null;
    }

    _clearAvatarPollTimer() {
        clearTimeout(this._avatarPollTimer);
        this._avatarPollTimer = null;
    }

    // ─── Injection ─────────────────────────────────────────────────────────────

    _doInject(menu, data) {
        if (this._injected) return;
        this._injected = true;

        menu.dataset.yppRedesigned = '1';

        Array.from(menu.children).forEach(child => {
            if (!child.classList.contains('ypp-account-menu')) {
                child.style.display = 'none';
            }
        });

        const panel = document.createElement('div');
        panel.className = 'ypp-account-menu';
        panel.style.cssText = 'opacity:0;transform:translateY(-6px);transition:opacity 0.2s ease,transform 0.2s ease;';
        panel.innerHTML = window.YPP.features.AccountMenuUI.buildMenuHTML(data);
        menu.appendChild(panel);

        this._wireEvents(panel);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
        });

        this._scheduleAvatarRefresh(panel);
    }

    _scheduleAvatarRefresh(panel) {
        const delays = [300, 800, 1600];
        let attempt = 0;

        const upgradeDisk = (container, acc, size, ring) => {
            const letter = container.querySelector('.ypp-letter-avatar');
            if (!letter) return;
            const temp = document.createElement('div');
            temp.innerHTML = window.YPP.features.AccountMenuUI.diskHTML(acc, size, ring);
            const newDisk = temp.firstElementChild;
            letter.replaceWith(newDisk);
            newDisk?.querySelector('.ypp-disk-img')?.addEventListener('error', () => {
                const t = document.createElement('div');
                t.innerHTML = window.YPP.features.AccountMenuUI.letterAvatar(acc.name, size, ring);
                newDisk.replaceWith(t.firstElementChild);
            });
        };

        const refresh = () => {
            if (!panel.isConnected) return;
            const menu = this._findMenu();
            if (!menu) return;
            const freshData = window.YPP.features.AccountMenuData.extractData(menu);

            freshData.accounts.forEach(acc => {
                if (!acc.avatar) return;

                if (acc.isActive) {
                    const centerContainer = panel.querySelector(
                        '.ypp-orbital-wrap > div:not(.ypp-satellite)'
                    );
                    if (centerContainer) upgradeDisk(centerContainer, acc, 64, true);
                } else {
                    const sat = panel.querySelector(
                        `.ypp-satellite[title="${CSS.escape(acc.name)}"]`
                    );
                    if (sat) upgradeDisk(sat, acc, 40, false);
                }
            });

            attempt++;
            if (attempt < delays.length) {
                const nextDelay = delays[attempt] - delays[attempt - 1];
                this._avatarPollTimer = setTimeout(refresh, nextDelay);
            }
        };

        this._avatarPollTimer = setTimeout(refresh, delays[0]);
    }

    // ─── Event wiring ──────────────────────────────────────────────────────────

    _wireEvents(panel) {
        panel.querySelector('#ypp-view-channel')
            ?.addEventListener('click', () => this._closeMenu());

        panel.querySelector('#ypp-appearance')
            ?.addEventListener('click', () => {
                this._closeMenu();
                setTimeout(() => {
                    document.querySelector(
                        'ytd-toggle-theme-compact-link-renderer button,' +
                        '[aria-label*="Appearance"]'
                    )?.click();
                }, 100);
            });

        panel.querySelector('#ypp-settings')
            ?.addEventListener('click', () => {
                this._closeMenu();
                window.location.href = '/account';
            });

        const moreToggle = panel.querySelector('#ypp-more-toggle');
        const moreItems  = panel.querySelector('#ypp-more-items');
        const chevron    = panel.querySelector('.ypp-chevron');
        if (moreToggle && moreItems) {
            moreToggle.addEventListener('click', () => {
                const open = moreItems.classList.toggle('open');
                moreToggle.setAttribute('aria-expanded', String(open));
                if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
            });
        }

        const confirmDialog = panel.querySelector('#ypp-signout-confirm');
        panel.querySelector('#ypp-signout')
            ?.addEventListener('click', () => {
                if (confirmDialog) confirmDialog.style.display = 'flex';
            });
        panel.querySelector('#ypp-confirm-cancel')
            ?.addEventListener('click', () => {
                if (confirmDialog) confirmDialog.style.display = 'none';
            });
        panel.querySelector('#ypp-confirm-ok')
            ?.addEventListener('click', () => {
                const nativeSignOut =
                    document.querySelector('a[href*="logout"]') ||
                    document.querySelector('a[href*="signout"]');
                if (nativeSignOut) {
                    nativeSignOut.click();
                } else {
                    window.location.href = 'https://www.youtube.com/logout';
                }
            });

        panel.querySelectorAll('.ypp-disk-img').forEach(img => {
            img.addEventListener('error', () => {
                const wrap = img.closest('.ypp-disk-wrap');
                if (!wrap) return;
                const name = wrap.dataset.fallbackName || '';
                const size = parseInt(wrap.dataset.size, 10) || 40;
                const ring = wrap.dataset.ring === '1';
                const temp = document.createElement('div');
                temp.innerHTML = window.YPP.features.AccountMenuUI.letterAvatar(name, size, ring);
                wrap.replaceWith(temp.firstElementChild);
            });
        });

        panel.querySelectorAll('.ypp-satellite').forEach(sat => {
            const activate = () => {
                const idx = parseInt(sat.dataset.accountIndex, 10);
                if (!isNaN(idx)) {
                    document.querySelectorAll('ytd-account-item-renderer')[idx]?.click();
                }
            };
            sat.addEventListener('click', activate);
            sat.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
        });
    }

    _closeMenu() {
        const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
        if (backdrop) { backdrop.click(); return; }
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }

    // ─── Cleanup ───────────────────────────────────────────────────────────────

    _cleanup() {
        this._clearPollTimer();
        this._clearAvatarPollTimer();
        this._injected = false;

        document.querySelectorAll('[data-ypp-redesigned]').forEach(el => {
            Array.from(el.children).forEach(child => {
                if (!child.classList.contains('ypp-account-menu')) {
                    child.style.display = '';
                }
            });
            delete el.dataset.yppRedesigned;
            el.querySelector('.ypp-account-menu')?.remove();
        });
    }
};
