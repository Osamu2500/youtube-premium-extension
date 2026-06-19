/**
 * popup-schema.js  — v3.1 Architecture
 * ─────────────────────────────────────────────────────────────────────
 * Declarative definition of every popup tab, section, and setting.
 * The popup-renderer.js consumes this and generates live DOM from it.
 *
 * Structure:
 *   POPUP_SCHEMA = Tab[]
 *   Tab          = { id, label, icon, sections: Section[] }
 *   Section      = { title, subtitle?, items: Item[] }
 *   Item         = { type, id, label, desc?, icon?, ...typeProps }
 *
 * Item types:
 *   'toggle'   → checkbox toggle card
 *   'range'    → range slider  (needs: min, max, step, unit)
 *   'select'   → <select>      (needs: options: [{value, label}])
 *   'pill'     → segmented pill (needs: options, storageKey)
 *   'custom'   → slot rendered by renderer via customRenderers map
 *   'heading'  → non-interactive label/divider row
 *
 * Sections support `hidden: true` for legacy/unused items kept for
 * settings-compatibility but not displayed.
 * ─────────────────────────────────────────────────────────────────────
 */

// Tiny SVG path helper — returns just the <path d="…"> inner string
// Full <svg> wrapper is added by the renderer
const P = (d) => d;

export const POPUP_SCHEMA = [

    // ──────────────────────────────────────────────────────────────────
    // DASHBOARD (rendered by popup-components.js, schema provides meta)
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'dashboard', label: 'Dash',
        icon: P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
        custom: true,   // entirely custom-rendered, no sections here
        sections: []
    },

    // ──────────────────────────────────────────────────────────────────
    // HOME FEED
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'home', label: 'Home',
        icon: P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
        sections: [
            {
                title: 'Feed Layout',
                items: [
                    { type:'toggle', id:'cinematicMode',    label:'Cinematic Mode',   desc:'Netflix-style immersive UI', icon:P('M2 7h20v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z M17 2l5 5M7 2L2 7'), style:'border:1px solid var(--accent-primary)' },
                    { type:'toggle', id:'displayFullTitle', label:'Full Video Titles', desc:'Prevent truncation',        icon:P('M4 6h16M4 12h16M4 18h16') },
                    { type:'toggle', id:'autoScaleLayout',  label:'Auto-Scale Grid',  desc:'Adapt to zoom/window size', icon:P('M15 3l6 6M15 3h6v6M9 21l-6-6M9 21H3v-6') },
                    { type:'range', id:'homeColumns', label:'Grid Columns', unit:'', min:1, max:8, step:1 },
                    { type:'toggle', id:'useSquareCorners',    label:'Square Corners',     desc:'Sharp edges for videos',   icon:P('M3 3h18v18H3z') }
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // SHORTS
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'shorts', label: 'Shorts',
        icon: P('M12 20V10M18 20V4M6 20v-4'),
        sections: [
            {
                title: 'Visibility & Routing',
                items: [
                    { type:'toggle', id:'hideShorts',       label:'Hide Shorts',        desc:'Remove from Home feed',    icon:P('M12 20V10M18 20V4M6 20v-4') },
                    { type:'toggle', id:'hideSearchShorts', label:'Hide Search Shorts', desc:'Remove from search results', icon:P('M21 21l-4.35-4.35M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z') },
                    { type:'toggle', id:'redirectShorts',   label:'Redirect Shorts',    desc:'Play in normal UI',        icon:P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z') },
                ]
            },
            {
                title: 'Playback Enhancements',
                items: [
                    { type:'toggle', id:'shortsAutoScroll', label:'Auto-Scroll',        desc:'Skip when ended',          icon:P('M12 5l0 14M19 12l-7 7-7-7') },
                    { type:'toggle', id:'shortsVolumeNormalizer', label:'Normalize Volume', desc:'Enforce default volume', icon:P('M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07') },
                    { type:'toggle', id:'hideShortsInteraction', label:'Hide Interaction Bar', desc:'Hide likes/comments on right', icon:P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') },
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // PLAYER
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'player', label: 'Player',
        icon: P('M5 3l14 9-14 9V3z'),
        sections: [
            {
                title: 'Playback Automation',
                items: [
                    { type:'toggle', id:'autoCinema',       label:'Auto Cinema',        desc:'Expand player on load',      icon:P('M2 3h20v14H2zM8 21h8M12 17v4') },
                    { type:'toggle', id:'videoResumer',     label:'Video Resumer',      desc:'Save playback position',     icon:P('M12 20V4M20 12H4') },
                    { type:'toggle', id:'autoPause',        label:'Auto Pause',         desc:'Pause when backgrounded',    icon:P('M6 4h4v16H6zM14 4h4v16h-4z') },
                    { type:'toggle', id:'autoLike',         label:'Auto Like',          desc:'Automatically like video',   icon:P('M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z') },
                    { type:'toggle', id:'autoPiP',          label:'Auto PiP',           desc:'PiP when switching tabs',    icon:P('M3 3h18v14H3zM12 14h7v5h-7z') },
                    { type:'toggle', id:'intentionalDelay', label:'Intentional Delay',  desc:'Pause before video',         icon:P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2') },
                    { type:'range',  id:'autoLikeThreshold',label:'Auto Like at (%)',   unit:'%', min:0, max:100, step:5 },
                    { type:'select', id:'autoQuality',      label:'Auto-Quality',       desc:'Force specific resolution', icon:P('M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 8l6 4-6 4V8z'), options:[{value:'highres',label:'Max/4K'},{value:'hd1440',label:'1440p'},{value:'hd1080',label:'1080p'},{value:'hd720',label:'720p'},{value:'off',label:'Off'}] },
                    { type:'range',  id:'intentionalDelayTime',label:'Delay Duration',  unit:'s', min:1, max:10, step:1 },
                ]
            },
            {
                title: 'Audio & Interactions',
                items: [
                    { type:'toggle', id:'enableVolumeBoost',  label:'Volume Booster',    desc:'Increase past 100%',         icon:P('M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07') },
                    { type:'toggle', id:'audioCompressor',    label:'Audio Compressor',  desc:'Compress loud sounds',       icon:P('M22 12h-4l-3 9L9 3l-3 9H2') },
                    { type:'toggle', id:'wheelControls',      label:'Wheel Controls',    desc:'Shift/Alt+Scroll to control', icon:P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2') },
                ]
            },

            {
                title: 'Player UI Components',
                items: [
                    { type:'toggle', id:'revertProgressBar',   label:'Classic Progress Bar', desc:'Solid red, no pink gradient', icon:P('M3 3h18v18H3zM3 9h18') },
                    { type:'toggle', id:'videoControlsEnabled', label:'Video Controls UI', desc:'Custom floating panel',     icon:P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z') },
                    { type:'toggle', id:'enableCinemaFilters',  label:'Filters',          desc:'Visual effects panel',       icon:P('M22 3H2l8 9.46V19l4 2v-8.54L22 3z') },
                    { type:'toggle', id:'enableLoop',           label:'Loop Button',      desc:'Add loop toggle',            icon:P('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z') },
                    { type:'toggle', id:'enableSnapshot',       label:'Snapshot Button',  desc:'Save frame as image',        icon:P('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') },
                    { type:'toggle', id:'enableRemainingTime',  label:'Time Remaining',   desc:'Next to duration',           icon:P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2') },
                    { type:'toggle', id:'enableBookmarks',      label:'Bookmarks',        desc:'Capture clips & text',       icon:P('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z') },
                    { type:'layoutToggle', id:'sidebarLayout',        label:'Sidebar Layout',   desc:'Video cards size' },
                    { type:'toggle', id:'splitScrolling',       label:'Split Scrolling',  desc:'Scroll sidebar independently', icon:P('M12 5l0 14M19 12l-7 7-7-7') },
                ]
            },
            {
                title: 'Custom Player Bar (Placements)',
                items: [
                    { type:'button-group', id:'pb_snapshot', label:'Snapshot Button', desc:'Extension feature', icon:P('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_loop', label:'Loop Button', desc:'Extension feature', icon:P('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_speed', label:'Speed Controls', desc:'Extension feature', icon:P('M5 4l15 8-15 8V4z M19 5v14'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_bookmark', label:'Bookmark Button', desc:'Extension feature', icon:P('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_pip', label:'PiP Button', desc:'Extension feature', icon:P('M3 3h18v14H3zM12 14h7v5h-7z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_volume', label:'Volume Booster', desc:'Extension feature', icon:P('M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_cinema', label:'Cinema Filters', desc:'Extension feature', icon:P('M22 3H2l8 9.46V19l4 2v-8.54L22 3z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_play', label:'Native Play/Pause', desc:'YouTube feature', icon:P('M5 3l14 9-14 9V3z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_next', label:'Native Next', desc:'YouTube feature', icon:P('M5 4l10 8-10 8V4zM15 4h4v16h-4z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_mute', label:'Native Mute/Volume', desc:'YouTube feature', icon:P('M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_cast', label:'Native Cast/TV', desc:'YouTube feature', icon:P('M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z M1 18v3h3c0-1.66-1.34-3-3-3zM1 14v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zM1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_autoplay', label:'Native Autoplay', desc:'YouTube feature', icon:P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_cc', label:'Native CC/Subtitles', desc:'YouTube feature', icon:P('M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_settings', label:'Native Settings', desc:'YouTube feature', icon:P('M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_miniplayer', label:'Native Miniplayer', desc:'YouTube feature', icon:P('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_theater', label:'Native Theater Mode', desc:'YouTube feature', icon:P('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_native_fullscreen', label:'Native Fullscreen', desc:'YouTube feature', icon:P('M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_autoPause', label:'Auto Pause', desc:'Extension feature', icon:P('M6 19h4V5H6v14zm8-14v14h4V5h-4z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_autoLike', label:'Auto Like', desc:'Extension feature', icon:P('M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_videoResumer', label:'Video Resume', desc:'Extension feature', icon:P('M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_intentionalDelay', label:'Video Delay', desc:'Extension feature', icon:P('M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0 0 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 0 0 7.53-14.39zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_audioCompressor', label:'Audio Compressor', desc:'Extension feature', icon:P('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_autoQuality', label:'Auto Quality', desc:'Extension feature', icon:P('M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                    { type:'button-group', id:'pb_durationFilter', label:'Duration Filter', desc:'Extension feature', icon:P('M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z'), options: [{value:'front',label:'Front'},{value:'back',label:'Back'},{value:'hidden',label:'Hidden'}] },
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // VIDEO SPEED CONTROLLER
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'speed', label: 'Speed',
        icon: P('M4 6v12l8.5-6L4 6zm9 0v12l8.5-6L13 6z'),
        sections: [
            {
                title: 'Video Speed Controller',
                items: [
                    { type:'toggle', id:'enableCustomSpeed',  label:'Enable Speed Controller', desc:'Master toggle for custom speed features', icon:P('M4 6v12l8.5-6L4 6zm9 0v12l8.5-6L13 6z') },
                ]
            },
            {
                title: 'Other Settings',
                items: [
                    { type:'toggle', id:'vscAudioSupport',  label:'Audio Support', desc:'Control speed of HTML5 <audio> elements', icon:P('M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z') },
                    { type:'toggle', id:'vscRememberSpeed', label:'Remember playback speed', desc:'Restore speed across videos', icon:P('M19 8l-4 4h3c0 3.31-2.69 6-6 6a5.87 5.87 0 0 1-2.8-.7l-1.46 1.46A7.93 7.93 0 0 0 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46A7.93 7.93 0 0 0 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z') },
                    { type:'toggle', id:'vscHideByDefault', label:'Hide controller by default', desc:'Only show when changing speed', icon:P('M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.28 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z') },
                    { type:'toggle', id:'vscForceSpeed',    label:'Force last saved speed', desc:'Prevent video players that override VSC speed', icon:P('M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 11.25V9c0-1.1-.9-2-2-2H8v8h2v-2.5h2v2.5h2V11.25zM10 9v1.25H8V9h2zm4 0v8h2V9h-2z') },
                ]
            },
            {
                title: 'Shortcuts',
                items: [
                    { type:'custom', id:'vsc_shortcuts_manager' }
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // SEARCH
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'search', label: 'Search',
        icon: P('M21 21l-4.35-4.35M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z'),
        sections: [
            {
                title: 'Layout & Filters',
                items: [
                    { type:'toggle', id:'searchGrid',        label:'Grid View',           desc:'Card layout for search',   icon:P('M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z') },
                    { type:'toggle', id:'cleanSearch',       label:'Clean Search',         desc:'Remove junk/ads',          icon:P('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z') },
                    { type:'toggle', id:'autoVideoFilter',   label:'Auto Video Filter',    desc:'Default to Videos tab',    icon:P('M5 4l15 8-15 8V4z'), style:'display:none' },
                    { type:'toggle', id:'hideSearchShelves', label:'Hide Shelf Sections',  desc:'Remove "For You"',         icon:P('M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z') },
                    { type:'toggle', id:'hideChannelCards',  label:'Hide Channel Cards',   desc:'Show videos only',         icon:P('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z') },
                    { type:'range',  id:'searchColumns',     label:'Grid Columns', unit:'', min:1, max:8, step:1 },
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // SUBSCRIPTIONS
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'subscriptions', label: 'Subs',
        icon: P('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'),
        sections: [
            {
                title: 'Subscription Management',
                items: [
                    { type:'toggle', id:'subscriptionFolders', label:'Sub Folders',     desc:'Create groups',              icon:P('M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z') },
                    { type:'toggle', id:'enableSubsManager',   label:'Group Sidebar',   desc:'Show UI sidebar',            icon:P('M3 3h18v18H3zM9 3v18') },
                    { type:'toggle', id:'contextMenu',         label:'Context Menu',    desc:'Card context menu',          icon:P('M12 12h.01M12 5h.01M12 19h.01') },
                    { type:'toggle', id:'enableFilterBar',     label:'Filter Bar',      desc:'Show duration/date filters', icon:P('M22 3L2 3l8 9.46V19l4 2v-8.54L22 3z') },
                    { type:'toggle', id:'enableChannelHealth', label:'Channel Health',  desc:'Show health scanner',        icon:P('M22 12h-4l-3 9L9 3l-3 9H2') },
                ]
            },
            {
                title: 'Columns',
                items: [
                    { type:'range', id:'channelColumns',       label:'Channel Columns',    unit:'', min:2, max:10, step:1 },
                    { type:'range', id:'subscriptionsColumns', label:'Feed Grid Columns',  unit:'', min:1, max:8,  step:1 }
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // HISTORY (custom — complex widget, keep as custom slot)
    // ──────────────────────────────────────────────────────────────────
    { id: 'history', label: 'History', icon: P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2'), custom: true, sections: [] },

    // ──────────────────────────────────────────────────────────────────
    // BOOKMARKS (custom — list rendered by popup-extras)
    // ──────────────────────────────────────────────────────────────────
    { id: 'bookmarks', label: 'Marks', icon: P('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'), custom: true, sections: [] },

    // ──────────────────────────────────────────────────────────────────
    // WELLNESS (FOCUS)
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'wellness', label: 'Focus',
        icon: P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l3 3'),
        sections: [
            {
                title: 'Global Filters (All Pages)',
                items: [
                    { type:'toggle', id:'hideMetrics',    label:'Hide Views & Subs',   desc:'Hide views, likes, sub counts', icon:P('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M3 3l18 18') },
                    { type:'toggle', id:'hideThumbnails',    label:'Hide Thumbnails',   desc:'Blur on hover to reveal',  icon:P('M3 3h18v18H3z M8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21') },
                    { type:'toggle', id:'hideWatched',       label:'Hide Watched',      desc:'Auto-hide watched videos',    icon:P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'), slot:'hideWatchedOptions' },
                    { type:'toggle', id:'enableMarkWatched', label:'Mark as Watched',   desc:'Hover icon to mark',       icon:P('M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3') },
                    { type:'toggle', id:'hideMixes',         label:'Hide Mixes',        desc:'Remove infinite mixes',    icon:P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71') },
                    { type:'toggle', id:'cleanMixUrls',      label:'Clean Mix URLs',    desc:'Prevent Mix Auto-Play',    icon:P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z') },
                    { type:'toggle', id:'hidePlaylists',     label:'Hide Playlists',    desc:'Remove playlist cards',    icon:P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01') },
                    { type:'toggle', id:'hidePodcasts',      label:'Hide Podcasts',     desc:'Remove podcast cards',     icon:P('M3 18v-6a9 9 0 0 1 18 0v6 M21 19a2 2 0 0 1-2 2h-1v-6h3v4z M3 19a2 2 0 0 0 2 2h1v-6H3v4z') },
                    { type:'toggle', id:'hidePosts',         label:'Hide Posts',        desc:'Remove community posts',   icon:P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') },
                    { type:'toggle', id:'hidePromoShelves',  label:'Hide Promos',       desc:'Remove shelves & games',   icon:P('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z') },
                    { type:'toggle', id:'hideVoiceSearch',   label:'Hide Voice Search', desc:'Remove microphone icon',    icon:P('M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V22h2v-4.08A7 7 0 0 0 19 11h-2z') },
                    { type:'toggle', id:'aggressiveShortsBlock', label:'Nuke Shorts', desc:'Remove everywhere', icon:P('M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z') },
                    { type:'toggle', id:'stopShortsLooping',     label:'Stop Looping', desc:'No auto-replay on Shorts', icon:P('M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z') },
                    { type:'toggle', id:'hideShortVideos', label:'Duration Filter', desc:'Hide short videos', icon:P('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6') },
                    { type:'range', id:'minVideoDuration', label:'Min Duration', min: 1, max: 60, step: 1, unit:'m' },
                ]
            },
            {
                title: 'Homepage',
                items: [
                    { type:'toggle', id:'hideFeed',       label:'Hide Homepage Feed',  desc:'Blank homepage', icon:P('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z') },
                    { type:'toggle', id:'hideExploreTopics', label:'Hide Topics Bar',   desc:'Remove category chips',    icon:P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M3.6 9h16.8 M3.6 15h16.8') },
                    { type:'toggle', id:'hideTrending',   label:'Hide Trending/Explore',icon:P('M13 2L3 14h9l-1 8 10-12h-9l1-8z') },
                ]
            },
            {
                title: 'Player Page',
                items: [
                    { type:'toggle', id:'hideComments',   label:'Hide Comments',       icon:P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') },
                    { type:'toggle', id:'commentFilter',  label:'Comment Spam Filter', desc:'Hide suspected bots',        icon:P('M22 3L2 3l8 9.46V19l4 2v-8.54L22 3z') },
                    { type:'select', id:'commentFilterAction', label:'Spam Action', desc:'What to do with spam', icon:P('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'), options: [{value:'dim',label:'Dim (Hover to reveal)'},{value:'hide',label:'Hide completely'}] },
                    { type:'toggle', id:'hideRelated',    label:'Hide Related Feed',   desc:'Hide sidebar videos', icon:P('M3 3h18v18H3zM14 8h6M14 12h6M14 16h6') },
                    { type:'toggle', id:'hideLiveChat',   label:'Hide Live Chat',      icon:P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') },
                    { type:'toggle', id:'hideEndScreens', label:'Hide End Screens',    icon:P('M3 3h18v18H3zM3 9h18M9 21V9') },
                    { type:'toggle', id:'hideCards',      label:'Hide Video Cards',    icon:P('M3 3h18v18H3zM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0') },
                    { type:'toggle', id:'hideAnnotations',label:'Hide Annotations',    icon:P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') },
                    { type:'toggle', id:'hideMerch',      label:'Hide Merch/Offers',   icon:P('M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0') },
                    { type:'toggle', id:'hideFundraiser', label:'Hide Donations',      icon:P('M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z') },
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // CUSTOMIZATION (custom — theme engine requires component hooks)
    // ──────────────────────────────────────────────────────────────────
    { id: 'customization', label: 'Style', icon: P('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'), custom: true, sections: [] },

    // ──────────────────────────────────────────────────────────────────
    // THEMING (custom — glass tuning)
    // ──────────────────────────────────────────────────────────────────
    { id: 'theming', label: 'Theme', icon: P('M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'), custom: true, sections: [] },

    // ──────────────────────────────────────────────────────────────────
    // ADVANCED
    // ──────────────────────────────────────────────────────────────────
    {
        id: 'advanced', label: 'Pro',
        icon: P('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'),
        sections: [
            {
                title: 'Hotkeys (Watch Page)',
                items: [
                    { type:'toggle', id:'keyboardShortcuts', label:'Enable Hotkeys', icon:P('M2 4h20v16H2z M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10') },
                    { type:'custom', id:'shortcutsPanel', slot:'shortcutsPanel' },
                ]
            },
            {
                title: 'External Integrations',
                items: [
                    { type:'inlineToggle', id:'enableGlobalPlayerBar', label:'Global Player Bar', desc:'External sites UI', icon:P('M3 3h18v14H3zM3 15h18') },
                    {
                        type:'select', id:'globalPlayerBarPosition', label:'Player Bar Position', desc:'Global Player Bar layout',
                        options: [ {value:'right',label:'Right'}, {value:'left',label:'Left'}, {value:'top',label:'Top'} ]
                    },
                ]
            },
            {
                title: 'Global Player Bar (Elements)',
                items: [
                    { type:'toggle', id:'gpb_showPlay', label:'Play/Pause', desc:'Native Play/Pause', icon:P('M5 3l14 9-14 9V3z') },
                    { type:'toggle', id:'gpb_showTime', label:'Current Time', desc:'Time Display', icon:P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2') },
                    { type:'toggle', id:'gpb_showVolume', label:'Volume/Mute', desc:'Native Volume slider', icon:P('M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07') },
                    { type:'toggle', id:'gpb_showVolumeBoost', label:'Volume Booster', desc:'Sub-feature toggle', icon:P('M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07') },
                    { type:'toggle', id:'gpb_showFilters', label:'Cinema Filters', desc:'Sub-feature toggle', icon:P('M22 3H2l8 9.46V19l4 2v-8.54L22 3z') },
                    { type:'toggle', id:'gpb_showLoop', label:'Loop', desc:'Native Loop toggle', icon:P('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z') },
                    { type:'toggle', id:'gpb_showPip', label:'PiP', desc:'Picture-in-Picture', icon:P('M3 3h18v14H3zM12 14h7v5h-7z') },
                    { type:'toggle', id:'gpb_showFullscreen', label:'Fullscreen', desc:'Native Fullscreen', icon:P('M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z') },
                ]
            },
            {
                title: 'Stats & Overlays',
                items: [
                    { type:'toggle', id:'enableStatsForNerds', label:'Stats Overlay', desc:'View tech details', icon:P('M4 17l6-6 4 4 6-8') },
                ]
            }
        ]
    },

    // ──────────────────────────────────────────────────────────────────
    // GLOBAL (custom — misc toggles + backup)
    // ──────────────────────────────────────────────────────────────────
    { id: 'global', label: 'Global', icon: P('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'), custom: true, sections: [] },
];

/**
 * Map of custom slot IDs → render functions.
 * Registered by popup-renderer.js at init-time.
 * Each fn(container: HTMLElement, state: object) → void
 */
export const CUSTOM_SLOT_RENDERERS = new Map();
