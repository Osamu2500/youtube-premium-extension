/**
 * Utility Module
 * Common helper functions for the extension
 * @module utils
 */

import { LOG_PREFIX } from '../constants.js';

export const Utils = {
    /**
     * Log a message with extension prefix
     * @param {string} msg - Message to log
     * @param {string} type - Log type (default: MAIN)
     */
    log: (msg, type = 'UTILS') => {
        const prefix = LOG_PREFIX[type] || LOG_PREFIX.MAIN;
        console.log(`${prefix} ${msg}`);
    },

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<HTMLElement|null>} Found element or null
     */
    waitForElement: (selector, timeout = 10000) => {
        return new Promise(resolve => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    resolve(el);
                    observer.disconnect();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            if (timeout > 0) {
                setTimeout(() => {
                    observer.disconnect();
                    resolve(null);
                }, timeout);
            }
        });
    },

    /**
     * Create a DOM element with attributes
     * @param {string} tag - HTML tag name
     * @param {string[]} classes - Array of class names
     * @param {Object} attributes - Key-value pair of attributes
     * @param {string} innerHTML - Inner HTML content
     * @returns {HTMLElement} Created element
     */
    createElement: (tag, classes = [], attributes = {}, innerHTML = '') => {
        const el = document.createElement(tag);
        if (classes.length) el.classList.add(...classes);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    },

    /**
     * Debounce a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Backward compatibility for existing code that uses window.Utils
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}
