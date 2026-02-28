// Home Feed Organizer (Refactored)
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

/**
 * Home Feed Organizer
 * Manages channel tagging, visual priorities, and feed organization
 */
window.YPP.features.HomeOrganizer = class HomeOrganizer extends window.YPP.features.BaseFeature {
    constructor() {
        super('HomeOrganizer');
        this.CONSTANTS = window.YPP.CONSTANTS;
        this.Utils = window.YPP.Utils;
        // Use the shared DOMObserver mechanism from BaseFeature, fallback if missing
        this.domObserver = this.observer || new window.YPP.Utils.DOMObserver(); 
        /** @type {Object<string, string[]>} Channel name to folder tags mapping */
        this.channelTags = {};
        /** @type {Object<string, string[]>} Folders loaded from SubscriptionFolders */
        this.folders = {};
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
        // Use tracked listener to prevent SPA memory leaks
        this.addListener(document, 'click', this._boundClickListener);
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
            // Clean up tracked events automatically
            this.cleanupEvents();
        }
        
        this.Utils.log('Home Organizer Disabled', 'HOME');
    }

    /**
     * Load tags by parsing the Subscription Folders
     */
    async loadTags() {
        try {
            const result = await chrome.storage.local.get('ypp_subscription_folders');
            this.folders = result.ypp_subscription_folders || {};
            
            this.channelTags = {};
            for (const [folderName, channels] of Object.entries(this.folders)) {
                for (const channel of channels) {
                    if (!this.channelTags[channel]) {
                        this.channelTags[channel] = [];
                    }
                    if (!this.channelTags[channel].includes(folderName)) {
                        this.channelTags[channel].push(folderName);
                    }
                }
            }
        } catch (e) {
            this.Utils.log(`Failed to load tags from Subscription Folders: ${e.message}`, 'HOME', 'error');
        }
    }

    /**
     * Toggle a channel's presence in a subscription folder
     * @param {string} channelName 
     * @param {string} folderName 
     */
    async toggleFolderForChannel(channelName, folderName) {
        if (!this.folders[folderName]) {
            this.folders[folderName] = [];
        }
        
        const channelIndex = this.folders[folderName].indexOf(channelName);
        let added = false;
        
        if (channelIndex > -1) {
            // Remove
            this.folders[folderName].splice(channelIndex, 1);
        } else {
            // Add
            this.folders[folderName].push(channelName);
            added = true;
        }

        try {
            await chrome.storage.local.set({ 'ypp_subscription_folders': this.folders });
            this.Utils.createToast(added ? `Added to ${folderName}` : `Removed from ${folderName}`);
            await this.loadTags(); // Re-compute mappings
            this.refreshAllTagButtons();
        } catch (e) {
            this.Utils.log(`Failed to update folder assignment: ${e.message}`, 'HOME', 'error');
            this.Utils.createToast('Failed to update folder', 'error');
        }
    }

    /**
     * Refresh the visual state of all loaded tag buttons instantly
     */
    refreshAllTagButtons() {
        const videoItems = document.querySelectorAll('ytd-rich-item-renderer');
        videoItems.forEach(item => {
            const channelName = item.querySelector('#text.ytd-channel-name')?.textContent?.trim();
            const btn = item.querySelector('.ypp-tag-btn');
            if (btn && channelName) {
                const tags = this.channelTags[channelName];
                if (tags && tags.length > 0) {
                    btn.classList.add('tagged');
                    btn.innerHTML = tags[0][0]; // Print the first letter of the first folder name
                } else {
                    btn.classList.remove('tagged');
                    btn.innerHTML = '#';
                }
            }
        });
    }

    /**
     * Organize the feed (Separators, Priorities, Tags)
     */
    organizeFeed() {
        if (!this.isActive) return;

        const contents = document.querySelector(this.CONSTANTS.SELECTORS.GRID_CONTENTS);
        if (!contents) return;

        // Feature 1: Separators removed per user request

        // Process Items in a single pass (Priority, Tags, Watched Status)
        this._processGridItems(contents);
    }

    /**
     * Process grid items in a single pass for performance.
     * @param {HTMLElement} contents 
     */
    _processGridItems(contents) {
        // Handle standalone shelves priority
        const lowPrioritySelectors = ['ytd-rich-shelf-renderer[is-shorts]', 'ytd-reel-shelf-renderer'];
        lowPrioritySelectors.forEach(sel => {
            contents.querySelectorAll(sel).forEach(el => el.classList.add('ypp-priority-low'));
        });

        // Single pass on video items
        const videoItems = contents.querySelectorAll('ytd-rich-item-renderer');
        videoItems.forEach(item => {
            // 1. Shorts Check Priority
            if (item.querySelector('a[href^="/shorts/"]')) {
                item.classList.add('ypp-priority-low');
            }

            // 2. Hide Watched Check (if enabled)
            if (this.settings?.hideWatched && item.style.display !== 'none') {
                const progressBar = item.querySelector('ytd-thumbnail-overlay-resume-playback-renderer #progress');
                if (progressBar) {
                    const percentage = parseFloat(progressBar.style.width);
                    if (!isNaN(percentage) && percentage > 80) {
                        item.style.display = 'none';
                    }
                }
            }

            // 3. Inject Tag Buttons (skip if hidden or already injected)
            if (item.style.display !== 'none' && !item.querySelector('.ypp-tag-btn')) {
                const thumbnail = item.querySelector('ytd-thumbnail');
                if (thumbnail) {
                    const btn = document.createElement('button');
                    btn.className = 'ypp-tag-btn';
                    btn.innerHTML = '#';
                    btn.title = 'Tag Channel';
            
                    const channelName = item.querySelector('#text.ytd-channel-name')?.textContent?.trim();
                    if (channelName && this.channelTags[channelName]) {
                        const tags = this.channelTags[channelName];
                        if (tags && tags.length > 0) {
                            btn.classList.add('tagged');
                            btn.innerHTML = tags[0][0]; 
                        }
                    }
            
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleTagClick(e, channelName, btn);
                    };
                    thumbnail.appendChild(btn);
                }
            }
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

        const folderNames = Object.keys(this.folders);
        
        if (folderNames.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'ypp-tag-option';
            emptyMsg.textContent = 'No Subfolders created yet';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.cursor = 'default';
            popover.appendChild(emptyMsg);
        } else {
            folderNames.forEach(folderName => {
                const item = document.createElement('div');
                item.className = 'ypp-tag-option';
                
                // Show a checkmark if this channel is already in this folder
                const isInFolder = this.channelTags[channelName] && this.channelTags[channelName].includes(folderName);
                item.innerHTML = isInFolder ? `<strong style="color:var(--ypp-accent)">✓</strong> ${folderName}` : folderName;
                
                item.onclick = async () => {
                    await this.toggleFolderForChannel(channelName, folderName);
                    this.removePopover();
                };
                popover.appendChild(item);
            });
        }

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
