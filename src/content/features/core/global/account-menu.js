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
 *  4. _extractData() reads account data from DOM attributes and text content.
 *     Avatar URLs are extracted via yt-img-shadow[src] getAttribute() first
 *     (isolated-world safe), falling back to <img>.src and finally the
 *     Polymer .data property as a last-resort (silently caught if blocked).
 *  5. _cleanup() tears down timers and removes injected HTML on nav/disable.
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

        // Store the handler reference so we can remove it cleanly in disable().
        // Bug fix: previously a new anonymous handler was added on every enable()
        // call without ever being removed, causing exponential listener buildup.
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
        // Skip expensive work when we have already injected our panel.
        // Previously this ran _tryFillAvatars on every DOM mutation (thousands
        // per page load), using selectors that no longer exist in the orbital
        // layout — pure wasted work.
        if (this._injected) return;

        const menu = this._findMenu();
        if (menu) this._startPolling(menu);
    }

    _findMenu() {
        // Scope to menus that actually contain account content.
        // Without this guard, the Settings menu (also ytd-multi-page-menu-renderer)
        // triggers polling unnecessarily.
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

    // ─── Polling: wait for account data to hydrate, then inject ───────────────

    /**
     * Polls the native menu at 50ms intervals until YouTube has populated
     * enough account data for a useful render, then calls _doInject().
     *
     * YouTube renders account item elements before their text content and
     * avatar URLs are available, so we must wait rather than inject immediately.
     *
     * @param {Element} menu
     */
    _startPolling(menu) {
        if (this._pollTimer) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 80; // 80 × 50ms = 4s max wait

        const tick = () => {
            attempts++;

            // Abort if the menu was closed or we've waited too long.
            if (!menu.isConnected || attempts > MAX_ATTEMPTS) {
                this._clearPollTimer();
                return;
            }

            const data = this._extractData(menu);
            const hasAnyAccount = data.accounts.some(a => a.name);

            // Keep waiting if we have no name yet at all.
            if (!hasAnyAccount) {
                this._pollTimer = setTimeout(tick, 50);
                return;
            }

            // If YouTube reports multiple native account items but we haven't
            // parsed the non-active ones yet, wait a little longer (max 600ms).
            const nativeCount = menu.querySelectorAll('ytd-account-item-renderer').length;
            const parsedOtherCount = data.accounts.filter(a => !a.isActive).length;
            if (nativeCount > 0 && parsedOtherCount === 0 && attempts < 12) {
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

        // Hide all native children — we render our own UI on top.
        Array.from(menu.children).forEach(child => {
            if (!child.classList.contains('ypp-account-menu')) {
                child.style.display = 'none';
            }
        });

        const panel = document.createElement('div');
        panel.className = 'ypp-account-menu';
        // Start invisible for smooth fade-in
        panel.style.cssText = 'opacity:0;transform:translateY(-6px);transition:opacity 0.2s ease,transform 0.2s ease;';
        panel.innerHTML = this._buildMenuHTML(data);
        menu.appendChild(panel);

        this._wireEvents(panel);

        // Animate in on next paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            });
        });

        // YouTube's lazy-loader may fire after we inject. Schedule a follow-up
        // pass to upgrade any letter-avatar fallbacks with real photos.
        this._scheduleAvatarRefresh(panel);
    }

    /**
     * Runs up to 3 refresh passes (at 300ms, 800ms, 1600ms) to replace
     * letter-avatar disks with real photos once YouTube populates img.src.
     *
     * @param {Element} panel  — the injected .ypp-account-menu element
     * @param {{ accounts: Array }} data — the original extracted data object
     */
    /**
     * Runs up to 3 refresh passes (at 300 ms, 800 ms, 1600 ms) to replace
     * letter-avatar disks with real photos once YouTube's lazy-loader fires.
     *
     * Matching strategy: satellites are found by their `title` attribute
     * (= full account name), which is reliable and already present. The center
     * disk is found via the `.ypp-orbital-wrap` non-satellite child.
     *
     * @param {Element} panel — the injected .ypp-account-menu element
     */
    _scheduleAvatarRefresh(panel) {
        const delays = [300, 800, 1600];
        let attempt = 0;

        const upgradeDisk = (container, acc, size, ring) => {
            const letter = container.querySelector('.ypp-letter-avatar');
            if (!letter) return; // already showing a photo
            const temp = document.createElement('div');
            temp.innerHTML = this._diskHTML(acc, size, ring);
            const newDisk = temp.firstElementChild;
            letter.replaceWith(newDisk);
            // Re-wire error handler so a broken photo falls back to letter-avatar
            newDisk?.querySelector('.ypp-disk-img')?.addEventListener('error', () => {
                const t = document.createElement('div');
                t.innerHTML = this._letterAvatar(acc.name, size, ring);
                newDisk.replaceWith(t.firstElementChild);
            });
        };

        const refresh = () => {
            if (!panel.isConnected) return;
            const menu = this._findMenu();
            if (!menu) return;
            const freshData = this._extractData(menu);

            freshData.accounts.forEach(acc => {
                if (!acc.avatar) return;

                if (acc.isActive) {
                    // Center disk: the non-satellite absolute-positioned child
                    const centerContainer = panel.querySelector(
                        '.ypp-orbital-wrap > div:not(.ypp-satellite)'
                    );
                    if (centerContainer) upgradeDisk(centerContainer, acc, 64, true);
                } else {
                    // Satellite disk: find by the title attribute (= full name)
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

    // ─── Data extraction ───────────────────────────────────────────────────────

    /**
     * Reads avatar URL from a YouTube custom element using three strategies
     * in order of reliability:
     *  1. yt-img-shadow[src] HTML attribute — Polymer reflects src to an HTML
     *     attribute that IS accessible from an extension isolated world.
     *  2. inner <img>.src — populated by yt-img-shadow's IntersectionObserver
     *     once the element enters the viewport.
     *  3. Polymer .data / .__data JS property — last resort, blocked in MV3
     *     isolated worlds but caught silently; useful in page-world contexts.
     *
     * @param {Element} el
     * @returns {string} URL or empty string
     */
    _getAvatarUrl(el, { isActive = false } = {}) {
        // ── Strategy 1: yt-img-shadow[src] HTML attribute ────────────────────
        // Polymer reflects its `src` property to an HTML attribute, which IS
        // accessible from an extension isolated-world (unlike JS properties).
        const ytImg = el.querySelector('yt-img-shadow');
        const ytAttr = ytImg?.getAttribute('src');
        if (ytAttr && !ytAttr.startsWith('data:') && ytAttr !== window.location.href) {
            return ytAttr;
        }

        // ── Strategy 2: inner <img> src attribute/property ───────────────────
        // Populated by yt-img-shadow's IntersectionObserver once in viewport.
        const img = el.querySelector('img#img, yt-img-shadow img, img');
        const imgSrc = img?.getAttribute('src') || img?.src || '';
        if (imgSrc && !imgSrc.startsWith('data:') && imgSrc !== window.location.href) {
            return imgSrc;
        }

        // ── Strategy 3: Polymer .data property (page-world JS) ───────────────
        // Only works if Chrome hasn't isolated it; caught silently if blocked.
        try {
            const d = el.data || el.__data;
            if (d) {
                const thumbs =
                    d.accountPhoto?.thumbnails ||
                    d.thumbnail?.thumbnails ||
                    d.photo?.thumbnails ||
                    d.thumbnails;
                if (Array.isArray(thumbs) && thumbs.length) {
                    const best = thumbs[thumbs.length - 1];
                    if (best?.url && !best.url.startsWith('data:')) return best.url;
                }
                if (d.accountPhoto?.url) return d.accountPhoto.url;
                if (d.thumbnail?.url)    return d.thumbnail.url;
            }
        } catch (_) { /* isolated-world property access denied */ }

        // ── Strategy 4 (active account only): header avatar button ───────────
        // YouTube always eagerly renders the signed-in user's avatar in the
        // masthead — use it as a guaranteed fallback for the active account.
        if (isActive) {
            const headerImg = document.querySelector(
                '#masthead #avatar-btn img,' +
                '#avatar-btn yt-img-shadow img,' +
                '#avatar-btn img'
            );
            const hSrc = headerImg?.getAttribute('src') || headerImg?.src || '';
            if (hSrc && !hSrc.startsWith('data:') && hSrc !== window.location.href) {
                return hSrc;
            }
        }

        return '';
    }

    /**
     * Extracts account data from the native YouTube menu DOM.
     * Returns { accounts, channelHref } where accounts[0] is always the
     * active account (if found).
     *
     * @param {Element} menu
     * @returns {{ accounts: Array, channelHref: string }}
     */
    _extractData(menu) {
        const accounts = [];
        let activeName = '';

        // ── Active account (header section) ──────────────────────────────────
        const activeHeader = menu.querySelector('ytd-active-account-header-renderer');
        if (activeHeader) {
            // Walk into nested yt-formatted-string/span before falling back
            // to #account-name itself. The old fallback selector
            // '.ytd-active-account-header-renderer' matched the whole renderer
            // and returned all concatenated child text.
            activeName = activeHeader.querySelector(
                '#account-name yt-formatted-string,' +
                '#account-name span,' +
                '#account-name'
            )?.textContent?.trim() || '';

            const handle = activeHeader.querySelector(
                '#channel-handle, #account-email, #email'
            )?.textContent?.trim() || '';

            accounts.push({
                name: activeName,
                handle,
                avatar: this._getAvatarUrl(activeHeader, { isActive: true }),
                isActive: true,
            });
        }

        // ── Channel link ──────────────────────────────────────────────────────
        // Bug fix: was previously hardcoded as '/channel' in _buildMenuHTML.
        // Now we read the real href from the native manage-account element.
        const channelHref =
            menu.querySelector('#manage-account')?.href ||
            menu.querySelector('a[href*="/channel"]')?.href ||
            '/';

        // ── Switchable accounts ───────────────────────────────────────────────
        menu.querySelectorAll('ytd-account-item-renderer').forEach((item, nativeIndex) => {
            // YouTube nests the display name inside yt-formatted-string or a
            // span inside #account-name — walk the tree to get the real text.
            const nameEl = item.querySelector(
                '#account-name yt-formatted-string,' +
                '#account-name span,' +
                '#account-name,' +
                '#channel-title yt-formatted-string,' +
                '#channel-title'
            );
            const name = nameEl?.textContent?.trim() || '';
            if (!name) return;

            const handle = item.querySelector(
                '#account-email, #channel-handle'
            )?.textContent?.trim() || '';

            const isChecked = !!item.querySelector(
                'yt-icon[icon="checked"], [aria-checked="true"]'
            );
            const isActive = isChecked || (!!activeName && name === activeName);
            const avatar = this._getAvatarUrl(item, { isActive });

            // De-duplicate: the active header and the item list often both
            // contain the active account — merge rather than push a second copy.
            const existing = accounts.find(a => a.name === name);
            if (existing) {
                existing.nativeIndex = nativeIndex;
                if (avatar && !existing.avatar) existing.avatar = avatar;
            } else {
                accounts.push({ name, handle, avatar, isActive, nativeIndex });
            }
        });

        return { accounts, channelHref };
    }

    // ─── HTML builders ─────────────────────────────────────────────────────────

    /**
     * HTML-escapes a string for safe insertion into attribute values and
     * text content. Escapes &, ", <, >, and '.
     *
     * Bug fix: previous version did not escape > or single-quotes, which
     * could break out of attribute context in edge cases.
     *
     * @param {string} str
     * @returns {string}
     */
    _esc(str) {
        return (str || '')
            .replace(/&/g,  '&amp;')
            .replace(/"/g,  '&quot;')
            .replace(/'/g,  '&#39;')
            .replace(/</g,  '&lt;')
            .replace(/>/g,  '&gt;');
    }

    /**
     * Renders a circular letter-avatar div.
     * Uses codePointAt(0) so surrogate-pair characters (e.g. Fraktur 𝔑)
     * produce a valid hue value instead of NaN.
     *
     * @param {string}  name  — account display name
     * @param {number}  size  — diameter in px
     * @param {boolean} ring  — whether to show the red active ring
     * @returns {string} HTML string
     */
    _letterAvatar(name, size, ring = false) {
        const safeName = (name || 'A').trim();
        // Array.from correctly handles multi-codepoint characters
        const initial  = Array.from(safeName)[0]?.toUpperCase() || '?';
        const hue      = (safeName.codePointAt(0) * 47) % 360;
        const bg       = `hsl(${hue},50%,35%)`;
        const fs       = Math.round(size * 0.38);
        const ringCSS  = ring ? 'box-shadow:0 0 0 3px #ff4e45,0 0 0 5px rgba(255,78,69,0.25);' : '';
        return `<div class="ypp-letter-avatar" style="` +
            `width:${size}px;height:${size}px;border-radius:50%;` +
            `background:${bg};display:flex;align-items:center;` +
            `justify-content:center;font-size:${fs}px;color:#fff;` +
            `font-weight:600;font-family:Roboto,Arial,sans-serif;` +
            `flex-shrink:0;user-select:none;position:relative;${ringCSS}` +
            `">${initial}</div>`;
    }

    /**
     * Renders an account disk: a real profile photo if an avatar URL is
     * available, otherwise falls back to a letter avatar.
     * The wrapping div carries data-* attributes so _wireEvents() can
     * swap in the letter fallback if the image fails to load.
     *
     * @param {{ name: string, avatar: string }} acc
     * @param {number}  size  — diameter in px
     * @param {boolean} ring  — whether to show the red active ring
     * @returns {string} HTML string
     */
    _diskHTML(acc, size, ring = false) {
        const url = acc?.avatar;
        const ringCSS = ring
            ? 'box-shadow:0 0 0 3px #ff4e45,0 0 0 5px rgba(255,78,69,0.25);'
            : '';

        if (url) {
            return `<div class="ypp-disk-wrap"
                        data-fallback-name="${this._esc(acc?.name || '')}"
                        data-size="${size}"
                        data-ring="${ring ? '1' : '0'}"
                        style="width:${size}px;height:${size}px;border-radius:50%;
                               overflow:hidden;flex-shrink:0;position:relative;
                               ${ringCSS}">
                       <img class="ypp-disk-img"
                            src="${this._esc(url)}"
                            alt="${this._esc(acc?.name || '')}"
                            loading="eager"
                            style="width:100%;height:100%;object-fit:cover;display:block;">
                   </div>`;
        }
        return this._letterAvatar(acc?.name, size, ring);
    }

    /**
     * Builds the full menu HTML string.
     * Layout:
     *  - Header: orbital container (satellites + center) + name + channel link
     *  - Actions: Appearance, Settings, More options (collapsed)
     *  - Footer: Sign out button
     *  - Overlay: sign-out confirmation dialog
     *
     * @param {{ accounts: Array, channelHref: string }} data
     * @returns {string} HTML string
     */
    _buildMenuHTML(data) {
        const { accounts, channelHref } = data;
        const activeAccount  = accounts.find(a => a.isActive) || accounts[0];
        const otherAccounts  = accounts.filter(a => !a.isActive);

        // ── Orbital geometry ─────────────────────────────────────────────────
        const R             = 88;           // px from center to satellite midpoint
        const SAT_SIZE      = 40;           // satellite disk diameter
        // Expand container height to accommodate name labels below satellites
        const containerSize = R * 2 + SAT_SIZE + 28; // extra 20px for labels

        const satelliteHTML = otherAccounts.map((acc, i) => {
            // Distribute evenly around the circle, starting from top (−π/2 rad)
            const angle = (i / otherAccounts.length) * 2 * Math.PI - Math.PI / 2;
            const dx    = Math.round(Math.cos(angle) * R);
            const dy    = Math.round(Math.sin(angle) * R);
            // Prefer nativeIndex for clicking the correct ytd-account-item-renderer
            const idx   = acc.nativeIndex ?? i;
            // Short label: first word of name, max 9 chars
            const label = (acc.name || '').split(' ')[0].substring(0, 9);
            return `<div class="ypp-satellite"
                         data-account-index="${idx}"
                         title="${this._esc(acc.name)}"
                         role="button"
                         tabindex="0"
                         aria-label="Switch to ${this._esc(acc.name)}"
                         style="position:absolute;top:50%;left:50%;
                                transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px));
                                cursor:pointer;
                                display:flex;flex-direction:column;
                                align-items:center;gap:3px;">
                        ${this._diskHTML(acc, SAT_SIZE)}
                        <span style="font-size:9px;font-weight:500;
                                     color:rgba(255,255,255,0.65);
                                     max-width:${SAT_SIZE + 12}px;
                                     overflow:hidden;text-overflow:ellipsis;
                                     white-space:nowrap;line-height:1;
                                     text-align:center;
                                     font-family:Roboto,Arial,sans-serif;">
                            ${this._esc(label)}
                        </span>
                    </div>`;
        }).join('');

        const centerHTML = `
            <div style="position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%);z-index:2;pointer-events:none;">
                ${this._diskHTML(activeAccount, 64, true)}
            </div>`;

        const orbitalSection = `
            <div class="ypp-orbital-wrap"
                 style="position:relative;width:${containerSize}px;height:${containerSize}px;margin:0 auto;">
                ${satelliteHTML}
                ${centerHTML}
            </div>`;

        // HTML-escape the channel href for safe insertion into the href attribute.
        const safeChannelHref = this._esc(channelHref);

        return `
        <div class="ypp-menu-header"
             style="padding:20px 16px 12px;text-align:center;
                    border-bottom:1px solid rgba(255,255,255,0.08);">
            ${orbitalSection}
            <div style="margin-top:14px;">
                <div class="ypp-active-name">${this._esc(activeAccount?.name || 'Account')}</div>
                ${activeAccount?.handle
                    ? `<div class="ypp-active-handle">${this._esc(activeAccount.handle)}</div>`
                    : ''}
                <a class="ypp-channel-link"
                   href="${safeChannelHref}"
                   id="ypp-view-channel">View channel →</a>
            </div>
        </div>

        <div class="ypp-menu-actions">
            <button class="ypp-menu-item" id="ypp-appearance">
                <svg viewBox="0 0 24 24" width="18" height="18"
                     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
                             M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
                Appearance
            </button>

            <button class="ypp-menu-item" id="ypp-settings">
                <svg viewBox="0 0 24 24" width="18" height="18"
                     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83
                             l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0
                             v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83
                             l.06-.06A1.65 1.65 0 004.6 9a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09
                             A1.65 1.65 0 004.6 4.6"/>
                </svg>
                Settings
            </button>

            <button class="ypp-menu-item ypp-more-toggle" id="ypp-more-toggle"
                    aria-expanded="false" aria-controls="ypp-more-items">
                <svg viewBox="0 0 24 24" width="18" height="18"
                     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="5"  r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
                More options
                <svg class="ypp-chevron" viewBox="0 0 24 24" width="14" height="14"
                     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            <div class="ypp-more-items" id="ypp-more-items" role="group">
                <a class="ypp-menu-item ypp-more-item"
                   href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer">
                    YouTube Studio
                </a>
                <a class="ypp-menu-item ypp-more-item" href="/paid_memberships">
                    Purchases &amp; memberships
                </a>
                <a class="ypp-menu-item ypp-more-item" href="/account">
                    Your data in YouTube
                </a>
                <a class="ypp-menu-item ypp-more-item"
                   href="https://myaccount.google.com" target="_blank" rel="noopener noreferrer">
                    Google Account
                </a>
            </div>
        </div>

        <div class="ypp-menu-footer">
            <button class="ypp-menu-item ypp-signout" id="ypp-signout">
                <svg viewBox="0 0 24 24" width="18" height="18"
                     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
            </button>
        </div>

        <div class="ypp-signout-confirm" id="ypp-signout-confirm" role="dialog"
             aria-modal="true" aria-labelledby="ypp-confirm-title">
            <div class="ypp-confirm-box">
                <p id="ypp-confirm-title">Sign out of YouTube?</p>
                <div class="ypp-confirm-actions">
                    <button id="ypp-confirm-cancel">Cancel</button>
                    <button id="ypp-confirm-ok" class="danger">Sign out</button>
                </div>
            </div>
        </div>`;
    }

    // ─── Event wiring ──────────────────────────────────────────────────────────

    _wireEvents(panel) {
        // View channel link — just close the menu; the href handles navigation.
        panel.querySelector('#ypp-view-channel')
            ?.addEventListener('click', () => this._closeMenu());

        // Appearance — delegate to YouTube's native appearance button.
        panel.querySelector('#ypp-appearance')
            ?.addEventListener('click', () => {
                this._closeMenu();
                // Small delay ensures menu is gone before triggering native dialog.
                setTimeout(() => {
                    document.querySelector(
                        'ytd-toggle-theme-compact-link-renderer button,' +
                        '[aria-label*="Appearance"]'
                    )?.click();
                }, 100);
            });

        // Settings — navigate to YouTube account settings page.
        panel.querySelector('#ypp-settings')
            ?.addEventListener('click', () => {
                this._closeMenu();
                window.location.href = '/account';
            });

        // "More options" expand/collapse.
        // Bug fix: added null guard — if either element is missing, skip safely.
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

        // Sign-out confirmation dialog.
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

        // Profile photo error fallback: if an img fails to load (e.g. CORS,
        // lazy-load not fired yet), replace the disk-wrap with a letter avatar.
        panel.querySelectorAll('.ypp-disk-img').forEach(img => {
            img.addEventListener('error', () => {
                const wrap = img.closest('.ypp-disk-wrap');
                if (!wrap) return;
                const name = wrap.dataset.fallbackName || '';
                const size = parseInt(wrap.dataset.size, 10) || 40;
                const ring = wrap.dataset.ring === '1';
                // Replace the entire disk-wrap element with a letter avatar
                const temp = document.createElement('div');
                temp.innerHTML = this._letterAvatar(name, size, ring);
                wrap.replaceWith(temp.firstElementChild);
            });
        });

        // Orbital satellite clicks — switch to the chosen account.
        // Each satellite stores the native ytd-account-item-renderer index.
        panel.querySelectorAll('.ypp-satellite').forEach(sat => {
            const activate = () => {
                const idx = parseInt(sat.dataset.accountIndex, 10);
                if (!isNaN(idx)) {
                    document.querySelectorAll('ytd-account-item-renderer')[idx]?.click();
                }
            };
            sat.addEventListener('click', activate);
            // Keyboard accessibility: activate on Enter/Space
            sat.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate();
                }
            });
        });
    }

    // ─── Utility ───────────────────────────────────────────────────────────────

    _closeMenu() {
        // Primary: click the iron-dropdown backdrop (standard YouTube layout).
        const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
        if (backdrop) { backdrop.click(); return; }
        // Fallback: press Escape, which all iron-dropdown variants handle.
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }

    // ─── Cleanup ───────────────────────────────────────────────────────────────

    /**
     * Tears down all timers, removes injected HTML, and resets state so the
     * next menu open starts fresh. Called on page navigation and on disable().
     */
    _cleanup() {
        this._clearPollTimer();
        this._clearAvatarPollTimer();
        this._injected = false;

        document.querySelectorAll('[data-ypp-redesigned]').forEach(el => {
            // Restore native children before removing our panel
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
