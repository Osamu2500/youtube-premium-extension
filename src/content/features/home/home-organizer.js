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
        // Use the shared DOMObserver mechanism
        this.domObserver = new window.YPP.Utils.DOMObserver(); 
        /** @type {Object<string, string>} Channel name to tag mapping */
        this.channelTags = {};
        /** @type {boolean} Feature active state */
        this.isActive = false;
    }

    /**
     * Initialize feature with settings and load stored channel tags.
     * @param {Object} settings - User settings
     */
    async run(settings) {
        this.settings = settings;
        // Logic: Enable unless "hookFreeHome" is ON (which implies a minimal home)
        // Or maybe hookFreeHome means "clean home". 
        // Assuming original logic: if !hookFreeHome, enable organizer.
        if (!settings.hookFreeHome) {
            await this.enable();
        } else {
            this.disable();
        }
    }

    /**
     * Enable the feature
     */
    async enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.Utils.log('Home Organizer Enabled', 'HOME');

        await this.loadTags();

        // Register observer for the grid
        this.domObserver.start();
        this.domObserver.register('home-grid', this.CONSTANTS.SELECTORS.GRID_CONTENTS, () => {
            this.organizeFeed();
        });

        // Initial run
        this.organizeFeed();

        // Handle Popover close
        this._boundClickListener = (e) => {
            if (!e.target.closest('.ypp-tag-btn') && !e.target.closest('.ypp-tag-popover')) {
                this.removePopover();
            }
        };
        document.addEventListener('click', this._boundClickListener);
    }

    /**
     * Disable the feature
     */
    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        
        this.domObserver.stop();
        this.domObserver.unregister('home-grid');

        document.querySelectorAll('.ypp-tag-btn').forEach(el => el.remove());
        document.querySelectorAll('.ypp-feed-separator').forEach(el => el.remove());
        this.removePopover();

        if (this._boundClickListener) {
            document.removeEventListener('click', this._boundClickListener);
        }
        
        this.Utils.log('Home Organizer Disabled', 'HOME');
    }

    /**
     * Load tags from storage
     */
    async loadTags() {
        try {
            const data = await this.Utils.loadSettings(); // Actually we need 'channelTags', not 'settings'
            // Utils.loadSettings gets 'settings' key.
            // We need a generic storage getter for 'channelTags'. 
            // Utils.getSetting gets from 'settings' object usually? 
            // Let's check Utils.js. loadSettings gets "settings". 
            // We need raw storage for channelTags which is likely a separate key.
            // Let's use direct chrome.storage for this separate key or add a utility.
            // For now, consistent with others: use direct chrome.storage or add helper. 
            // Utils has `loadSettings` which returns `settings`. 
            
            const result = await chrome.storage.local.get('channelTags');
            this.channelTags = result.channelTags || {};
        } catch (e) {
            this.Utils.log(`Failed to load tags: ${e.message}`, 'HOME', 'error');
        }
    }

    /**
     * Save a tag for a channel
     * @param {string} channelName 
     * @param {string} tag 
     */
    async saveTag(channelName, tag) {
        this.channelTags[channelName] = tag;
        try {
            await chrome.storage.local.set({ channelTags: this.channelTags });
            this.Utils.createToast(`Tagged as ${tag}`);
        } catch (e) {
            this.Utils.log(`Failed to save tag: ${e.message}`, 'HOME', 'error');
            this.Utils.createToast('Failed to save tag', 'error');
        }
    }

    /**
     * Organize the feed (Separators, Priorities, Tags)
     */
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

        // Feature 3: Topic Tags
        this.injectTagButtons(contents);
    }

    /**
     * Apply visual styles based on priority/type
     * @param {HTMLElement} contents 
     */
    applyVisualPriority(contents) {
        const lowPrioritySelectors = ['ytd-rich-shelf-renderer[is-shorts]', 'ytd-reel-shelf-renderer'];
        lowPrioritySelectors.forEach(sel => {
            contents.querySelectorAll(sel).forEach(el => el.classList.add('ypp-priority-low'));
        });

        // Apply Tags Visuals
        contents.querySelectorAll('ytd-rich-item-renderer').forEach(item => {
            // Shorts Check
            if (item.querySelector('a[href^="/shorts/"]')) item.classList.add('ypp-priority-low');
        });
    }

    /**
     * Inject tagging buttons onto video cards
     * @param {HTMLElement} contents 
     */
    injectTagButtons(contents) {
        const videoItems = contents.querySelectorAll('ytd-rich-item-renderer');
        videoItems.forEach(item => {
            if (item.querySelector('.ypp-tag-btn')) return;

            const thumbnail = item.querySelector('ytd-thumbnail');
            if (!thumbnail) return;

            // Positioning handled by CSS (absolute)
            // Ensure parent has position relative (ytd-thumbnail does)

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

    /**
     * Handle click on tag button
     * @param {Event} e 
     * @param {string} channelName 
     * @param {HTMLElement} btn 
     */
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
                    await this.saveTag(channelName, null); // Handle delete in saveTag if needed or just save map
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

    createSeparator(text, specificClass = '') {
        const div = document.createElement('div');
        div.className = `ypp-feed-separator ${specificClass}`;
        div.textContent = text;
        return div;
    }
};
