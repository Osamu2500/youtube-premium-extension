/**
 * Grid Layout Module
 * Forces 4x4 video grid layout on YouTube home page
 * @module gridLayout
 */

import { SELECTORS, GRID, LOG_PREFIX } from '../constants.js';

/**
 * Manages 4x4 grid layout for YouTube home page
 * @class
 */
export class GridLayoutManager {
    /**
     * Creates a new GridLayoutManager instance
     */
    constructor() {
        /** @type {boolean} Indicates if grid layout is active */
        this.isActive = false;

        /** @type {MutationObserver|null} Observes DOM changes for new videos */
        this.observer = null;
    }

    /**
     * Initialize and apply 4x4 grid layout
     * @returns {void}
     */
    init() {
        if (this.isActive) return;

        console.log(`${LOG_PREFIX.GRID} Initializing 4x4 grid...`);
        this.isActive = true;

        try {
            this.applyGridLayout();
            this.startObserver();
        } catch (error) {
            console.error(`${LOG_PREFIX.GRID} Initialization error:`, error);
        }
    }

    /**
     * Apply 4x4 grid layout to all video items
     * @returns {void}
     */
    applyGridLayout() {
        try {
            const gridRenderer = document.querySelector(SELECTORS.GRID_RENDERER);
            if (!gridRenderer) {
                console.log(`${LOG_PREFIX.GRID} Grid renderer not found`);
                return;
            }

            // Force container to be flex
            const contents = gridRenderer.querySelector(SELECTORS.GRID_CONTENTS);
            if (contents) {
                contents.style.display = 'flex';
                contents.style.flexWrap = 'wrap';
                contents.style.justifyContent = 'flex-start';
                contents.style.width = '100%';
            }

            // Get all video items
            const items = document.querySelectorAll(SELECTORS.VIDEO_ITEM);
            console.log(`${LOG_PREFIX.GRID} Found ${items.length} video items`);

            items.forEach((item) => {
                this._styleVideoItem(item);
            });

            // Make rows transparent if they exist
            const rows = document.querySelectorAll(SELECTORS.GRID_ROW);
            rows.forEach(row => {
                row.style.display = 'contents';
            });

            console.log(`${LOG_PREFIX.GRID} Applied 4x4 grid`);
        } catch (error) {
            console.error(`${LOG_PREFIX.GRID} Error applying layout:`, error);
        }
    }

    /**
     * Style a single video item for 4x4 grid
     * @param {HTMLElement} item - Video item element
     * @private
     */
    _styleVideoItem(item) {
        // We now rely on CSS for sizing and margins to handle responsiveness better.
        // The JS responsibility is primarily to ensure the structure allows for the CSS grid/flex to work.
        // See styles.css for the width and margin definitions.

        // Ensure box-sizing is correct just in case
        item.style.boxSizing = 'border-box';

        // Remove potentially conflicting inline styles if they were set by previous versions
        item.style.width = '';
        item.style.maxWidth = '';
        item.style.flex = '';
        item.style.margin = '';
    }

    /**
     * Start observing for new video items
     * @returns {void}
     */
    startObserver() {
        if (this.observer) return;

        const targetNode = document.querySelector(SELECTORS.GRID_RENDERER);
        if (!targetNode) {
            console.log(`${LOG_PREFIX.GRID} Target node not found for observer`);
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            let shouldReapply = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldReapply = true;
                    break;
                }
            }

            if (shouldReapply) {
                this.applyGridLayout();
            }
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        console.log(`${LOG_PREFIX.GRID} Observer started`);
    }

    /**
     * Clean up resources
     * @returns {void}
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isActive = false;
        console.log(`${LOG_PREFIX.GRID} Destroyed`);
    }
}
