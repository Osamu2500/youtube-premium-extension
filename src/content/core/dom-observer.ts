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
        /** @type {string|null} Cached combined selector to avoid string building on every frame */
        this._cachedSelector = null;
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
        this._cachedSelector = null; // Invalidate cache

        if (immediate) {
            let existingElements = [];
            try {
                existingElements = Array.from(document.querySelectorAll(selector));
            } catch (e) {
                console.error(`[YPP:DOMObserver] Invalid selector registered: ${selector}`);
                return; // Stop here if selector is invalid
            }

            if (existingElements.length > 0) {
                if (callback) {
                    try {
                        callback(existingElements);
                    } catch (e) {
                        console.error(`[YPP:DOMObserver] Error in immediate callback for '${id}':`, e);
                    }
                }
                if (this.events) {
                    this.events.emit(`dom:found:${id}`, existingElements);
                }
            }
        }
    }

    /**
     * Unregister a selector
     * @param {string} id
     */
    unregister(id) {
        if (this.registry.has(id)) {
            this.registry.delete(id);
            this._cachedSelector = null; // Invalidate cache
        }
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

        if (nodesToProcess.length === 0 || this.registry.size === 0) return;

        // 1. Combine all registered selectors into one massive query (cached)
        let combinedSelector = this._cachedSelector;
        if (!combinedSelector) {
            const uniqueSelectors = Array.from(new Set(Array.from(this.registry.values()).map(d => d.selector)));
            combinedSelector = uniqueSelectors.join(',');
            this._cachedSelector = combinedSelector;
        }

        // 2. Extract valid nodes to process.
        // MutationObserver.addedNodes already yields root elements of an inserted subtree,
        // so we don't need expensive manual filtering for descendants.
        const rootNodes = new Set();
        
        for (let i = 0; i < nodesToProcess.length; i++) {
            const node = nodesToProcess[i];
            if (node.isConnected) {
                rootNodes.add(node);
            }
        }

        // 3. Find all matching elements across all root newly added nodes in a single pass
        const matchedElements = new Set();
        for (const node of rootNodes) {
            
            // Check node itself
            if (node.matches && node.matches(combinedSelector)) {
                matchedElements.add(node);
            }
            
            // Check descendants
            if (node.querySelectorAll) {
                try {
                    const children = node.querySelectorAll(combinedSelector);
                    for (let c = 0; c < children.length; c++) {
                        matchedElements.add(children[c]);
                    }
                } catch(e) {
                    // Ignore bad queries
                }
            }
        }

        // 4. Distribute matched elements to their respective listeners
        const matchedBuckets = new Map();
        if (matchedElements.size > 0) {
            for (const el of matchedElements) {
                if (!el.matches) continue;
                for (const [id, { selector }] of this.registry.entries()) {
                    if (el.matches(selector)) {
                        let matches = matchedBuckets.get(id);
                        if (!matches) {
                            matches = [];
                            matchedBuckets.set(id, matches);
                        }
                        matches.push(el);
                    }
                }
            }
        }

        // 4. Dispatch results
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
