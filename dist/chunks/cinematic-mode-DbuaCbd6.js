const v=`/* ============================================================================\r
** Core Variables and Root Settings\r
============================================================================ */\r
:root {\r
  --netflix-red: #e50914;\r
  --netflix-black: #141414;\r
  --netflix-dark-gray: #181818;\r
  --netflix-light-gray: #e5e5e5;\r
}\r
\r
/* ============================================================================\r
** Base Layout and Global Styles\r
============================================================================ */\r
\r
body.cinematic {\r
  overflow: scroll !important;\r
  opacity: 0;\r
  -moz-animation: fadeIn 1s ease-in-out;\r
  -webkit-animation: fadeIn 1s ease-in-out;\r
  animation: fadeIn 1s ease-in-out;\r
  -moz-animation-delay: 1s;\r
  -webkit-animation-delay: 1s;\r
  animation-delay: 1s;\r
  -moz-animation-fill-mode: forwards;\r
  -webkit-animation-fill-mode: forwards;\r
  animation-fill-mode: forwards;\r
}\r
\r
body.cinematic-home {\r
  overflow: hidden !important;\r
  background: var(--netflix-black) !important;\r
}\r
\r
body.cinematic-home ytd-page-manager.ytd-app {\r
  margin-left: auto !important;\r
  margin-right: auto !important;\r
  width: 90vw !important;\r
}\r
\r
/* Ensure header icons and text maintain dark mode appearance regardless of system theme */\r
body.cinematic ytd-masthead #start *,\r
body.cinematic ytd-masthead #center *,\r
body.cinematic ytd-masthead #end *,\r
body.cinematic ytd-masthead #end yt-icon,\r
body.cinematic ytd-masthead #end .yt-spec-icon-shape,\r
body.cinematic ytd-masthead #end svg,\r
body.cinematic ytd-masthead #start svg,\r
body.cinematic ytd-masthead #start yt-icon,\r
body.cinematic ytd-masthead yt-icon,\r
body.cinematic ytd-masthead .yt-spec-icon-shape svg,\r
body.cinematic ytd-masthead ytd-button-renderer,\r
body.cinematic ytd-masthead yt-icon-button {\r
  fill: #fff !important;\r
  color: #fff !important;\r
}\r
\r
/* Make the pill container fully transparent in cinematic mode */\r
html.yt-premium-plus-theme body.cinematic-home ytd-masthead #container,\r
body.cinematic-home ytd-masthead #container {\r
  background: transparent !important;\r
  backdrop-filter: none !important;\r
  -webkit-backdrop-filter: none !important;\r
  border: none !important;\r
  box-shadow: none !important;\r
}\r
\r
html.yt-premium-plus-theme body.cinematic-home ytd-masthead #container:hover,\r
body.cinematic-home ytd-masthead #container:hover {\r
  background: transparent !important;\r
  box-shadow: none !important;\r
  border: none !important;\r
}\r
\r
/* Fix white circles on masthead icon buttons and YouTube logo.\r
   YouTube's button shapes have semi-opaque white fills in dark mode by default. */\r
body.cinematic-home ytd-masthead yt-icon-button,\r
body.cinematic-home ytd-masthead #buttons yt-icon-button,\r
body.cinematic-home ytd-masthead #guide-button,\r
body.cinematic-home ytd-masthead #logo-container,\r
body.cinematic-home ytd-masthead #logo,\r
body.cinematic-home ytd-masthead ytd-topbar-logo-renderer {\r
  background: transparent !important;\r
  background-color: transparent !important;\r
}\r
body.cinematic-home ytd-masthead yt-icon-button:hover {\r
  background: rgba(255, 255, 255, 0.1) !important;\r
}\r
\r
/* Fix button-shape backgrounds (YouTube's pill-shaped icon buttons) */\r
body.cinematic-home ytd-masthead .yt-spec-button-shape-next,\r
body.cinematic-home ytd-masthead .yt-spec-button-shape-with-label__button {\r
  background: transparent !important;\r
  --yt-spec-icon-button-icon-active-color: #fff !important;\r
}\r
\r
body.cinematic\r
  .yt-spec-button-shape-next--mono.yt-spec-button-shape-next--text {\r
  color: #fff !important;\r
}\r
\r
/* ============================================================================\r
** Header and Navigation Styling\r
============================================================================ */\r
/* Main header styling */\r
html.yt-premium-plus-theme body.cinematic-home #masthead-container,\r
body.cinematic-home #masthead-container,\r
html.yt-premium-plus-theme body.cinematic-home #masthead-container.ytd-app,\r
body.cinematic-home #masthead-container.ytd-app,\r
html.yt-premium-plus-theme body.cinematic-home ytd-masthead,\r
body.cinematic-home ytd-masthead,\r
html.yt-premium-plus-theme body.cinematic-home ytd-masthead::after,\r
body.cinematic-home ytd-masthead::after,\r
html.yt-premium-plus-theme body.cinematic-home #background.ytd-masthead,\r
body.cinematic-home #background.ytd-masthead {\r
  background: transparent !important;\r
  background-color: transparent !important;\r
  --yt-spec-base-background: transparent !important;\r
  --yt-spec-raised-background: transparent !important;\r
  --yt-spec-menu-background: transparent !important;\r
  box-shadow: none !important;\r
}\r
\r
html.yt-premium-plus-theme body.cinematic-home ytd-feed-filter-chip-bar-renderer,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer,\r
html.yt-premium-plus-theme body.cinematic-home ytd-feed-filter-chip-bar-renderer #chips-wrapper,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer #chips-wrapper,\r
html.yt-premium-plus-theme body.cinematic-home ytd-feed-filter-chip-bar-renderer #scroll-container,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer #scroll-container,\r
html.yt-premium-plus-theme body.cinematic-home ytd-feed-filter-chip-bar-renderer #right-arrow,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer #right-arrow,\r
html.yt-premium-plus-theme body.cinematic-home ytd-feed-filter-chip-bar-renderer #left-arrow,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer #left-arrow {\r
  background: transparent !important;\r
  background-color: transparent !important;\r
  --yt-spec-base-background: transparent !important;\r
  --yt-spec-raised-background: transparent !important;\r
  border-top: none !important;\r
  border-bottom: none !important;\r
}\r
\r
body.cinematic-home yt-chip-cloud-chip-renderer,\r
body.cinematic-home .ypp-filter-chip {\r
  background: transparent !important;\r
  background-color: transparent !important;\r
  border: 1px solid transparent !important;\r
}\r
body.cinematic-home yt-chip-cloud-chip-renderer:hover,\r
body.cinematic-home .ypp-filter-chip:hover {\r
  background: rgba(255, 255, 255, 0.1) !important;\r
  border-color: transparent !important;\r
}\r
body.cinematic-home yt-chip-cloud-chip-renderer[selected],\r
body.cinematic-home .ypp-filter-chip.active {\r
  background: rgba(255, 255, 255, 0.15) !important;\r
  background-color: rgba(255, 255, 255, 0.15) !important;\r
  color: #fff !important;\r
  border-color: transparent !important;\r
  /* Override YouTube's internal CSS variables for chip background */\r
  --yt-spec-badge-chip-background: rgba(255, 255, 255, 0.15) !important;\r
  --yt-spec-icon-inactive-color: rgba(255, 255, 255, 0.7) !important;\r
}\r
body.cinematic-home yt-chip-cloud-chip-renderer[selected] *,\r
body.cinematic-home .ypp-filter-chip.active * {\r
  color: #fff !important;\r
  fill: #fff !important;\r
}\r
\r
/* Drawer Menu */\r
body.cinematic-home #contentContainer.tp-yt-app-drawer {\r
  -moz-animation: fadeIn 0.3s ease-in-out;\r
  -webkit-animation: fadeIn 0.3s ease-in-out;\r
  animation: fadeIn 0.3s ease-in-out;\r
  -moz-animation-delay: 1.5s;\r
  -webkit-animation-delay: 1.5s;\r
  animation-delay: 1.5s;\r
  -moz-animation-fill-mode: forwards;\r
  -webkit-animation-fill-mode: forwards;\r
  animation-fill-mode: forwards;\r
\r
  opacity: 0;\r
}\r
\r
/* YouTube logo */\r
body.cinematic-home ytd-masthead #logo-icon {\r
  fill: var(--netflix-red) !important;\r
}\r
\r
/* Make the background dark Netflix style */\r
body.cinematic-home html[dark] {\r
  background: var(--netflix-black) !important;\r
}\r
\r
/* ============================================================================\r
** Hero Section Styling\r
============================================================================ */\r
body.cinematic-home .netflix-hero {\r
  position: fixed;\r
  top: 0;\r
  left: 0;\r
  width: 100%;\r
  height: 70vh;\r
  z-index: 1000 !important;\r
  pointer-events: none !important;\r
  /* Explicit background ensures hero is never transparent blank when iframe loads */\r
  background: #0f0f0f;\r
  overflow: hidden;\r
}\r
\r
body.cinematic-home ytd-miniplayer[is-watch-page] ~ * .netflix-hero {\r
  display: none !important;\r
}\r
\r
/* Re-enable pointer events specifically on interactive elements inside the hero */\r
body.cinematic-home .netflix-hero-content,\r
body.cinematic-home .netflix-hero-content *,\r
body.cinematic-home .netflix-hero-nav,\r
body.cinematic-home .netflix-hero-nav * {\r
  pointer-events: auto !important;\r
}\r
\r
/* Hero Video Container and Inner Elements */\r
body.cinematic-home .netflix-hero ytd-video-preview,\r
body.cinematic-home .netflix-hero ytd-video-preview #video-preview-container,\r
body.cinematic-home .netflix-hero ytd-video-preview #player-container,\r
body.cinematic-home .netflix-hero ytd-video-preview ytd-player,\r
body.cinematic-home .netflix-hero ytd-video-preview #container.ytd-player,\r
body.cinematic-home .netflix-hero ytd-video-preview .html5-video-player,\r
body.cinematic-home .netflix-hero ytd-video-preview #movie_player,\r
body.cinematic-home .netflix-hero ytd-video-preview .html5-video-container,\r
body.cinematic-home .netflix-hero ytd-video-preview video {\r
  position: absolute !important;\r
  top: 0 !important;\r
  left: 0 !important;\r
  width: 100% !important;\r
  height: 100% !important;\r
  --ytd-video-preview-width: 100vw !important;\r
  --ytd-video-preview-height: 70vh !important;\r
  --ytd-inline-preview-player-width: 100vw !important;\r
  --ytd-inline-preview-player-height: 70vh !important;\r
  max-width: none !important;\r
  max-height: none !important;\r
  margin: 0 !important;\r
  padding: 0 !important;\r
  transform: none !important;\r
  border-radius: 0 !important;\r
}\r
\r
body.cinematic-home .netflix-hero ytd-video-preview video {\r
  object-fit: cover !important;\r
  z-index: 0 !important;\r
}\r
\r
body.cinematic-home .netflix-hero ytd-video-preview {\r
  pointer-events: none !important;\r
}\r
\r
/* Hero Content Overlay */\r
body.cinematic-home .netflix-hero-content {\r
  position: absolute;\r
  bottom: 20vh;\r
  left: 5%;\r
  color: white;\r
  z-index: 3 !important;\r
  max-width: 45%;\r
  pointer-events: auto !important;\r
  transition: opacity 1.5s ease-in-out !important;\r
  -moz-animation: fadeIn 1.5s ease-in-out !important;\r
  -webkit-animation: fadeIn 1.5s ease-in-out !important;\r
  animation: fadeIn 1.5s ease-in-out !important;\r
  transition: opacity 1.5s ease-in-out !important;\r
}\r
\r
@keyframes fadeIn {\r
  from {\r
    opacity: 0;\r
  }\r
  to {\r
    opacity: 1;\r
  }\r
}\r
\r
@-webkit-keyframes fadeIn {\r
  from {\r
    opacity: 0;\r
  }\r
  to {\r
    opacity: 1;\r
  }\r
}\r
\r
@-moz-keyframes fadeIn {\r
  from {\r
    opacity: 0;\r
  }\r
  to {\r
    opacity: 1;\r
  }\r
}\r
\r
/* Hero Gradient Overlay */\r
body.cinematic-home .netflix-hero-gradient {\r
  position: absolute;\r
  bottom: -120px;\r
  left: 0;\r
  right: 0;\r
  height: 85vh;\r
  background: linear-gradient(\r
    180deg,\r
    rgba(0, 0, 0, 0.4) 0%,\r
    transparent 10%,\r
    transparent 70%,\r
    rgba(15, 15, 15, 0.4) 85%,\r
    rgb(15, 15, 15) 100%\r
  );\r
  pointer-events: none;\r
  z-index: 2;\r
}\r
\r
/* ============================================================================\r
** Hero Content Typography and Layout\r
============================================================================ */\r
body.cinematic-home .netflix-hero-content h1 {\r
  font-size: 5em !important;\r
  margin-bottom: 2rem !important;\r
  max-width: 780px !important;\r
}\r
\r
/* Channel Info Section */\r
body.cinematic-home .netflix-hero-content .channel-info {\r
  display: flex;\r
  align-items: center;\r
  gap: 15px;\r
  margin-bottom: 1.5rem !important;\r
}\r
\r
body.cinematic-home .netflix-hero-content .channel-info h2 {\r
  font-size: 1.5em !important;\r
  font-weight: normal !important;\r
  max-width: 780px !important;\r
}\r
\r
body.cinematic-home .netflix-hero-content .channel-info .channel-avatar {\r
  border-radius: 100% !important;\r
  border: 1px solid rgba(255, 255, 255, 0.7);\r
  width: 40px !important;\r
}\r
\r
/* ============================================================================\r
** Recently Added Badge\r
============================================================================ */\r
\r
body.cinematic .recently-badge-container {\r
  position: absolute;\r
  top: -17px;\r
  left: 50%;\r
  transform: translateX(-50%);\r
  z-index: 2;\r
  padding: 8px;\r
}\r
\r
body.cinematic .recently-badge {\r
  background-color: #e50914;\r
  color: white;\r
  padding: 6px 8px;\r
  border-radius: 4px;\r
  font-size: 15px;\r
  font-weight: 500;\r
  text-transform: capitalize;\r
  letter-spacing: 0.5px;\r
}\r
\r
body.cinematic .netflix-hero-content .recently-badge {\r
  margin-bottom: 14px;\r
  display: inline-block;\r
}\r
\r
/* ============================================================================\r
** Button Styles\r
============================================================================ */\r
body.cinematic-home .netflix-hero-buttons {\r
  display: flex;\r
  gap: 1rem;\r
}\r
\r
body.cinematic-home .netflix-hero-buttons button {\r
  display: flex;\r
  align-items: center;\r
  gap: 0.5rem;\r
  padding: 0.8em 2em;\r
  border: none;\r
  border-radius: 4px;\r
  font-size: 1.5em;\r
  cursor: pointer;\r
  transition: all 0.2s;\r
}\r
\r
body.cinematic-home .netflix-hero-buttons button svg {\r
  width: 24px;\r
  height: 24px;\r
}\r
\r
/* Button Variants */\r
body.cinematic-home .netflix-hero-buttons .netflix-unmute-button {\r
  background: white;\r
  color: black;\r
  display: flex;\r
  opacity: 0;\r
  /* transition: opacity 0.5s ease-in-out !important; */\r
}\r
\r
body.cinematic-home .netflix-unmute-button:hover {\r
  background: rgba(255, 255, 255, 0.75);\r
}\r
\r
body.cinematic-home .netflix-hero-buttons .secondary {\r
  background-color: rgba(109, 109, 110, 0.7);\r
  color: white;\r
}\r
\r
body.cinematic-home .netflix-hero-buttons .secondary:hover {\r
  background-color: rgba(109, 109, 110, 0.4);\r
}\r
\r
/* ============================================================================\r
** Hero Navigation\r
============================================================================ */\r
body.cinematic-home .netflix-hero-nav {\r
  position: absolute;\r
  top: 0;\r
  left: 0;\r
  right: 0;\r
  bottom: 0;\r
  z-index: 9999;\r
  display: flex;\r
  justify-content: space-between;\r
  align-items: center;\r
  padding: 0 2rem;\r
  pointer-events: none;\r
}\r
\r
body.cinematic-home .netflix-nav-button {\r
  position: relative;\r
  top: -80px;\r
  width: 35px;\r
  height: 35px;\r
  border-radius: 50%;\r
  background: rgba(20, 20, 20, 0.5);\r
  border: 2px solid rgba(255, 255, 255, 0.5);\r
  color: white;\r
  cursor: pointer;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  transition: all 0.3s ease-in-out;\r
  pointer-events: auto;\r
  opacity: 0.15;\r
}\r
\r
body.cinematic-home .netflix-nav-button:hover {\r
  opacity: 1;\r
  background: rgba(255, 255, 255, 0.9);\r
  border-color: white;\r
  color: black;\r
  transform: scale(1.1);\r
}\r
\r
body.cinematic-home .netflix-nav-button svg {\r
  width: 24px;\r
  height: 24px;\r
}\r
\r
/* Fade animation for navigation buttons */\r
@keyframes fadeInNav {\r
  from {\r
    transform: scale(0.9);\r
  }\r
  to {\r
    transform: scale(1);\r
  }\r
}\r
\r
body.cinematic-home .netflix-nav-button {\r
  animation: fadeInNav 0.3s ease;\r
}\r
\r
/* ============================================================================\r
** Hero Iframe Styles (current approach — replaces old ytd-video-preview rules)\r
============================================================================ */\r
/* CSS class mirrors the inline cssText but allows transitions and animations */\r
body.cinematic-home .netflix-hero-iframe {\r
  position: absolute;\r
  top: 0;\r
  left: 0;\r
  width: 100%;\r
  height: 100%;\r
  border: none;\r
  pointer-events: none;\r
  z-index: 0;\r
  object-fit: cover;\r
  opacity: 1;\r
  transition: opacity 1.25s ease-in-out;\r
  /* Subtle scale-in to mask the initial black frame flash */\r
  animation: iframeReveal 2s ease-out forwards;\r
}\r
\r
@keyframes iframeReveal {\r
  from { opacity: 0; }\r
  to   { opacity: 1; }\r
}\r
\r
/* Ken Burns slow zoom applied to the hero wrapper so it works regardless of iframe rendering */\r
@keyframes heroKenBurns {\r
  0%   { transform: scale(1.05) translate(0, 0); }\r
  50%  { transform: scale(1.10) translate(-1%, -0.5%); }\r
  100% { transform: scale(1.05) translate(0.5%, 0.5%); }\r
}\r
\r
/* CRITICAL: Fading state was completely missing from migrated CSS.\r
   Without this the video transition between cards is an instant hard cut.\r
   In the old code this targeted ytd-video-preview — now targets iframe. */\r
body.cinematic-home .netflix-hero.fading .netflix-hero-iframe,\r
body.cinematic-home .netflix-hero.fading .netflix-hero-content {\r
  opacity: 0 !important;\r
  transition: opacity 1.25s ease-in-out !important;\r
}\r
\r
/* Thumbnail fallback: if iframe fails to load, show the thumbnail as a blurred BG */\r
body.cinematic-home .netflix-hero[data-thumb] {\r
  background-size: cover;\r
  background-position: center;\r
  background-repeat: no-repeat;\r
}\r
\r
\r
/* ============================================================================\r
** Filter Chips Styling\r
============================================================================ */\r
body.cinematic-home #chips-wrapper {\r
  border-radius: 15px !important;\r
  overflow: hidden !important;\r
}\r
\r
/* Only move the outermost header container. Do not apply fixed to children to avoid stacking offsets. */\r
body.cinematic-home ytd-rich-grid-renderer > #header {\r
  position: fixed !important;\r
  bottom: 300px !important; /* sits exactly above the 300px tall row container */\r
  top: auto !important;\r
  left: 0 !important;\r
  right: 0 !important;\r
  z-index: 2000 !important;\r
  margin-bottom: 0 !important;\r
  padding: 10px 24px !important;\r
  background: transparent !important;\r
  transform: none !important;\r
  max-width: 100vw !important;\r
}\r
\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer,\r
body.cinematic-home ytd-feed-filter-chip-bar-renderer #chips-wrapper {\r
  position: static !important;\r
  transform: none !important;\r
}\r
\r
body.cinematic-home yt-chip-cloud-chip-renderer {\r
  transition: font-size 0.2s ease-in-out;\r
  background-color: transparent !important;\r
  color: rgba(255, 255, 255, 0.7) !important;\r
  padding-bottom: 1.5rem !important;\r
  margin-bottom: -1rem !important;\r
}\r
\r
body.cinematic-home #chips-wrapper.ytd-feed-filter-chip-bar-renderer {\r
  justify-content: flex-start !important;\r
}\r
\r
body.cinematic-home yt-chip-cloud-chip-renderer:hover {\r
  font-size: 2.5rem;\r
}\r
\r
body.cinematic-home yt-chip-cloud-chip-renderer.iron-selected {\r
  font-size: 2.5rem;\r
  color: white !important;\r
}\r
\r
body.cinematic-home yt-chip-cloud-chip-renderer yt-formatted-string {\r
  padding: 3rem 0 !important;\r
}\r
\r
/* ============================================================================\r
** Grid and Content Layout\r
============================================================================ */\r
body.cinematic-home ytd-browse:has(ytd-thumbnail) {\r
  padding: 0 !important;\r
  position: static !important;\r
  bottom: auto !important;\r
  left: auto !important;\r
  z-index: 999 !important;\r
  max-width: 100vw !important;\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer {\r
  justify-content: flex-start !important;\r
  align-items: flex-start !important;\r
  position: fixed !important;\r
  top: 0 !important;\r
  left: 0 !important;\r
  width: 100vw !important;\r
  height: 100vh !important;\r
  z-index: 9 !important;\r
  pointer-events: none !important; /* let clicks pass through the background */\r
}\r
\r
/* Re-enable pointer events for actual content rows so cards are clickable */\r
body.cinematic-home ytd-rich-grid-renderer > * {\r
  pointer-events: auto !important;\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer > #contents:last-child {\r
  margin-right: 5000px !important;\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer > #contents:not(:has(ytd-background-promo-renderer)) {\r
  z-index: 9 !important;\r
  /* Use absolute instead of fixed to avoid creating a small containing block for the hero video */\r
  position: absolute !important;\r
  bottom: 0 !important;\r
  left: 0 !important;\r
  right: 0 !important;\r
  top: auto !important;\r
  /* Height: card (260px) + details peek (~40px) + padding + scrollbar room */\r
  height: 300px !important;\r
  padding-left: 24px !important;\r
  padding-bottom: 16px !important;\r
  padding-top: 16px !important;\r
  /* Firefox */\r
  scrollbar-width: thin;\r
  scrollbar-color: rgba(122, 122, 122, 0.15) transparent;\r
  /* Hide default scrollbar in IE/Edge */\r
  -ms-overflow-style: none;\r
  display: flex !important;\r
  flex-direction: row !important;\r
  flex-wrap: nowrap !important;\r
  justify-content: flex-start !important;\r
  gap: 20px !important;\r
  overflow-x: scroll !important;\r
  overflow-y: hidden !important;\r
  /* Subtle background fade so cards sit over the hero naturally */\r
  background: linear-gradient(to top, rgba(15,15,15,0.98) 60%, transparent 100%) !important;\r
}\r
\r
/* Add fade gradients */\r
body.cinematic-home ytd-rich-grid-renderer > #contents::before,\r
body.cinematic-home ytd-rich-grid-renderer > #contents::after {\r
  content: '';\r
  position: absolute;\r
  top: 0;\r
  width: 150px;\r
  height: 100%;\r
  z-index: 1;\r
  pointer-events: none;\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer > #contents::before {\r
  left: 0;\r
  background: linear-gradient(to right, #0f0f0f, transparent);\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer > #contents::after {\r
  right: 0;\r
  background: linear-gradient(to left, #0f0f0f, transparent);\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer:has(ytd-feed-nudge-renderer) > #contents {\r
  flex-direction: column !important;\r
}\r
\r
/* Hide paid content overlay and CC */\r
body.cinematic-home ytp-paid-content-overlay,\r
body.cinematic-home .ytp-paid-content-overlay,\r
body.cinematic-home ytp-caption-window-container,\r
body.cinematic-home .caption-window,\r
body.cinematic-home #masthead-ad,\r
body.cinematic ytd-ad-slot-renderer,\r
body.cinematic-home .ytp-paid-content-overlay-link,\r
body.cinematic tp-yt-paper-dialog:has(yt-mealbar-promo-renderer),\r
body.cinematic #player-ads,\r
body.cinematic .ytp-ad-overlay-slot,\r
body.cinematic ytd-page-top-ad-layout-renderer,\r
body.cinematic-home\r
  ytd-rich-item-renderer:has(yt-collection-thumbnail-view-model),\r
body.cinematic-home ytd-rich-item-renderer:has(ytd-ad-slot-renderer),\r
body.cinematic-home ytd-rich-item-renderer:has(ytd-rich-shelf-renderer),\r
body.cinematic\r
  ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads'] {\r
  display: none !important;\r
}\r
\r
/* Webkit/Blink Scrollbar Styling (Chrome, Safari, Edge Chromium) */\r
/* cinematic Home Scrollbar */\r
body.cinematic-home #contents::-webkit-scrollbar {\r
  width: 8px;\r
  background-color: transparent;\r
}\r
\r
body.cinematic-home #contents::-webkit-scrollbar-track {\r
  background: transparent;\r
  border: none;\r
}\r
\r
body.cinematic-home #contents::-webkit-scrollbar-thumb {\r
  background-color: rgba(122, 122, 122, 0.15);\r
  border-radius: 4px;\r
  border: 2px solid transparent;\r
  /* Minimum height for the thumb */\r
  min-height: 40px;\r
}\r
\r
body.cinematic-home #contents::-webkit-scrollbar-thumb:hover {\r
  background-color: rgba(122, 122, 122, 0.3);\r
}\r
\r
body.cinematic-home #contents::-webkit-scrollbar-button {\r
  display: none;\r
}\r
\r
body.cinematic-home #contents::-webkit-scrollbar-corner {\r
  background: transparent;\r
}\r
\r
/* ============================================================================\r
** Thumbnail and Video Item Styling\r
============================================================================ */\r
body.cinematic-home ytd-rich-item-renderer {\r
  height: 260px !important;\r
  width: 280px !important;\r
  flex: 0 0 280px !important;\r
  aspect-ratio: unset !important;\r
  margin-right: 0 !important;\r
  margin-left: 0 !important;\r
  margin-bottom: 0 !important;\r
  overflow: visible !important;\r
}\r
\r
body.cinematic-home ytd-rich-item-renderer ytd-thumbnail {\r
  border: 2px solid transparent;\r
  transition:\r
    top 0.2s ease-in-out,\r
    scale 0.2s ease-in-out,\r
    opacity 0.2s ease-in-out;\r
  scale: 0.95 !important;\r
  position: relative !important;\r
  top: 0px !important;\r
  margin-top: 0 !important;\r
  margin-bottom: 0 !important;\r
}\r
\r
body.cinematic-home ytd-rich-item-renderer:hover ytd-thumbnail {\r
  scale: 0.85 !important;\r
  top: -20px !important;\r
  opacity: 0.6 !important;\r
}\r
\r
body.cinematic-home .netflix-active-preview ytd-thumbnail {\r
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);\r
  border: 2px solid rgba(255, 255, 255, 0.1) !important;\r
  border-radius: 8px;\r
  transition:\r
    box-shadow 0.3s ease-in-out,\r
    border-color 0.3s ease-in-out,\r
    top 0.2s ease-in-out,\r
    scale 0.2s ease-in-out,\r
    opacity 0.2s ease-in-out;\r
  animation: glowPulse 3s ease-in-out infinite;\r
}\r
\r
@keyframes glowPulse {\r
  0% {\r
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);\r
  }\r
  50% {\r
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);\r
  }\r
  100% {\r
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);\r
  }\r
}\r
\r
body.cinematic-home ytd-rich-grid-renderer > #contents:hover ytd-thumbnail {\r
  box-shadow: none;\r
  border-color: transparent !important;\r
  animation: none;\r
}\r
\r
/* Video Details Styling */\r
body.cinematic-home ytd-rich-grid-media #details {\r
  padding: 1rem !important;\r
  background: var(--netflix-dark-gray) !important;\r
  border-radius: 4px !important;\r
  margin-top: -4px !important;\r
  transition: all 0.2s ease-in-out !important;\r
  opacity: 0 !important;\r
  top: -50px !important;\r
}\r
\r
body.cinematic-home ytd-rich-grid-media:hover #details {\r
  opacity: 1 !important;\r
  top: -80px !important;\r
}\r
\r
body.cinematic-home ytd-rich-grid-media #details #channel-name {\r
  opacity: 0.7 !important;\r
}\r
\r
/* ============================================================================\r
** UI Element Modifications and Hiding\r
============================================================================ */\r
/* Hide YouTube's default UI elements */\r
body.cinematic-home .ytp-gradient-top,\r
body.cinematic-home .ytp-gradient-bottom,\r
body.cinematic-home .ytp-chrome-top,\r
body.cinematic-home .ytp-chrome-bottom,\r
body.cinematic-home ytd-mini-guide-renderer,\r
body.cinematic-home yt-closed-captions-toggle-button,\r
body.cinematic-home .YtInlinePlayerControlsTopRightControls,\r
body.cinematic-home .YtInlinePlayerControlsTopLeftControls,\r
body.cinematic-home yt-progress-bar,\r
body.cinematic-home ytd-rich-shelf-renderer[is-shorts],\r
body.cinematic-home ytd-rich-shelf-renderer:has(ytd-statement-banner-renderer),\r
body.cinematic-home #rich-shelf-header {\r
  display: none !important;\r
}\r
\r
/* Position fix for rich section renderer */\r
body.cinematic-home\r
  ytd-rich-section-renderer:not(:has(ytd-feed-nudge-renderer)) {\r
  position: fixed !important;\r
  left: -999999999999px !important;\r
}\r
\r
/* ============================================================================\r
** Ad Overlay Styling\r
============================================================================ */\r
body.cinematic .ad-skipper-overlay {\r
  position: absolute;\r
  top: 0;\r
  left: 0;\r
  right: 0;\r
  bottom: 0;\r
  background: rgba(0, 0, 0, 0.85);\r
  backdrop-filter: blur(25px);\r
  -webkit-backdrop-filter: blur(5px);\r
  display: flex;\r
  justify-content: center;\r
  align-items: center;\r
  z-index: 2147483647;\r
}\r
\r
body.cinematic .ad-skipper-spinner {\r
  width: 50px;\r
  height: 50px;\r
  border: 5px solid #f3f3f3;\r
  border-top: 5px solid transparent;\r
  border-radius: 50%;\r
  animation: spin 1s linear infinite;\r
}\r
\r
@keyframes spin {\r
  0% {\r
    transform: rotate(0deg);\r
  }\r
  100% {\r
    transform: rotate(360deg);\r
  }\r
}\r
\r
/* ============================================================================\r
** Animation and Transition States\r
============================================================================ */\r
/* Hero Video Animation */\r
@keyframes heroKenBurns {\r
  0% {\r
    transform: scale(1);\r
  }\r
  100% {\r
    transform: scale(1.15);\r
  }\r
}\r
\r
/* Apply animation to hero video */\r
body.cinematic-home .netflix-hero ytd-video-preview video,\r
body.cinematic-home #video-preview-container.ytd-video-preview video,\r
body.cinematic-home .netflix-hero #media-container video {\r
  animation: heroKenBurns 9s ease-in-out forwards;\r
  transform-origin: center center;\r
  width: 100vw !important;\r
  top: 0 !important;\r
  left: 0 !important;\r
  right: 0 !important;\r
}\r
\r
/* Fade States */\r
body.cinematic-home .netflix-hero.fading ytd-video-preview,\r
body.cinematic-home .netflix-hero.fading .netflix-hero-content {\r
  opacity: 0 !important;\r
  transition: opacity 1.5s ease-in-out !important;\r
}\r
\r
/* Force show preview elements */\r
body.cinematic-home .netflix-hero ytd-video-preview * {\r
  opacity: 1 !important;\r
  visibility: visible !important;\r
}\r
\r
body.cinematic-home .netflix-hero ytd-video-preview {\r
  transition: opacity 1.5s ease-in-out !important;\r
}\r
\r
/* ============================================================================\r
** Media Queries (Reverse Breakpoints)\r
============================================================================ */\r
/* Extra Large (xl) - 1280px and down */\r
@media (max-width: 1280px) {\r
  /* xl breakpoint styles */\r
  body.cinematic-home .netflix-hero-content h1 {\r
    font-size: 4em !important;\r
    margin-bottom: 2rem !important;\r
    max-width: 700px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info h2 {\r
    max-width: 700px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info .channel-avatar {\r
    width: 40px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-buttons button {\r
    font-size: 1.45em !important;\r
    padding: 0.8em 1.7em !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-nav {\r
    display: none !important;\r
  }\r
}\r
\r
/* Large (lg) - 1024px and down */\r
@media (max-width: 1024px) {\r
  /* lg breakpoint styles */\r
  body.cinematic-home .netflix-hero-content h1 {\r
    font-size: 3.5em !important;\r
    margin-bottom: 2rem !important;\r
    max-width: 600px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info h2 {\r
    max-width: 600px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info .channel-avatar {\r
    width: 40px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-buttons button {\r
    font-size: 1.4em !important;\r
    padding: 0.7em 1.6em !important;\r
  }\r
}\r
\r
/* Medium (md) - 768px and down */\r
@media (max-width: 768px) {\r
  /* md breakpoint styles */\r
  body.cinematic-home .netflix-hero-content h1 {\r
    font-size: 3em !important;\r
    margin-bottom: 2rem !important;\r
    max-width: 98% !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info h2 {\r
    max-width: 98% !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info .channel-avatar {\r
    width: 40px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-buttons button {\r
    font-size: 1.3em !important;\r
    padding: 0.8em 1.6em !important;\r
  }\r
}\r
\r
/* Small (sm) - 640px and down */\r
@media (max-width: 640px) {\r
  body.cinematic-home .netflix-hero-content h1 {\r
    font-size: 2.5em !important;\r
    margin-bottom: 2rem !important;\r
    max-width: 98% !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info h2 {\r
    max-width: 98% !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-content .channel-info .channel-avatar {\r
    width: 30px !important;\r
  }\r
\r
  body.cinematic-home .netflix-hero-buttons button {\r
    font-size: 1.3em !important;\r
    padding: 0.6em 1.5em !important;\r
  }\r
}\r
\r
/* ============================================================================\r
** Conflict Resolution: Override YPP theme styles that break cinematic layout\r
** These !important overrides from body.yt-premium-plus-theme in styles.css\r
** conflict with cinematic mode's horizontal flex layout. We win them back here\r
** by adding body.cinematic-home to the specificity chain.\r
============================================================================ */\r
\r
/* Restore ytd-rich-item-renderer to cinematic dimensions —\r
   the YPP theme forces flex-direction:column + overflow:hidden + height:100%\r
   which collapses cards into thin strips when cinematic's flex row takes over. */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer,\r
body.cinematic-home ytd-rich-item-renderer {\r
  width: 280px !important;\r
  min-width: 280px !important;\r
  max-width: 280px !important;\r
  height: 260px !important;\r
  aspect-ratio: unset !important;\r
  margin: 0 !important;\r
  flex: 0 0 280px !important;\r
  align-self: auto !important;\r
  display: block !important;\r
  flex-direction: unset !important;\r
  justify-content: unset !important;\r
  overflow: visible !important;\r
  isolation: auto !important;\r
  contain: none !important;\r
  transform: none !important;\r
  position: relative !important;\r
}\r
\r
/* Restore thumbnail so it renders as a full square, not a collapsed strip */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer ytd-thumbnail,\r
body.cinematic-home ytd-rich-item-renderer ytd-thumbnail {\r
  width: 100% !important;\r
  aspect-ratio: unset !important;\r
  border-radius: 0 !important;\r
  overflow: hidden !important;\r
  position: relative !important;\r
  background-color: transparent !important;\r
}\r
\r
/* Restore rich-grid-media child container */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer ytd-rich-grid-media,\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer ytd-video-renderer {\r
  height: auto !important;\r
  flex: none !important;\r
  flex-direction: unset !important;\r
}\r
\r
/* Kill the YPP grid variables that fight cinematic's flex row */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer {\r
  --ytd-rich-grid-items-per-row: unset !important;\r
  --ytd-rich-grid-posts-per-row: unset !important;\r
}\r
\r
/* Suppress the YPP hover lift on cinematic cards — cinematic has its own hover */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-item-renderer:hover {\r
  transform: none !important;\r
  background: none !important;\r
  box-shadow: none !important;\r
  border-color: transparent !important;\r
}\r
\r
/* Prevent the YPP grid container from fighting cinematic's flex row */\r
body.cinematic-home #contents.ypp-grid-container,\r
body.cinematic-home #contents[data-ypp-cols] {\r
  display: flex !important;\r
  flex-direction: row !important;\r
  flex-wrap: nowrap !important;\r
  grid-template-columns: unset !important;\r
  grid-auto-flow: unset !important;\r
}\r
\r
/* Prevent ytd-rich-section-renderer from spanning the whole "grid" in cinematic */\r
html.yt-premium-plus-theme body.cinematic-home ytd-rich-section-renderer {\r
  grid-column: unset !important;\r
  width: auto !important;\r
}\r
`;window.YPP.features.CinematicMode=class extends window.YPP.features.BaseFeature{constructor(){super(),this._cinematicActive=!1,this._videoQueue=[],this._currentVideoIndex=0,this._videoTimer=null,this._checkInterval=null,this._isUserHovering=!1,this._mo=null,this._abortController=null,this._isMuted=!0,this._isFirefox=navigator.userAgent.toLowerCase().includes("firefox"),this._navObserver=null,this._darkModeObserver=null,this.CONFIG={PREVIEW_DELAY:7750,FADE_DURATION:1250,HOVER_EVENTS:["mouseenter","mouseover","pointerenter"],CHECK_INTERVAL:500,CONTENT_UPDATE_DELAY:100,SCROLL_AMOUNT:70},this._heroState={status:"inactive",heroElement:null,observers:new Set,currentVideo:null},this.onPageChange=this.onPageChange.bind(this),this._onNavigateStart=this._onNavigateStart.bind(this),this._onNavigateFinish=this._onNavigateFinish.bind(this),this._playNextVideo=this._playNextVideo.bind(this),this._periodicCheck=this._periodicCheck.bind(this)}getConfigKey(){return"cinematicMode"}_extractVideoId(t){if(!t)return"";try{const e=new URL(t,window.location.origin);let n=e.searchParams.get("v");return!n&&e.pathname.startsWith("/shorts/")&&(n=e.pathname.split("/shorts/")[1].split("?")[0]),n||""}catch{return""}}enable(){var t;super.enable(),this._isMuted=((t=this.settings)==null?void 0:t.cinematicMuted)!==void 0?this.settings.cinematicMuted:this._isFirefox,this._injectStyles(),this.addListener(document,"yt-navigate-start",this._onNavigateStart),this.addListener(window,"yt-navigate-finish",this._onNavigateFinish),this.onPageChange()}disable(){super.disable(),this._teardown();const t=document.getElementById("ypp-cinematic-style");t&&t.remove()}async onUpdate(){if(this.settings){const t=this._isMuted;if(this._isMuted=this.settings.cinematicMuted!==void 0?this.settings.cinematicMuted:this._isFirefox,t!==this._isMuted&&this._cinematicActive){const e=document.querySelector(".netflix-unmute-button");if(e){e.classList.toggle("muted",this._isMuted);const n=this._generateMuteButtonHTML(this._isMuted);e.innerHTML=window.YPP.utils.sanitizeHTML?window.YPP.utils.sanitizeHTML(n):n}this._syncMuteState()}}}_injectStyles(){if(document.getElementById("ypp-cinematic-style"))return;const t=document.createElement("style");t.id="ypp-cinematic-style",t.textContent=v,document.head.appendChild(t)}_onNavigateStart(){this._teardownHero()}async onPageChange(){if(!(window.location.pathname==="/"||window.location.pathname.includes("/feed/subscriptions"))||!this.settings.cinematicMode){this._teardown();return}await this._activate()}async _activate(){if(this._cinematicActive)return;this._cinematicActive=!0,this._abortController=new AbortController,document.documentElement.setAttribute("dark",""),document.body.classList.add("cinematic"),document.body.classList.add("cinematic-home");const t=()=>{const e=document.querySelector("tp-yt-app-drawer");e&&e.removeAttribute("opened")};[0,100,500,1e3,2e3,3e3].forEach(e=>setTimeout(t,e)),this._setupScrollHandler(),this._lastPathname=window.location.pathname,this._darkModeObserver=new MutationObserver(()=>{document.documentElement.hasAttribute("dark")||document.documentElement.setAttribute("dark","")}),this._darkModeObserver.observe(document.documentElement,{attributes:!0,attributeFilter:["dark"]});try{if(await new Promise(r=>setTimeout(r,500)),!await this.waitForElement("ytd-rich-item-renderer",1e4))return;this._updateVideoQueue(),this._videoQueue.length===0&&(await new Promise(r=>setTimeout(r,1500)),this._updateVideoQueue());const n=this._videoQueue[0];if(!n){window.YPP.utils.log("No valid video found for cinematic hero","CINEMATIC","warn");return}await this._makeHeroPreview(n),this._setupContentObserver(),n.classList.add("netflix-active-preview"),this._videoTimer=setTimeout(this._playNextVideo,this.CONFIG.PREVIEW_DELAY),this._checkInterval=setInterval(this._periodicCheck,this.CONFIG.CHECK_INTERVAL)}catch(e){window.YPP.utils.log("Cinematic Initialization Error","CINEMATIC","error",e)}}_periodicCheck(){if(!this._isUserHovering&&!document.querySelector("ytd-video-preview[active][playing]:not([hidden])")){const e=this._videoQueue[this._currentVideoIndex];e&&this._heroState.status==="ready"&&(this._updateHeroContent(e),this._simulateHover(e))}}async _makeHeroPreview(t){if(this._heroState.status!=="inactive")return;this._heroState.status="creating",this._heroState.currentVideo=t;const e=await this._waitForPreview(t);if(!e){this._heroState.status="inactive";return}const n=document.createElement("div");n.className="netflix-hero",this._heroState.heroElement=n,n.insertAdjacentHTML("afterbegin",`
          <div class="netflix-hero-nav">
            <button class="netflix-nav-button prev" aria-label="Previous video" style="pointer-events: auto;">
              <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>
            </button>
            <button class="netflix-nav-button next" aria-label="Next video" style="pointer-events: auto;">
              <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/></svg>
            </button>
          </div>
        `),document.body.appendChild(n),n.appendChild(e),this._forceVideoSize(e);const o=document.createElement("div");o.className="netflix-hero-gradient",n.appendChild(o);const i=document.createElement("div");i.className="netflix-hero-content",n.appendChild(i),this._setupPreviewChangeObserver(),this._heroState.status="ready",this._updateHeroContent(t)}_waitForPreview(t){return new Promise(e=>{let n=!1;const r=c=>{n||(n=!0,e(c||null))},o=t.querySelector("ytd-video-preview");if(o)return r(o);const i=new MutationObserver(()=>{const c=t.querySelector("ytd-video-preview");c&&(i.disconnect(),r(c))});i.observe(t,{childList:!0,subtree:!0}),this._abortController&&this._abortController.signal.addEventListener("abort",()=>{i.disconnect(),r(null)});let a=0;const s=10,d=async()=>{n||(await this._simulateHover(t),!n&&(a++,a<s?setTimeout(d,400):(i.disconnect(),r(t.querySelector("ytd-video-preview")||document.querySelector("ytd-video-preview")))))};d()})}_simulateHover(t){return t?new Promise(e=>{const n=o=>{const i=o.getBoundingClientRect();this.CONFIG.HOVER_EVENTS.forEach(a=>{o.dispatchEvent(new MouseEvent(a,{bubbles:!0,cancelable:!0,view:window,clientX:i.left+10,clientY:i.top+10}))})},r=o=>{const i=t.querySelector("#thumbnail, a#thumbnail, ytd-thumbnail a");i?(n(t),n(i),setTimeout(()=>{this._isMuted||this._syncMuteState(),this._updateMuteButtonVisibility(),e()},800)):o>0?setTimeout(()=>r(o-1),300):(n(t),e())};setTimeout(()=>r(5),100)}):Promise.resolve()}_updateHeroContent(t){var u,y,b,f,g;if(this._heroState.status!=="ready"||!this._heroState.heroElement)return;const e=this._heroState.heroElement.querySelector(".netflix-hero-content");if(!e)return;const n=((y=(u=t.querySelector("#video-title"))==null?void 0:u.textContent)==null?void 0:y.trim())||"Video Title",r=((b=t.querySelector("yt-avatar-shape img, #avatar-link img, #avatar img"))==null?void 0:b.src)||null,o=((g=(f=t.querySelector("ytd-channel-name a, ytd-channel-name yt-formatted-string"))==null?void 0:f.textContent)==null?void 0:g.trim())||"Channel Name",i=t.querySelector("a#video-title-link, a#video-title, a#thumbnail"),a=(i==null?void 0:i.href)||"#",s=this._isRecentlyAdded(t),d=`
            <div class="channel-info" style="display: flex; align-items: center; gap: 15px; margin-bottom: 1.5rem;">
                ${r?`<img src="${r}" class="channel-avatar" style="border-radius: 100%; border: 1px solid rgba(255,255,255,0.7); width: 40px;" onerror="this.style.display='none'">`:""}
                <h2 class="channel-name" style="font-size: 1.5em; font-weight: normal;">${window.YPP.utils.escapeHTML(o)}</h2>
            </div>   
            ${s?'<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500; margin-bottom: 14px; display: inline-block;">Recently Added</span>':""}
            <h1 style="font-size: 4em; margin-bottom: 2rem; max-width: 780px;">${window.YPP.utils.escapeHTML(n)}</h1>
            <div class="netflix-hero-buttons" style="display: flex; gap: 1rem;">
                <a class="netflix-play-button" href="${a}" style="background: white; color: black; display: flex; align-items: center; gap: 0.5rem; padding: 0.8em 2em; border-radius: 4px; font-size: 1.5em; text-decoration: none; font-weight: bold; cursor: pointer;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
                    Play
                </a>
                <button class="netflix-unmute-button secondary" style="background-color: rgba(109, 109, 110, 0.7); color: white; display: flex; align-items: center; gap: 0.5rem; padding: 0.8em 2em; border: none; border-radius: 4px; font-size: 1.5em; cursor: pointer; transition: all 0.2s;">
                    ${this._generateMuteButtonHTML(this._isMuted)}
                </button>
            </div>
        `;e.innerHTML=window.YPP.utils.sanitizeHTML?window.YPP.utils.sanitizeHTML(d):d;const c=e.querySelector(".netflix-unmute-button");c&&(c.classList.toggle("muted",this._isMuted),c.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),this._handleMuteToggle(c)}));const p=this._heroState.heroElement,l=p.querySelector(".netflix-nav-button.prev"),h=p.querySelector(".netflix-nav-button.next");l&&!l.dataset.bound&&(l.dataset.bound="true",l.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),this._navigateVideo("prev")})),h&&!h.dataset.bound&&(h.dataset.bound="true",h.addEventListener("click",m=>{m.preventDefault(),m.stopPropagation(),this._navigateVideo("next")}))}_generateMuteButtonHTML(t){return t?`
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
            </svg>
            Unmute
        `:`
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
            </svg>
            Mute
        `}_handleMuteToggle(t){try{this._isMuted=!this._isMuted,this._syncMuteState(),t.classList.toggle("muted",this._isMuted);const e=this._generateMuteButtonHTML(this._isMuted);t.innerHTML=window.YPP.utils.sanitizeHTML?window.YPP.utils.sanitizeHTML(e):e,window.YPP.utils.saveSettings({cinematicMuted:this._isMuted})}catch{}}_syncMuteState(){var n;if(this._isFirefox)return;const t=document.querySelector("ytd-video-preview"),e=t==null?void 0:t.querySelector("yt-mute-toggle-button button");e&&((n=e.getAttribute("aria-label"))==null?void 0:n.toLowerCase().includes("unmute"))!==this._isMuted&&e.click()}_updateMuteButtonVisibility(){const t=document.querySelector(".netflix-unmute-button");t&&(t.style.opacity="1")}_setupPreviewChangeObserver(){var e,n,r;const t=document.querySelector("#contents");t&&(t.addEventListener("mouseover",o=>{const i=o.target.closest("ytd-rich-item-renderer");i&&(!this._isUserHovering||this._heroState.currentVideo!==i)&&(this._isUserHovering=!0,this._heroState.currentVideo=i,clearTimeout(this._videoTimer),this._updateHeroContent(i),setTimeout(()=>this._simulateHover(i),50))},{signal:(e=this._abortController)==null?void 0:e.signal}),t.addEventListener("mouseout",o=>{if(!t.contains(o.relatedTarget)&&this._isUserHovering){this._isUserHovering=!1;const i=this._videoQueue[this._currentVideoIndex];i&&(this._updateHeroContent(i),setTimeout(()=>{this._simulateHover(i),this._videoTimer=setTimeout(this._playNextVideo,this.CONFIG.PREVIEW_DELAY)},50))}},{signal:(n=this._abortController)==null?void 0:n.signal}),(r=window.YPP)!=null&&r.sharedObserver&&window.YPP.sharedObserver.register("cinematic-preview-stealer","ytd-video-preview",o=>{const i=o[0]||document.querySelector("ytd-video-preview");if(i&&this._heroState.heroElement&&i.parentNode!==this._heroState.heroElement){this._heroState.heroElement.appendChild(i);const a=this._heroState.heroElement.querySelector(".netflix-hero-gradient"),s=this._heroState.heroElement.querySelector(".netflix-hero-content");a&&this._heroState.heroElement.appendChild(a),s&&this._heroState.heroElement.appendChild(s),this._forceVideoSize(i)}}))}_forceVideoSize(t){if(!t)return;const e=r=>{r&&(r.style.setProperty("width","100%","important"),r.style.setProperty("height","100%","important"),r.style.setProperty("max-width","none","important"),r.style.setProperty("max-height","none","important"),r.style.setProperty("min-width","100%","important"),r.style.setProperty("min-height","100%","important"),r.style.setProperty("transform","none","important"),r.style.setProperty("border-radius","0","important"),r.style.setProperty("margin","0","important"),r.style.setProperty("padding","0","important"))},n=()=>{window.YPP.Utils.batch.read(()=>{const r=t.querySelector("#video-preview-container")||t.querySelector("#inline-preview-player"),o=t.querySelector("ytd-player");let i=o?o.querySelector("#container"):null;!i&&o&&o.shadowRoot&&(i=o.shadowRoot.querySelector("#container"));const a=t.querySelector(".html5-video-player")||(i?i.querySelector(".html5-video-player"):null),s=t.querySelector(".html5-video-container")||(a?a.querySelector(".html5-video-container"):null),d=t.querySelector("video")||(s?s.querySelector("video"):null);window.YPP.Utils.batch.write(()=>{e(t),t.style.setProperty("position","absolute","important"),t.style.setProperty("top","0","important"),t.style.setProperty("left","0","important"),t.style.setProperty("pointer-events","none","important"),e(r),e(o),e(i),e(a),e(s),e(d),d&&(d.style.setProperty("object-fit","cover","important"),d.style.setProperty("z-index","0","important"))})})};n(),t._sizeForcerAttached||(t._sizeForcerAttached=!0,this.addListener(t,"playing",()=>n(),{capture:!0}),this.addListener(t,"loadeddata",()=>n(),{capture:!0}))}_updateVideoQueue(){window.YPP.Utils.batch.read(()=>{const t=document.querySelectorAll("#contents > ytd-rich-item-renderer, #contents > ytd-rich-section-renderer ytd-rich-item-renderer"),e=Array.from(t).filter(r=>{const o=r.querySelector("a#video-title-link, a#video-title, a#thumbnail");return o&&this._extractVideoId(o.href)}),n=[];e.forEach(r=>{r.hasAttribute("data-ypp-processed")||n.push({video:r,isRecent:this._isRecentlyAdded(r),thumbnail:r.querySelector("ytd-thumbnail"),badges:r.querySelectorAll(".recently-badge-container")})}),window.YPP.Utils.batch.write(()=>{let r=!1;if(e.length!==this._videoQueue.length){const i=e.length>this._videoQueue.length;this._videoQueue=e,i||(this._currentVideoIndex=0),r=!0,n.forEach(a=>{if(a.badges.forEach(s=>s.remove()),a.isRecent){const s=document.createElement("div");s.className="recently-badge-container",s.style="position: absolute; top: -17px; left: 50%; transform: translateX(-50%); z-index: 2; padding: 8px;";const d='<span class="recently-badge" style="background-color: #e50914; color: white; padding: 6px 8px; border-radius: 4px; font-size: 15px; font-weight: 500;">Recently Added</span>';s.innerHTML=window.YPP.utils.sanitizeHTML?window.YPP.utils.sanitizeHTML(d):d,a.thumbnail&&a.thumbnail.appendChild(s)}a.video.setAttribute("data-ypp-processed","true")})}const o=this._videoQueue[0];o&&(this._heroState.status==="inactive"?this._makeHeroPreview(o).then(()=>{this._heroState.status==="ready"&&(o.classList.add("netflix-active-preview"),this._updateHeroContent(o),clearTimeout(this._videoTimer),this._videoTimer=setTimeout(this._playNextVideo,this.CONFIG.PREVIEW_DELAY))}):this._heroState.status==="ready"&&r&&(o.classList.add("netflix-active-preview"),this._updateHeroContent(o),clearTimeout(this._videoTimer),this._videoTimer=setTimeout(this._playNextVideo,this.CONFIG.PREVIEW_DELAY)))})})}_isRecentlyAdded(t){var s;const e=t.querySelectorAll("#metadata-line .inline-metadata-item, #metadata-line span.ytd-video-meta-block"),n=Array.from(e).find(d=>d.textContent.toLowerCase().includes("ago")),o=(((s=n==null?void 0:n.textContent)==null?void 0:s.toLowerCase())||"").match(/(\d+)\s+(hour|day|minute)s?\s+ago/);if(!o)return!1;const i=parseInt(o[1],10),a=o[2];return a==="minute"||a==="hour"||a==="day"&&i<=2}_setupContentObserver(){var t;(t=window.YPP)!=null&&t.sharedObserver&&window.YPP.sharedObserver.register("cinematic-content-scanner","ytd-rich-item-renderer",()=>{clearTimeout(this._contentUpdateTimer),this._contentUpdateTimer=setTimeout(()=>this._updateVideoQueue(),this.CONFIG.CONTENT_UPDATE_DELAY)})}_setupScrollHandler(){document.body.addEventListener("wheel",t=>{const e=document.querySelector("#contents");e&&(t.preventDefault(),Math.abs(t.deltaX)>Math.abs(t.deltaY)?e.scrollLeft+=t.deltaX:e.scrollLeft+=t.deltaY)},{passive:!1,signal:this._abortController.signal}),document.addEventListener("keydown",t=>{const e=document.querySelector("#contents");if(e)switch(t.key){case"ArrowLeft":t.preventDefault(),this._navigateVideo("prev");break;case"ArrowRight":t.preventDefault(),this._navigateVideo("next");break;case"ArrowDown":case"PageDown":case"Space":document.activeElement.tagName!=="INPUT"&&(t.preventDefault(),e.scrollLeft+=this.CONFIG.SCROLL_AMOUNT);break;case"ArrowUp":case"PageUp":document.activeElement.tagName!=="INPUT"&&(t.preventDefault(),e.scrollLeft-=this.CONFIG.SCROLL_AMOUNT);break}},{signal:this._abortController.signal})}_onNavigateFinish(){const t=window.location.pathname;if(t===this._lastPathname)return;const e=t==="/"||t==="",n=t.includes("/feed/subscriptions");if(e||n){if(this._isFirefox){const r=document.querySelector("#content");r&&(r.style.visibility="hidden")}window.location.reload()}else setTimeout(()=>{const r=t==="/"||t.includes("/feed/subscriptions");document.body.classList.toggle("cinematic-home",r)},500);this._lastPathname=t}_navigateVideo(t){if(this._isUserHovering||this._videoQueue.length===0)return;const e=this._heroState.heroElement;if(!e)return;clearTimeout(this._videoTimer);const n=this._videoQueue.length;this._currentVideoIndex=t==="next"?(this._currentVideoIndex+1)%n:(this._currentVideoIndex-1+n)%n,this._handleVideoTransition(e,this._currentVideoIndex)}_playNextVideo(){this._navigateVideo("next"),this._updateMuteButtonVisibility()}_handleVideoTransition(t,e){document.querySelectorAll(".netflix-active-preview").forEach(n=>{n.classList.remove("netflix-active-preview")}),t.classList.add("fading"),setTimeout(()=>{if(!this._cinematicActive||this._heroState.status!=="ready")return;const n=this._videoQueue[e];n&&(n.classList.add("netflix-active-preview"),this._updateHeroContent(n),this._simulateHover(n).then(()=>{this._syncMuteState()}),t.classList.remove("fading"),this._updateMuteButtonVisibility(),clearTimeout(this._videoTimer),this._videoTimer=setTimeout(this._playNextVideo,this.CONFIG.PREVIEW_DELAY))},this.CONFIG.FADE_DURATION)}_teardownHero(){var e;if(this._heroState.status==="inactive")return;this._heroState.status="destroying",this._heroState.observers.forEach(n=>n.disconnect()),this._heroState.observers.clear(),(e=window.YPP)!=null&&e.sharedObserver&&(window.YPP.sharedObserver.unregister("cinematic-content-scanner"),window.YPP.sharedObserver.unregister("cinematic-preview-stealer")),this._contentUpdateTimer&&(clearTimeout(this._contentUpdateTimer),this._contentUpdateTimer=null),document.querySelectorAll('[data-ypp-processed="true"]').forEach(n=>{n.removeAttribute("data-ypp-processed"),n.querySelectorAll(".recently-badge-container").forEach(r=>r.remove())});const t=this._heroState.heroElement;if(t){const n=t.querySelector("ytd-video-preview");n&&document.body.appendChild(n),t.remove()}this._heroState={status:"inactive",heroElement:null,observers:new Set,currentVideo:null}}_teardown(){this._cinematicActive=!1,document.body.classList.remove("cinematic-home"),document.body.classList.remove("cinematic"),document.documentElement.removeAttribute("dark"),clearTimeout(this._videoTimer),clearInterval(this._checkInterval),this._videoTimer=null,this._checkInterval=null,this._mo&&(this._mo.disconnect(),this._mo=null),this._navObserver&&(this._navObserver.disconnect(),this._navObserver=null),this._darkModeObserver&&(this._darkModeObserver.disconnect(),this._darkModeObserver=null),this._abortController&&(this._abortController.abort(),this._abortController=null),this._teardownHero(),document.querySelectorAll(".netflix-active-preview").forEach(t=>{t.classList.remove("netflix-active-preview")})}};
