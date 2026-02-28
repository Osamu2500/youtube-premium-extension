/**
 * Element Cache Utility
 * Reduces repeated DOM queries by caching elements and invalidating when they're removed
 * 
 * @example
 * const cache = new ElementCache();
 * const video = cache.get('video', 'video');
 * cache.clear(); // Clear all cached elements
 */
class ElementCache {
    constructor() {
        this._cache = new Map();
        this._observers = new Map();
    }

    /**
     * Get an element by key, querying DOM only if not cached or invalid
     * @param {string} key - Unique cache key
     * @param {string} selector - CSS selector to query
     * @param {Element} [context=document] - Context to query within
     * @returns {Element|null}
     */
    get(key, selector, context = document) {
        // Check if cached element still exists in DOM
        if (this._cache.has(key)) {
            const cached = this._cache.get(key);
            if (cached && document.contains(cached)) {
                return cached;
            }
            // Cache invalid, remove it
            this._cache.delete(key);
        }

        // Query for element
        const element = context.querySelector(selector);
        
        if (element) {
            this._cache.set(key, element);
        }
        
        return element;
    }

    /**
     * Get multiple elements by key
     * @param {string} key - Unique cache key
     * @param {string} selector - CSS selector to query
     * @param {Element} [context=document] - Context to query within
     * @returns {NodeList}
     */
    getAll(key, selector, context = document) {
        // Note: querySelectorAll returns a static NodeList, so we don't cache it
        // as the list can become stale. This method is here for consistency.
        return context.querySelectorAll(selector);
    }

    /**
     * Manually set a cached element
     * @param {string} key - Cache key
     * @param {Element} element - Element to cache
     */
    set(key, element) {
        if (element && element instanceof Element) {
            this._cache.set(key, element);
        }
    }

    /**
     * Check if a key exists and is valid
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        const cached = this._cache.get(key);
        if (cached && document.contains(cached)) {
            return true;
        }
        this._cache.delete(key);
        return false;
    }

    /**
     * Remove specific cached element
     * @param {string} key - Cache key
     */
    remove(key) {
        this._cache.delete(key);
    }

    /**
     * Clear all cached elements
     */
    clear() {
        this._cache.clear();
    }

    /**
     * Get cache statistics without forcing synchronous DOM reflows.
     * The cache lazily self-invalidates on 'get' anyway, so returning 
     * the raw size is much faster and usually accurate enough for stats.
     * @returns {Object}
     */
    getStats() {
        return { 
            totalCachedItems: this._cache.size,
            activeObservers: this._observers.size
        };
    }

    /**
     * Watch for element removal and clear cache when removed
     * @param {string} key - Cache key to watch
     * @param {Element} element - Element to watch
     */
    watch(key, element) {
        if (!element || !(element instanceof Element)) return;

        // Create observer for this element
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach(node => {
                        if (node === element || node.contains(element)) {
                            this.remove(key);
                            observer.disconnect();
                            this._observers.delete(key);
                        }
                    });
                }
            }
        });

        // Observe parent for removal
        const parent = element.parentNode;
        if (parent) {
            observer.observe(parent, { childList: true });
            this._observers.set(key, observer);
        }
    }

    /**
     * Stop watching all elements and disconnect observers
     */
    destroy() {
        this._observers.forEach(observer => observer.disconnect());
        this._observers.clear();
        this._cache.clear();
    }
}

// Export for use in features
if (typeof window !== 'undefined') {
    window.ElementCache = ElementCache;
}
