// Home Feed Organizer (Refactored)
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Home Feed Organizer
 * Manages channel tagging, visual priorities, and feed organization
 */
window.YPP.features.HomeOrganizer = class HomeOrganizer {
    constructor() {
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        this.observer = new window.YPP.Utils.DOMObserver(); // Shared
        /** @type {Object<string, string>} Channel name to tag mapping */
        this.channelTags = {};
        /** @type {Array<HTMLElement>} Active tag filter buttons */
        this.tagButtons = [];
        this.isActive = false;
    }

    /**
     * Initialize feature with settings and load stored channel tags.
     * @param {Object} settings - User settings
     * @returns {void}
     */
    run(settings) {
        this.settings = settings;
        if (!settings.hookFreeHome) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        this.init();
    }

    async init() {
        if (this.isActive) return;
        this.isActive = true;
        await this.loadTags();

        // Observe Grid
        this.observer.register('home-grid', this.CONSTANTS.SELECTORS.GRID_CONTENTS, () => {
            this.organizeFeed();
        });

        // Initial run
        this.organizeFeed();

        // Handle Popover close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ypp-tag-btn') && !e.target.closest('.ypp-tag-popover')) {
                this.removePopover();
            }
        });
    }

    disable() {
        this.isActive = false;
        document.querySelectorAll('.ypp-tag-btn').forEach(el => el.remove());
        this.removePopover();
    }

    async loadTags() {
        return new Promise(resolve => {
            chrome.storage.local.get('channelTags', (data) => {
                if (chrome.runtime.lastError) {
                    this.Utils.log(`Storage Error: ${chrome.runtime.lastError.message}`, 'HOME', 'error');
                    this.channelTags = {};
                    resolve();
                    return;
                }
                this.channelTags = data.channelTags || {};
                resolve();
            });
        });
    }

    async saveTag(channelName, tag) {
        // Note: Using Channel Name as ID for now since grabbing Channel ID from DOM is tricky without API.
        // Ideally we grab the channel URL or distinct ID.
        this.channelTags[channelName] = tag;

        return new Promise((resolve) => {
            chrome.storage.local.set({ channelTags: this.channelTags }, () => {
                if (chrome.runtime.lastError) {
                    this.Utils.log(`Storage Save Error: ${chrome.runtime.lastError.message}`, 'HOME', 'error');
                    this.Utils.createToast('Failed to save tag');
                } else {
                    this.Utils.createToast(`Tagged as ${tag}`);
                }
                resolve();
            });
        });
    }

    organizeFeed() {
        if (!this.isActive) return;

        const contents = document.querySelector(this.CONSTANTS.SELECTORS.GRID_CONTENTS);
        if (!contents) return;

        // Feature 1: Separators
        if (!document.querySelector('.ypp-separator-top')) {
            const topSeparator = this.createSeparator('Top Recommendations', 'ypp-separator-top');
            contents.prepend(topSeparator);
            topSeparator.onclick = () => this.toggleSection(topSeparator);
        }

        // Feature 2: Visual Priority
        this.applyVisualPriority(contents);

        // Feature 4: Topic Tags
        this.injectTagButtons(contents);
    }

    applyVisualPriority(contents) {
        const lowPrioritySelectors = ['ytd-rich-shelf-renderer[is-shorts]', 'ytd-reel-shelf-renderer'];
        lowPrioritySelectors.forEach(sel => {
            contents.querySelectorAll(sel).forEach(el => el.classList.add('ypp-priority-low'));
        });

        // Apply Tags Visuals
        contents.querySelectorAll('ytd-rich-item-renderer').forEach(item => {
            // Shorts Check
            if (item.querySelector('a[href^="/shorts/"]')) item.classList.add('ypp-priority-low');

            // Tag Check
            const channelName = item.querySelector('#text.ytd-channel-name')?.textContent?.trim();
            if (channelName && this.channelTags[channelName]) {
                // If tagged, maybe highlight or show badge?
                // For now, let's just ensure the button reflects it? 
                // We'll update button text in injectTagButtons
            }
        });
    }

    injectTagButtons(contents) {
        const videoItems = contents.querySelectorAll('ytd-rich-item-renderer');
        videoItems.forEach(item => {
            if (item.querySelector('.ypp-tag-btn')) return;

            const metaBlock = item.querySelector('#details');
            if (!metaBlock) return;

            // Positioning: Relative to details or thumbnail?
            // User requested: "Hover button on video card"
            // Let's put it over the thumbnail for visibility or near the menu button.
            // Thumbnail is safer for "Hover" effect.
            const thumbnail = item.querySelector('ytd-thumbnail');
            if (!thumbnail) return;

            // Make parent relative if needed (ytd-thumbnail usually is)

            const btn = document.createElement('button');
            btn.className = 'ypp-tag-btn';
            btn.innerHTML = '#';
            btn.title = 'Tag Channel';

            // Check if already tagged
            const channelName = item.querySelector('#text.ytd-channel-name')?.textContent?.trim();
            if (channelName && this.channelTags[channelName]) {
                const tag = this.channelTags[channelName];
                if (tag && tag.length > 0) {
                    btn.classList.add('tagged');
                    btn.innerHTML = tag[0]; // First letter
                }
            }

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleTagClick(e, channelName, btn);
            };

            thumbnail.appendChild(btn);
        });
    }

    handleTagClick(e, channelName, btn) {
        this.removePopover();
        if (!channelName) return;

        const popover = document.createElement('div');
        popover.className = 'ypp-tag-popover';

        const tags = ['Focus', 'Entertainment', 'News', 'Music', 'Clear'];

        tags.forEach(tag => {
            const item = document.createElement('div');
            item.className = 'ypp-tag-option';
            item.textContent = tag;
            item.onclick = async () => {
                if (tag === 'Clear') {
                    delete this.channelTags[channelName];
                    btn.classList.remove('tagged');
                    btn.innerHTML = '#';

                    // Use callback to check for errors
                    chrome.storage.local.set({ channelTags: this.channelTags }, () => {
                        if (chrome.runtime.lastError) {
                            this.Utils.log(`Storage Clear Error: ${chrome.runtime.lastError.message}`, 'HOME', 'error');
                        }
                    });
                } else {
                    await this.saveTag(channelName, tag);
                    btn.classList.add('tagged');
                    btn.innerHTML = tag[0];
                }
                this.removePopover();
            };
            popover.appendChild(item);
        });

        // Position popover
        const rect = btn.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;

        document.body.appendChild(popover);
    }

    removePopover() {
        const existing = document.querySelector('.ypp-tag-popover');
        if (existing) existing.remove();
    }

    toggleSection(separator) {
        separator.classList.toggle('collapsed');
        const isCollapsed = separator.classList.contains('collapsed');
        let sibling = separator.nextElementSibling;
        while (sibling) {
            if (sibling.classList.contains('ypp-feed-separator')) break;
            if (isCollapsed) sibling.classList.add('ypp-section-hidden');
            else sibling.classList.remove('ypp-section-hidden');
            sibling = sibling.nextElementSibling;
        }
    }

    startObserver() {
        const target = document.querySelector(this.CONSTANTS.SELECTORS.GRID_RENDERER);
        if (!target) return;
        this.observer = new MutationObserver(() => this.organizeFeed());
        this.observer.observe(target, { childList: true, subtree: true });
    }

    createSeparator(text, specificClass = '') {
        const div = document.createElement('div');
        div.className = `ypp-feed-separator ${specificClass}`;
        div.textContent = text;
        return div;
    }
};
