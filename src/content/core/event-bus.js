/**
 * EventBus - Central Event Emitter
 * Decouples features from each other and from direct DOM observers.
 */
window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

window.YPP.core.EventBus = class EventBus {
    static EVENTS = {
        DOM_MUTATED: 'dom:mutated'
    };

    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @listens EventBus#event
     * @param {string} event - The event name to listen for
     * @param {Function} handler - The callback function
     * @returns {Function} An unsubscribe function
     */
    on(event, handler) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(handler);

        // Notify the DOMObserver when 'dom:mutated' gets its first subscriber
        // so it can enable the raw mutation emit path (which is otherwise suppressed
        // for performance when nothing is listening).
        if (event === EventBus.EVENTS.DOM_MUTATED) {
            window.YPP?.sharedObserver?.setHasMutatedListeners(true);
        }

        // Return unsubscribe mechanism
        return () => {
            this.off(event, handler);
        };
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - The event name
     * @param {Function} handler - The callback function
     */
    off(event, handler) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(h => h !== handler);
        
        // Update listener flag when the last 'dom:mutated' subscriber unsubscribes
        if (event === EventBus.EVENTS.DOM_MUTATED) {
            const remaining = (this.listeners[event] || []).length;
            window.YPP?.sharedObserver?.setHasMutatedListeners(remaining > 0);
        }
    }

    /**
     * Subscribe to an event, but only trigger once
     * @param {string} event 
     * @param {Function} handler 
     */
    once(event, handler) {
        const unsub = this.on(event, (data) => {
            unsub();
            handler(data);
        });
    }

    /**
     * Emit an event to all subscribers
     * @fires EventBus#event
     * @param {string} event - The event name
     * @param {any} data - Data to pass to handlers
     */
    emit(event, data) {
        // Shallow copy the array to prevent iteration issues if handlers add/remove listeners during execution
        const handlers = [...(this.listeners[event] || [])];
        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                if (window.YPP?.errorHandler) {
                    window.YPP.errorHandler.handleError(error, `[YPP:EventBus] Error in handler for event '${event}'`);
                } else {
                    console.error(`[YPP:EventBus] Error in handler for event '${event}':`, error);
                }
            }
        }
    }

    /**
     * Remove all listeners for a specific event
     * @param {string} event 
     */
    clear(event) {
        if (event) {
            delete this.listeners[event];
            if (event === EventBus.EVENTS.DOM_MUTATED) {
                window.YPP?.sharedObserver?.setHasMutatedListeners(false);
            }
        } else {
            this.listeners = {};
            window.YPP?.sharedObserver?.setHasMutatedListeners(false);
        }
    }
};

// Instantiate a global singleton for immediate use by features
window.YPP.events = new window.YPP.core.EventBus();
