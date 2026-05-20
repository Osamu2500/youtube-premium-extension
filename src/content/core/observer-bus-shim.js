/**
 * ObserverBusShim
 * Wraps window.YPP.sharedObserver (DOMObserver) and exposes the same
 * register(id, selector, callback) / unregister(id) API that all existing
 * features use — so zero callsite changes are needed when ObserverBus lands.
 *
 * Internal map: id → { selector, callback }
 * unregister(id) looks up the stored entry and delegates to the underlying
 * observer's unregister(id) which removes the slot by id from its registry.
 */
window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

window.YPP.core.ObserverBusShim = class ObserverBusShim {
    constructor(underlyingObserver) {
        /**
         * The real observer — DOMObserver today, ObserverBus tomorrow.
         * @type {Object}
         */
        this._observer = underlyingObserver;

        /**
         * Internal slot registry: id → { selector, callback }
         * Needed so unregister(id) can call the underlying API correctly.
         * @type {Map<string, {selector: string, callback: Function}>}
         */
        this._slots = new Map();
    }

    /**
     * Register a CSS selector to watch.
     * Delegates to the underlying DOMObserver immediately.
     *
     * @param {string}   id       - Unique slot identifier
     * @param {string}   selector - CSS selector to watch for in the DOM
     * @param {Function} callback - Invoked with matched Element[] when found
     */
    register(id, selector, callback) {
        if (!id || !selector) return;
        this._slots.set(id, { selector, callback });
        this._observer.register(id, selector, callback);
    }

    /**
     * Unregister a slot by id.
     * Cleans up the internal map and delegates to the underlying observer.
     *
     * @param {string} id - Slot id previously passed to register()
     */
    unregister(id) {
        if (!this._slots.has(id)) return;
        this._slots.delete(id);
        this._observer.unregister(id);
    }

    /**
     * Unregister every slot owned by this shim instance.
     * Call from _teardown() for a full cleanup pass.
     */
    unregisterAll() {
        for (const id of this._slots.keys()) {
            this._observer.unregister(id);
        }
        this._slots.clear();
    }

    /**
     * Pass-through: start the underlying MutationObserver.
     */
    start() {
        this._observer.start?.();
    }

    /**
     * Pass-through: stop the underlying MutationObserver.
     * NOTE: do NOT call this from individual feature teardowns —
     * the observer is shared. Use unregisterAll() instead.
     */
    stop() {
        this._observer.stop?.();
    }
};

// Wrap the global sharedObserver with the shim once, at module load time.
// All existing code that calls window.YPP.sharedObserver.register(...)
// transparently gets shim behaviour; the MutationObserver keeps running.
if (
    window.YPP.sharedObserver &&
    !(window.YPP.sharedObserver instanceof window.YPP.core.ObserverBusShim)
) {
    window.YPP.sharedObserver = new window.YPP.core.ObserverBusShim(window.YPP.sharedObserver);
}
