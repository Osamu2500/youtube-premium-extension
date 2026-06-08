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
                        <span style="font-size:10px;font-weight:500;
                                     color:rgba(255,255,255,0.7);
                                     max-width:${SAT_SIZE + 16}px;
                                     overflow:hidden;text-overflow:ellipsis;
                                     white-space:nowrap;line-height:1;
                                     text-align:center;
                                     font-family:Roboto,Arial,sans-serif;
                                     text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                            ${this.esc(label)}
                        </span>
                    </div>`;
        }).join('');

        const centerHTML = `
            <div style="position:absolute;top:50%;left:50%;
                        transform:translate(-50%,-50%);z-index:2;pointer-events:none;">
                ${this.diskHTML(activeAccount, 68, true)}
            </div>`;

        const orbitalSection = `
            <div class="ypp-orbital-wrap"
                 style="position:relative;width:${containerSize}px;height:${containerSize}px;margin:0 auto;">
                ${satelliteHTML}
                ${centerHTML}
            </div>`;

        const safeChannelHref = this.esc(channelHref);

        // Added SVG definitions for cleaner code
        const icons = {
            appearance: '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/>',
            settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 9a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 4.6l.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H10a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V10a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
            language: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.36 7.64c-1.38-1.53-3.11-2.6-5.08-3.16.89 1.13 1.55 2.45 1.93 3.86h3.15zm-8.8 3.86h4.88c-.06 1.13-.25 2.22-.56 3.25H9.08c-.31-1.03-.5-2.12-.56-3.25zm.56-4.5h3.76c.21 1.05.34 2.15.34 3.25 0 1.1-.13 2.2-.34 3.25H9.64c-.21-1.05-.34-2.15-.34-3.25 0-1.1.13-2.2.34-3.25zm1.5-6.1c1.55.51 2.92 1.44 3.99 2.65h-3.99V2.9zm-4.66.26c1.07-1.21 2.44-2.14 3.99-2.65v3.41H6.96zM4.64 9.64h3.15c.38-1.41 1.04-2.73 1.93-3.86-1.97.56-3.7 1.63-5.08 3.16v.7z"/>',
            location: '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>',
            keyboard: '<path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>',
            restricted: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>',
            help: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>',
            feedback: '<path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/>',
            studio: '<path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-3V8l5 3 5-3v6l-5 3z"/>',
            purchases: '<path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
            data: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
            google: '<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.545,6.477,2.545,12s4.476,10,10,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>'
        };

        const createBtn = (id, iconSvg, label, isLink = false, href = '') => `
            <${isLink ? 'a href="'+href+'" target="_blank"' : 'button id="'+id+'"'} class="ypp-menu-item">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="${isLink ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${isLink ? '0' : '1.5'}" aria-hidden="true" style="opacity:0.8; margin-right: 4px;">
                    ${iconSvg}
                </svg>
                ${label}
            </${isLink ? 'a' : 'button'}>
        `;

        return `
        <div class="ypp-menu-header"
             style="padding:24px 16px 16px;text-align:center;
                    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
                    border-bottom:1px solid rgba(255,255,255,0.06);">
            ${orbitalSection}
            <div style="margin-top:20px;">
                <div class="ypp-active-name" style="font-size:18px; font-weight:600; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${this.esc(activeAccount?.name || 'Account')}</div>
                ${activeAccount?.handle
                    ? `<div class="ypp-active-handle" style="font-size:13px; color: rgba(255,255,255,0.6); margin-top:4px;">${this.esc(activeAccount.handle)}</div>`
                    : ''}
                <a class="ypp-channel-link"
                   href="${safeChannelHref}"
                   id="ypp-view-channel"
                   style="display:inline-block; margin-top:12px; padding:6px 16px; background:rgba(255,255,255,0.1); border-radius:20px; text-decoration:none; color:#fff; font-size:13px; font-weight:500; transition:background 0.2s;">View channel</a>
            </div>
        </div>

        <div class="ypp-menu-scrollable" style="max-height: 400px; overflow-y: auto; padding: 12px 8px;">
            ${createBtn('ypp-appearance', icons.appearance, 'Appearance')}
            ${createBtn('ypp-settings', icons.settings, 'Settings')}
            ${createBtn('ypp-language', icons.language, 'Language')}
            ${createBtn('ypp-location', icons.location, 'Location')}
            ${createBtn('ypp-keyboard', icons.keyboard, 'Keyboard shortcuts')}
            ${createBtn('ypp-restricted', icons.restricted, 'Restricted Mode')}
            
            <div style="height: 1px; background: rgba(255,255,255,0.06); margin: 8px 12px;"></div>

            <button class="ypp-menu-item ypp-more-toggle" id="ypp-more-toggle"
                    aria-expanded="false" aria-controls="ypp-more-items"
                    style="padding: 10px 14px; border-radius: 10px; color: rgba(255,255,255,0.7);">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="margin-right: 4px;">
                    <circle cx="12" cy="5"  r="1" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor"/>
                    <circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
                More options
                <svg class="ypp-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>

            <div class="ypp-more-items" id="ypp-more-items" role="group" style="margin-left: 8px; border-left: 2px solid rgba(255,255,255,0.05); padding-left: 4px; margin-top: 4px;">
                ${createBtn('', icons.studio, 'YouTube Studio', true, 'https://studio.youtube.com')}
                ${createBtn('', icons.purchases, 'Purchases & memberships', true, '/paid_memberships')}
                ${createBtn('', icons.data, 'Your data in YouTube', true, '/account')}
                ${createBtn('', icons.google, 'Google Account', true, 'https://myaccount.google.com')}
                ${createBtn('ypp-help', icons.help, 'Help')}
                ${createBtn('ypp-feedback', icons.feedback, 'Send feedback')}
            </div>
        </div>

        <div class="ypp-menu-footer" style="padding: 12px; background: rgba(0,0,0,0.2);">
            <button class="ypp-menu-item ypp-signout" id="ypp-signout" style="padding: 10px 14px; border-radius: 10px; justify-content: center; background: rgba(255, 78, 69, 0.1); border: 1px solid rgba(255, 78, 69, 0.2); color: #ff4e45; font-weight: 500;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="margin-right: 4px;">
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
