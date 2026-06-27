# Fix P0 and P1 Bugs

This plan addresses the highest priority bugs (P0 and P1) reported in the player page and related features.

## Proposed Changes

### Feature Orchestration & Configuration (Cinematic Mode)
Remove orphaned references to the deleted `cinematic-mode` feature to fix the broken UI toggle and prevent registration errors.

#### [MODIFY] [popup-schema.js](file:///f:/Youtube%202.0/src/popup/popup-schema.js)
- Remove the `cinematicMode` toggle from the `home` tab's `Feed Layout` section.

#### [MODIFY] [feature-manager.js](file:///f:/Youtube%202.0/src/content/core/feature-manager.js)
- Remove `cinematicMode` from the `PRIORITY_ORDER` array.

#### [MODIFY] [constants.js](file:///f:/Youtube%202.0/src/content/config/constants.js)
- Remove `CINEMATIC_MODE` from the `CSS_CLASSES` object.

#### [MODIFY] [shorts-ast.css](file:///f:/Youtube%202.0/src/content/features/shorts/shorts-ast.css)
- Remove `.ypp-cinematic-mode` CSS selectors.

#### [MODIFY] [settings-schema.js](file:///f:/Youtube%202.0/src/content/config/settings-schema.js)
- Remove the `cinematicMode` property default (if present).

---

### Player Media Effects (Volume Booster)
Fix the AudioContext suspension bug that prevents the volume booster from working without explicit user interaction (Autoplay policy violation) and memory leaks.

#### [MODIFY] [volume-booster.js](file:///f:/Youtube%202.0/src/content/features/player/media-effects/volume-booster/volume-booster.js)
- Refactor the `resumeAudioContext` logic. Instead of attaching a global `once` listener when the video loads, attach it robustly to user interactions (`click`, `keydown`, `pointerdown`) globally, and check `if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()`. 
- Ensure `resumeAudioContext` cleans up its listeners properly to avoid memory leaks when disabled.

---

### Player Enhancements (Video Speed Controller)
Fix keyboard shortcut conflicts where single-character shortcuts (like Z, X, S) hijack inputs when typing in search bars or comments.

#### [MODIFY] [video-speed-controller.js](file:///f:/Youtube%202.0/src/content/features/player/enhancements/video-speed-controller.js)
- Strengthen the input focus detection. Ensure that single key presses (`Z`, `X`, `S`, `D`, `R`, `V`) are accurately blocked if the user is typing in *any* YouTube input (search, comments, live chat, community posts).
- Verify the fallback for `e.target` missing or being a nested Web Component (Shadow DOM) since YouTube uses Polymer/Web Components heavily (e.g., checking `e.composedPath()`).

---

### Player Controls (Snapshot Button)
Fix the CORS error handling for canvas extraction.

#### [MODIFY] [snapshot-button.js](file:///f:/Youtube%202.0/src/content/features/player/controls/snapshot-button.js)
- Wrap `canvas.toBlob` and `canvas.toDataURL` in proper `try-catch` blocks.
- If a `SecurityError` is thrown because of tainted canvas (due to cross-origin CDNs or DRM), display a clean visual toast/alert inside the player, rather than throwing an unhandled exception or using the native `alert()` which disrupts user flow.
- Optimize canvas memory by restricting the max canvas dimensions to `1920x1080` even if the source is 4K, to prevent mobile crashing and memory spikes.

---

### Build Infrastructure
Generate the missing `dist/` artifacts.

#### [NEW] Execute Build Step
- Run `npm install` and `npm run build` using the terminal to generate `dist/content.js` and `dist/style.css` so the extension successfully works as an unpacked extension on the manifest V3 loading path.

## Verification Plan
1. **Cinematic Mode**: Check the Popup UI; ensure the Cinematic Mode toggle is gone.
2. **Volume Booster**: Open a video, interact with the page, and ensure the AudioContext transitions to `running` automatically.
3. **VSC**: Focus the search bar and type "zxrd". Ensure the video speed doesn't change and the characters appear in the search bar.
4. **Snapshot**: Click the snapshot button on a video; if it errors, verify the visual toast appears instead of a hard crash.
5. **Build**: Ensure the `dist/` directory contains updated bundles.
