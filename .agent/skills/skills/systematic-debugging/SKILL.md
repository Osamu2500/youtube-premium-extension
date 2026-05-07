---
name: systematic-debugging
description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes"
risk: unknown
source: community
date_added: "2026-05-07"
---

## Overview
Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## When to Use
Use for ANY technical issue in the YouTube Premium Plus extension:
- DOM bugs (thumbnails not sizing, features not applying)
- Test failures
- Extension popup UI bugs
- Unexpected behavior after SPA navigation
- Feature settings not persisting
- MutationObserver not triggering
- Content script injection failures
- Build failures

**Use this ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes
- Previous fix didn't work
- YouTube DOM changes broke something
- You don't fully understand the issue

## The Four Phases
You MUST complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation
**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Check the browser console for errors
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - Does it happen every time or only after SPA navigation?
   - Is it YouTube-page-specific or universal?

3. **Check Recent Changes**
   - What changed that could cause this?
   - Git diff, recent commits
   - New dependencies, config changes

4. **Gather Evidence in Multi-Component Systems**

   **For the extension, trace through:**
   ```
   popup.js (UI) → chrome.storage → main.js (orchestration)
     → FeatureManager → Feature class
       → DOM manipulation
         → MutationObserver
   ```

5. **Trace Data Flow**
   - Where does the bad value originate?
   - Is settings merge working correctly? (check `{...this.settings, ...request.settings}`)
   - Is the feature being enabled/disabled correctly?
   - Is the DOM element present when the code runs?

### Phase 2: Pattern Analysis
**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working features in `src/content/features/`
   - What works that's similar to what's broken?

2. **Compare Against References**
   - Read working feature implementations completely
   - Understand the pattern fully before applying

3. **Identify Differences**
   - What's different between working and broken?
   - Check YouTube selector specificity

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis**
   - State clearly: "I think X is the root cause because Y"
   - Be specific, not vague

2. **Test Minimally**
   - Make the SMALLEST possible change to test hypothesis
   - One variable at a time

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4
   - Didn't work? Form NEW hypothesis
   - DON'T add more fixes on top

4. **If 3+ Fixes Failed: Question Architecture**
   - Is the DOM selector still valid? (YouTube updates their DOM)
   - Is the approach fundamentally flawed?
   - Discuss with human before attempting more fixes

### Phase 4: Implementation

1. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time

2. **Build & Test**
   - Run `npm run build`
   - Reload the extension in Chrome
   - Test on actual YouTube pages

## Red Flags - STOP and Follow Process
If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "It's probably the selector, let me change it"
- "One more fix attempt" (when already tried 2+)

**ALL of these mean: STOP. Return to Phase 1.**

## Common Extension-Specific Root Causes
| Symptom | Likely Root Cause |
|---------|-------------------|
| Feature not applying after SPA navigation | Missing `onPageChange()` re-init |
| Settings overwriting other features | Missing merge `{...this.settings, ...incoming}` |
| CSS overridden by YouTube | Need `element.style.setProperty(..., 'important')` |
| Feature enabled but no effect | Selector outdated / YouTube DOM changed |
| MutationObserver not firing | Wrong target element or subtree config |
