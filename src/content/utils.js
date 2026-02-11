/**
 * Utilities for YouTube Premium Plus
 * Common helper functions and shared classes.
 */
window.YPP = window.YPP || {};

window.YPP.Utils = Object.assign(window.YPP.Utils || {}, {
    /**
     * Standardized Logger
     * @param {string} msg - Message to log
     * @param {string} type - Feature context (e.g., 'SIDEBAR')
     * @param {string} level - 'info', 'warn', or 'error'
     */
    log: (msg, type = 'MAIN', level = 'info') => {
        const prefix = `%c[YPP:${type}]`;
        const style = 'color: #3ea6ff; font-weight: bold;';
        if (level === 'error') console.error(prefix, style, msg);
        else if (level === 'warn') console.warn(prefix, style, msg);
        else console.log(prefix, style, msg);
    },

    /** Page Detection Helpers */
    isWatchPage: () => window.location.pathname === '/watch',
    isSearchPage: () => window.location.pathname === '/results',
    isHome: () => window.location.pathname === '/' || window.location.pathname === '/index',


    /**
     * Wait for an element to appear in the DOM.
     * @param {string} selector - CSS selector
     * @param {number} timeout - Ms to wait (default from CONSTANTS)
     * @returns {Promise<Element|null>}
     */
    waitForElement: (selector, timeout = window.YPP?.CONSTANTS?.TIMINGS?.ELEMENT_WAIT_DEFAULT || 10000) => {
        // Defensive: Validate selector
        if (!selector || typeof selector !== 'string') {
            return Promise.resolve(null);
        }

        const el = document.querySelector(selector);
        if (el) return Promise.resolve(el);

        return new Promise((resolve) => {
            let resolved = false;

            const observer = new MutationObserver((_, obs) => {
                const element = document.querySelector(selector);
                if (element && !resolved) {
                    resolved = true;
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });

            if (timeout > 0) {
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        observer.disconnect();
                        resolve(null);
                    }
                }, timeout);
            }
        });
    },

    /**
     * Create a toast notification on screen.
     * @param {string} msg - Text to display
     * @returns {void}
     */
    createToast: (msg) => {
        const toast = document.createElement('div');
        toast.className = 'ypp-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        // Force reflow
        void toast.offsetWidth;

        // Defensive: Safe access to timing constants with fallbacks
        const TIMINGS = window.YPP?.CONSTANTS?.TIMINGS || {
            TOAST_DISPLAY: 3000,
            TOAST_FADE: 300
        };
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), TIMINGS.TOAST_FADE);
            }, TIMINGS.TOAST_DISPLAY);
        });
    },

    /**
     * Debounce a function to limit execution frequency.
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: (func, wait) => {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Create a standard player control button.
     * @param {string} className - Extra CSS classes
     * @param {string} title - Tooltip title
     * @param {string} svgContent - Inner SVG HTML
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    addPlayerButton: (className, title, svgContent, onClick) => {
        const btn = document.createElement('button');
        btn.className = `ytp-button ${className}`;
        btn.title = title;
        btn.innerHTML = svgContent;
        btn.onclick = onClick;
        return btn;
    },

    /**
     * Create a DOM element with attributes and optional children.
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Element attributes as key-value pairs
     * @param {Array<Element>|Element|string} children - Child elements or text content
     * @returns {Element|null} Created DOM element or null if tag is invalid
     */
    createElement: (tag, attrs = {}, children = []) => {
        // Defensive: Validate tag name
        if (!tag || typeof tag !== 'string') {
            console.error('[YPP:Utils] createElement: invalid tag name');
            return null;
        }

        try {
            const el = document.createElement(tag);

            // Defensive: Validate attrs is an object
            if (attrs && typeof attrs === 'object') {
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key === 'className') el.className = value;
                    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
                    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.substring(2).toLowerCase(), value);
                    else el.setAttribute(key, value);
                });
            }

            // Defensive: Ensure children is iterable
            const childArray = Array.isArray(children) ? children : [children];
            childArray.forEach(child => {
                if (typeof child === 'string') el.appendChild(document.createTextNode(child));
                else if (child instanceof Element) el.appendChild(child);
            });

            return el;
        } catch (error) {
            console.error('[YPP:Utils] createElement error:', error);
            return null;
        }
    },

    /**
     * Inject CSS styles into the document head.
     * @param {string} css - CSS string to inject
     * @param {string} id - Unique ID for the style element (prevents duplicates)
     * @returns {void}
     */
    addStyle: (css, id = 'ypp-custom-style') => {
        if (document.getElementById(id)) return;
        const style = document.createElement('style');
        style.id = id;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    },

    /**
     * Remove Dynamic CSS
     * @param {string} id - Unique ID of the style tag
     */
    removeStyle: (id) => {
        const style = document.getElementById(id);
        if (style) style.remove();
    }
});

/**
 * Simple Event Bus for decoupled communication
 */
window.YPP.Utils.EventBus = class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error(`[EventBus] Error in listener for '${event}':`, e);
            }
        });
    }
};

// Singleton Event Bus instance
window.YPP.events = new window.YPP.Utils.EventBus();

/**
 * DOM Observer Class
 * Efficiently batches mutations to avoid performance hits.
 */
window.YPP.Utils.DOMObserver = class DOMObserver {
    constructor() {
        this.callbacks = new Map();
        this.observer = null;
        // Defensive: Safe access to timing constants with fallback
        const debounceDelay = window.YPP?.CONSTANTS?.TIMINGS?.DEBOUNCE_DEFAULT || 50;
        this.debouncedProcess = this._debounce(
            this._processMutations.bind(this),
            debounceDelay
        );
        this.start();
    }

    start() {
        if (this.observer) return;
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => this.start());
            return;
        }
        this.observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            // Quick check if relevant nodes were added/removed
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) this.debouncedProcess();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    register(id, selector, callback) {
        if (!this.callbacks.has(id)) {
            this.callbacks.set(id, { selector, callback });
            // Immediate check
            const el = document.querySelector(selector);
            if (el) callback(el);
        }
    }

    unregister(id) {
        this.callbacks.delete(id);
    }

    _processMutations() {
        this.callbacks.forEach(({ selector, callback }) => {
            const el = document.querySelector(selector);
            if (el) callback(el);
        });
    }

    _debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};
