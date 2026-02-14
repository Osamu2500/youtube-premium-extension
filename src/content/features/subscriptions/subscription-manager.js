window.YPP.features.SubscriptionManager = class SubscriptionManager {
    constructor() {
        this.logger = new window.YPP.Utils.Logger('SubscriptionManager');
        this.groups = {}; // { groupName: [channelId1, channelId2, ...] }
        this.channels = []; // [{ id, name, icon, url }, ...]
        this.isInitialized = false;
        this.STORAGE_KEY = 'yt_subscription_groups';
    }

    async init() {
        if (this.isInitialized) return;
        
        await this.loadGroups();
        this.logger.info('Initialized Subscription Manager');
        this.isInitialized = true;
    }

    async loadGroups() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            this.groups = result[this.STORAGE_KEY] || {};
            this.logger.debug('Loaded groups:', this.groups);
        } catch (error) {
            this.logger.error('Failed to load groups:', error);
        }
    }

    async saveGroups() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.groups });
            this.logger.debug('Saved groups');
        } catch (error) {
            this.logger.error('Failed to save groups:', error);
        }
    }

    createGroup(groupName) {
        if (this.groups[groupName]) {
            this.logger.warn(`Group "${groupName}" already exists.`);
            return false;
        }
        this.groups[groupName] = [];
        this.saveGroups();
        return true;
    }

    deleteGroup(groupName) {
        if (this.groups[groupName]) {
            delete this.groups[groupName];
            this.saveGroups();
            return true;
        }
        return false;
    }

    addChannelToGroup(groupName, channel) {
        if (!this.groups[groupName]) return false;
        
        // Check if channel already in group
        if (!this.groups[groupName].some(c => c.id === channel.id)) {
            this.groups[groupName].push(channel);
            this.saveGroups();
            return true;
        }
        return false;
    }

    removeChannelFromGroup(groupName, channelId) {
        if (!this.groups[groupName]) return false;

        const initialLength = this.groups[groupName].length;
        this.groups[groupName] = this.groups[groupName].filter(c => c.id !== channelId);
        
        if (this.groups[groupName].length !== initialLength) {
            this.saveGroups();
            return true;
        }
        return false;
    }

    getGroups() {
        return this.groups;
    }

    getChannelsInGroup(groupName) {
        return this.groups[groupName] || [];
    }
};
