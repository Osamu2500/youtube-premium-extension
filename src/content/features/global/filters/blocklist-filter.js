window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.BlocklistFilter = class BlocklistFilter extends window.YPP.features.BaseFilterFeature {
    constructor() {
        super('BlocklistFilter');
        this.blockedChannels = [];
        this.blockedKeywords = [];
    }

    getConfigKey() {
        // Run if either field is populated
        return 'blockedChannels'; // Just a fallback, we handle logic in enable
    }

    async enable() {
        if (!this.settings) return;
        
        // Parse comma-separated strings into arrays
        this.blockedChannels = this._parseList(this.settings.blockedChannels);
        this.blockedKeywords = this._parseList(this.settings.blockedKeywords);

        if (this.blockedChannels.length === 0 && this.blockedKeywords.length === 0) return;

        this.utils?.log(`Enabled with ${this.blockedChannels.length} channels, ${this.blockedKeywords.length} keywords blocked.`, 'BLOCKLIST', 'debug');

        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.register('blocklist-home', 'ytd-rich-item-renderer', (items) => this._processItems(items));
            window.YPP.sharedObserver.register('blocklist-search', 'ytd-video-renderer', (items) => this._processItems(items));
            window.YPP.sharedObserver.register('blocklist-related', 'ytd-compact-video-renderer', (items) => this._processItems(items));
        }

        // Catch up on existing elements
        const existing = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
        if (existing.length) {
            this._processItems(Array.from(existing));
        }
    }

    async disable() {
        await super.disable();
        if (window.YPP.sharedObserver) {
            window.YPP.sharedObserver.unregister('blocklist-home');
            window.YPP.sharedObserver.unregister('blocklist-search');
            window.YPP.sharedObserver.unregister('blocklist-related');
        }
    }

    _parseList(str) {
        if (!str || typeof str !== 'string') return [];
        return str.split(',')
                  .map(s => s.trim().toLowerCase())
                  .filter(s => s.length > 0);
    }

    _processItems(elements) {
        if (!this.isEnabled || !this._shouldRunOnCurrentPage()) return;
        
        let blockedCount = 0;

        for (const el of elements) {
            if (el.hasAttribute('data-ypp-blocked') || el.classList.contains('ypp-hidden')) continue;

            const titleEl = el.querySelector('#video-title');
            const channelEl = el.querySelector('#channel-name .yt-simple-endpoint, #text-container.ytd-channel-name');

            const title = titleEl ? titleEl.textContent.trim().toLowerCase() : '';
            const channel = channelEl ? channelEl.textContent.trim().toLowerCase() : '';

            let shouldBlock = false;

            // Check Keywords
            for (const keyword of this.blockedKeywords) {
                // Use exact word boundary matching instead of fuzzy includes
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(title)) {
                    shouldBlock = true;
                    break;
                }
            }

            // Check Channels
            if (!shouldBlock) {
                for (const ch of this.blockedChannels) {
                    if (channel === ch || channel === `@${ch}`) {
                        shouldBlock = true;
                        break;
                    }
                }
            }

            if (shouldBlock) {
                el.setAttribute('data-ypp-blocked', 'true');
                this._hideElement(el, 'blocklist');
                blockedCount++;
                this.utils?.log(`Blocked video: "${title}" by "${channel}"`, 'BLOCKLIST', 'debug');
            }
        }
        
        if (blockedCount > 0 && this.settings?.showBlocklistFeedback !== false) {
            this.utils?.createToast?.(`${blockedCount} video(s) hidden by blocklist`);
        }
    }
};
