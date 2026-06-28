window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * AccountMenu — replaces YouTube's native account dropdown with an
 * orbital-style panel: active account centered, other accounts as
 * clickable satellite disks around it.
 *
 * Architecture:
 *  1. MutationObserver detects when the native menu appears in DOM.
 *  2. We IMMEDIATELY hide the native menu children to prevent flash.
 *  3. A polling loop waits until YouTube has hydrated account data.
 *  4. _doInject() appends our panel and wires events.
 *  5. Data extraction is delegated to AccountMenuData.
 *  6. UI generation is delegated to AccountMenuUI.
 */
window.YPP.features.AccountMenu = class AccountMenu extends window.YPP.features.BaseFeature {

    constructor() {
        super('AccountMenu');
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._pollTimer = null;
        /** @type {ReturnType<typeof setTimeout>|null} */
        this._avatarPollTimer = null;
        /** @type {MutationObserver|null} — left for backward compat, now unused */
        this._dropdownObserver = null;
        /** @type {boolean} */
        this._injected = false;
        /** @type {Element|null} — the currently observed menu */
        this._currentMenu = null;
    }

    getConfigKey() { return 'enableAccountMenu'; }

    // ─── Lifecycle ─────────────────────────────────────────────────────────────

    async enable() {
        await super.enable();
        try {
            // Track which topbar button was clicked to definitively separate Account from Notifications!
            this.addListener(document, 'click', e => {
                const btn = e.target.closest('#avatar-btn, yt-notification-topbar-button-renderer, ytd-topbar-menu-button-renderer');
                if (btn) {
                    window.YPP.lastMenuClick = btn.id || btn.tagName;
                }
            }, { capture: true });

            // Use sharedObserver (architecture rule: never new MutationObserver)
            if (window.YPP?.sharedObserver) {
                window.YPP.sharedObserver.register(
                    'account-menu-dropdown',
                    'tp-yt-iron-dropdown, ytd-multi-page-menu-renderer',
                    () => { if (!this._injected) this._onMutation(); }
                );
            }

            // Use onBusEvent() so the subscription is auto-cleaned on disable()
            this.onBusEvent('page:changed', () => this._cleanup());
        } catch (e) {
            this.utils?.log('Error enabling AccountMenu', 'ACCOUNT', 'error', e);
        }
    }

    async disable() {
        await super.disable(); // cleanupEvents() called here — removes all busListeners
        if (window.YPP?.sharedObserver) {
            window.YPP.sharedObserver.unregister('account-menu-dropdown');
        }
        this._cleanup();
    }

    // ─── Mutation handling ─────────────────────────────────────────────────────

    _onMutation() {
        if (this._injected) return;
        if (this._pollTimer) return; // already polling

        const menu = this._findMenu();
        if (!menu) return;

        // Immediately cloak so the user never sees the native menu flash
        this._cloakNativeChildren(menu);
        this._startPolling(menu);
    }

    /**
     * Find the account menu element. We look for the multi-page menu that
     * contains the active account header, which is the most reliable signal.
     * We intentionally do NOT require ytd-account-item-renderer here because
     * single-account users don't have those.
     *
     * @returns {Element|null}
     */
    _findMenu() {
        // Strategy 1: slot="menu" inside a visible iron-dropdown
        const dropdowns = document.querySelectorAll('tp-yt-iron-dropdown');
        for (const dd of dropdowns) {
            // Skip dropdowns that are explicitly hidden
            if (dd.hasAttribute('aria-hidden') && dd.getAttribute('aria-hidden') === 'true') continue;
            const menu = dd.querySelector('ytd-multi-page-menu-renderer');
            if (menu && this._isAccountMenu(menu)) return menu;
        }

        // Strategy 2: slot attribute on the renderer
        const slotted = document.querySelector('ytd-multi-page-menu-renderer[slot="menu"]');
        if (slotted && this._isAccountMenu(slotted)) return slotted;

        // Strategy 3: any visible multi-page-menu with account header
        const allMenus = document.querySelectorAll('ytd-multi-page-menu-renderer');
        for (const m of allMenus) {
            if (this._isAccountMenu(m)) return m;
        }

        return null;
    }

    _isAccountMenu(menu) {
        // If the user definitively clicked the Notification button, abort.
        if (window.YPP.lastMenuClick && window.YPP.lastMenuClick.includes('NOTIFICATION')) {
            return false;
        }
        
        // If the user definitively clicked the Avatar button, accept it!
        if (window.YPP.lastMenuClick && window.YPP.lastMenuClick.includes('avatar-btn')) {
            return true;
        }

        // Fallback check (for keyboard navigation or untracked clicks)
        return !!(
            menu.querySelector('ytd-active-account-header-renderer') ||
            menu.querySelector('ytd-account-item-renderer') ||
            menu.querySelector('ytd-account-item') ||
            menu.querySelector('a[href*="studio.youtube.com"]') ||
            menu.querySelector('a[href*="logout"]') ||
            menu.querySelector('a[href*="myaccount.google.com"]')
        );
    }

    // ─── Cloaking — done BEFORE inject to prevent flash ───────────────────────

    /**
     * Immediately hides native children with a thin 1px slice (not display:none,
     * so YouTube's IntersectionObserver still fires and loads lazy images).
     *
     * @param {Element} menu
     */
    _cloakNativeChildren(menu) {
        if (menu.dataset.yppCloaked) return;
        menu.dataset.yppCloaked = '1';

        Array.from(menu.children).forEach(child => {
            if (!child.classList.contains('ypp-account-menu')) {
                // Use fixed positioning at top-left to ABSOLUTELY GUARANTEE IntersectionObserver fires!
                child.style.setProperty('position', 'fixed', 'important');
                child.style.setProperty('top', '0', 'important');
                child.style.setProperty('left', '0', 'important');
                child.style.setProperty('width', '10px', 'important');
                child.style.setProperty('height', '10px', 'important');
                child.style.setProperty('opacity', '0.001', 'important');
                child.style.setProperty('pointer-events', 'none', 'important');
                child.style.setProperty('z-index', '-1', 'important');
                
                // Force all account items to the top so they intersect the viewport and trigger lazy-loaded avatars!
                child.querySelectorAll('ytd-account-item-renderer, ytd-account-item, yt-img-shadow').forEach(item => {
                    item.style.setProperty('position', 'absolute', 'important');
                    item.style.setProperty('top', '0', 'important');
                    item.style.setProperty('left', '0', 'important');
                    item.style.setProperty('width', '10px', 'important');
                    item.style.setProperty('height', '10px', 'important');
                });
            }
        });
    }

    // ─── Polling ──────────────────────────────────────────────────────────────

    /**
     * Polls until we have enough account data to render, then injects.
     * Uses this.pollFor() (architecture rule: no raw setTimeout polling).
     *
     * @param {Element} menu
     */
    _startPolling(menu) {
        if (this._pollTimer) return;
        // Mark as polling so _onMutation() short-circuits
        this._pollTimer = true;

        this.pollFor(
            () => {
                if (!menu.isConnected) return true; // abort
                this._cloakNativeChildren(menu);
                const data = window.YPP.features.AccountMenuData.extractData(menu);
                
                // If we don't have switchable accounts loaded yet (i.e. only 1 or 0 accounts), 
                // we are probably on the Main Profile Menu page. Let's auto-click "Switch account"!
                if (data.accounts.length <= 1) {
                    const switchBtn = Array.from(menu.querySelectorAll('ytd-compact-link-renderer, ytd-menu-navigation-item-renderer'))
                        .find(el => {
                            const text = (el.textContent || '').toLowerCase();
                            const icon = el.querySelector('yt-icon')?.getAttribute('icon') || '';
                            return text.includes('switch') || text.includes('cambiar') || icon.includes('switch_account') || icon.includes('switch-account');
                        });
                        
                    if (switchBtn) {
                        // Click the inner anchor or paper item for reliable navigation
                        const target = switchBtn.querySelector('a#endpoint, tp-yt-paper-item') || switchBtn;
                        target.click();
                        return false; // keep polling, wait for the DOM mutation to load the accounts!
                    }
                }

                const hasActiveAccount = data.accounts.some(a => a.isActive && a.name);
                if (hasActiveAccount) {
                    this._pollTimer = null;
                    this._doInject(menu, data);
                    return true; // done
                }
                return false; // keep polling
            },
            4000, // 4s timeout
            40    // 40ms interval
        ).catch(() => {
            this._pollTimer = null; // timed out, reset
        });
    }

    _clearPollTimer() {
        if (this._pollTimer === true) {
            this._pollTimer = null;
        }
    }

    _clearAvatarPollTimer() {
        clearTimeout(this._avatarPollTimer);
        this._avatarPollTimer = null;
    }

    // ─── Injection ─────────────────────────────────────────────────────────────

    _doInject(menu, data) {
        if (this._injected) return;
        this._injected = true;
        this._currentMenu = menu;

        menu.dataset.yppRedesigned = '1';

        // Remove any leftover panel from a previous session
        menu.querySelector('.ypp-account-menu')?.remove();

        const panel = document.createElement('div');
        panel.className = 'ypp-account-menu';
        panel.style.cssText = 'opacity:0;transform:translateY(-8px);transition:opacity 0.25s ease,transform 0.25s cubic-bezier(0.34,1.56,0.64,1);';
        panel.innerHTML = window.YPP.features.AccountMenuUI.buildMenuHTML(data);
        menu.appendChild(panel);

        this._wireEvents(panel);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
        });

        // Schedule progressive avatar upgrades
        this._scheduleAvatarRefresh(panel, menu);
    }

    // ─── Avatar refresh ────────────────────────────────────────────────────────

    /**
     * Progressively upgrades letter-avatars to real photos once YouTube's
     * IntersectionObserver has loaded the actual img.src values.
     *
     * @param {Element} panel  — our injected panel
     * @param {Element} menu   — the native menu element
     */
    _scheduleAvatarRefresh(panel, menu) {
        const DELAYS = [250, 700, 1400, 2500];
        let attempt = 0;

        const upgradeDisk = (container, acc, size, ring) => {
            if (!container) return;
            // Only replace letter avatars — if an img is already there, skip
            const existing = container.querySelector('.ypp-disk-wrap .ypp-disk-img');
            if (existing && existing.getAttribute('src') === acc.avatar) return;

            const letterEl = container.querySelector('.ypp-letter-avatar');
            if (!letterEl) return;

            const temp = document.createElement('div');
            temp.innerHTML = window.YPP.features.AccountMenuUI.diskHTML(acc, size, ring);
            const newDisk = temp.firstElementChild;
            if (!newDisk) return;
            letterEl.replaceWith(newDisk);

            const imgNode = newDisk.querySelector('.ypp-disk-img');
            if (imgNode) {
                this.addListener(imgNode, 'error', () => {
                    const t = document.createElement('div');
                    t.innerHTML = window.YPP.features.AccountMenuUI.letterAvatar(acc.name, size, ring);
                    newDisk.replaceWith(t.firstElementChild);
                });
            }
        };

        const refresh = () => {
            if (!panel.isConnected) return;

            // Re-extract fresh data from the native menu
            const freshData = window.YPP.features.AccountMenuData.extractData(menu);

            freshData.accounts.forEach(acc => {
                if (!acc.avatar) return;

                if (acc.isActive) {
                    // The center disk is inside the second direct child of .ypp-orbital-wrap
                    // which is structured as: .ypp-orbital-wrap > satellites... > centerDiv
                    // The center div is the one with position:absolute that isn't a .ypp-satellite
                    const orbitalWrap = panel.querySelector('.ypp-orbital-wrap');
                    if (orbitalWrap) {
                        const centerDiv = orbitalWrap.querySelector('div:not(.ypp-satellite)');
                        if (centerDiv) upgradeDisk(centerDiv, acc, 68, true);
                    }
                } else {
                    // Find the satellite matching by title attribute
                    const satTitle = acc.name;
                    const sat = panel.querySelector(`.ypp-satellite[title="${CSS.escape(satTitle)}"]`);
                    if (sat) upgradeDisk(sat, acc, 40, false);
                }
            });

            attempt++;
            if (attempt < DELAYS.length) {
                const delay = attempt === 0
                    ? DELAYS[0]
                    : DELAYS[attempt] - DELAYS[attempt - 1];
                this._avatarPollTimer = setTimeout(refresh, delay);
            }
        };

        // Use tracked timer stored in _avatarPollTimer for cleanup
        this._avatarPollTimer = window.setTimeout(refresh, DELAYS[0]);
    }

    // ─── Event wiring ──────────────────────────────────────────────────────────

    _wireEvents(panel) {
        const viewChannel = panel.querySelector('#ypp-view-channel');
        if (viewChannel) this.addListener(viewChannel, 'click', () => this._closeMenu());

        const appearance = panel.querySelector('#ypp-appearance');
        if (appearance) this.addListener(appearance, 'click', () => {
            this._closeMenu();
            setTimeout(() => {
                document.querySelector(
                    'ytd-toggle-theme-compact-link-renderer button,' +
                    '[aria-label*="Appearance"]'
                )?.click();
            }, 150);
        });

        const settingsBtn = panel.querySelector('#ypp-settings');
        if (settingsBtn) this.addListener(settingsBtn, 'click', () => {
            this._closeMenu();
            window.location.href = '/account';
        });

        // Helper to click native sub-menu items by matching text or aria-labels
        const clickNativeItem = (keywords) => {
            this._closeMenu();
            setTimeout(() => {
                const items = Array.from(document.querySelectorAll(
                    'ytd-compact-link-renderer, ytd-menu-navigation-item-renderer, ytd-toggle-theme-compact-link-renderer'
                ));
                const target = items.find(el => {
                    const text = (el.textContent || '').toLowerCase();
                    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
                    return keywords.some(k => text.includes(k) || aria.includes(k));
                });
                if (target) target.click();
            }, 150);
        };

        const langBtn = panel.querySelector('#ypp-language');
        if (langBtn) this.addListener(langBtn, 'click', () => clickNativeItem(['language', 'idioma', 'langue', 'sprache', 'język']));
        const locBtn = panel.querySelector('#ypp-location');
        if (locBtn) this.addListener(locBtn, 'click', () => clickNativeItem(['location', 'ubicación', 'lieu', 'standort', 'lokalizacja']));
        const restBtn = panel.querySelector('#ypp-restricted');
        if (restBtn) this.addListener(restBtn, 'click', () => clickNativeItem(['restricted', 'restringido', 'restreint', 'eingeschränkt']));

        const keyboardBtn = panel.querySelector('#ypp-keyboard');
        if (keyboardBtn) this.addListener(keyboardBtn, 'click', () => {
            this._closeMenu();
            setTimeout(() => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true }));
            }, 150);
        });

        const helpBtn = panel.querySelector('#ypp-help');
        if (helpBtn) this.addListener(helpBtn, 'click', () => {
            this._closeMenu();
            window.open('https://support.google.com/youtube/', '_blank');
        });

        const feedbackBtn = panel.querySelector('#ypp-feedback');
        if (feedbackBtn) this.addListener(feedbackBtn, 'click', () => clickNativeItem(['feedback', 'comentarios', 'commentaires']));

        const moreToggle = panel.querySelector('#ypp-more-toggle');
        const moreItems  = panel.querySelector('#ypp-more-items');
        const chevron    = panel.querySelector('.ypp-chevron');
        if (moreToggle && moreItems) {
            this.addListener(moreToggle, 'click', () => {
                const open = moreItems.classList.toggle('open');
                moreToggle.setAttribute('aria-expanded', String(open));
                if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
            });
        }

        const confirmDialog = panel.querySelector('#ypp-signout-confirm');
        const signoutBtn = panel.querySelector('#ypp-signout');
        if (signoutBtn) this.addListener(signoutBtn, 'click', () => {
            if (confirmDialog) confirmDialog.style.display = 'flex';
        });
        
        const confirmCancel = panel.querySelector('#ypp-confirm-cancel');
        if (confirmCancel) this.addListener(confirmCancel, 'click', () => {
            if (confirmDialog) confirmDialog.style.display = 'none';
        });
        
        const confirmOk = panel.querySelector('#ypp-confirm-ok');
        if (confirmOk) this.addListener(confirmOk, 'click', () => {
            const nativeSignOut =
                document.querySelector('a[href*="logout"]') ||
                document.querySelector('a[href*="signout"]');
            if (nativeSignOut) {
                nativeSignOut.click();
            } else {
                window.location.href = 'https://www.youtube.com/logout';
            }
        });

        // Image error fallback
        panel.querySelectorAll('.ypp-disk-img').forEach(img => {
            this.addListener(img, 'error', () => {
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

        // Satellite click → switch account
        panel.querySelectorAll('.ypp-satellite').forEach(sat => {
            const activate = () => {
                const idx = parseInt(sat.dataset.accountIndex, 10);
                if (!isNaN(idx)) {
                    // The native account items are still in the DOM (just hidden)
                    const items = document.querySelectorAll('ytd-account-item-renderer, ytd-account-item');
                    if (items[idx]) items[idx].click();
                }
            };
            this.addListener(sat, 'click', activate);
            this.addListener(sat, 'keydown', e => {
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
        if (typeof this.cleanupEvents === 'function') this.cleanupEvents();
        this._clearPollTimer();
        this._clearAvatarPollTimer();
        this._injected = false;
        this._currentMenu = null;

        document.querySelectorAll('[data-ypp-redesigned]').forEach(el => {
            // Remove cloaking from all children
            Array.from(el.children).forEach(child => {
                if (!child.classList.contains('ypp-account-menu')) {
                    child.style.removeProperty('position');
                    child.style.removeProperty('opacity');
                    child.style.removeProperty('pointer-events');
                    child.style.removeProperty('z-index');
                }
            });
            // Clean up any nested account items too
            el.querySelectorAll('ytd-account-item-renderer, ytd-account-item, yt-img-shadow').forEach(item => {
                item.style.removeProperty('position');
                item.style.removeProperty('opacity');
                item.style.removeProperty('pointer-events');
                item.style.removeProperty('z-index');
                item.style.removeProperty('top');
                item.style.removeProperty('left');
                item.style.removeProperty('width');
                item.style.removeProperty('height');
            });
            delete el.dataset.yppRedesigned;
            delete el.dataset.yppCloaked;
            el.querySelector('.ypp-account-menu')?.remove();
        });

        // Also clean up any menus that were cloaked but not yet redesigned
        document.querySelectorAll('[data-ypp-cloaked]').forEach(el => {
            Array.from(el.children).forEach(child => {
                child.style.removeProperty('position');
                child.style.removeProperty('opacity');
                child.style.removeProperty('pointer-events');
                child.style.removeProperty('z-index');
            });
            delete el.dataset.yppCloaked;
        });
    }
};
