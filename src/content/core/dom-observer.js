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
        this._maxPendingNodes = 100;
        /** @type {boolean} Whether a rAF flush is already scheduled */
        this._rafPending = false;
        /** @type {boolean} Whether dom:mutated has any subscribers (lazy-checked) */
        this._hasMutatedListeners = false;
        /** @type {string|null} Cached combined selector to avoid string building on every frame */
        this._cachedSelector = null;
        
        // --- Lazy Loading state ---
        this._lazyObserver = new IntersectionObserver(this._onIntersect.bind(this), { rootMargin: '400px 0px', threshold: 0 });
        this._lazyMap = new WeakMap(); // Map<Element, Array<{id, callback}>>
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
     * @param {boolean} [lazy=false] - Only fire callback when element enters the viewport
     */
    register(id, selector, callback, immediate = true, lazy = false) {
        if (!id || !selector) return;

        this.registry.set(id, { selector, callback, lazy });
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
                if (lazy) {
                    this._observeLazy(existingElements, id, callback);
                } else {
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
    }

    _observeLazy(elements, id, callback) {
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            if (!this._lazyMap.has(el)) {
                this._lazyMap.set(el, []);
                this._lazyObserver.observe(el);
            }
            // Avoid duplicate registrations
            const listeners = this._lazyMap.get(el);
            if (!listeners.some(l => l.id === id)) {
                listeners.push({ id, callback });
            }
        }
    }

    _onIntersect(entries) {
        const triggered = new Map(); // listenerId -> { callback, nodes }
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            if (entry.isIntersecting) {
                const node = entry.target;
                this._lazyObserver.unobserve(node);
                const listeners = this._lazyMap.get(node);
                if (listeners) {
                    for (let j = 0; j < listeners.length; j++) {
                        const listener = listeners[j];
                        // Ensure listener is still registered
                        if (!this.registry.has(listener.id)) continue;
                        
                        if (!triggered.has(listener.id)) {
                            triggered.set(listener.id, { callback: listener.callback, nodes: [] });
                        }
                        triggered.get(listener.id).nodes.push(node);
                    }
                    this._lazyMap.delete(node);
                }
            }
        }
        for (const [id, data] of triggered.entries()) {
            if (data.callback) {
                try {
                    data.callback(data.nodes);
                } catch (e) {
                    console.error(`[YPP:DOMObserver] Lazy callback error for '${id}':`, e);
                }
            }
            if (this.events) {
                this.events.emit(`dom:found:${id}`, data.nodes);
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
                    if (this._pendingNodes.length >= this._maxPendingNodes) {
                        this._flush(); // Force immediate flush if buffer is full
                    }
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

        // 1. Combine all registered selectors into an array of chunks (max ~4000 chars)
        let selectorChunks = this._cachedSelector;
        if (!selectorChunks) {
            const uniqueSelectors = Array.from(new Set(Array.from(this.registry.values()).map(d => d.selector)));
            selectorChunks = [];
            let currentChunk = [];
            let currentLength = 0;

            for (const selector of uniqueSelectors) {
                if (currentLength + selector.length + 1 > 4000) {
                    selectorChunks.push(currentChunk.join(','));
                    currentChunk = [selector];
                    currentLength = selector.length;
                } else {
                    currentChunk.push(selector);
                    currentLength += selector.length + 1;
                }
            }
            if (currentChunk.length > 0) {
                selectorChunks.push(currentChunk.join(','));
            }
            this._cachedSelector = selectorChunks;
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

        // 3. Find all matching elements using native querySelectorAll per registered listener
        // This avoids O(n^2) JS loops comparing every element against every selector
        const matchedBuckets = new Map();
        
        for (const [id, { selector }] of this.registry.entries()) {
            const matches = [];
            
            for (const node of rootNodes) {
                // Check if the root node itself matches
                if (node.matches && node.matches(selector)) {
                    matches.push(node);
                }
                
                // Check all descendants using native querySelectorAll
                if (node.querySelectorAll) {
                    try {
                        const children = node.querySelectorAll(selector);
                        for (let c = 0; c < children.length; c++) {
                            matches.push(children[c]);
                        }
                    } catch(e) {
                        // Ignore bad queries silently to avoid log spam
                    }
                }
            }
            
            if (matches.length > 0) {
                matchedBuckets.set(id, matches);
            }
        }

        // 4. Dispatch results
        for (const [id, matches] of matchedBuckets.entries()) {
            const data = this.registry.get(id);
            if (!data) continue; // Guard against concurrent unregister

            if (data.lazy) {
                this._observeLazy(matches, id, data.callback);
            } else {
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
