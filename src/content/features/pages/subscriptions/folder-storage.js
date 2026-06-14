/**
 * Folder Storage
 * Owns: Chrome storage I/O, folders object, folderConfig object, and all
 * CRUD operations (add/delete folder, add/remove channel from folder).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.FolderStorage = class FolderStorage {

    constructor() {
        this.STORAGE_KEY = 'ypp_subscription_folders';

        /** @type {Object<string, string[]>} Folder name → channel names */
        this.folders = {
            'Favorites': [],
            'Tech':      [],
            'Gaming':    [],
        };

        /** @type {Object<string, {icon?: string, color?: string}>} Per-folder UI config */
        this.folderConfig = {};
        
        /** @type {string[]} Keywords to hide from feed */
        this.keywordBlacklist = [];
    }

    // =========================================================================
    // PERSISTENCE
    // =========================================================================

    /** Load folders and config from Chrome storage. */
    async load() {
        try {
            const [foldersData, configData, blacklistData] = await Promise.all([
                window.YPP.StorageManager.get(this.STORAGE_KEY),
                window.YPP.StorageManager.get('ypp_folder_config'),
                window.YPP.StorageManager.get('ypp_keyword_blacklist')
            ]);

            if (foldersData) {
                this.folders = foldersData;
            } else {
                // First run — persist defaults
                await this.save();
            }

            this.folderConfig = configData || {};
            this.keywordBlacklist = blacklistData || [];
        } catch (e) {
            window.YPP.Utils?.log('Failed to load subscription folders', 'FolderStorage', 'error');
        }
    }

    /** Persist current folders and config to Chrome storage. */
    async save() {
        try {
            await Promise.all([
                window.YPP.StorageManager.set(this.STORAGE_KEY, this.folders),
                window.YPP.StorageManager.set('ypp_folder_config', this.folderConfig),
                window.YPP.StorageManager.set('ypp_keyword_blacklist', this.keywordBlacklist)
            ]);
        } catch (e) {
            window.YPP.Utils?.log('Failed to save subscription folders', 'FolderStorage', 'error');
        }
    }

    // =========================================================================
    // FOLDER CRUD
    // =========================================================================

    /**
     * Add a new empty folder.
     * @param {string} folderName
     * @returns {boolean} true if created
     */
    addFolder(folderName) {
        if (!folderName || this.folders[folderName]) return false;
        this.folders[folderName] = [];
        this.save();
        return true;
    }

    /**
     * Delete a folder entirely.
     * @param {string} folderName
     * @returns {boolean} true if deleted
     */
    deleteFolder(folderName) {
        if (!this.folders[folderName]) return false;
        delete this.folders[folderName];
        if (this.folderConfig[folderName]) delete this.folderConfig[folderName];
        this.save();
        return true;
    }

    /**
     * Reorder a folder to a new index in the list.
     * @param {string} folderName 
     * @param {number} newIndex 
     */
    reorderFolder(folderName, newIndex) {
        if (!this.folders[folderName]) return false;
        const keys = Object.keys(this.folders);
        const oldIndex = keys.indexOf(folderName);
        if (oldIndex === -1 || oldIndex === newIndex) return false;

        keys.splice(oldIndex, 1);
        keys.splice(newIndex, 0, folderName);

        const newFolders = {};
        for (const key of keys) {
            newFolders[key] = this.folders[key];
        }
        
        this.folders = newFolders;
        this.save();
        return true;
    }

    // =========================================================================
    // CHANNEL CRUD
    // =========================================================================

    /**
     * Add a channel to a folder (idempotent).
     * @param {string} channelName
     * @param {string} folderName
     * @returns {boolean} true if added (false if already present or folder missing)
     */
    addChannelToFolder(channelName, folderName) {
        if (!this.folders[folderName]) return false;
        if (this.folders[folderName].includes(channelName)) return false;
        this.folders[folderName].push(channelName);
        this.save();
        return true;
    }

    /**
     * Remove a channel from a folder.
     * @param {string} channelName
     * @param {string} folderName
     * @returns {boolean} true if removed
     */
    removeChannelFromFolder(channelName, folderName) {
        if (!this.folders[folderName]) return false;
        const idx = this.folders[folderName].indexOf(channelName);
        if (idx === -1) return false;
        this.folders[folderName].splice(idx, 1);
        this.save();
        return true;
    }
};
