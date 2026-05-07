---
name: animejs-animation
description: "Advanced animation patterns for the extension popup UI. Use when adding micro-interactions, animated toggles, entrance animations, or staggered reveals to popup.html. Covers CSS transitions, keyframes, and anime.js for complex orchestrations."
risk: safe
source: imported
date_added: "2026-05-07"
---

# Animation Patterns for Extension UI

Fluid, polished animation guidance for the YouTube Premium Plus popup and injected UI elements.

---

## Extension Animation Budget

The popup is a **small, focused UI** — animations must be:
- **Fast**: 150–300ms max for micro-interactions
- **Subtle**: Enhance, don't distract
- **GPU-safe**: Only animate `transform` and `opacity`
- **Reducible**: Respect `prefers-reduced-motion`

```css
/* ALWAYS include this at the top of popup.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Core Easing Functions

```css
:root {
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1);   /* Bouncy spring */
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);          /* Material smooth */
  --ease-snap:    cubic-bezier(0.23, 1, 0.32, 1);         /* Snappy entrance */
  --ease-exit:    cubic-bezier(0.4, 0, 1, 1);             /* Quick exit */
}
```

---

## Popup Open Animation

```css
@keyframes popup-enter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

body {
  animation: popup-enter 0.2s var(--ease-snap) both;
}
```

---

## Toggle Switch Animation

```css
/* Smooth pill toggle transition */
.pill-option {
  transition: all 0.2s var(--ease-smooth);
  position: relative;
}

/* Active indicator sliding background */
.pill-toggle {
  position: relative;
}

.pill-indicator {
  position: absolute;
  inset: 3px;
  width: calc(50% - 3px);
  background: linear-gradient(135deg, #6366f1, #a855f7);
  border-radius: 16px;
  transition: transform 0.25s var(--ease-spring);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.pill-option[data-active="right"] .pill-indicator {
  transform: translateX(100%);
}
```

---

## Feature Row Hover Lift

```css
.feature-row {
  transition: transform 0.15s var(--ease-smooth),
              box-shadow 0.15s var(--ease-smooth),
              border-color 0.15s ease;
}

.feature-row:hover {
  transform: translateX(3px);
  box-shadow: -3px 0 0 0 #6366f1, 0 4px 12px rgba(0,0,0,0.2);
  border-color: rgba(99, 102, 241, 0.5);
}
```

---

## Section Collapse/Expand

```css
.section-content {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s var(--ease-smooth),
              opacity 0.2s ease;
  opacity: 0;
}

.section-content.open {
  max-height: 500px;
  opacity: 1;
}
```

---

## Staggered List Entrance (anime.js)

Use when revealing multiple feature rows on popup open:

```js
// In popup.js — after DOM is ready
import anime from 'animejs';

anime({
  targets: '.feature-row',
  translateX: [-12, 0],
  opacity: [0, 1],
  delay: anime.stagger(40, { start: 100 }),
  easing: 'spring(1, 80, 10, 0)',
  duration: 600,
});
```

---

## Toggle ON/OFF Pulse

```css
@keyframes toggle-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
  70%  { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}

input[type="checkbox"]:checked + .toggle-track {
  animation: toggle-pulse 0.4s ease-out;
}
```

---

## Loading Skeleton (for async settings load)

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
```

---

## Rules
- **NEVER** use `setTimeout` for animation sequencing — use CSS delays or anime.js stagger
- **NEVER** animate `width`, `height`, `top`, `left` — causes layout thrash
- **ALWAYS** animate `transform` and `opacity` only
- **ALWAYS** add `will-change: transform` to elements with complex animations
