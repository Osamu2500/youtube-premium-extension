---
name: browser-extension-builder
description: "Expert in building Chrome Manifest V3 browser extensions. Use when adding new features, fixing DOM issues, managing content scripts, or handling YouTube SPA navigation. Covers MV3 architecture, content scripts, messaging, storage, and DOM manipulation."
risk: safe
source: imported
date_added: "2026-05-07"
---

# Browser Extension Builder

Expert playbook for the YouTube Premium Plus Chrome extension (Manifest V3).

## Architecture Overview

```
src/
  content/
    main.js              # FeatureManager orchestration layer
    features/
      core/global/       # Page-wide features (hide-watched, themes, etc.)
      player/            # Video player page features (sidebar-layout, etc.)
  popup/
    popup.html           # Extension settings UI
    popup.js             # Settings sync + UI logic
  background/            # Service worker (MV3)
dist/                    # Built output (Vite)
```

## MV3 Critical Rules

### Content Scripts
- Content scripts run in an **isolated world** — no access to page's JS globals
- Use `chrome.storage.local` for persistence (NOT localStorage)
- Message passing via `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`

### Settings Flow
```
popup.js (user changes setting)
  → chrome.storage.local.set(settings)
    → main.js onMessage handler (UPDATE_SETTINGS)
      → this.settings = {...this.settings, ...request.settings}  // ALWAYS MERGE
        → feature.update(this.settings)
```

**⚠️ CRITICAL: NEVER overwrite `this.settings` wholesale. Always merge.**

### Feature Lifecycle
Every feature must implement:
```js
class MyFeature {
  constructor(settings) { /* init */ }
  enable()      // Apply DOM changes / start observers
  disable()     // Clean up ALL DOM changes, stop observers
  update(settings) // Re-apply with new settings
  onPageChange() // Called on YouTube SPA navigation
}
```

## YouTube DOM Patterns

### SPA Navigation Detection
YouTube is a SPA. DOM changes without full page reload. Use:
```js
document.addEventListener('yt-navigate-finish', () => {
  this.onPageChange();
});
```

### Overriding YouTube's CSS
YouTube uses Lit/Polymer with high-specificity inline styles. CSS classes alone are NOT enough.

**The only reliable way to override:**
```js
element.style.setProperty('property', 'value', 'important');
```

**For cleanup:**
```js
element.style.removeProperty('property');
// OR stamp a data attribute to track processed elements
element.setAttribute('data-ypp-processed', 'true');
```

### MutationObserver Pattern
```js
this._observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        this._processElement(node);
      }
    }
  }
});
this._observer.observe(document.querySelector('#secondary'), {
  childList: true,
  subtree: true
});
```

**Cleanup on disable:**
```js
if (this._observer) {
  this._observer.disconnect();
  this._observer = null;
}
```

## Popup UI Patterns

### Settings Persistence
```js
// Always read from storage on popup open
chrome.storage.local.get(['settings'], (result) => {
  applySettingsToUI(result.settings);
});

// Always save via saveSettings() — never manual messages
function saveSettings() {
  const settings = gatherSettingsFromUI();
  chrome.storage.local.set({ settings }, () => {
    chrome.tabs.query({active: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'UPDATE_SETTINGS',
        settings
      });
    });
  });
}
```

### Pill Toggle Pattern
```html
<div class="pill-toggle" id="myFeatureToggle">
  <button class="pill-option active" data-value="option1">Option 1</button>
  <button class="pill-option" data-value="option2">Option 2</button>
</div>
```

## Build & Test Workflow
```bash
npm run build          # Build to dist/
# Then: Chrome → Extensions → Reload extension → Test on YouTube
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| CSS class not applying | Use `element.style.setProperty(..., 'important')` |
| Feature breaks after SPA nav | Implement `onPageChange()` hook |
| Other features disabled on update | Merge settings: `{...current, ...incoming}` |
| Observer not firing | Check target element exists before observing |
| Selector stops working | YouTube updated their DOM — check DevTools |
| Memory leak | Always `disconnect()` observers in `disable()` |

## Testing Checklist
- [ ] Feature works on initial page load
- [ ] Feature survives SPA navigation (click between videos)
- [ ] Feature can be toggled off and on
- [ ] Settings persist after popup is closed and reopened
- [ ] Other features still work after this feature's settings change
- [ ] No console errors
