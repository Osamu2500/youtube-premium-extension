window.YPP.features.SubscriptionManager = class SubscriptionManager {
    constructor() {
        this.logger = window.YPP.Utils || console;
        this.groups = {}; // { groupName: [channelId1, channelId2, ...] }
        this.channels = []; // [{ id, name, icon, url }, ...]
        this.isInitialized = false;
        this.STORAGE_KEY = 'yt_subscription_groups';
    }

    async init() {
        if (this.isInitialized) return;

        await this.loadGroups();
        window.YPP.Utils.log('Initialized Subscription Manager', 'SubManager');
        this.isInitialized = true;
    }

    async loadGroups() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            this.groups = result[this.STORAGE_KEY] || {};
            window.YPP.Utils.log('Loaded groups', 'SubManager', 'debug');
        } catch (error) {
            window.YPP.Utils.log(`Failed to load groups: ${error?.message}`, 'SubManager', 'error');
        }
    }

    async saveGroups() {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: this.groups });
            window.YPP.Utils.log('Saved groups', 'SubManager', 'debug');
        } catch (error) {
            window.YPP.Utils.log(`Failed to save groups: ${error?.message}`, 'SubManager', 'error');
        }
    }

    createGroup(groupName) {
        if (this.groups[groupName]) {
            window.YPP.Utils.log(`Group "${groupName}" already exists.`, 'SubManager', 'warn');
            return false;
        }
        this.groups[groupName] = [];
        // saveGroups is async but we intentionally don't await here — the in-memory
        // state is updated synchronously and the UI re-renders immediately. Storage
        // write is fire-and-forget; errors are logged inside saveGroups().
        this.saveGroups();
        return true;
    }

    deleteGroup(groupName) {
        if (!this.groups[groupName]) return false;
        delete this.groups[groupName];
        this.saveGroups();
        return true;
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
