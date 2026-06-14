/**
 * SplitScrolling Feature
 * ─────────────────────────────────────────────────────────────────────────────
 * Makes the "Up Next" sidebar (#secondary) independently scrollable on the
 * watch page. The main column (video + description + comments) stays fixed
 * while the user scrolls through related videos in the sidebar.
 *
 * HOW IT WORKS:
 * ─────────────────────────────────────────────────────────────────────────────
 * A single <style> block is injected into <head> once and left there.
 * Activation/deactivation is handled purely by toggling the body class
 * `ypp-split-scrolling-enabled` — cheaper than DOM node insertion/removal.
 *
 * ROOT CAUSE HISTORY (why the CSS is the way it is):
 * ─────────────────────────────────────────────────────────────────────────────
 * Problem 1 — position:sticky silently failing:
 *   `position:sticky` only works when NO ancestor in the stacking context
 *   has overflow:hidden/auto/scroll. YouTube's layout applies overflow:hidden
 *   to #page-manager and ytd-watch-flexy, which broke sticky entirely.
 *   Fix: `overflow:clip`. Unlike `overflow:hidden`, clip does NOT create a
 *   scroll container (no BFC), so sticky positioning is preserved.
 *
 * Problem 2 — height context missing:
 *   `height: calc(100vh - <masthead>)` on #secondary requires the containing
 *   block to have a defined height. Without it the value resolves to `auto`.
 *   Fix: `min-height: 100vh` on ytd-watch-flexy.
 *
 * Problem 3 — lifecycle mismatch (fixed):
 *   The feature previously used run() with manual enable()/disable() calls,
 *   bypassing BaseFeature.update() lifecycle (isEnabled was never set, so
 *   onPageChange() was never dispatched to this feature). Refactored to pure
 *   enable()/disable() — FeatureManager now tracks state correctly.
 *
 * COMPATIBILITY NOTES:
 * ─────────────────────────────────────────────────────────────────────────────
 * • hide-scrollbar (ypp-hide-scrollbar): the global theme feature applies
 *   scrollbar-width:none to all elements. The CSS below re-asserts hidden
 *   scrollbar on #secondary when that class is present so the override is
 *   explicit and survives specificity changes.
 */

window.YPP          = window.YPP          || {};
window.YPP.features = window.YPP.features || {};

/** @constant {string} ID of the injected <style> element */
const _SPLIT_SCROLL_STYLE_ID = 'ypp-split-scrolling-style';

/** @constant {string} Body class that activates the split-scroll CSS */
const _SPLIT_SCROLL_ACTIVE_CLASS = 'ypp-split-scrolling-enabled';

window.YPP.features.SplitScrolling = class SplitScrolling extends window.YPP.features.BaseFeature {

    constructor() {
        super('SplitScrolling');
    }

    // ── BaseFeature contract ──────────────────────────────────────────────────

    /** @returns {string} The chrome.storage key that controls this feature */
    getConfigKey() { return 'splitScrolling'; }

    /**
     * Activate split scrolling.
     * Injects the shared <style> block (idempotent) then enables via body class.
     */
    enable() {
        this._injectStyles();
        document.body.classList.add(_SPLIT_SCROLL_ACTIVE_CLASS);
    }

    /**
     * Deactivate split scrolling.
     * Removes the body class; the <style> block is kept in <head> so
     * re-enabling is instant (no DOM allocation overhead).
     */
    disable() {
        document.body.classList.remove(_SPLIT_SCROLL_ACTIVE_CLASS);
        super.disable(); // runs BaseFeature.cleanupEvents() — future-safe
    }

    /**
     * Called by FeatureManager on every YouTube SPA navigation.
     *
     * The body class survives SPA navigation automatically. However YouTube
     * occasionally clears injected <style> elements during hard tab-switches
     * or when the page renderer is fully destroyed and rebuilt. We defensively
     * re-inject if the style element is missing.
     *
     * @param {string} _url - Current URL (unused — we act unconditionally)
     */
    onPageChange(_url) {
        if (this.isEnabled && !document.getElementById(_SPLIT_SCROLL_STYLE_ID)) {
            this._injectStyles();
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Inject the split-scrolling <style> block into <head>.
     * Guarded by an ID check — safe to call multiple times.
     * @private
     */
    _injectStyles() {
        if (document.getElementById(_SPLIT_SCROLL_STYLE_ID)) return;

        const style = document.createElement('style');
        style.id    = _SPLIT_SCROLL_STYLE_ID;
        style.setAttribute('data-ypp-feature', 'splitScrolling');

        // Build selector prefix used throughout to keep rules scoped.
        // `ytd-watch-flexy:not([hidden])` targets only the active watch page —
        // the element persists in the DOM between navigations but gets [hidden]
        // while on non-watch pages, preventing unwanted style application.
        const watchCtx = 'html:not(.ypp-sidebar-comments-active) body.ypp-split-scrolling-enabled ytd-watch-flexy:not([hidden])';

        style.textContent = `
            /* ══ YPP: Independent Sidebar Scroll ══════════════════════════════ */

            /*
             * overflow:clip on ancestors — the critical fix.
             *
             * overflow:clip visually clips overflowing content, just like
             * overflow:hidden, but does NOT create a block formatting context
             * (BFC). A BFC is what causes position:sticky to silently stop
             * working. Using clip instead of hidden preserves sticky while
             * still preventing scroll-bar emergence on these containers.
             */
            body.ypp-split-scrolling-enabled #page-manager {
                overflow: clip !important;
            }

            ${watchCtx} {
                overflow: clip !important;
                /* Establish a height context so the child height:calc() resolves */
                min-height: 100vh !important;
            }

            /*
             * #columns is a flex container. overflow:visible lets the sticky
             * child escape, and align-items:flex-start stops it from
             * stretching to the container height (which would prevent scrolling).
             */
            ${watchCtx} #columns {
                overflow: visible !important;
                align-items: flex-start !important;
            }

            /* ── The sticky, independently-scrollable sidebar ─────────────── */

            ${watchCtx} #secondary {
                position: sticky !important;
                top: var(--ytd-masthead-height, 56px) !important;
                height: calc(100vh - var(--ytd-masthead-height, 56px)) !important;
                box-sizing: border-box !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                margin-top: 0 !important;
                padding-top: var(--ytd-margin-6x, 24px) !important;
                /* Firefox */
                scrollbar-width: thin;
                scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
            }

            /* ── Webkit scrollbar (shown unless hide-scrollbar is active) ──── */

            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${watchCtx} #secondary::-webkit-scrollbar {
                width: 6px !important;
                display: block !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${watchCtx} #secondary::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2) !important;
                border-radius: 4px !important;
            }
            body.ypp-split-scrolling-enabled:not(.ypp-hide-scrollbar) ${watchCtx} #secondary::-webkit-scrollbar-track {
                background: transparent !important;
            }

            /* ── Override: hide sidebar scrollbar when global hide-scrollbar is on */

            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ${watchCtx} #secondary {
                scrollbar-width: none !important;
            }
            body.ypp-hide-scrollbar.ypp-split-scrolling-enabled ${watchCtx} #secondary::-webkit-scrollbar {
                width: 0 !important;
                display: none !important;
            }

            /* ── Breathing room at the bottom of the sidebar list ─────────── */

            ${watchCtx} #secondary-inner {
                padding-bottom: 40px !important;
            }
        `;

        document.head.appendChild(style);
    }
};
