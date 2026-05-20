'use strict';
/**
 * @author YouTube Premium+ Team
 * @purpose Centralized MutationObserver using requestAnimationFrame to drastically reduce CPU overhead.
 * @dependencies window.YPP
 * @example
 * YPP.ObserverBus.subscribe('.ytd-video-renderer', handleVideos, 'HideShorts');
 */
window.YPP = window.YPP || {};

window.YPP.ObserverBus = class ObserverBus {
    constructor() {
        this.subscribers = new Map();
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.scheduled = false;
        this.pendingMutations = [];
    }

    start() {
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stop() {
        this.observer.disconnect();
    }

    subscribe(selector, callback, ownerName = 'Unknown') {
        if (!this.subscribers.has(selector)) {
            this.subscribers.set(selector, new Map());
        }
        this.subscribers.get(selector).set(callback, { owner: ownerName });
    }

    unsubscribe(selector, callback) {
        if (this.subscribers.has(selector)) {
            this.subscribers.get(selector).delete(callback);
            if (this.subscribers.get(selector).size === 0) {
                this.subscribers.delete(selector);
            }
        }
    }

    handleMutations(mutations) {
        this.pendingMutations.push(...mutations);
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.processQueue());
        }
    }

    processQueue() {
        this.scheduled = false;
        
        for (const [selector, callbackMap] of this.subscribers.entries()) {
            let matches;
            try {
                // ⚠️ YouTube-Fragile: Custom tags must be valid selectors
                matches = document.querySelectorAll(selector);
            } catch (e) {
                const owners = Array.from(callbackMap.values()).map(m => m.owner).join(', ');
                console.warn(`[YPP ObserverBus] Invalid selector "${selector}" registered by [${owners}]`, e);
                continue; 
            }

            if (matches && matches.length > 0) {
                for (const [callback, _] of callbackMap.entries()) {
                    try {
                        callback(matches);
                    } catch (e) {
                        console.error(`[YPP ObserverBus] Callback error for "${selector}"`, e);
                    }
                }
            }
        }
        this.pendingMutations = [];
    }
};
// Instantiate global instance
window.YPP.observerBus = new window.YPP.ObserverBus();
