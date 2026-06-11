/**
 * SidebarLayout Feature
 * ─────────────────────────────────────────────────────────────────────────────
 * Toggles between YouTube's compact sidebar and the new 2026 large-thumbnail layout.
 *
 * ROOT CAUSE HISTORY & WHY THIS WORKS:
 * ─────────────────────────────────────
 * Previous attempts used selectors like:
 *   `#secondary ytd-compact-video-renderer div#dismissible`  ← WRONG
 *
 * YouTube uses Polymer's CSS scoping: every element inside a Polymer component
 * template gets the component tag name added as a CSS class. So div#dismissible
 * INSIDE ytd-compact-video-renderer becomes:
 *   <div id="dismissible" class="ytd-compact-video-renderer style-scope ...">
 *
 * The correct selectors (from community-verified uBlock/Reddit solutions) are:
 *   #dismissible.ytd-compact-video-renderer  ← same element, has both id AND class
 *   #thumbnail.ytd-compact-video-renderer
 *   #details.ytd-compact-video-renderer
 *
 * These ARE in the light DOM — no shadow DOM, no JS per-element processing needed.
 * A single injected <style> tag covers all current and future sidebar items.
 *
 * Context: YouTube began rolling out the large thumbnail A/B test in Feb 2026
 * and expanded it to more users by Apr 2026. No official opt-out exists.
 * This CSS replicates what the experiment does natively.
 */

window.YPP          = window.YPP          || {};
window.YPP.features = window.YPP.features || {};

const _STYLE_ID = 'ypp-sidebar-layout-expanded';

window.YPP.features.SidebarLayout = class SidebarLayout extends window.YPP.features.BaseFeature {

  constructor() {
    super('SidebarLayout');
    this._currentLayout = null;
  }

  enable(settings)  { this.update(settings); }

  disable() {
    try {
      this._removeStyle();
      this._currentLayout = null;
    } catch (err) {
      this.utils?.log?.('[YPP] SidebarLayout disable error: ' + err.message, 'SIDEBAR_LAYOUT', 'error');
    }
  }

  update(settings) {
    const layout = settings?.sidebarLayout ?? 'compact';

    if (this._currentLayout === layout) return;
    this._currentLayout = layout;
    this._injectStyle(layout);
  }

  /**
   * SPA navigation: <head> style persists across yt-navigate-finish,
   * so just ensure it's still present (YouTube doesn't wipe <head>).
   */
  onPageChange() {
    if (!document.getElementById(_STYLE_ID)) {
      this._injectStyle(this._currentLayout || 'compact');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  _injectStyle(layout) {
    this._removeStyle(); // Ensure no duplicates

    const style = document.createElement('style');
    style.id = _STYLE_ID;
    style.setAttribute('data-ypp-feature', 'sidebarLayout');
    style.setAttribute('data-ypp-layout', layout);

    if (layout === 'expanded') {
        style.textContent = `
          /* ══ YPP: Large Sidebar Thumbnails (2026 YouTube layout) ═════════════ */
          ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer {
            display: block !important;
            margin-bottom: 12px !important;
          }

          ytd-watch-next-secondary-results-renderer #dismissible.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model > *,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model > *,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #content {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            align-items: stretch !important;
          }

          ytd-watch-next-secondary-results-renderer #thumbnail.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(yt-image),
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(yt-image),
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer ytd-thumbnail {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            aspect-ratio: 16 / 9 !important;
            max-width: 100% !important;
            margin-bottom: 8px !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            flex: none !important;
          }

          ytd-watch-next-secondary-results-renderer #details.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model .yt-lockup-metadata-view-model-wiz,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model .yt-lockup-metadata-view-model-wiz,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #details {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            padding: 0 !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          ytd-watch-next-secondary-results-renderer #video-title.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model h3,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model h3,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #video-title {
            -webkit-line-clamp: unset !important;
            max-height: unset !important;
            white-space: normal !important;
            overflow: visible !important;
          }
        `;
    } else {
        // FORCE COMPACT LAYOUT (Reverse YouTube's A/B test)
        style.textContent = `
          /* ══ YPP: Compact Sidebar Thumbnails (Classic Layout) ═════════════ */
          ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer {
            display: block !important;
            margin-bottom: 8px !important;
          }

          ytd-watch-next-secondary-results-renderer #dismissible.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model > *,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model > *,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #content {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            align-items: flex-start !important;
            gap: 8px !important;
          }

          ytd-watch-next-secondary-results-renderer #thumbnail.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model a:has(yt-image),
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model a:has(yt-image),
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer ytd-thumbnail {
            display: block !important;
            width: 168px !important;
            height: 94px !important;
            max-width: 168px !important;
            min-width: 168px !important;
            margin-bottom: 0 !important;
            border-radius: 8px !important;
            flex: none !important;
          }

          ytd-watch-next-secondary-results-renderer #details.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model .yt-lockup-metadata-view-model-wiz,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model .yt-lockup-metadata-view-model-wiz,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #details {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            min-width: 0 !important;
            padding: 0 !important;
          }

          ytd-watch-next-secondary-results-renderer #video-title.ytd-compact-video-renderer,
          ytd-watch-next-secondary-results-renderer yt-lockup-view-model h3,
          ytd-watch-next-secondary-results-renderer ytd-lockup-view-model h3,
          ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer #video-title {
            -webkit-line-clamp: 2 !important;
            max-height: 3.2rem !important;
            overflow: hidden !important;
          }
        `;
    }

    document.head.appendChild(style);
  }

  _removeStyle() {
    document.getElementById(_STYLE_ID)?.remove();
  }
};
