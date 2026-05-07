---
name: uncle-bob-craft
description: "Use when performing code review, writing or refactoring extension code, or discussing architecture. Applies Clean Code + SOLID principles to keep feature classes focused, boundaries clean, and lifecycle methods pure."
risk: safe
source: imported
date_added: "2026-05-07"
---

# Uncle Bob Craft — Clean Code for the Extension

Applies Robert C. Martin principles to this extension codebase.

## Single Responsibility (SRP)
Each feature class does ONE thing:
```js
// Good
class HideWatched { /* only hides watched videos */ }
class SidebarLayout { /* only controls sidebar layout */ }
```

## Naming Rules
| Bad | Good |
|-----|------|
| `fn()` | `applyExpandedLayout()` |
| `el` | `thumbnailContainer` |
| `flag` | `isObserverActive` |
| `handle()` | `onMutationObserved()` |

## Function Rules
- Max ~20 lines per function — if longer, extract
- One level of abstraction per function
- Command/Query separation

## Code Smells
| Smell | Fix |
|-------|-----|
| Rigidity — small change requires many edits | Extract shared logic |
| Fragility — feature breaks unrelated things | Decouple via settings merge |
| Opacity — can't tell what code does | Better naming, extract methods |
| Needless repetition — same selector 3+ times | Extract as a constant |

## Extension-Specific Patterns
```js
// Constants — no magic strings
const SELECTORS = {
  SIDEBAR: '#secondary',
  COMPACT_RENDERER: 'ytd-compact-video-renderer',
  THUMBNAIL: 'a#thumbnail',
};

// Pure lifecycle methods
enable() {
  this._applyToExisting();
  this._attachObserver();
}

disable() {
  this._detachObserver();
  this._removeAllStamps();
}
```

## Review Checklist
- [ ] Class has one clear responsibility
- [ ] All methods named with clear intent (verbs)
- [ ] No method exceeds ~20 lines
- [ ] No magic strings — use constants
- [ ] No logic duplication
- [ ] `enable()`, `disable()`, `update()`, `onPageChange()` all present
- [ ] Observer cleanup in `disable()` — no memory leaks
