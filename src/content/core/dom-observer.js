/**
 * Next-Generation DOM Observer
 * Processes ONLY mutated nodes instead of re-evaluating the entire DOM.
 * Integrates directly with the EventBus to decouple features.
 *
 * Performance notes:
 *  - All mutation batches are coalesced into a SINGLE requestAnimationFrame flush.
 *    Previously, each batch scheduled its own rAF, so 50 batches/sec → 50 frames/sec
 *    of JS work. Now it's always ≤1 frame per browser paint cycle.
 *  - dom:mutated is only emitted when at least one listener is subscribed.
 */
window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

window.YPP.core.DOMObserver = class DOMObserver {
    constructor() {
        this.registry = new Map();
        this.observer = new MutationObserver(this._onMutations.bind(this));
        this.isRunning = false;
        this.events = window.YPP.events; // Reference to global event bus

        // --- Coalescing state ---
        /** @type {Element[]} Accumulated added element nodes not yet processed */
        this._pendingNodes = [];
        /** @type {boolean} Whether a rAF flush is already scheduled */
        this._rafPending = false;
        /** @type {boolean} Whether dom:mutated has any subscribers (lazy-checked) */
        this._hasMutatedListeners = false;
    }

    /**
     * Start the global observer
     */
    start() {
        if (this.isRunning) return;
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
        this._pendingNodes = [];
        this._rafPending = false;
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

    // =========================================================================
    // INTERNAL — Mutation handling with single-rAF coalescing
    // =========================================================================

    /**
     * Raw MutationObserver callback.
     * Accumulates added Element nodes and schedules ONE rAF flush per paint cycle.
     * EXTREMELY performance sensitive — no DOM queries here.
     *
     * @param {MutationRecord[]} mutations
     */
    _onMutations(mutations) {
        // Conditionally emit raw mutation event (only when subscribed to)
        if (this.events && this._hasMutatedListeners) {
            this.events.emit('dom:mutated', mutations);
        }

        // Fast escape if no selectors registered
        if (this.registry.size === 0) return;

        // 1. Flatten added Element nodes into the shared pending list
        for (let i = 0; i < mutations.length; i++) {
            const added = mutations[i].addedNodes;
            for (let j = 0; j < added.length; j++) {
                const node = added[j];
                if (node.nodeType === Node.ELEMENT_NODE) {
                    this._pendingNodes.push(node);
                }
            }
        }

        // 2. Schedule a single rAF flush if not already pending
        if (!this._rafPending && this._pendingNodes.length > 0) {
            this._rafPending = true;
            requestAnimationFrame(() => this._flush());
        }
    }

    /**
     * Flush all accumulated pending nodes against the registry.
     * Called at most once per browser paint cycle regardless of how many
     * mutation batches arrived since the last paint.
     */
    _flush() {
        this._rafPending = false;

        const nodesToProcess = this._pendingNodes;
        this._pendingNodes = []; // Reset before processing to capture new mutations

        if (nodesToProcess.length === 0) return;

        // Build match buckets: Map<id, Element[]>
        const matchedBuckets = new Map();

        for (const [id, { selector }] of this.registry.entries()) {
            const matches = [];

            for (let k = 0; k < nodesToProcess.length; k++) {
                const node = nodesToProcess[k];

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

        // Dispatch results
        for (const [id, matches] of matchedBuckets.entries()) {
            const data = this.registry.get(id);
            if (!data) continue; // Guard against concurrent unregister

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
    }

    /**
     * Notify the observer that dom:mutated has active subscribers.
     * Called by the EventBus integration when a listener is added.
     * Avoids checking listener count on every single mutation.
     * @param {boolean} hasListeners
     */
    setHasMutatedListeners(hasListeners) {
        this._hasMutatedListeners = hasListeners;
    }
};

window.YPP.sharedObserver = new window.YPP.core.DOMObserver();
