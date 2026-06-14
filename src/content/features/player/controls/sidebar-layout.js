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

import './sidebar-layout.css';

window.YPP          = window.YPP          || {};
window.YPP.features = window.YPP.features || {};

const ROOT_SELECTORS = [
  'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
  'ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
  'ytd-watch-next-secondary-results-renderer ytd-lockup-view-model',
  'ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer'
];

window.YPP.features.SidebarLayout = class SidebarLayout extends window.YPP.features.BaseFeature {

  constructor() {
    super('SidebarLayout');
    this._currentLayout = null;
  }

  /**
   * Always active — runs on every featureManager.init() call.
   * The setting value (compact/expanded) is read inside _applyLayout().
   */
  getConfigKey() { return null; }

  async enable() {
    this._applyLayout();
    this._cleanUpLegacyStamps();
  }

  async disable() {
    try {
      this._teardown();
      this._currentLayout = null;
    } catch (err) {
      this.utils?.log?.('[YPP] SidebarLayout disable error: ' + err.message, 'SIDEBAR_LAYOUT', 'error');
    }
  }

  async onUpdate() {
    // Force re-apply on every settings update
    this._currentLayout = null;
    this._applyLayout();
  }

  _applyLayout() {
    const layout = this.settings?.sidebarLayout ?? 'compact';

    if (this._currentLayout === layout) return;
    this._currentLayout = layout;

    if (window.YPP.layoutManager) {
      window.YPP.layoutManager.setState('sidebarLayout', layout);
    }
  }

  onPageChange() {
    // LayoutManager handles SPA navigation re-application
  }

  _cleanUpLegacyStamps() {
    // One-time cleanup of legacy DOM stamps left over from previous extension versions
    document.querySelectorAll('[data-ypp-processed-layout]').forEach(el => {
      el.removeAttribute('data-ypp-processed-layout');
    });

    // Clean up any legacy inline styles that might have been applied by earlier code
    document.querySelectorAll(ROOT_SELECTORS.join(', ')).forEach(node => {
      if (node.style) {
        node.style.removeProperty('display');
        node.style.removeProperty('margin-bottom');
      }

      const dismissible = node.querySelector('#dismissible') || node;
      if (dismissible && dismissible.style) {
        dismissible.style.removeProperty('display');
        dismissible.style.removeProperty('flex-direction');
        dismissible.style.removeProperty('width');
        dismissible.style.removeProperty('align-items');
        dismissible.style.removeProperty('gap');
      }

      const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
      if (thumbnail && thumbnail.style) {
        thumbnail.style.removeProperty('display');
        thumbnail.style.removeProperty('width');
        thumbnail.style.removeProperty('height');
        thumbnail.style.removeProperty('aspect-ratio');
        thumbnail.style.removeProperty('max-width');
        thumbnail.style.removeProperty('min-width');
        thumbnail.style.removeProperty('margin-bottom');
        thumbnail.style.removeProperty('border-radius');
        thumbnail.style.removeProperty('overflow');
        thumbnail.style.removeProperty('flex');
      }

      const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
      if (details && details.style) {
        details.style.removeProperty('display');
        details.style.removeProperty('flex-direction');
        details.style.removeProperty('flex');
        details.style.removeProperty('min-width');
        details.style.removeProperty('width');
        details.style.removeProperty('padding');
        details.style.removeProperty('align-items');
        details.style.removeProperty('gap');
      }

      const title = node.querySelector('#video-title, h3');
      if (title && title.style) {
        title.style.removeProperty('-webkit-line-clamp');
        title.style.removeProperty('max-height');
        title.style.removeProperty('white-space');
        title.style.removeProperty('overflow');
      }
    });
  }

  _teardown() {
    document.body.classList.remove('ypp-sidebar-expanded');
    document.body.classList.remove('ypp-sidebar-compact');
    this._cleanUpLegacyStamps();
  }
};
