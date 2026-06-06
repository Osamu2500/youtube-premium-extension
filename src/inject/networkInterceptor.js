/**
 * Network Interceptor — YPP Subscription Folders
 * Runs in the page's MAIN world to intercept /youtubei/v1/browse requests.
 * Filters JSON responses natively before YouTube's Polymer engine sees them.
 */

(function() {
    // Prevent multiple injections
    if (window.__YPP_INTERCEPTOR_INJECTED) return;
    window.__YPP_INTERCEPTOR_INJECTED = true;

    if (window.__YPP_FILTER_DEBUG) {
        console.log('[YPP] Network Interceptor initialized');
    }

    /**
     * Normalize a channel name for comparison.
     * Must match the implementation in subscription-folders.js.
     */
    const _normChannelCache = new Map();
    function normChannel(name) {
        if (!name) return '';
        if (_normChannelCache.has(name)) return _normChannelCache.get(name);
        const result = name
            .replace(/[\u200B-\u200D\uFEFF]/g, '')  // zero-width chars
            .replace(/[\u2713\u2714\u2705\u2022]/g, '') // verified checkmarks
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        _normChannelCache.set(name, result);
        return result;
    }

    /**
     * Safely reads and parses local storage state
     */
    let _cachedFilterState = undefined;
    
    // Invalidate cache on storage change
    if (!window.__YPP_STORAGE_LISTENER_ADDED) {
        window.addEventListener('storage', (e) => {
            if (e.key === 'ypp_active_folder' || e.key === 'ypp_folder_data') {
                _cachedFilterState = undefined;
            }
        });
        window.__YPP_STORAGE_LISTENER_ADDED = true;
    }

    function getFilterState() {
        if (_cachedFilterState !== undefined) return _cachedFilterState;
        try {
            const activeFolder = localStorage.getItem('ypp_active_folder');
            if (!activeFolder) {
                _cachedFilterState = null;
                return null;
            }

            const folderDataStr = localStorage.getItem('ypp_folder_data');
            const folders = folderDataStr ? JSON.parse(folderDataStr) : {};

            let activeChannelSet = new Set();
            if (activeFolder === '__no_folder__') {
                // Return a special flag for "No Folder" logic
                _cachedFilterState = { type: 'no_folder', allFolders: folders };
                return _cachedFilterState;
            } else if (folders[activeFolder]) {
                const arr = folders[activeFolder];
                activeChannelSet = new Set(arr.map(n => normChannel(n)));
                _cachedFilterState = { type: 'folder', channels: activeChannelSet };
                return _cachedFilterState;
            }
        } catch (e) {
            console.error('[YPP] Failed to read filter state:', e);
        }
        _cachedFilterState = null;
        return null;
    }

    /**
     * Helper to extract channel name from a video item object in the JSON
     */
    function getChannelNameFromItem(item) {
        const pd = item;
        // Path A: 2024+ lockupViewModel
        const lockup = pd.content?.lockupViewModel
            ?.metadata?.lockupMetadataViewModel
            ?.metadata?.contentMetadataViewModel
            ?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;

        // Path B: legacy videoRenderer / richItemRenderer
        const legacy = pd.videoRenderer?.ownerText?.runs?.[0]?.text
            ?? pd.videoRenderer?.shortBylineText?.runs?.[0]?.text
            ?? pd.content?.videoRenderer?.ownerText?.runs?.[0]?.text
            ?? pd.richItemRenderer?.content?.videoRenderer?.ownerText?.runs?.[0]?.text;

        return lockup ?? legacy ?? null;
    }

    /**
     * Filters an array of video items
     */
    function filterItems(items, state) {
        if (!Array.isArray(items)) return items;

        return items.filter(itemWrapper => {
            // Some items are continuation endpoints, ad slots, or shelf renderers. Keep them.
            if (!itemWrapper.richItemRenderer && !itemWrapper.videoRenderer) {
                return true; // Keep continuations/spinners
            }

            const channelName = getChannelNameFromItem(itemWrapper);
            if (!channelName) return true; // Can't resolve name, play it safe

            const norm = normChannel(channelName);

            if (state.type === 'no_folder') {
                // Match items NOT in ANY folder
                const inAnyFolder = Object.values(state.allFolders)
                    .some(list => list.some(ch => normChannel(ch) === norm));
                return !inAnyFolder;
            } else if (state.type === 'folder') {
                // Match items IN the active folder
                return state.channels.has(norm);
            }

            return true;
        });
    }

    /**
     * Main processor for the JSON response
     */
    function processBrowseResponse(jsonText, url) {
        // Only process Subscriptions feed
        if (!url.includes('/youtubei/v1/browse')) return jsonText;

        const state = getFilterState();
        if (!state) return jsonText; // Filtering not active

        try {
            const data = JSON.parse(jsonText);
            let modified = false;

            // Pattern 1: Initial load (Contents > twoColumnBrowseResultsRenderer)
            if (data.contents?.twoColumnBrowseResultsRenderer?.tabs) {
                const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
                for (const tab of tabs) {
                    const contents = tab.tabRenderer?.content?.richGridRenderer?.contents;
                    if (contents && Array.isArray(contents)) {
                        const originalLen = contents.length;
                        tab.tabRenderer.content.richGridRenderer.contents = filterItems(contents, state);
                        if (tab.tabRenderer.content.richGridRenderer.contents.length !== originalLen) modified = true;
                    }
                }
            }

            // Pattern 2: Infinite scroll continuation (onResponseReceivedActions)
            if (data.onResponseReceivedActions) {
                for (const action of data.onResponseReceivedActions) {
                    const contents = action.appendContinuationItemsAction?.continuationItems;
                    if (contents && Array.isArray(contents)) {
                        const originalLen = contents.length;
                        action.appendContinuationItemsAction.continuationItems = filterItems(contents, state);
                        if (action.appendContinuationItemsAction.continuationItems.length !== originalLen) modified = true;
                    }
                }
            }

            if (modified) {
                if (window.__YPP_FILTER_DEBUG) {
                    console.log(`[YPP] Interceptor filtered /browse request.`);
                }
                return JSON.stringify(data);
            }

        } catch (e) {
            console.error('[YPP] Failed to process /browse response:', e);
        }

        return jsonText;
    }

    // =========================================================================
    // XHR Override
    // =========================================================================
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._ypp_url = typeof url === 'string' ? url : url.toString();
        return originalXhrOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        this.addEventListener('readystatechange', function() {
            if (this.readyState === 4 && this.status === 200 && this.responseType === '' || this.responseType === 'text') {
                if (this._ypp_url && this._ypp_url.includes('/youtubei/v1/browse')) {
                    if (!getFilterState()) return; // Early return, skip heavy parsing
                    try {
                        const newResponseText = processBrowseResponse(this.responseText, this._ypp_url);
                        if (newResponseText !== this.responseText) {
                            Object.defineProperty(this, 'responseText', {
                                value: newResponseText,
                                writable: false
                            });
                            Object.defineProperty(this, 'response', {
                                value: newResponseText,
                                writable: false
                            });
                        }
                    } catch (e) {
                        console.error('[YPP] Error in XHR response intercept:', e);
                    }
                }
            }
        });
        return originalXhrSend.apply(this, args);
    };

    // =========================================================================
    // Fetch Override
    // =========================================================================
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        const url = typeof resource === 'string' ? resource : (resource?.url || '');
        
        const response = await originalFetch.call(this, resource, init);

        if (url.includes('/youtubei/v1/browse') && response.ok) {
            if (!getFilterState()) return response; // Early return, skip clone and parse
            try {
                // Clone the response because reading .text() locks the body
                const clone = response.clone();
                const text = await clone.text();
                
                const newText = processBrowseResponse(text, url);
                if (newText !== text) {
                    // Return a new Response with the modified text
                    return new Response(newText, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers
                    });
                }
            } catch (e) {
                console.error('[YPP] Fetch intercept error:', e);
            }
        }

        return response;
    };

})();
