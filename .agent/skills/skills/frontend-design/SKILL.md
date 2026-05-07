---
name: frontend-design
description: "Create distinctive, production-grade frontend interfaces with high design quality. Use when building popup UI, designing feature toggles, styling extension panels, or when told to beautify/redesign any UI component. Generates creative, polished interfaces that avoid generic AI aesthetics."
risk: safe
source: imported
date_added: "2026-05-07"
---

# Frontend Design

Creates distinctive, production-grade UI that avoids generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic detail.

---

## Design Thinking (Before Any Code)

Commit to a **BOLD aesthetic direction** before writing a single line:

| Question | Ask Yourself |
|----------|-------------|
| **Purpose** | What problem does this UI solve? Who uses it? |
| **Tone** | Pick an extreme: glassmorphic dark, neon brutalist, soft premium, retro-futuristic |
| **Differentiation** | What makes this UNFORGETTABLE? |
| **Constraints** | Extension popup constraints (max 400px width, fixed height) |

**CRITICAL:** Choose a clear direction and execute it with precision.

---

## Extension Popup Design Rules

### Color System
```css
/* Extension-specific palette — dark glassmorphism */
--bg-primary: #0a0a0f;
--bg-glass: rgba(255, 255, 255, 0.05);
--bg-glass-hover: rgba(255, 255, 255, 0.08);
--accent-primary: #6366f1;    /* Indigo */
--accent-secondary: #a855f7;  /* Purple */
--accent-glow: rgba(99, 102, 241, 0.3);
--text-primary: #f1f5f9;
--text-muted: #94a3b8;
--border-subtle: rgba(255, 255, 255, 0.08);
```

### Typography
- **Never use** Arial, Roboto, system-ui as primary font
- **Use** Inter, Outfit, DM Sans, Sora, or Plus Jakarta Sans
- Load from Google Fonts in `popup.html`

### Motion Principles
```css
/* Micro-interactions — all transitions should use this */
transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Hover lift effect */
transform: translateY(-1px);
box-shadow: 0 8px 25px rgba(99, 102, 241, 0.25);

/* Active press */
transform: translateY(0px) scale(0.98);
```

### Layout Aesthetics
- Use **glassmorphism** for cards: `backdrop-filter: blur(12px)`
- Use **gradient accents** on active states
- Use **subtle glow** on primary interactive elements
- Use **12px border-radius** minimum for cards
- Use **generous padding** (16px–24px inner padding on cards)

---

## Popup-Specific Patterns

### Feature Toggle Row
```css
.feature-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-glass);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.feature-row:hover {
  background: var(--bg-glass-hover);
  border-color: var(--accent-primary);
  transform: translateX(2px);
}
```

### Pill Toggle
```css
.pill-toggle {
  display: flex;
  background: rgba(0,0,0,0.3);
  border-radius: 20px;
  padding: 3px;
  border: 1px solid var(--border-subtle);
}
.pill-option {
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
.pill-option.active {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
  color: white;
  box-shadow: 0 2px 8px var(--accent-glow);
}
```

### Section Header (collapsible)
```css
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.section-header::after {
  content: '▸';
  margin-left: auto;
  transition: transform 0.2s ease;
}
.section-header.open::after {
  transform: rotate(90deg);
}
```

---

## Anti-Patterns (Immediate Rejection)

❌ Generic purple gradient on white/light background  
❌ Arial, Roboto, system-ui as the primary font  
❌ Square corners (use border-radius: 8px minimum)  
❌ Flat solid colors with no depth or texture  
❌ No hover effects on interactive elements  
❌ Inconsistent spacing (use 4px/8px/12px/16px/24px grid)  
❌ Low contrast text (< 4.5:1 ratio)  

---

## Implementation Checklist

- [ ] Google Fonts loaded in `<head>`
- [ ] CSS variables defined at `:root`
- [ ] All interactive elements have hover + active states
- [ ] Transitions use `cubic-bezier(0.4, 0, 0.2, 1)` not `linear`
- [ ] Glassmorphism with `backdrop-filter: blur()`
- [ ] Consistent spacing grid
- [ ] Color palette cohesive and premium
