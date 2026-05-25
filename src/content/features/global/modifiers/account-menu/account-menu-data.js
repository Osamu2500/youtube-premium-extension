window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Handles extraction of account data and avatar URLs from YouTube's native DOM.
 */
window.YPP.features.AccountMenuData = class AccountMenuData {
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
     * @param {{ isActive?: boolean }} options
     * @returns {string} URL or empty string
     */
    static getAvatarUrl(el, { isActive = false } = {}) {
        // ── Strategy 1: yt-img-shadow[src] HTML attribute ────────────────────
        const ytImg = el.querySelector('yt-img-shadow');
        const ytAttr = ytImg?.getAttribute('src');
        if (ytAttr && !ytAttr.startsWith('data:') && ytAttr !== window.location.href) {
            return ytAttr;
        }

        // ── Strategy 2: inner <img> src attribute/property ───────────────────
        const img = el.querySelector('img#img, yt-img-shadow img, img');
        const imgSrc = img?.getAttribute('src') || img?.src || '';
        if (imgSrc && !imgSrc.startsWith('data:') && imgSrc !== window.location.href) {
            return imgSrc;
        }

        // ── Strategy 3: Polymer .data property (page-world JS) ───────────────
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
    static extractData(menu) {
        const accounts = [];
        let activeName = '';

        // ── Active account (header section) ──────────────────────────────────
        const activeHeader = menu.querySelector('ytd-active-account-header-renderer');
        if (activeHeader) {
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
                avatar: this.getAvatarUrl(activeHeader, { isActive: true }),
                isActive: true,
            });
        }

        // ── Channel link ──────────────────────────────────────────────────────
        const channelHref =
            menu.querySelector('#manage-account')?.href ||
            menu.querySelector('a[href*="/channel"]')?.href ||
            '/';

        // ── Switchable accounts ───────────────────────────────────────────────
        menu.querySelectorAll('ytd-account-item-renderer, ytd-account-item').forEach((item, nativeIndex) => {
            const nameEl = item.querySelector(
                '#account-name yt-formatted-string,' +
                '#account-name span,' +
                '#account-name,' +
                '#channel-title yt-formatted-string,' +
                '#channel-title,' +
                '#name'
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
            const avatar = this.getAvatarUrl(item, { isActive });

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
};
