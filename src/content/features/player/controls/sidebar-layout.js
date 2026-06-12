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



window.YPP.features.SidebarLayout = class SidebarLayout extends window.YPP.features.BaseFeature {

  constructor() {
    super('SidebarLayout');
    this._currentLayout = null;
  }

  async enable() {
    this.observer.register(
      'sidebarLayoutObserver',
      'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer, ytd-watch-next-secondary-results-renderer yt-lockup-view-model, ytd-watch-next-secondary-results-renderer ytd-lockup-view-model, ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer',
      (elements) => {
        elements.forEach(el => this._applyLayoutToNode(el));
      }
    );
    this._applyLayout();
  }

  async disable() {
    try {
      this.observer.unregister('sidebarLayoutObserver');
      this._teardown();
      this._currentLayout = null;
    } catch (err) {
      this.utils?.log?.('[YPP] SidebarLayout disable error: ' + err.message, 'SIDEBAR_LAYOUT', 'error');
    }
  }

  async onUpdate() {
    this._applyLayout();
  }

  _applyLayout() {
    const layout = this.settings?.sidebarLayout ?? 'compact';

    if (this._currentLayout === layout) return;
    this._currentLayout = layout;
    
    // Update existing elements instantly
    const selectors = [
      'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
      'ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
      'ytd-watch-next-secondary-results-renderer ytd-lockup-view-model',
      'ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer'
    ].join(', ');
    
    document.querySelectorAll(selectors).forEach(el => {
      this._applyLayoutToNode(el);
    });
  }

  onPageChange() {
    // Re-apply to existing elements on page change to ensure consistency
    if (this.isEnabled) {
      this._currentLayout = null; // force re-apply
      this._applyLayout();
    }
  }

  _applyLayoutToNode(node) {
    if (!node) return;
    const layout = this._currentLayout || 'compact';

    // Prevent double processing unless layout changed
    if (node.getAttribute('data-ypp-processed-layout') === layout) return;
    node.setAttribute('data-ypp-processed-layout', layout);

    if (layout === 'expanded') {
      node.style.setProperty('display', 'block', 'important');
      node.style.setProperty('margin-bottom', '12px', 'important');

      const dismissible = node.querySelector('#dismissible') || node;
      dismissible.style.setProperty('display', 'flex', 'important');
      dismissible.style.setProperty('flex-direction', 'column', 'important');
      dismissible.style.setProperty('width', '100%', 'important');
      dismissible.style.setProperty('align-items', 'stretch', 'important');

      const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
      if (thumbnail) {
        thumbnail.style.setProperty('display', 'block', 'important');
        thumbnail.style.setProperty('width', '100%', 'important');
        thumbnail.style.setProperty('height', 'auto', 'important');
        thumbnail.style.setProperty('aspect-ratio', '16 / 9', 'important');
        thumbnail.style.setProperty('max-width', '100%', 'important');
        thumbnail.style.setProperty('margin-bottom', '8px', 'important');
        thumbnail.style.setProperty('border-radius', '8px', 'important');
        thumbnail.style.setProperty('overflow', 'hidden', 'important');
        thumbnail.style.setProperty('flex', 'none', 'important');
      }

      const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
      if (details) {
        details.style.setProperty('display', 'flex', 'important');
        details.style.setProperty('flex-direction', 'row', 'important');
        details.style.setProperty('width', '100%', 'important');
        details.style.setProperty('padding', '0', 'important');
        details.style.setProperty('align-items', 'flex-start', 'important');
        details.style.setProperty('gap', '8px', 'important');
      }

      const title = node.querySelector('#video-title, h3');
      if (title) {
        title.style.setProperty('-webkit-line-clamp', 'unset', 'important');
        title.style.setProperty('max-height', 'unset', 'important');
        title.style.setProperty('white-space', 'normal', 'important');
        title.style.setProperty('overflow', 'visible', 'important');
      }
    } else {
      node.style.setProperty('display', 'block', 'important');
      node.style.setProperty('margin-bottom', '8px', 'important');

      const dismissible = node.querySelector('#dismissible') || node;
      dismissible.style.setProperty('display', 'flex', 'important');
      dismissible.style.setProperty('flex-direction', 'row', 'important');
      dismissible.style.setProperty('width', '100%', 'important');
      dismissible.style.setProperty('align-items', 'flex-start', 'important');
      dismissible.style.setProperty('gap', '8px', 'important');

      const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
      if (thumbnail) {
        thumbnail.style.setProperty('display', 'block', 'important');
        thumbnail.style.setProperty('width', '168px', 'important');
        thumbnail.style.setProperty('height', '94px', 'important');
        thumbnail.style.setProperty('max-width', '168px', 'important');
        thumbnail.style.setProperty('min-width', '168px', 'important');
        thumbnail.style.setProperty('margin-bottom', '0', 'important');
        thumbnail.style.setProperty('border-radius', '8px', 'important');
        thumbnail.style.setProperty('flex', 'none', 'important');
      }

      const details = node.querySelector('#details, .yt-lockup-metadata-view-model-wiz');
      if (details) {
        details.style.setProperty('display', 'flex', 'important');
        details.style.setProperty('flex-direction', 'column', 'important');
        details.style.setProperty('flex', '1', 'important');
        details.style.setProperty('min-width', '0', 'important');
        details.style.setProperty('padding', '0', 'important');
      }

      const title = node.querySelector('#video-title, h3');
      if (title) {
        title.style.setProperty('-webkit-line-clamp', '2', 'important');
        title.style.setProperty('max-height', '3.2rem', 'important');
        title.style.setProperty('overflow', 'hidden', 'important');
      }
    }
  }

  _teardown() {
    // Clean up DOM stamps and inline styles
    const selectors = [
      'ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer',
      'ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
      'ytd-watch-next-secondary-results-renderer ytd-lockup-view-model',
      'ytd-watch-next-secondary-results-renderer ytd-rich-item-renderer'
    ].join(', ');

    document.querySelectorAll(selectors).forEach(node => {
      node.removeAttribute('data-ypp-processed-layout');
      node.style.removeProperty('display');
      node.style.removeProperty('margin-bottom');

      const dismissible = node.querySelector('#dismissible') || node;
      dismissible.style.removeProperty('display');
      dismissible.style.removeProperty('flex-direction');
      dismissible.style.removeProperty('width');
      dismissible.style.removeProperty('align-items');
      dismissible.style.removeProperty('gap');

      const thumbnail = node.querySelector('#thumbnail, ytd-thumbnail, a:has(yt-image)');
      if (thumbnail) {
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
      if (details) {
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
      if (title) {
        title.style.removeProperty('-webkit-line-clamp');
        title.style.removeProperty('max-height');
        title.style.removeProperty('white-space');
        title.style.removeProperty('overflow');
      }
    });
  }
};
