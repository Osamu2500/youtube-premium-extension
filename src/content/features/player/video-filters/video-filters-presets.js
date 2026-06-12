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

        { category: 'Special Effects', name: 'Night Vision', css: 'saturate(0%) sepia(100%) hue-rotate(60deg) brightness(140%) contrast(160%)', overlay: 'nightvision' },
        { category: 'Special Effects', name: 'Thermal',      css: 'invert(100%) hue-rotate(180deg) saturate(400%) contrast(200%)', overlay: null },
        { category: 'Special Effects', name: 'X-Ray',        css: 'invert(100%) grayscale(100%) contrast(150%)', overlay: null },
        { category: 'Special Effects', name: 'Psychedelic',  css: 'hue-rotate(90deg) saturate(300%) contrast(150%) invert(20%)', overlay: null },
        { category: 'Special Effects', name: 'RGB Glitch',   css: 'url(#ypp-fx-glitch) contrast(120%) brightness(110%) saturate(120%)', overlay: null },
        { category: 'Special Effects', name: 'The Matrix',   css: 'url(#ypp-fx-matrix) contrast(150%) brightness(130%)', overlay: null },
        { category: 'Special Effects', name: 'Posterize',    css: 'url(#ypp-fx-posterize) saturate(150%) contrast(120%)', overlay: null },
        { category: 'Special Effects', name: 'Emboss',       css: 'url(#ypp-fx-emboss) grayscale(100%) contrast(150%) brightness(120%)', overlay: null },
        { category: 'Special Effects', name: 'Neon Edge',    css: 'url(#ypp-fx-edge) saturate(200%) brightness(120%)', overlay: null },
        { category: 'Special Effects', name: 'Deep Fried',   css: 'saturate(400%) contrast(300%) brightness(120%) hue-rotate(-10deg)', overlay: null },
        { category: 'Special Effects', name: 'Duotone Red',  css: 'grayscale(100%) sepia(100%) hue-rotate(320deg) saturate(400%) contrast(140%)', overlay: null },
        { category: 'Special Effects', name: 'Colorize B&W', css: 'url(#ypp-fx-colorize) saturate(120%) contrast(110%)', overlay: null },
        { category: 'Special Effects', name: 'Vintage Colorize', css: 'url(#ypp-fx-technicolor) saturate(110%) contrast(115%)', overlay: null },
        { category: 'Special Effects', name: 'Dream Colorize', css: 'url(#ypp-fx-dreamcolor) saturate(130%) contrast(110%)', overlay: null },

        // ── Social Media ──
        { category: 'Social Media', name: '1977',        css: 'sepia(50%) hue-rotate(-30deg) saturate(140%)', overlay: null },
        { category: 'Social Media', name: 'Aden',        css: 'sepia(20%) brightness(115%) saturate(140%)', overlay: null },
        { category: 'Social Media', name: 'Amaro',       css: 'sepia(35%) contrast(110%) brightness(120%) saturate(130%)', overlay: null },
        { category: 'Social Media', name: 'Ashby',       css: 'sepia(50%) contrast(120%) saturate(180%)', overlay: null },
        { category: 'Social Media', name: 'Brannan',     css: 'sepia(40%) contrast(125%) brightness(110%) saturate(90%) hue-rotate(-2deg)', overlay: null },
        { category: 'Social Media', name: 'Brooklyn',    css: 'sepia(25%) contrast(125%) brightness(125%) hue-rotate(5deg)', overlay: null },
        { category: 'Social Media', name: 'Charmes',     css: 'sepia(25%) contrast(125%) brightness(125%) saturate(135%) hue-rotate(-5deg)', overlay: null },
        { category: 'Social Media', name: 'Clarendon',   css: 'contrast(120%) saturate(135%) brightness(110%) hue-rotate(5deg)', overlay: null },
        { category: 'Social Media', name: 'Crema',       css: 'sepia(50%) contrast(125%) brightness(115%) saturate(90%) hue-rotate(-2deg)', overlay: null },
        { category: 'Social Media', name: 'Dogpatch',    css: 'sepia(35%) saturate(110%) contrast(150%) brightness(110%)', overlay: null },
        { category: 'Social Media', name: 'Earlybird',   css: 'sepia(25%) contrast(125%) brightness(115%) saturate(90%) hue-rotate(-5deg)', overlay: null },
        { category: 'Social Media', name: 'Gingham',     css: 'brightness(105%) hue-rotate(350deg) contrast(110%) saturate(120%)', overlay: null },
        { category: 'Social Media', name: 'Ginza',       css: 'sepia(25%) contrast(115%) brightness(120%) saturate(135%) hue-rotate(-5deg)', overlay: null },
        { category: 'Social Media', name: 'Hefe',        css: 'sepia(40%) contrast(150%) brightness(120%) saturate(140%) hue-rotate(-10deg)', overlay: null },
        { category: 'Social Media', name: 'Helena',      css: 'sepia(50%) contrast(105%) brightness(105%) saturate(135%)', overlay: null },
        { category: 'Social Media', name: 'Hudson',      css: 'sepia(25%) contrast(120%) brightness(120%) saturate(105%) hue-rotate(-15deg)', overlay: null },
        { category: 'Social Media', name: 'Inkwell',     css: 'grayscale(100%) sepia(15%) contrast(110%) brightness(110%)', overlay: null },
        { category: 'Social Media', name: 'Juno',        css: 'saturate(140%) contrast(110%) brightness(115%) hue-rotate(15deg)', overlay: null },
        { category: 'Social Media', name: 'Kelvin',      css: 'sepia(15%) contrast(150%) brightness(110%) saturate(120%) hue-rotate(-10deg)', overlay: null },
        { category: 'Social Media', name: 'Lark',        css: 'contrast(120%) saturate(120%) brightness(110%) hue-rotate(5deg)', overlay: null },
        { category: 'Social Media', name: 'Lo-Fi',       css: 'saturate(110%) contrast(150%)', overlay: null },
        { category: 'Social Media', name: 'Ludwig',      css: 'sepia(25%) contrast(105%) brightness(105%) saturate(200%) hue-rotate(-5deg)', overlay: null },
        { category: 'Social Media', name: 'Maven',       css: 'sepia(25%) contrast(105%) brightness(105%) saturate(150%) hue-rotate(-5deg)', overlay: null },
        { category: 'Social Media', name: 'Mayfair',     css: 'contrast(110%) brightness(115%) saturate(110%)', overlay: null },
        { category: 'Social Media', name: 'Moon',        css: 'grayscale(100%) contrast(110%) brightness(110%)', overlay: null },
        { category: 'Social Media', name: 'Nashville',   css: 'sepia(25%) contrast(150%) brightness(105%) saturate(120%) hue-rotate(-15deg)', overlay: null },
        { category: 'Social Media', name: 'Perpetua',    css: 'contrast(110%) brightness(125%) saturate(110%)', overlay: null },
        { category: 'Social Media', name: 'Reyes',       css: 'sepia(75%) contrast(75%) brightness(125%) saturate(140%)', overlay: null },
        { category: 'Social Media', name: 'Rise',        css: 'sepia(25%) contrast(125%) brightness(120%) saturate(90%) hue-rotate(5deg)', overlay: null },
        { category: 'Social Media', name: 'Sierra',      css: 'sepia(25%) contrast(150%) brightness(90%) saturate(120%) hue-rotate(-15deg)', overlay: null },
        { category: 'Social Media', name: 'Slumber',     css: 'sepia(35%) contrast(125%) brightness(105%) saturate(130%)', overlay: null },
        { category: 'Social Media', name: 'Stinson',     css: 'sepia(35%) contrast(125%) brightness(115%) saturate(110%)', overlay: null },
        { category: 'Social Media', name: 'Sutro',       css: 'sepia(40%) contrast(120%) brightness(90%) saturate(140%) hue-rotate(-10deg)', overlay: null },
        { category: 'Social Media', name: 'Toaster',     css: 'sepia(25%) contrast(150%) brightness(95%) saturate(110%) hue-rotate(-15deg)', overlay: null },
        { category: 'Social Media', name: 'Valencia',    css: 'sepia(25%) contrast(125%) brightness(110%) saturate(110%)', overlay: null },
        { category: 'Social Media', name: 'Walden',      css: 'sepia(35%) contrast(80%) brightness(125%) saturate(140%) hue-rotate(-10deg)', overlay: null },
        { category: 'Social Media', name: 'Willow',      css: 'grayscale(100%) sepia(20%) contrast(110%) brightness(120%)', overlay: null },
        { category: 'Social Media', name: 'X-Pro II',    css: 'sepia(45%) contrast(125%) brightness(175%) saturate(130%) hue-rotate(-5deg)', overlay: null },

        // ── Anime Worlds ──
        { category: 'Anime Worlds', name: 'Studio Ghibli',   css: 'sepia(15%) saturate(160%) contrast(110%) brightness(110%) hue-rotate(5deg)', overlay: null },
        { category: 'Anime Worlds', name: 'Makoto Shinkai',  css: 'saturate(200%) contrast(125%) brightness(115%) hue-rotate(350deg)', overlay: null },
        { category: 'Anime Worlds', name: 'KyoAni Soft',     css: 'saturate(140%) contrast(95%) brightness(115%)', overlay: null },
        { category: 'Anime Worlds', name: 'Ufotable Night',  css: 'saturate(170%) contrast(135%) brightness(105%) hue-rotate(210deg)', overlay: null },
        { category: 'Anime Worlds', name: 'MAPPA Dark',      css: 'saturate(80%) contrast(130%) brightness(90%) hue-rotate(200deg)', overlay: null },
        { category: 'Anime Worlds', name: '90s Retro Anime', css: 'sepia(30%) contrast(95%) saturate(120%) brightness(105%) hue-rotate(345deg)', overlay: null },
        { category: 'Anime Worlds', name: 'Pastel Shojo',    css: 'sepia(20%) saturate(130%) contrast(90%) brightness(120%) hue-rotate(330deg)', overlay: null },
        { category: 'Anime Worlds', name: 'Isekai Fantasy',  css: 'saturate(170%) contrast(115%) brightness(110%) hue-rotate(10deg)', overlay: null },
        { category: 'Anime Worlds', name: 'Cyberpunk Edgerunner', css: 'saturate(180%) contrast(140%) brightness(95%) hue-rotate(290deg)', overlay: null },
        { category: 'Anime Worlds', name: 'Shonen Pop',      css: 'saturate(160%) contrast(120%) brightness(110%)', overlay: null },

        // ── Cinematic Worlds ──
        // Each filter is tuned to recreate the iconic color grade of a specific film/franchise

        { category: 'Cinematic Worlds', name: 'Dune',
          // Arrakis: scorched amber sand, bleached sky, high contrast desert heat
          css: 'sepia(45%) hue-rotate(10deg) saturate(130%) contrast(130%) brightness(105%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Twilight',
          // Cold blue-green teal desaturated Pacific Northwest romance grade
          css: 'hue-rotate(175deg) saturate(70%) contrast(110%) brightness(90%) sepia(15%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Disney Magic',
          // Vibrant, warm, punchy fairy-tale palette — high saturation with lifted blacks
          css: 'saturate(220%) contrast(105%) brightness(112%) hue-rotate(350deg)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Pixar Glow',
          // Soft, warm, slightly over-exposed look — bright highlights and clean colours
          css: 'brightness(118%) contrast(95%) saturate(170%) hue-rotate(355deg)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Avatar: Pandora',
          // Bioluminescent blue-green lush jungle — deep teal, vivid cyan, boosted saturation
          css: 'hue-rotate(155deg) saturate(210%) contrast(125%) brightness(95%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Interstellar',
          // Cold steel blue space / warm wheat field split — desaturated with cool shift
          css: 'hue-rotate(195deg) saturate(75%) contrast(125%) brightness(98%) sepia(10%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Mad Max: Fury Road',
          // Scorched orange chrome — bleached sky, hyper-orange foreground, crushed blacks
          css: 'sepia(60%) hue-rotate(345deg) saturate(200%) contrast(145%) brightness(105%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Lord of the Rings',
          // New Zealand epic: warm green lands + golden mist — earthy, high contrast
          css: 'hue-rotate(20deg) saturate(145%) contrast(118%) brightness(102%) sepia(25%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Blade Runner 2049',
          // Amber smog dystopia: warm orange fog + cold neon accents, heavy contrast
          css: 'sepia(50%) hue-rotate(15deg) saturate(160%) contrast(140%) brightness(88%)',
          overlay: null },

        { category: 'Cinematic Worlds', name: 'Marvel Studios',
          // MCU bright blockbuster: punchy primaries, slightly teal shadows, vivid highlights
          css: 'saturate(175%) contrast(120%) brightness(108%) hue-rotate(185deg)',
          overlay: null }
    ]
};
