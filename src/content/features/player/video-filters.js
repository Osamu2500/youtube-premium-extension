/**
 * Video Filters Feature — DEPRECATED / MERGED
 *
 * This feature has been merged into the Cinema Filters system inside player.js.
 * The Cinema Filters button now provides a unified tabbed panel with:
 *   - Presets tab (16 presets including CRT, VHS, Old Film)
 *   - Adjust tab (brightness, contrast, saturation, hue, blur, opacity sliders)
 *
 * This file is kept as a no-op stub so the FEATURE_MAP reference remains valid.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFilters = class VideoFilters {
    constructor() { this.name = 'VideoFilters'; }
    enable() {}
    disable() {}
    run() {}
    update() {}
};
