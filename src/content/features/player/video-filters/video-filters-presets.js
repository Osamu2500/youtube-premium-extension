window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.VideoFiltersPresets = {
    FILTERS: [
        { category: 'Classic', name: 'Normal',        css: 'none',                                                        overlay: null },
        { category: 'Classic', name: 'Sepia',         css: 'sepia(100%)',                                                  overlay: null },
        { category: 'Classic', name: 'Grayscale',     css: 'grayscale(100%)',                                              overlay: null },
        { category: 'Classic', name: 'High Contrast', css: 'contrast(160%) saturate(90%)',                                 overlay: null },
        { category: 'Classic', name: 'Vivid',         css: 'saturate(200%) contrast(110%)',                                overlay: null },
        { category: 'Classic', name: 'Warm',          css: 'sepia(40%) saturate(130%) contrast(100%) brightness(105%)',    overlay: null },
        { category: 'Classic', name: 'Cool',          css: 'hue-rotate(200deg) saturate(130%) brightness(95%)',            overlay: null },
        { category: 'Classic', name: 'Invert',        css: 'invert(100%)',                                                 overlay: null },

        { category: 'Cinematic', name: 'Cinematic',     css: 'contrast(115%) saturate(110%) brightness(95%) hue-rotate(350deg)', overlay: null },
        { category: 'Cinematic', name: 'Noir',          css: 'grayscale(100%) contrast(130%) brightness(85%)',               overlay: null },
        { category: 'Cinematic', name: 'B&W Cinematic', css: 'grayscale(100%) contrast(140%) brightness(90%)', overlay: null },
        { category: 'Cinematic', name: 'Teal & Orange', css: 'hue-rotate(180deg) saturate(130%) contrast(115%) brightness(100%)', overlay: null },
        { category: 'Cinematic', name: 'Documentary',   css: 'contrast(120%) saturate(90%) brightness(100%)', overlay: null },
        { category: 'Cinematic', name: 'HDR',           css: 'contrast(140%) saturate(120%) brightness(110%)', overlay: null },

        { category: 'Retro & Analog', name: 'Retro',         css: 'sepia(60%) hue-rotate(330deg) saturate(150%) contrast(120%)', overlay: null },
        { category: 'Retro & Analog', name: '📺 CRT Display',css: 'url(#ypp-crt-rgb) contrast(135%) brightness(110%) saturate(85%)', overlay: 'crt' },
        { category: 'Retro & Analog', name: '📼 VHS Tape',   css: 'contrast(90%) brightness(85%) saturate(60%) hue-rotate(5deg)',overlay: 'vhs' },
        { category: 'Retro & Analog', name: '🎞 Old Film',   css: 'sepia(70%) contrast(90%) brightness(85%) blur(0.3px)',         overlay: 'oldfilm' },
        { category: 'Retro & Analog', name: 'Film Grain',    css: 'contrast(110%) brightness(100%) saturate(100%)', overlay: 'oldfilm' },
        { category: 'Retro & Analog', name: '90s TV',        css: 'contrast(85%) brightness(90%) saturate(75%) hue-rotate(5deg)', overlay: 'crt' },
        { category: 'Retro & Analog', name: 'Polaroid',      css: 'sepia(20%) contrast(105%) brightness(108%) saturate(110%)', overlay: null },

        { category: 'Artistic', name: 'Cyberpunk',     css: 'hue-rotate(180deg) saturate(180%) contrast(120%) brightness(110%)', overlay: null },
        { category: 'Artistic', name: 'Vaporwave',     css: 'hue-rotate(280deg) saturate(160%) contrast(110%) brightness(105%)', overlay: null },
        { category: 'Artistic', name: '80s Synthwave', css: 'hue-rotate(300deg) saturate(180%) contrast(130%) brightness(100%)', overlay: null },
        { category: 'Artistic', name: 'Neon Noir',     css: 'hue-rotate(280deg) saturate(200%) contrast(140%) brightness(85%)', overlay: null },
        { category: 'Artistic', name: 'Sci-Fi',        css: 'hue-rotate(220deg) saturate(140%) contrast(125%) brightness(90%)', overlay: null },
        { category: 'Artistic', name: 'Anime',         css: 'saturate(180%) contrast(115%) brightness(110%)', overlay: null },
        { category: 'Artistic', name: 'Comic Book',    css: 'contrast(200%) saturate(150%) brightness(110%)', overlay: null },
        { category: 'Artistic', name: 'Lomo',          css: 'saturate(150%) contrast(110%) brightness(95%) vignette(0.5)', overlay: null },

        { category: 'Atmospheric', name: 'Golden Hour',   css: 'sepia(30%) hue-rotate(30deg) saturate(130%) brightness(110%) contrast(105%)', overlay: null },
        { category: 'Atmospheric', name: 'Blue Hour',     css: 'hue-rotate(210deg) saturate(120%) brightness(95%) contrast(110%)', overlay: null },
        { category: 'Atmospheric', name: 'Summer',        css: 'sepia(15%) hue-rotate(40deg) saturate(140%) brightness(110%)', overlay: null },
        { category: 'Atmospheric', name: 'Winter',        css: 'hue-rotate(200deg) saturate(80%) brightness(105%) contrast(110%)', overlay: null },
        { category: 'Atmospheric', name: 'Autumn',        css: 'sepia(40%) hue-rotate(30deg) saturate(130%) brightness(100%)', overlay: null },
        { category: 'Atmospheric', name: 'Spring',        css: 'hue-rotate(100deg) saturate(150%) brightness(108%) contrast(105%)', overlay: null },
        { category: 'Atmospheric', name: 'Sunset',        css: 'sepia(30%) hue-rotate(330deg) saturate(150%) contrast(110%) brightness(105%)', overlay: null },

        { category: 'Mood', name: 'Dreamy',        css: 'brightness(110%) contrast(90%) saturate(120%) blur(0.5px)',    overlay: null },
        { category: 'Mood', name: 'Muted',         css: 'saturate(70%) contrast(90%) brightness(105%)', overlay: null },
        { category: 'Mood', name: 'Pastel',        css: 'saturate(60%) brightness(115%) contrast(85%)', overlay: null },
        { category: 'Mood', name: 'Soft Focus',    css: 'brightness(105%) contrast(95%) saturate(90%) blur(0.8px)', overlay: null },
        { category: 'Mood', name: 'Horror',        css: 'contrast(130%) brightness(80%) saturate(70%) hue-rotate(10deg)', overlay: null },
        { category: 'Mood', name: 'Fantasy',       css: 'saturate(140%) brightness(105%) contrast(110%) hue-rotate(300deg)', overlay: null },
        { category: 'Mood', name: 'Gothic',        css: 'contrast(125%) brightness(85%) saturate(60%) hue-rotate(340deg)', overlay: null },
    ]
};
