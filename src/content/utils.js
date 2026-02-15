/**
 * Utilities for YouTube Premium Plus
 * Common helper functions and shared classes
 */
window.YPP = window.YPP || {};

// Safely access constants
const CONSTANTS = window.YPP.CONSTANTS || {};

window.YPP.Utils = Object.assign(window.YPP.Utils || {}, {
    // =====================================================================
    // LOGGING
    // =====================================================================

    /**
     * Standardized Logger
     * @param {string} msg - Message to log
     * @param {string} type - Feature context (e.g., 'SIDEBAR')
     * @param {string} level - 'info', 'warn', 'error', or 'debug'
     */
    log: (msg, type = 'MAIN', level = 'info') => {
        const prefix = `%c[YPP:${type}]`;
        const styles = {
            info: 'color: #3ea6ff; font-weight: bold;',
            warn: 'color: #ff9800; font-weight: bold;',
            error: 'color: #f44336; font-weight: bold;',
            debug: 'color: #9e9e9e; font-weight: bold;'
        };
        const style = styles[level] || styles.info;
        const consoleMethod = console[level] || console.log;
        
        // Filter debug logs in production if needed
        if (level === 'debug' && !window.YPP_DEBUG) return;

        consoleMethod(prefix, style, msg);
    },

    /**
     * Start a performance measurement
     * @param {string} label - Unique label for the measurement
     */
    startPerf: (label) => {
        if (!label) return;
        performance.mark(`ypp-start-${label}`);
    },

    /**
     * End a performance measurement and log the duration
     * @param {string} label - Unique label for the measurement
     * @param {string} [context] - Context for logging
     */
    endPerf: (label, context = 'PERF') => {
        if (!label) return;
        const startMark = `ypp-start-${label}`;
        const endMark = `ypp-end-${label}`;
        
        try {
            performance.mark(endMark);
            const measure = performance.measure(label, startMark, endMark);
            
            // Only log if it took significant time (> 10ms)
            if (measure.duration > 10) {
                window.YPP.Utils.log(`${label} took ${measure.duration.toFixed(2)}ms`, context, 'debug');
            }
            
            // Cleanup
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(label);
        } catch (e) {
            // Ignore performance measurement errors
        }
    },

    // =====================================================================
    // PAGE DETECTION
    // =====================================================================

    /**
     * Check if current page is watch page
     * @returns {boolean}
     */
    isWatchPage: () => window.location.pathname === '/watch',

    /**
     * Check if current page is search results
     * @returns {boolean}
     */
    isSearchPage: () => window.location.pathname === '/results',

    /**
     * Check if current page is home
     * @returns {boolean}
     */
    isHome: () => {
        const path = window.location.pathname;
        return path === '/' || path === '/index' || path === '/feed/subscriptions';
    },

    /**
     * Check if current page is Shorts
     * @returns {boolean}
     */
    isShortsPage: () => window.location.pathname.startsWith('/shorts/'),

    /**
     * Check if current page is a channel
     * @returns {boolean}
     */
    isChannelPage: () => {
        const path = window.location.pathname;
        return path.startsWith('/@') || path.startsWith('/channel') || path.startsWith('/c/');
    },

    // =====================================================================
    // DOM UTILITIES
    // =====================================================================

    /**
     * Safely query a single element
     * @param {string} selector 
     * @param {Element} [parent=document] 
     * @returns {Element|null}
     */
    safeQuerySelector: (selector, parent = document) => {
        if (!selector || typeof selector !== 'string') return null;
        try {
            return parent.querySelector(selector);
        } catch (e) {
            Utils?.log(`Invalid selector: ${selector}`, 'UTILS', 'warn');
            return null;
        }
    },

    /**
     * Safely query multiple elements
     * @param {string} selector 
     * @param {Element} [parent=document] 
     * @returns {NodeList|Array}
     */
    safeQuerySelectorAll: (selector, parent = document) => {
        if (!selector || typeof selector !== 'string') return [];
        try {
            return parent.querySelectorAll(selector);
        } catch (e) {
            Utils?.log(`Invalid selector: ${selector}`, 'UTILS', 'warn');
            return [];
        }
    },

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {number} [timeout] - Timeout in ms (default: from CONSTANTS)
     * @returns {Promise<Element|null>}
     */
    waitForElement: (selector, timeout = CONSTANTS.TIMINGS?.ELEMENT_WAIT_DEFAULT || 10000) => {
        if (!selector || typeof selector !== 'string') {
            Utils?.log('Invalid selector provided to waitForElement', 'UTILS', 'warn');
            return Promise.resolve(null);
        }

        // Try distinct lookup first
        try {
            const existing = document.querySelector(selector);
            if (existing) return Promise.resolve(existing);
        } catch (e) {
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            let resolved = false;
            let timeoutId = null;
            let observer = null;

            const cleanup = () => {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            };

            const check = () => {
                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        resolved = true;
                        cleanup();
                        resolve(el);
                        return true;
                    }
                } catch (e) {
                    // Ignore selector errors during wait
                }
                return false;
            };

            observer = new MutationObserver(check);
            observer.observe(document.documentElement, { childList: true, subtree: true });

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        cleanup();
                        resolve(null);
                    }
                }, timeout);
            }
        });
    },

    /**
     * Wait for multiple elements to appear
     * @param {string[]} selectors - Array of CSS selectors
     * @param {number} [timeout] - Timeout in ms
     * @returns {Promise<Map<string, Element>>}
     */
    waitForElements: (selectors, timeout = 10000) => {
        const results = new Map();
        let remaining = selectors.length;

        if (remaining === 0) {
            return Promise.resolve(results);
        }

        return new Promise((resolve) => {
            const checkElements = () => {
                selectors.forEach(sel => {
                    if (!results.has(sel)) {
                        const el = document.querySelector(sel);
                        if (el) {
                            results.set(sel, el);
                            remaining--;
                        }
                    }
                });

                if (remaining === 0) {
                    resolve(results);
                }
            };

            const observer = new MutationObserver(checkElements);
            observer.observe(document.documentElement, { childList: true, subtree: true });

            checkElements();

            setTimeout(() => {
                observer.disconnect();
                resolve(results);
            }, timeout);
        });
    },

    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} [attrs] - Element attributes
     * @param {Array|Element|string} [children] - Child elements or text
     * @returns {Element|null}
     */
    createElement: (tag, attrs = {}, children = []) => {
        if (!tag || typeof tag !== 'string') {
            console.error('[YPP:Utils] createElement: invalid tag name');
            return null;
        }

        try {
            const el = document.createElement(tag);

            // Handle attributes
            if (attrs && typeof attrs === 'object') {
                Object.entries(attrs).forEach(([key, value]) => {
                    if (key === 'className') {
                        el.className = value;
                    } else if (key === 'style' && typeof value === 'object') {
                        Object.assign(el.style, value);
                    } else if (key.startsWith('on') && typeof value === 'function') {
                        el.addEventListener(key.substring(2).toLowerCase(), value);
                    } else if (key === 'dataset' && typeof value === 'object') {
                        Object.entries(value).forEach(([dataKey, dataValue]) => {
                            el.dataset[dataKey] = dataValue;
                        });
                    } else {
                        el.setAttribute(key, value);
                    }
                });
            }

            // Handle children
            const childArray = Array.isArray(children) ? children : [children];
            childArray.forEach(child => {
                if (!child) return;
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Element) {
                    el.appendChild(child);
                }
            });

            return el;
        } catch (error) {
            console.error('[YPP:Utils] createElement error:', error);
            return null;
        }
    },

    /**
     * Create an SVG element safely
     * @param {string} viewBox - SVG viewbox
     * @param {string} pathData - SVG path data (d attribute)
     * @param {string} [className] - CSS class
     * @returns {SVGElement}
     */
    createSVG: (viewBox, pathData, className = '') => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', viewBox);
        if (className) svg.setAttribute('class', className);
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'currentColor');
        
        svg.appendChild(path);
        return svg;
    },

    // =====================================================================
    // EVENT UTILITIES
    // =====================================================================

    /**
     * Create a debounced version of a function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function}
     */
    debounce: (func, wait = CONSTANTS.TIMINGS?.DEBOUNCE_DEFAULT || 50) => {
        let timeoutId = null;
        return function (...args) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    },

    /**
     * Create a throttled version of a function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function}
     */
    throttle: (func, limit = 100) => {
        let inThrottle = false;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    },

    /**
     * Create a throttled version with leading and trailing options
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function}
     */
    throttleLeadingTrailing: (func, limit = 100) => {
        let lastFunc = null;
        let lastRan = 0;
        return function (...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if (Date.now() - lastRan >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    },

    // =====================================================================
    // NOTIFICATIONS
    // =====================================================================

    /**
     * Create a toast notification
     * @param {string} msg - Message to display
     * @param {string} [type] - 'info', 'success', 'error', or 'warning'
     * @returns {void}
     */
    createToast: (msg, type = 'info') => {
        if (!msg || typeof msg !== 'string') return;

        try {
            const toast = document.createElement('div');
            toast.className = `ypp-toast ypp-toast-${type}`;
            toast.textContent = msg;
            document.body.appendChild(toast);

            // Force reflow
            void toast.offsetWidth;

            const displayTime = CONSTANTS.TIMINGS?.TOAST_DISPLAY || 3000;
            const fadeTime = CONSTANTS.TIMINGS?.TOAST_FADE || 300;

            requestAnimationFrame(() => {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), fadeTime);
                }, displayTime);
            });
        } catch (error) {
            console.error('[YPP:Utils] Error creating toast:', error);
        }
    },

    // =====================================================================
    // STORAGE UTILITIES
    // =====================================================================

    /**
     * Safe JSON parse with fallback
     * @param {string} jsonString - JSON string to parse
     * @param {*} [fallback] - Fallback value if parsing fails
     * @returns {*}
     */
    safeJsonParse: (jsonString, fallback = null) => {
        if (!jsonString || typeof jsonString !== 'string') {
            return fallback;
        }

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            Utils?.log('JSON parse error: ' + error.message, 'UTILS', 'warn');
            return fallback;
        }
    },

    /**
     * Safe JSON stringify with fallback
     * @param {*} obj - Object to stringify
     * @param {string} [fallback] - Fallback string if stringify fails
     * @returns {string}
     */
    safeJsonStringify: (obj, fallback = '{}') => {
        try {
            return JSON.stringify(obj);
        } catch (error) {
            Utils?.log('JSON stringify error: ' + error.message, 'UTILS', 'warn');
            return fallback;
        }
    },

    /**
     * Load settings from Chrome storage with default fallback
     * @returns {Promise<Object>}
     */
    loadSettings: async () => {
        try {
            if (!chrome?.storage?.local) {
                Utils?.log('Chrome storage not available', 'UTILS', 'warn');
                return CONSTANTS.DEFAULT_SETTINGS || {};
            }

            const data = await chrome.storage.local.get('settings');
            return data.settings || CONSTANTS.DEFAULT_SETTINGS || {};
        } catch (error) {
            Utils?.log('Error loading settings: ' + error.message, 'UTILS', 'error');
            return CONSTANTS.DEFAULT_SETTINGS || {};
        }
    },

    /**
     * Save settings to Chrome storage
     * @param {Object} settings - Settings object to save
     * @returns {Promise<void>}
     */
    saveSettings: async (settings) => {
        try {
            if (!chrome?.storage?.local) {
                Utils?.log('Chrome storage not available', 'UTILS', 'warn');
                return;
            }
            await chrome.storage.local.set({ settings });
            Utils?.log('Settings saved', 'UTILS', 'debug');
        } catch (error) {
            Utils?.log('Error saving settings: ' + error.message, 'UTILS', 'error');
        }
    },

    // =====================================================================
    // STYLE UTILITIES
    // =====================================================================

    /**
     * Inject CSS styles into the document head
     * @param {string} css - CSS string to inject
     * @param {string} [id] - Unique ID for the style element
     * @returns {void}
     */
    addStyle: (css, id = 'ypp-custom-style') => {
        if (!css || typeof css !== 'string') return;
        if (document.getElementById(id)) return;

        try {
            const style = document.createElement('style');
            style.id = id;
            style.textContent = css;
            (document.head || document.documentElement).appendChild(style);
        } catch (error) {
            console.error('[YPP:Utils] Error adding style:', error);
        }
    },

    /**
     * Remove a dynamic style element
     * @param {string} id - ID of the style element to remove
     * @returns {void}
     */
    removeStyle: (id) => {
        if (!id) return;
        const style = document.getElementById(id);
        if (style) style.remove();
    },

    /**
     * Inject a CSS file from the extension package
     * @param {string} path - Relative path to the CSS file
     * @param {string} [id] - Optional ID for the link element
     * @returns {void}
     */
    injectCSS: (path, id) => {
        if (!path) return;
        const fullUrl = chrome.runtime.getURL(path);
        // Check if already injected
        if (document.querySelector(`link[href="${fullUrl}"]`)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fullUrl;
        if (id) link.id = id;
        document.head.appendChild(link);
    },

    /**
     * Add CSS variable to document root
     * @param {string} name - Variable name (without --)
     * @param {string} value - Variable value
     */
    addCssVariable: (name, value) => {
        if (!name || !value) return;
        document.documentElement.style.setProperty(`--${name}`, value);
    },

    /**
     * Remove CSS variable from document root
     * @param {string} name - Variable name (without --)
     */
    removeCssVariable: (name) => {
        if (!name) return;
        document.documentElement.style.removeProperty(`--${name}`);
    },

    // =====================================================================
    // PLAYER UTILITIES
    // =====================================================================

    /**
     * Create a standard player control button
     * @param {string} className - Extra CSS classes
     * @param {string} title - Tooltip title
     * @param {string} svgContent - Inner SVG HTML (WARNING: Trusted content only, uses innerHTML)
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    /**
     * Create a standard player control button
     * @param {string} className - Extra CSS classes
     * @param {string} title - Tooltip title
     * @param {string} svgContent - Inner SVG HTML (WARNING: Trusted content only, uses innerHTML)
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    addPlayerButton: (className, title, svgContent, onClick) => {
        const btn = document.createElement('button');
        btn.className = `ytp-button ${className || ''}`;
        btn.title = title || '';
        
        // Safety: standardized SVG injection
        if (typeof svgContent === 'string') {
            // Basic sanitation to check for XSS vectors in string
            if (svgContent.toLowerCase().includes('javascript:') || svgContent.toLowerCase().includes('onclick')) {
                console.warn('[YPP] Blocked potential XSS in addPlayerButton');
                btn.textContent = 'ERROR';
            } else {
                 btn.innerHTML = svgContent;
            }
        } else if (svgContent instanceof Element) {
            btn.appendChild(svgContent);
        }
        
        btn.onclick = onClick;
        return btn;
    },

    /**
     * Get the current video element
     * @returns {HTMLVideoElement|null}
     */
    getVideo: () => {
        return document.querySelector(CONSTANTS.SELECTORS?.VIDEO || 'video');
    },

    /**
     * Get the video player container
     * @returns {Element|null}
     */
    getPlayer: () => {
        return document.querySelector(CONSTANTS.SELECTORS?.PLAYER || '.html5-video-player') ||
               document.querySelector(CONSTANTS.SELECTORS?.WATCH_FLEXY || 'ytd-watch-flexy');
    },

    // =====================================================================
    // VALIDATION UTILITIES
    // =====================================================================

    /**
     * Check if a value is a valid number within a range
     * @param {*} value - Value to check
     * @param {number} [min] - Minimum value
     * @param {number} [max] - Maximum value
     * @returns {boolean}
     */
    isValidNumber: (value, min = null, max = null) => {
        let num = Number(value);
        if (isNaN(num)) return false;
        
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    },

    /**
     * Check if a value is a valid CSS color
     * @param {string} value - Color value to check
     * @returns {boolean}
     */
    isValidColor: (value) => {
        if (!value || typeof value !== 'string') return false;
        const testDiv = document.createElement('div');
        testDiv.style.color = value;
        return testDiv.style.color !== '';
    },

    /**
     * Escapes HTML characters to prevent XSS.
     * Note: This strictly escapes content, it does not preserve safe HTML tags.
     * @param {string} str - String to escape
     * @returns {string} Escaped HTML string
     */
    sanitizeHtml: (str) => {
        if (!str || typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Clamp a number between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number}
     */
    clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    }
});

// Alias for convenience
const Utils = window.YPP.Utils;

// =====================================================================
// EVENT BUS
// =====================================================================

/**
 * Simple Event Bus for decoupled communication
 * @class
 */
window.YPP.Utils.EventBus = class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!event || typeof callback !== 'function') return;
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} [callback] - Specific callback to remove (optional)
     */
    off(event, callback) {
        if (!event) return;
        if (!callback) {
            this.listeners.delete(event);
            return;
        }
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} [data] - Event data
     */
    emit(event, data = null) {
        if (!event) return;
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`[EventBus] Error in listener for '${event}':`, error);
                }
            });
        }
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }

    /**
     * Remove all listeners
     */
    clear() {
        this.listeners.clear();
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    listenerCount(event) {
        const callbacks = this.listeners.get(event);
        return callbacks ? callbacks.size : 0;
    }
};

// Singleton Event Bus instance
window.YPP.events = new window.YPP.Utils.EventBus();

// =====================================================================
// DOM OBSERVER
// =====================================================================

/**
 * Efficient DOM Observer with batching
 * @class
 */
window.YPP.Utils.DOMObserver = class DOMObserver {
    constructor() {
        this.callbacks = new Map();
        this.observer = null;
        this.debouncedProcess = null;
        this.isRunning = false;
    }

    /**
     * Initialize the observer
     * @private
     */
    _init() {
        if (this.observer) return;

        const debounceDelay = CONSTANTS.TIMINGS?.DEBOUNCE_DEFAULT || 50;

        this.debouncedProcess = this._debounce(() => {
            this._processMutations();
        }, debounceDelay);

        this.observer = new MutationObserver((mutations) => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    shouldProcess = true;
                    break;
                }
            }
            if (shouldProcess) {
                this.debouncedProcess();
            }
        });
    }

    /**
     * Start observing
     */
    start() {
        if (this.isRunning || this.observer) return;
        this.isRunning = true;

        this._init();

        if (!document.body) {
            window.addEventListener('DOMContentLoaded', () => this.start());
            return;
        }

        try {
            this.observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) {
            console.error('[DOMObserver] Failed to start:', e);
            this.isRunning = false;
        }
    }

    /**
     * Stop observing
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.isRunning = false;
    }

    /**
     * Register a callback for a selector
     * @param {string} id - Unique identifier
     * @param {string} selector - CSS selector to watch
     * @param {Function} callback - Callback function
     * @param {boolean} [immediate=true] - Trigger immediately if element exists
     */
    register(id, selector, callback, immediate = true) {
        if (!id || !selector || typeof callback !== 'function') return;

        this.callbacks.set(id, { selector, callback });

        if (immediate) {
            const el = document.querySelector(selector);
            if (el) {
                try {
                    callback(el);
                } catch (error) {
                    console.error(`[DOMObserver] Error in callback for '${id}':`, error);
                }
            }
        }
    }

    /**
     * Unregister a callback
     * @param {string} id - Unique identifier
     */
    unregister(id) {
        this.callbacks.delete(id);
    }

    /**
     * Process mutations
     * @private
     */
    _processMutations() {
        this.callbacks.forEach(({ selector, callback }) => {
            const el = document.querySelector(selector);
            if (el) {
                try {
                    callback(el);
                } catch (error) {
                    console.error(`[DOMObserver] Error in callback:`, error);
                }
            }
        });
    }

    /**
     * Debounce implementation
     * @private
     */
    _debounce(func, wait) {
        let timeoutId = null;
        return function (...args) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    /**
     * Get registered callbacks
     * @returns {Map}
     */
    getCallbacks() {
        return new Map(this.callbacks);
    }
};

// =====================================================================
// PROMISE UTILITIES
// =====================================================================

/**
 * Create a timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise<void>}
 */
window.YPP.Utils.timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a retry helper
 * @param {Function} fn - Async function to retry
 * @param {number} [retries=3] - Number of retries
 * @param {number} [delay=1000] - Delay between retries
 * @returns {Promise}
 */
window.YPP.Utils.retry = async (fn, retries = 3, delay = 1000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0) throw error;
        await Utils.timeout(delay);
        return Utils.retry(fn, retries - 1, delay * 2); // Exponential backoff
    }
};

/**
 * Run multiple promises with concurrency limit
 * @param {Function[]} tasks - Array of async functions
 * @param {number} [concurrency=5] - Max concurrent tasks
 * @returns {Promise<Array>}
 */
window.YPP.Utils.parallel = async (tasks, concurrency = 5) => {
    const results = [];
    const executing = new Set();

    for (const task of tasks) {
        const promise = Promise.resolve().then(() => task());
        results.push(promise);
        executing.add(promise);
        promise.finally(() => executing.delete(promise));

        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }

    return Promise.all(results);
};
