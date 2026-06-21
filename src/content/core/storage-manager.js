'use strict';
/**
 * @author YouTube Premium+ Team
 * @purpose Unified storage manager with write queue, TTL pruning, and quota protection.
 * @dependencies window.YPP
 * @example
 * await YPP.StorageManager.set('ypp_data', myObj, 90); // 90 days TTL
 */
window.YPP = window.YPP || {};

window.YPP.StorageManager = class StorageManager {
    static CONFIG = {
        STORAGE_AREA: 'local',
        LOG_CATEGORY: 'STORAGE',
        EVENTS: {
            CHANGED: 'storage:changed',
            CHANGED_KEY: 'storage:changed:'
        }
    };

    static _writeQueue = Promise.resolve();
    static _quotaWarningCallbacks = new Set();
    static _MAX_BYTES = 5242880; 
    static _cache = new Map();
    static _cacheInitialized = false;
    static _inflightRequests = new Map();

    static _initCacheListener() {
        if (this._cacheInitialized) return;
        this._cacheInitialized = true;
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== StorageManager.CONFIG.STORAGE_AREA) return;
            for (const [key, { newValue }] of Object.entries(changes)) {
                let payloadData = newValue;
                if (newValue === undefined) {
                    this._cache.delete(key);
                    payloadData = undefined;
                } else {
                    try {
                        const parsed = JSON.parse(newValue);
                        this._cache.set(key, parsed);
                        payloadData = parsed.data;
                    } catch (e) {
                        this._cache.set(key, { data: newValue });
                        payloadData = newValue;
                    }
                }
                
                if (window.YPP.events) {
                    window.YPP.events.emit(`${StorageManager.CONFIG.EVENTS.CHANGED_KEY}${key}`, payloadData);
                    window.YPP.events.emit(StorageManager.CONFIG.EVENTS.CHANGED, { key, newValue: payloadData });
                }
            }
        });
    }

    static async set(key, value, ttlDays = null) {
        const previousQueue = this._writeQueue;
        let resolveQueue;
        this._writeQueue = new Promise(res => { resolveQueue = res; });

        try {
            await previousQueue;
        } catch (e) {} // ignore previous errors to not stall queue

        try {
            let payload = { data: value };
            if (ttlDays) {
                payload.expiresAt = Date.now() + (ttlDays * 24 * 60 * 60 * 1000);
            }

            const compressedStr = JSON.stringify(payload, (k, v) => v ?? undefined);
            const bytes = new TextEncoder().encode(compressedStr).length;
            const usage = await this.getBytesUsed();
            
            if (usage + bytes > this._MAX_BYTES * 0.9) {
                this._notifyQuotaWarning();
                window.YPP.Utils?.log(`[YPP Storage] Quota almost exceeded! Skipping write for ${key}.`, StorageManager.CONFIG.LOG_CATEGORY, 'warn');
                return false;
            }

            await chrome.storage.local.set({ [key]: compressedStr });
            this._cache.set(key, payload);
            return true;
        } catch (e) {
            window.YPP.Utils?.log(`Set error: ${e.message}`, StorageManager.CONFIG.LOG_CATEGORY, 'error');
            throw e;
        } finally {
            resolveQueue();
        }
    }

    static async get(key) {
        this._initCacheListener();

        if (this._cache.has(key)) {
            const payload = this._cache.get(key);
            if (payload.expiresAt && Date.now() > payload.expiresAt) {
                this._cache.delete(key);
                await chrome.storage.local.remove(key);
                return null;
            }
            return payload.data;
        }

        if (this._inflightRequests.has(key)) {
            return this._inflightRequests.get(key);
        }

        const promise = (async () => {
            let result;
            try {
                result = await chrome.storage.local.get(key);
            } catch (e) {
                window.YPP.Utils?.log(`Get error: ${e.message}`, StorageManager.CONFIG.LOG_CATEGORY, 'error');
                return null;
            }
            if (!result[key]) return null;

            try {
                const payload = JSON.parse(result[key]);
                this._cache.set(key, payload);
                if (payload.expiresAt && Date.now() > payload.expiresAt) {
                    this._cache.delete(key);
                    await chrome.storage.local.remove(key);
                    return null;
                }
                return payload.data;
            } catch (e) {
                this._cache.set(key, { data: result[key] });
                return result[key];
            }
        })();

        this._inflightRequests.set(key, promise);
        
        try {
            return await promise;
        } finally {
            this._inflightRequests.delete(key);
        }
    }

    static async purgeExpired() {
        let allData;
        try {
            allData = await chrome.storage.local.get(null);
        } catch (e) {
            window.YPP.Utils?.log(`Purge error: ${e.message}`, StorageManager.CONFIG.LOG_CATEGORY, 'error');
            return;
        }
        const keysToRemove = [];
        let bytesFreed = 0;
        
        for (const [key, value] of Object.entries(allData)) {
            try {
                const payload = JSON.parse(value);
                if (payload.expiresAt && Date.now() > payload.expiresAt) {
                    keysToRemove.push(key);
                    bytesFreed += new TextEncoder().encode(value).length;
                }
            } catch (e) {
                // Remove corrupted payloads automatically
                keysToRemove.push(key);
            }
        }
        
        if (keysToRemove.length > 0) {
            try {
                await chrome.storage.local.remove(keysToRemove);
                window.YPP.Utils?.log(`[YPP Storage] Purged ${keysToRemove.length} expired keys. Freed ~${(bytesFreed/1024).toFixed(2)} KB.`, StorageManager.CONFIG.LOG_CATEGORY, 'info');
            } catch (e) {
                window.YPP.Utils?.log(`Purge remove error: ${e.message}`, StorageManager.CONFIG.LOG_CATEGORY, 'error');
            }
        }
    }

    static async getBytesUsed() {
        try {
            return await chrome.storage.local.getBytesInUse(null);
        } catch (e) {
            window.YPP.Utils?.log(`GetBytesUsed error: ${e.message}`, StorageManager.CONFIG.LOG_CATEGORY, 'error');
            return 0;
        }
    }

    static onQuotaWarning(callback) {
        this._quotaWarningCallbacks.add(callback);
    }

    static _notifyQuotaWarning() {
        for (const cb of this._quotaWarningCallbacks) {
            cb();
        }
    }
};
