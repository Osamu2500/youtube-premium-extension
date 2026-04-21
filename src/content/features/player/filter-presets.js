/**
 * Shared Filter Presets
 * Readonly constants used by both VideoFilters (YouTube player) and GlobalPlayerBar (external video tags).
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.FilterPresets = {
    // Defines the available CSS filters and their overlay parameters
    PRESETS: [
        { category: 'Classic', name: 'Normal',        css: 'none',                                                        overlay: null },
        { category: 'Classic', name: 'Sepia',         css: 'sepia(100%)',                                                 overlay: null },
        { category: 'Classic', name: 'Grayscale',     css: 'grayscale(100%)',                                             overlay: null },
        { category: 'Classic', name: 'High Contrast', css: 'contrast(160%) saturate(90%)',                                overlay: null },
        { category: 'Classic', name: 'Vivid',         css: 'saturate(200%) contrast(110%)',                               overlay: null },
        { category: 'Classic', name: 'Warm',          css: 'sepia(40%) saturate(130%) contrast(100%) brightness(105%)',   overlay: null },
        { category: 'Classic', name: 'Cool',          css: 'hue-rotate(200deg) saturate(130%) brightness(95%)',           overlay: null },
        { category: 'Classic', name: 'Invert',        css: 'invert(100%)',                                                overlay: null },

        { category: 'Cinematic', name: 'Cinematic',     css: 'contrast(115%) saturate(110%) brightness(95%) hue-rotate(350deg)', overlay: null },
        { category: 'Cinematic', name: 'Noir',          css: 'grayscale(100%) contrast(130%) brightness(85%)',               overlay: null },
        { category: 'Cinematic', name: 'B&W Cinematic', css: 'grayscale(100%) contrast(140%) brightness(90%)',               overlay: null },
        { category: 'Cinematic', name: 'Teal & Orange', css: 'hue-rotate(180deg) saturate(130%) contrast(115%) brightness(100%)', overlay: null },
        { category: 'Cinematic', name: 'Documentary',   css: 'contrast(120%) saturate(90%) brightness(100%)',                overlay: null },
        { category: 'Cinematic', name: 'HDR',           css: 'contrast(140%) saturate(120%) brightness(110%)',               overlay: null },

        { category: 'Retro & Analog', name: 'Retro',    css: 'sepia(60%) hue-rotate(330deg) saturate(150%) contrast(120%)', overlay: null },
        { category: 'Retro & Analog', name: '90s TV',   css: 'contrast(85%) brightness(90%) saturate(75%) hue-rotate(5deg)', 
            overlay: { type: 'crt', scanlines: 0.1, noise: 0.15, vignette: 0.3 } },
        { category: 'Retro & Analog', name: 'Polaroid', css: 'sepia(20%) contrast(105%) brightness(108%) saturate(110%)', overlay: null },
        { category: 'Retro & Analog', name: 'VHS Tape', css: 'contrast(90%) brightness(95%) saturate(80%) sepia(20%) hue-rotate(-5deg)',
            overlay: { type: 'vhs', noise: 0.25, lines: true, tracking: true } },

        { category: 'Artistic', name: 'Cyberpunk',     css: 'hue-rotate(180deg) saturate(180%) contrast(120%) brightness(110%)', overlay: null },
        { category: 'Artistic', name: 'Vaporwave',     css: 'hue-rotate(280deg) saturate(160%) contrast(110%) brightness(105%)', overlay: null },
        { category: 'Artistic', name: 'Anime',         css: 'saturate(180%) contrast(115%) brightness(110%)',                overlay: null },

        { category: 'Atmospheric', name: 'Old Film',    css: 'sepia(80%) grayscale(40%) contrast(110%) brightness(90%)',
            overlay: { type: 'film', grain: 0.3, scratches: true, flicker: true } },
        { category: 'Atmospheric', name: 'Golden Hour', css: 'sepia(30%) hue-rotate(30deg) saturate(130%) brightness(110%) contrast(105%)', overlay: null },
        { category: 'Atmospheric', name: 'Blue Hour',   css: 'hue-rotate(210deg) saturate(120%) brightness(95%) contrast(110%)', overlay: null },
        { category: 'Atmospheric', name: 'Sunset',      css: 'sepia(30%) hue-rotate(330deg) saturate(150%) contrast(110%) brightness(105%)', overlay: null },
    ],

    // Gradients used for preview thumbnails
    PREVIEW_GRADIENTS: [
        'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)',
        'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
        'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
        'linear-gradient(135deg, #df89b5 0%, #bfd9fe 100%)'
    ]
};
