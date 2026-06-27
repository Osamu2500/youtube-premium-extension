/**
 * Google Drive AppData Sync for YouTube Premium Plus
 * Uses the hidden appDataFolder to securely store subscription groups across devices.
 */

const FILE_NAME = 'ypp_full_backup.json';
const LEGACY_FILE_NAME = 'ypp_subscription_folders_backup.json';

/**
 * Gets an OAuth2 token from chrome.identity
 */
async function getAuthToken(interactive = false) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(token);
        });
    });
}

/**
 * Finds the backup file in the Drive AppData folder
 */
async function findBackupFile(token, fileName = FILE_NAME) {
    const query = encodeURIComponent(`name='${fileName}'`);
    const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,modifiedTime)`;
    
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        chrome.identity.removeCachedAuthToken({ token }, () => {});
        throw new Error('Failed to search Drive files.');
    }
    
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
}

/**
 * Syncs ALL local extension data up to Google Drive
 */
export async function syncUp() {
    try {
        const token = await getAuthToken(true);
        // Get ALL local storage data by passing null
        const storage = await chrome.storage.local.get(null);
        
        // Exclude internal state keys from backup
        const keysToExclude = ['timerState', 'ypp_last_sync_time', 'ypp_backup_time', 'ypp_settings_backup'];
        keysToExclude.forEach(key => delete storage[key]);
        
        const fileContent = JSON.stringify(storage);

        const existingFile = await findBackupFile(token, FILE_NAME);
        
        const metadata = {
            name: FILE_NAME,
            parents: ['appDataFolder']
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        let fetchUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        // If file exists, update it instead of creating a new one
        if (existingFile) {
            fetchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
            method = 'PATCH';
        }

        const response = await fetch(fetchUrl, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: form
        });

        if (!response.ok) {
            chrome.identity.removeCachedAuthToken({ token }, () => {});
            throw new Error('Failed to upload sync data to Drive');
        }
        
        console.log('[YPP] Successfully backed up all data to Google Drive.');
        
        // Save the last sync time
        const syncTime = new Date().toISOString();
        await chrome.storage.local.set({ ypp_last_sync_time: syncTime });
        
        return { success: true, timestamp: syncTime };
    } catch (error) {
        console.error('[YPP] Sync Up Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Syncs the backup file down from Google Drive into local storage
 */
export async function syncDown() {
    try {
        const token = await getAuthToken(true);
        
        // Try finding the new full backup file first
        let existingFile = await findBackupFile(token, FILE_NAME);
        let isLegacy = false;
        
        // If not found, try finding the legacy subscription folders backup
        if (!existingFile) {
            existingFile = await findBackupFile(token, LEGACY_FILE_NAME);
            isLegacy = true;
        }
        
        if (!existingFile) {
            console.log('[YPP] No backup file found on Google Drive.');
            return { success: true, message: 'No backup found' };
        }

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            chrome.identity.removeCachedAuthToken({ token }, () => {});
            throw new Error('Failed to download sync data from Drive');
        }
        
        const downloadedData = await response.json();
        
        if (isLegacy) {
            // Legacy backup only contained subscription folders, so we wrap it properly
            await chrome.storage.local.set({ ypp_subscription_folders: downloadedData });
            console.log('[YPP] Successfully restored legacy subscription groups from Google Drive.');
        } else {
            // Full backup: remove keys that shouldn't overwrite local device state
            const keysToExclude = ['timerState', 'ypp_last_sync_time', 'ypp_backup_time', 'ypp_settings_backup'];
            keysToExclude.forEach(key => delete downloadedData[key]);
            
            await chrome.storage.local.set(downloadedData);
            console.log('[YPP] Successfully restored all memory from Google Drive.');
        }
        
        const syncTime = new Date().toISOString();
        await chrome.storage.local.set({ ypp_last_sync_time: syncTime });
        
        return { success: true, data: downloadedData, timestamp: syncTime };
    } catch (error) {
        console.error('[YPP] Sync Down Error:', error);
        return { success: false, error: error.message };
    }
}
