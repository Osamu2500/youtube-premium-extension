/**
 * Search Filter
 * Owns: auto-video-filter chip detection, session-storage query tracking,
 *       URL parameter inspection, and the poll-for-chip logic.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.SearchFilter = class SearchFilter {

    constructor() {
        this._settings = {};
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /** Receive the latest settings from the orchestrator. */
    updateSettings(settings) {
        this._settings = settings || {};
    }

    /**
     * Inspect the current URL and auto-apply the "Videos" filter when needed.
     * Safe to call on every navigation — uses sessionStorage to avoid loops.
     */
    checkAndApply() {
        const urlParams   = new URLSearchParams(window.location.search);
        const currentQuery = urlParams.get('search_query');
        const hasFilter    = urlParams.has('sp');

        if (!currentQuery) return; // not a search page

        const lastAutoQuery = sessionStorage.getItem('ypp_last_auto_query');

        if (currentQuery !== lastAutoQuery) {
            if (!hasFilter) {
                this._applyDefaultFilter(currentQuery);
            } else {
                // User navigated to a pre-filtered URL — mark as handled
                sessionStorage.setItem('ypp_last_auto_query', currentQuery);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    _applyDefaultFilter(query) {
        this._log(`Applying default Videos filter for: ${query}`, 'info');

        // Enter a pending state so CSS can show a loading indicator if desired
        document.body.classList.add('ypp-filter-pending');

        // Poll for the chip bar with up to 10 s timeout
        this._pollForElement('ytd-feed-filter-chip-bar-renderer', (bar) => {
            // Abort if the user or YouTube already applied a filter
            const currentParams = new URLSearchParams(window.location.search);
            if (currentParams.has('sp')) {
                document.body.classList.remove('ypp-filter-pending');
                sessionStorage.setItem('ypp_last_auto_query', query);
                return;
            }

            const chips     = Array.from(bar.querySelectorAll('yt-chip-cloud-chip-renderer'));
            const videoChip = chips.find(c => /^\s*Videos\s*$/i.test(c.innerText || c.textContent));

            if (videoChip) {
                // Already selected — nothing to do
                if (videoChip.hasAttribute('selected') || videoChip.classList.contains('selected')) {
                    document.body.classList.remove('ypp-filter-pending');
                    sessionStorage.setItem('ypp_last_auto_query', query);
                    return;
                }

                this._log('Clicking Videos chip', 'info');

                // Mark handled BEFORE clicking to prevent re-entrance
                sessionStorage.setItem('ypp_last_auto_query', query);
                videoChip.click();
                videoChip.querySelector('button')?.click();

                setTimeout(() => {
                    document.body.classList.remove('ypp-filter-pending');
                }, 500);
            }
            // If chip not found yet the poll will fire again via its retry logic
        }, 10000, 200);

        // Safety net — always clear the pending class
        setTimeout(() => {
            document.body.classList.remove('ypp-filter-pending');
        }, 4000);
    }

    /**
     * Poll for a DOM element with exponential back-off.
     * @param {string}   selector     - CSS selector to find
     * @param {Function} callback     - Invoked with the found element
     * @param {number}   maxWaitMs    - Total timeout (default 4 s)
     * @param {number}   startInterval - First retry delay (default 100 ms)
     */
    _pollForElement(selector, callback, maxWaitMs = 4000, startInterval = 100) {
        const startTime = Date.now();
        let interval = startInterval;

        const check = () => {
            const el = document.querySelector(selector);
            if (el) { callback(el); return; }

            const elapsed = Date.now() - startTime;
            if (elapsed < maxWaitMs) {
                interval = Math.min(interval * 2, 1000);
                setTimeout(check, interval);
            } else {
                this._log(`Element "${selector}" not found after ${maxWaitMs} ms`, 'warn');
            }
        };
        check();
    }

    _log(msg, level = 'info') {
        if (window.YPP?.Utils?.log) {
            window.YPP.Utils.log(msg, 'SEARCH_FILTER', level);
        } else {
            console[level]?.(`[SearchFilter] ${msg}`);
        }
    }
};
