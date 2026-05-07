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

window.YPP.features.SidebarLayout = class SidebarLayout {

  constructor() {
    this._currentLayout = null;
  }

  enable(settings)  { this.update(settings); }

  disable() {
    this._removeStyle();
    this._currentLayout = null;
  }

  update(settings) {
    const layout = settings?.sidebarLayout ?? 'compact';

    if (layout === 'expanded') {
      if (this._currentLayout === 'expanded') return;
      this._currentLayout = 'expanded';
      this._injectStyle();
    } else {
      if (this._currentLayout === 'compact') return;
      this._currentLayout = 'compact';
      this._removeStyle();
    }
  }

  /**
   * SPA navigation: <head> style persists across yt-navigate-finish,
   * so just ensure it's still present (YouTube doesn't wipe <head>).
   */
  onPageChange() {
    if (this._currentLayout === 'expanded') {
      // Re-inject if YouTube wiped our style (rare but possible)
      if (!document.getElementById(_STYLE_ID)) {
        this._injectStyle();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  _injectStyle() {
    this._removeStyle(); // Ensure no duplicates

    const style = document.createElement('style');
    style.id = _STYLE_ID;
    style.setAttribute('data-ypp-feature', 'sidebarLayout');

    // Selectors use Polymer's class-scoping pattern:
    // Elements inside ytd-compact-video-renderer get the component name
    // added as a CSS class — so #dismissible.ytd-compact-video-renderer
    // targets div#dismissible INSIDE the component (light DOM, not shadow DOM).
    style.textContent = `
      /* ══ YPP: Large Sidebar Thumbnails (2026 YouTube layout) ═════════════ */

      /* Switch card from inline-flex row → block so thumbnail stacks on top */
      ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer {
        display: block !important;
        margin-bottom: 12px !important;
      }

      /* Dismissible wrapper: must be column flex for thumbnail-on-top layout */
      ytd-watch-next-secondary-results-renderer #dismissible.ytd-compact-video-renderer {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        align-items: stretch !important;
      }

      /* Thumbnail: full-width 16:9 block */
      ytd-watch-next-secondary-results-renderer #thumbnail.ytd-compact-video-renderer {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
        max-width: 100% !important;
        margin-bottom: 8px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }

      /* ytd-thumbnail host — same treatment */
      ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        aspect-ratio: 16 / 9 !important;
      }

      /* Inner image */
      ytd-watch-next-secondary-results-renderer ytd-thumbnail.ytd-compact-video-renderer img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
      }

      /* Details row below thumbnail */
      ytd-watch-next-secondary-results-renderer #details.ytd-compact-video-renderer {
        display: flex !important;
        flex-direction: row !important;
        width: 100% !important;
        padding: 0 !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }

      /* Meta text */
      ytd-watch-next-secondary-results-renderer #meta.ytd-compact-video-renderer {
        flex: 1 !important;
        min-width: 0 !important;
      }

      /* Title: unclamp for full display */
      ytd-watch-next-secondary-results-renderer #video-title.ytd-compact-video-renderer {
        -webkit-line-clamp: unset !important;
        max-height: unset !important;
        white-space: normal !important;
        overflow: visible !important;
      }

      /* Sidebar list padding */
      ytd-watch-next-secondary-results-renderer #items.ytd-watch-next-secondary-results-renderer {
        padding: 0 !important;
      }
    `;

    document.head.appendChild(style);
  }

  _removeStyle() {
    document.getElementById(_STYLE_ID)?.remove();
  }
};
