/**
 * DomAPI - Centralized DOM query proxy
 * Removes hardcoded document.querySelector calls from features,
 * making UI changes on YouTube trivial to fix in one place.
 */
window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

// Helpers
const getSelector = (key) => window.YPP?.CONSTANTS?.SELECTORS[key] || '';
const query = (selector, parent = document) => {
    try {
        return parent.querySelector(selector);
    } catch {
        return null; // Handle malformed selectors gracefully
    }
};
const queryAll = (selector, parent = document) => {
    try {
        return Array.from(parent.querySelectorAll(selector));
    } catch {
        return [];
    }
};

window.YPP.core.DomAPI = {
    // Layout
    getGrid() { return query(getSelector('GRID_RENDERER') || 'ytd-rich-grid-renderer'); },
    getGridContents() { return query(getSelector('GRID_CONTENTS') || '#contents'); },
    getVideoItems(parent = document) { return queryAll(getSelector('VIDEO_ITEM') || 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer', parent); },

    // Player
    getPlayer() { return query(getSelector('PLAYER') || '.html5-video-player'); },
    getPlayerContainer() { return query(getSelector('PLAYER_CONTAINER') || '#player-container-outer'); },
    getWatchFlexy() { return query(getSelector('WATCH_FLEXY') || 'ytd-watch-flexy, #page-manager > ytd-watch'); },
    getVideoElement() { return query('video'); },
    getVideoControls() { return query(getSelector('VIDEO_CONTROLS') || '.ytp-right-controls'); },

    // Header & Masthead
    getMasthead() { return query(getSelector('MASTHEAD') || 'ytd-masthead'); },
    getChipsBar() { return query(getSelector('CHIPS_BAR') || 'ytd-feed-filter-chip-bar-renderer'); },

    // Sidebar & Navigation
    getMainGuide() { return query(getSelector('MAIN_GUIDE') || 'ytd-guide-renderer'); },
    getMiniGuide() { return query(getSelector('MINI_GUIDE') || 'ytd-mini-guide-renderer'); },
    getGuideButton() { return query(getSelector('GUIDE_BUTTON') || '#guide-button'); },
    getRelatedItems() { return query(getSelector('RELATED_ITEMS') || '#related'); },

    // Sections
    getComments() { return query(getSelector('COMMENTS_SECTION') || 'ytd-comments'); },
    getMerch() { return query(getSelector('MERCH_SHELF') || 'ytd-merch-shelf-renderer'); },
    getShortsSections() { return queryAll(getSelector('SHORTS_SECTION') || 'ytd-rich-section-renderer[is-shorts]'); }
};

window.YPP.DomAPI = window.YPP.core.DomAPI;
