/**
 * Next-Generation DOM Observer
 * Processes ONLY mutated nodes instead of re-evaluating the entire DOM.
 * Integrates directly with the EventBus to decouple features.
 */
window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

window.YPP.core.DOMObserver = class DOMObserver {
    constructor() {
        this.registry = new Map();
        // Bind handleMutations to ensure correct 'this' context in the callback
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.isRunning = false;
        this.events = window.YPP.events; // Reference to global event bus
    }

    /**
     * Start the global observer
     */
    start() {
        if (this.isRunning) return;
        
        // Observe exactly what we need
        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        this.isRunning = true;
    }

    /**
     * Stop the global observer
     */
    stop() {
        if (!this.isRunning) return;
        this.observer.disconnect();
        this.isRunning = false;
    }

    /**
     * Register a CSS selector to watch for.
     * Triggers both standard callbacks and EventBus emits.
     * 
     * @param {string} id - Unique identifier for the listener
     * @param {string} selector - CSS selector
     * @param {Function} [callback] - Direct callback (optional, use EventBus preferably)
     * @param {boolean} [immediate=true] - Run immediately on existing elements
     */
    register(id, selector, callback, immediate = true) {
        if (!id || !selector) return;

        this.registry.set(id, { selector, callback });

        // If immediate is true, process existing elements matching the selector
        if (immediate) {
            try {
                const existingElements = Array.from(document.querySelectorAll(selector));
                if (existingElements.length > 0) {
                    if (callback) {
                        callback(existingElements);
                    }
                    if (this.events) {
                        this.events.emit(`dom:found:${id}`, existingElements);
                    }
                }
            } catch (e) {
                console.error(`[YPP:DOMObserver] Invalid selector registered: ${selector}`);
            }
        }
    }

    /**
     * Unregister a selector
     * @param {string} id 
     */
    unregister(id) {
        this.registry.delete(id);
    }

    /**
     * Process mutation batches
     * EXTREMELY performance sensitive — no full-page DOM queries allowed here
     * 
     * @param {MutationRecord[]} mutations 
     */
    handleMutations(mutations) {
        // Emit raw mutation event first
        if (this.events) {
            this.events.emit("dom:mutated", mutations);
        }

        // Fast escape if no selectors registered
        if (this.registry.size === 0) return;

        // Use requestAnimationFrame to yield to browser rendering
        requestAnimationFrame(() => {
            const addedElementNodes = [];
            
            // 1. Flatten all added Element nodes
            for (let i = 0; i < mutations.length; i++) {
                const added = mutations[i].addedNodes;
                for (let j = 0; j < added.length; j++) {
                    const node = added[j];
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        addedElementNodes.push(node);
                    }
                }
            }

            if (addedElementNodes.length === 0) return;

            // 2. Map matches against registry
            const matchedBuckets = new Map(); // Map<id, Element[]>

            for (const [id, { selector }] of this.registry.entries()) {
                const matches = [];

                for (let k = 0; k < addedElementNodes.length; k++) {
                    const node = addedElementNodes[k];

                    // Check if node ITSELF matches
                    if (node.matches && node.matches(selector)) {
                        matches.push(node);
                    }
                    
                    // Check if node CONTAINS matches (critical for large rendered blocks)
                    if (node.querySelectorAll) {
                        const children = node.querySelectorAll(selector);
                        for (let c = 0; c < children.length; c++) {
                            matches.push(children[c]);
                        }
                    }
                }

                if (matches.length > 0) {
                    matchedBuckets.set(id, matches);
                }
            }

            // 3. Dispatch results
            for (const [id, matches] of matchedBuckets.entries()) {
                const data = this.registry.get(id);
                if (data.callback) {
                    try {
                        data.callback(matches);
                    } catch (e) {
                        console.error(`[YPP:DOMObserver] Direct callback error for '${id}':`, e);
                    }
                }

                if (this.events) {
                    this.events.emit(`dom:found:${id}`, matches);
                }
            }
        });
    }
};

window.YPP.sharedObserver = new window.YPP.core.DOMObserver();
