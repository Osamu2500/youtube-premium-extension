---
name: youtube-dom-mastery
description: "YouTube-specific DOM manipulation rules, CSS override strategies, and SPA lifecycle patterns. Use whenever writing code that touches the YouTube page DOM — selectors, CSS specificity, shadow DOM, Lit/Polymer, and SPA navigation patterns."
risk: safe
source: custom
date_added: "2026-05-07"
---

# YouTube DOM Mastery

Deep knowledge for reliably manipulating YouTube's dynamic, SPA-based, Lit/Polymer-rendered DOM inside a Chrome extension.

---

## YouTube Architecture Facts

| Fact | Impact |
|------|--------|
| YouTube is a **single-page app** (SPA) | DOM resets on navigation — features must re-init |
| Uses **Lit/Polymer web components** | Shadow DOM, high-specificity inline styles |
| Uses **`yt-navigate-finish`** event for routing | Listen to this, not `DOMContentLoaded` |
| Applies styles via **JavaScript inline** | CSS classes alone almost never win specificity |
| DOM elements are **recycled** (virtual scroll) | Observers must watch for re-added nodes |
| `#secondary` is the **sidebar container** | All sidebar features target this |
| `ytd-watch-flexy` is the **video page root** | Reliable anchor for player page detection |
| Thumbnail containers use `ytd-compact-video-renderer` | The key element for sidebar layout changes |

---

## SPA Navigation — The Right Pattern

```js
// ✅ Correct: listen for YouTube's custom SPA event
document.addEventListener('yt-navigate-finish', () => {
  this.onPageChange();
});

// ✅ Also listen for initial load
document.addEventListener('yt-navigate-start', () => {
  this._teardown(); // Clean up before new page
});

// ❌ Wrong: DOMContentLoaded fires ONCE on first load only
document.addEventListener('DOMContentLoaded', init); // BROKEN for SPA
```

---

## CSS Specificity — The Override Hierarchy

YouTube's style priority order (highest wins):

```
1. Inline style with !important  → element.style.setProperty('x', 'y', 'important')
2. Inline style without important → element.style.property = 'value'
3. Shadow DOM :host / ::part     → Limited access from content scripts
4. Lit property bindings         → Very hard to override from outside
5. CSS class rules               → RARELY enough for YouTube
```

**The only reliable override:**
```js
// ✅ Force override everything
element.style.setProperty('width', '100%', 'important');
element.style.setProperty('height', 'auto', 'important');

// ✅ Clean up on disable
element.style.removeProperty('width');
element.style.removeProperty('height');
```

**CSS variables sometimes work** for Polymer components:
```js
document.documentElement.style.setProperty(
  '--ytd-compact-video-renderer-thumbnail-width', '246px'
);
```

---

## Key YouTube Selectors (as of 2026)

| Target | Selector | Notes |
|--------|----------|-------|
| Sidebar | `#secondary` | Video watch page only |
| Sidebar item | `ytd-compact-video-renderer` | Each related video card |
| Thumbnail link | `a#thumbnail` | Inside compact renderer |
| Thumbnail img | `ytd-thumbnail img` | The actual `<img>` |
| Video title | `#video-title` | Sidebar video title |
| Progress bar | `ytd-thumbnail-overlay-resume-playback-renderer` | Watched indicator |
| Home feed | `ytd-rich-grid-renderer` | Home page grid |
| Filter chips | `ytd-feed-filter-chip-bar-renderer` | Topics bar |
| Watch page | `ytd-watch-flexy` | Is a video currently open |
| App root | `ytd-app` | Extension CSS injection point |

> ⚠️ **YouTube changes selectors without notice.** Always add a `console.warn` fallback if a selector returns null.

---

## MutationObserver — The Right Setup

```js
// ✅ Watch for new sidebar items being added
this._observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      // Check the node itself
      if (node.matches('ytd-compact-video-renderer')) {
        this._processItem(node);
      }
      // Check children (YouTube often wraps in containers)
      node.querySelectorAll('ytd-compact-video-renderer').forEach(el => {
        this._processItem(el);
      });
    }
  }
});

const secondary = document.querySelector('#secondary');
if (secondary) {
  this._observer.observe(secondary, { childList: true, subtree: true });
} else {
  console.warn('[YPP] #secondary not found — observer not attached');
}
```

**Cleanup (mandatory):**
```js
disable() {
  if (this._observer) {
    this._observer.disconnect();
    this._observer = null;
  }
  // Remove all inline style overrides
  document.querySelectorAll('[data-ypp-processed]').forEach(el => {
    el.style.removeProperty('width');
    el.style.removeProperty('height');
    el.removeAttribute('data-ypp-processed');
  });
}
```

---

## Centralized Observer Batching (Performance Traps)

When building a centralized `DOMObserver` or event bus that batches mutations for multiple features via `requestAnimationFrame`:

1. **NEVER use `node.querySelectorAll` inside a loop of `nodesToProcess`** for every registered selector. If 1,000 nodes are added and you have 50 selectors, you will trigger 50,000 queries per frame (O(N × M) explosion). This will completely freeze the browser (layout thrashing / CPU burn).
2. **NEVER fall back to `document.querySelectorAll`** inside the flush loop. Querying the entire document will return all *existing* elements on the page, not just the newly added ones. Emitting existing elements repeatedly will cause features to double-process the same elements hundreds of times, slowing down video load times and scrolling.
3. **The CORRECT Pattern**:
   - Create a combined comma-separated selector: `const combined = selectors.join(',');`
   - Iterate only over the `addedNodes`.
   - Run `node.querySelectorAll(combined)` exactly ONCE per added node.
   - Distribute the matching elements to the correct feature using `el.matches(selector)`.
   - **Always** ensure features use the DOM Stamping Pattern (`data-ypp-processed`) just in case an element is emitted twice.

---

## DOM Stamping Pattern (Idempotent Processing)

Prevent double-processing recycled DOM nodes:

```js
_processItem(el) {
  if (el.hasAttribute('data-ypp-processed')) return; // Already handled
  el.setAttribute('data-ypp-processed', 'true');
  
  // Apply changes...
  const thumb = el.querySelector('a#thumbnail');
  if (thumb) {
    thumb.style.setProperty('width', '246px', 'important');
  }
}
```

---

## Page Detection

```js
// Is user on a video watch page?
const isWatchPage = () => 
  window.location.pathname === '/watch' || 
  !!document.querySelector('ytd-watch-flexy');

// Is sidebar visible?
const hasSidebar = () => !!document.querySelector('#secondary');

// Is user on home feed?
const isHomeFeed = () => window.location.pathname === '/';
```

---

## YouTube CSS Variable Reference

These can be set on `document.documentElement` to override Polymer components:

| Variable | Effect |
|----------|--------|
| `--ytd-compact-video-renderer-thumbnail-width` | Sidebar thumbnail width |
| `--yt-spec-brand-background-primary` | YouTube main background |
| `--yt-spec-text-primary` | Primary text color |
| `--yt-spec-call-to-action` | YouTube's red/brand color |
| `--yt-spec-badge-chip-background` | Chip/badge background |

---

## Known YouTube Gotchas

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Feature stops working after navigation | SPA — `#secondary` is replaced | Implement `onPageChange()` + re-observe |
| Styles applied but then removed | Lit re-renders and overwrites | Re-apply via MutationObserver on attribute change |
| Observer fires thousands of times | Too broad — watching `document.body` | Target `#secondary` or specific containers |
| `querySelectorAll` returns empty | Element not yet in DOM | Wait for `yt-navigate-finish` or observe `#secondary` first |
| Shadow DOM elements unreachable | Polymer shadow root | Use CSS variables or target non-shadow wrapper elements |
