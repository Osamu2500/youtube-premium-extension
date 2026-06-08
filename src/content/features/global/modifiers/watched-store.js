/**
 * WatchedStore — Singleton
 * ──────────────────────────────────────────────────────────────────────────
 * Single source of truth for the "watched" video ID list. Replaces the
 * brittle pattern of: featureManager.getFeature('markWatched')._watchedIds
 *
 * Loaded once from chrome.storage on init(), then kept in-memory.
 * All features read/write through this store:
 *   - MarkWatched  → calls add() / remove()
 *   - HideWatched  → calls has() / getAll()
 *   - WatchHistory → calls has()
 *
 * Subscribers (e.g. HideWatched) listen via onChange() and react to changes
 * without polling or coupling to other feature classes.
 */
window.YPP = window.YPP || {};

window.YPP.WatchedStore = (() => {
    const STORAGE_KEY = 'ypp_watched_ids';
    let _ids = new Set();
    let _loaded = false;
    const _listeners = new Set();

    /** Load IDs from chrome.storage. Resolves when done. */
    async function load() {
        if (_loaded) return;
        return new Promise(resolve => {
            window.YPP.StorageManager.get(STORAGE_KEY).then(arr => {
                if (Array.isArray(arr)) _ids = new Set(arr);
                _loaded = true;
                resolve();
            });
        });
    }

    /** Persist in-memory set to chrome.storage */
    function _persist() {
        window.YPP.StorageManager.set(STORAGE_KEY, [..._ids]);
    }

    /** Notify all registered change listeners */
    function _notify(change) {
        _listeners.forEach(fn => { try { fn(change); } catch (e) {} });
    }

    return {
        /** @returns {Promise<void>} Must be awaited before first read */
        load,

        /** @param {string} id */
        has(id) { return _ids.has(id); },

        /** @returns {Set<string>} Live reference — do not mutate directly */
        getAll() { return _ids; },

        /** @param {string} id — marks as watched, fires onChange */
        add(id) {
            if (!id || _ids.has(id)) return;
            _ids.add(id);
            _persist();
            _notify({ type: 'add', id });
            window.YPP.events?.emit('watched:updated', { videoId: id });
        },

        /** @param {string} id — unmarks watched, fires onChange */
        remove(id) {
            if (!id || !_ids.has(id)) return;
            _ids.delete(id);
            _persist();
            _notify({ type: 'remove', id });
            window.YPP.events?.emit('watched:updated', { videoId: id });
        },

        /**
         * Register a listener called whenever the store changes.
         * @param {function({ type: 'add'|'remove', id: string }): void} fn
         * @returns {function} Unsubscribe function
         */
        onChange(fn) {
            _listeners.add(fn);
            return () => _listeners.delete(fn);
        },

        /** Sync the in-memory set from a known Set (used by MarkWatched on init) */
        seed(idSet) {
            if (idSet instanceof Set) {
                _ids = new Set(idSet);
                _loaded = true;
            }
        },

        /** @returns {number} Count of watched videos */
        get size() { return _ids.size; },
    };
})();
