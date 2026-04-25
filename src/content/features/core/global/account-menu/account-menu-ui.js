window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Handles HTML generation and UI components for the Account Menu.
 */
window.YPP.features.AccountMenuUI = class AccountMenuUI {
    /**
     * HTML-escapes a string for safe insertion into attribute values and
     * text content. Escapes &, ", <, >, and '.
     *
     * @param {string} str
     * @returns {string}
     */
    static esc(str) {
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
    static letterAvatar(name, size, ring = false) {
        const safeName = (name || 'A').trim();
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
    static diskHTML(acc, size, ring = false) {
        const url = acc?.avatar;
        const ringCSS = ring
            ? 'box-shadow:0 0 0 3px #ff4e45,0 0 0 5px rgba(255,78,69,0.25);'
            : '';

        if (url) {
            return `<div class="ypp-disk-wrap"
                        data-fallback-name="${this.esc(acc?.name || '')}"
                        data-size="${size}"
                        data-ring="${ring ? '1' : '0'}"
                        style="width:${size}px;height:${size}px;border-radius:50%;
                               overflow:hidden;flex-shrink:0;position:relative;
                               ${ringCSS}">
                       <img class="ypp-disk-img"
                            src="${this.esc(url)}"
                            alt="${this.esc(acc?.name || '')}"
                            loading="eager"
                            style="width:100%;height:100%;object-fit:cover;display:block;">
                   </div>`;
        }
        return this.letterAvatar(acc?.name, size, ring);
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
    static buildMenuHTML(data) {
        const { accounts, channelHref } = data;
        const activeAccount  = accounts.find(a => a.isActive) || accounts[0];
        const otherAccounts  = accounts.filter(a => !a.isActive);

        // ── Orbital geometry ─────────────────────────────────────────────────
        const R             = 88;           // px from center to satellite midpoint
        const SAT_SIZE      = 40;           // satellite disk diameter
        const containerSize = R * 2 + SAT_SIZE + 28; // extra 20px for labels

        const satelliteHTML = otherAccounts.map((acc, i) => {
            const angle = (i / otherAccounts.length) * 2 * Math.PI - Math.PI / 2;
            const dx    = Math.round(Math.cos(angle) * R);
            const dy    = Math.round(Math.sin(angle) * R);
            const idx   = acc.nativeIndex ?? i;
            const label = (acc.name || '').split(' ')[0].substring(0, 9);
            
            return `<div class="ypp-satellite"
                         data-account-index="${idx}"
                         title="${this.esc(acc.name)}"
                         role="button"
                         tabindex="0"
                         aria-label="Switch to ${this.esc(acc.name)}"
                         style="position:absolute;top:50%;left:50%;
                                transform:translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px));
                                cursor:pointer;
                                display:flex;flex-direction:column;
                                align-items:center;gap:3px;">
                        ${this.diskHTML(acc, SAT_SIZE)}
                        <span style="font-size:9px;font-weight:500;
                                     color:rgba(255,255,255,0.65);
                                     max-width:${SAT_SIZE + 12}px;
                                     overflow:hidden;text-overflow:ellipsis;
                                     white-space:nowrap;line-height:1;
                                     text-align:center;
                                     font-family:Roboto,Arial,sans-serif;">
                            ${this.esc(label)}
                        </span>
                    </div>`;
        }).join('');

        const centerHTML = `
            <div style="position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%);z-index:2;pointer-events:none;">
                ${this.diskHTML(activeAccount, 64, true)}
            </div>`;

        const orbitalSection = `
            <div class="ypp-orbital-wrap"
                 style="position:relative;width:${containerSize}px;height:${containerSize}px;margin:0 auto;">
                ${satelliteHTML}
                ${centerHTML}
            </div>`;

        const safeChannelHref = this.esc(channelHref);

        return `
        <div class="ypp-menu-header"
             style="padding:20px 16px 12px;text-align:center;
                    border-bottom:1px solid rgba(255,255,255,0.08);">
            ${orbitalSection}
            <div style="margin-top:14px;">
                <div class="ypp-active-name">${this.esc(activeAccount?.name || 'Account')}</div>
                ${activeAccount?.handle
                    ? `<div class="ypp-active-handle">${this.esc(activeAccount.handle)}</div>`
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
};
