---
name: web-design-guidelines
description: "Review popup UI and extension interface code for Web Interface Guidelines compliance. Use when asked to review UI, check accessibility, audit design, or improve the popup's UX."
risk: safe
source: imported
date_added: "2026-05-07"
---

# Web Interface Guidelines for Extension UI

Review popup UI (`popup.html`, `popup.js`, CSS) for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest Vercel Web Interface Guidelines
2. Read the specified popup/UI files
3. Check against all rules in the fetched guidelines
4. Output findings in `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:
```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules.

## Extension-Specific UI Checklist

### Popup Design Principles
- [ ] Dark glassmorphism theme consistent across all tabs
- [ ] Feature toggles use pill-toggle pattern (not checkboxes)
- [ ] Sliders have visible value labels
- [ ] Section headers are collapsible by default
- [ ] Color palette is cohesive (no generic reds/blues)
- [ ] Typography uses Inter or similar modern font
- [ ] Hover effects on all interactive elements
- [ ] Transitions smooth (200-300ms)

### Accessibility
- [ ] All interactive elements have unique IDs
- [ ] Toggle buttons have `aria-pressed` state
- [ ] Sliders have `aria-label` and `aria-valuenow`
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus indicators visible

### Consistency Rules
- [ ] All feature sections follow same layout pattern
- [ ] Same spacing tokens used throughout
- [ ] Icon style consistent across tabs
- [ ] Success/error states consistent

## Output Format
```
popup.html:42 — Missing aria-label on toggle button
popup.css:128 — Color contrast below WCAG AA
popup.js:203 — Missing keyboard event handler
```
