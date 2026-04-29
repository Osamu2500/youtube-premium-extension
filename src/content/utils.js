/**
 * Utilities for YouTube Premium Plus
 * Common helper functions and shared classes
 */
window.YPP = window.YPP || {};

// Safely access constants
const CONSTANTS = window.YPP.CONSTANTS || {};

window.YPP.Utils = Object.assign(window.YPP.Utils || {}, {
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
        
        // Filter debug logs unless debug mode is active
        if (level === 'debug' && !window.YPP?.debug?.enabled) return;

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
            window.YPP.Utils?.log(`Invalid selector: ${selector}`, 'UTILS', 'warn');
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
            window.YPP.Utils?.log(`Invalid selector: ${selector}`, 'UTILS', 'warn');
            return [];
        }
    },

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector
     * @param {number} [timeout] - Timeout in ms (default: from CONSTANTS)
     * @param {AbortSignal} [signal] - Optional abort signal to cancel waiting early
     * @returns {Promise<Element|null>}
     */
    waitForElement: (selector, timeout = CONSTANTS.TIMINGS?.ELEMENT_WAIT_DEFAULT || 10000, signal = null) => {
        // Input validation
        if (!selector || typeof selector !== 'string') {
            window.YPP.Utils?.log('Invalid selector provided to waitForElement', 'UTILS', 'warn');
            return Promise.resolve(null);
        }
        
        // Validate timeout
        if (typeof timeout !== 'number' || timeout <= 0 || !isFinite(timeout)) {
            window.YPP.Utils?.log(`Invalid timeout (${timeout}), using default 10000ms`, 'UTILS', 'warn');
            timeout = 10000;
        }

        if (signal?.aborted) return Promise.resolve(null);

        // Try distinct lookup first
        try {
            const existing = document.querySelector(selector);
            if (existing) return Promise.resolve(existing);
        } catch (e) {
            window.YPP.Utils?.log(`Invalid CSS selector: ${selector}`, 'UTILS', 'error');
            return Promise.resolve(null);
        }

        return new Promise((resolve) => {
            let resolved = false;
            let timeoutId = null;
            let observer = null;
            const startUrl = location.href; // Capture URL for early abort

            let rafId = null;

            const cleanup = () => {
                if (observer) {
                    observer.disconnect();
                    observer = null;
                }
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                if (signal) {
                    signal.removeEventListener('abort', handleAbort);
                }
            };

            const handleAbort = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(null);
                }
            };

            if (signal) {
                signal.addEventListener('abort', handleAbort);
            }

            const check = () => {
                rafId = null;
                if (resolved) return;

                // Abort if the user navigates away before element is found
                if (location.href !== startUrl) {
                    resolved = true;
                    cleanup();
                    resolve(null);
                    return;
                }

                try {
                    const el = document.querySelector(selector);
                    if (el) {
                        resolved = true;
                        cleanup();
                        resolve(el);
                        return;
                    }
                } catch (e) {
                    // Ignore selector errors during wait
                }
            };

            const scheduleCheck = () => {
                if (rafId) return;
                rafId = requestAnimationFrame(check);
            };

            observer = new MutationObserver(scheduleCheck);
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
            const startUrl = location.href;
            let observer = null;
            let rafId = null;

            const checkElements = () => {
                // Abort if the user navigates away before elements are found
                if (location.href !== startUrl) {
                    if (observer) observer.disconnect();
                    resolve(results); // Return what we found so far
                    return;
                }
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
                    if (observer) observer.disconnect();
                    resolve(results);
                }
            };

            // Coalesce rapid mutations into one check per animation frame
            // to avoid iterating all selectors on every single DOM mutation.
            const scheduleCheck = () => {
                if (rafId) return;
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    checkElements();
                });
            };

            observer = new MutationObserver(scheduleCheck);
            observer.observe(document.documentElement, { childList: true, subtree: true });

            checkElements();

            setTimeout(() => {
                if (observer) observer.disconnect();
                resolve(results);
            }, timeout);
        });
    },

    /**
     * Poll for a condition to be met (used when MutationObserver is not ideal)
     * @param {Function} conditionFn - Function that returns a truthy value when condition is met
     * @param {number} timeout - Maximum wait time in ms
     * @param {number} interval - Polling interval in ms
     * @param {AbortSignal} [signal] - Optional abort signal to cancel polling early
     * @returns {Promise<any>} Resolves with the truthy value returned by conditionFn
     */
    pollFor: (conditionFn, timeout = 10000, intervalMs = 250, signal = null) => {
        return new Promise((resolve) => {
            if (signal?.aborted) return resolve(null);

            // Initial check
            try {
                const initialResult = conditionFn();
                if (initialResult) return resolve(initialResult);
            } catch (error) {
                // IMPORTANT FIX: Do NOT resolve(null) here. A null reference error is expected 
                // if the DOM is still rendering. Proceed to the polling loop.
                window.YPP.Utils?.log('Initial pollFor missed (expected), proceeding to wait loop...', 'UTILS', 'debug');
            }

            const startTime = Date.now();
            const startUrl = location.href; // Capture URL for early abort
            let lastCheckTime = startTime;
            let rafId = null;
            let resolved = false;

            const cleanup = () => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                if (signal) {
                    signal.removeEventListener('abort', handleAbort);
                }
            };

            const handleAbort = () => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(null);
                }
            };

            if (signal) {
                signal.addEventListener('abort', handleAbort);
            }

            const check = () => {
                if (resolved) return;
                
                const now = Date.now();

                // Throttle the checks to match the requested interval
                if (now - lastCheckTime >= intervalMs) {
                    lastCheckTime = now;
                    try {
                        // Abort if the user navigates away early
                        if (location.href !== startUrl) {
                            resolved = true;
                            cleanup();
                            return resolve(null);
                        }

                        const result = conditionFn();
                        if (result) {
                            resolved = true;
                            cleanup();
                            return resolve(result); // Success
                        } 
                        
                        // Check for timeout
                        if (now - startTime >= timeout) {
                            resolved = true;
                            cleanup();
                            return resolve(null); // Timeout reached cleanly
                        }
                    } catch (error) {
                        // IMPORTANT FIX: Swallow transient errors (like null references during DOM load) 
                        // and allow the loop to try again on the next interval until timeout.
                        window.YPP.Utils?.log('Transient error in pollFor, retrying...', 'UTILS', 'debug');
                    }
                }
                
                // Continue polling aligned with browser frame rate
                rafId = requestAnimationFrame(check);
            };

            rafId = requestAnimationFrame(check);
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
        // Validate function
        if (typeof func !== 'function') {
            window.YPP.Utils?.log('debounce requires a function as first argument', 'UTILS', 'error');
            return () => {}; // Return noop
        }
        
        // Validate wait time
        if (typeof wait !== 'number' || wait < 0 || !isFinite(wait)) {
            window.YPP.Utils?.log(`Invalid wait time for debounce (${wait}), using default`, 'UTILS', 'warn');
            wait = CONSTANTS.TIMINGS?.DEBOUNCE_DEFAULT || 50;
        }
        
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
        // Validate function
        if (typeof func !== 'function') {
            window.YPP.Utils?.log('throttle requires a function as first argument', 'UTILS', 'error');
            return () => {}; // Return noop
        }
        
        // Validate limit
        if (typeof limit !== 'number' || limit < 0 || !isFinite(limit)) {
            window.YPP.Utils?.log(`Invalid limit for throttle (${limit}), using default 100ms`, 'UTILS', 'warn');
            limit = 100;
        }
        
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
            window.YPP.Utils?.log('JSON parse error: ' + error.message, 'UTILS', 'warn');
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
            window.YPP.Utils?.log('JSON stringify error: ' + error.message, 'UTILS', 'warn');
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
                window.YPP.Utils?.log('Chrome storage not available', 'UTILS', 'warn');
                return CONSTANTS.DEFAULT_SETTINGS || {};
            }

            const data = await chrome.storage.local.get('settings');
            const raw = data.settings || {};

            // Run through schema validator if available (settings-schema.js loads before utils)
            if (window.YPP?.SettingsSchema) {
                return window.YPP.SettingsSchema.validateAndMerge(raw);
            }

            // Fallback: merge raw over defaults
            return Object.assign({}, CONSTANTS.DEFAULT_SETTINGS || {}, raw);
        } catch (error) {
            window.YPP.Utils?.log('Error loading settings: ' + error.message, 'UTILS', 'error');
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
                window.YPP.Utils?.log('Chrome storage not available', 'UTILS', 'warn');
                return;
            }
            await chrome.storage.local.set({ settings });
            window.YPP.Utils?.log('Settings saved', 'UTILS', 'debug');
        } catch (error) {
            window.YPP.Utils?.log('Error saving settings: ' + error.message, 'UTILS', 'error');
        }
    },

    /**
     * Retrieve a single value from chrome.storage.local by key.
     * Useful for persisting non-settings preferences (e.g. searchViewMode).
     * @param {string} key - Storage key to retrieve
     * @param {*} [fallback=null] - Value to return if key is not found or storage unavailable
     * @returns {Promise<*>} The stored value, or fallback
     */
    getSetting: async (key, fallback = null) => {
        if (!key || typeof key !== 'string') return fallback;
        try {
            if (!chrome?.storage?.local) return fallback;
            const result = await chrome.storage.local.get([key]);
            return result[key] !== undefined ? result[key] : fallback;
        } catch (error) {
            window.YPP.Utils?.log(`Error reading storage key "${key}": ${error.message}`, 'UTILS', 'warn');
            return fallback;
        }
    },

    // =====================================================================
    // STYLE UTILITIES
    // =====================================================================

    /**
     * Inject CSS styles into the document head efficiently
     * @param {string} css - CSS string to inject
     * @param {string} [id] - Unique ID for the style element
     * @returns {void}
     */
    addStyle: (css, id) => {
        if (!css || typeof css !== 'string') return;
        
        // Generate a fast hash ID if none is provided to avoid duplicating nameless styles
        let styleId = id;
        if (!styleId) {
            let hash = 0;
            for (let i = 0; i < css.length; i++) {
                hash = ((hash << 5) - hash) + css.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
            }
            styleId = 'ypp-style-' + Math.abs(hash).toString(36);
        }
        
        // 1. Check by ID first (O(1) fastest look up)
        if (document.getElementById(styleId)) return;

        try {
            const style = document.createElement('style');
            style.id = styleId;
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
     * @param {string|Element} svgContent - SVG element or SVG markup string
     * @param {Function} onClick - Click handler
     * @returns {HTMLButtonElement}
     */
    addPlayerButton: (className, title, svgContent, onClick) => {
        const btn = document.createElement('button');
        btn.className = `ytp-button ${className || ''}`;
        btn.title = title || '';
        
        // Safely handle SVG content
        if (typeof svgContent === 'string') {
            // Use DOMParser for safe SVG parsing (browsers automatically sanitize)
            try {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                
                // Check for parse errors
                const parseError = svgDoc.querySelector('parsererror');
                if (parseError) {
                    console.warn('[YPP] Invalid SVG in addPlayerButton');
                    btn.textContent = '?';
                } else {
                    const svgElement = svgDoc.documentElement;
                    btn.appendChild(svgElement);
                }
            } catch (error) {
                console.error('[YPP] Error parsing SVG:', error);
                btn.textContent = '?';
            }
        } else if (svgContent instanceof Element) {
            btn.appendChild(svgContent);
        }
        
        if (typeof onClick === 'function') {
            btn.onclick = onClick;
        }
        
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
     * Check if a value is a valid CSS color.
     * Uses CSS.supports() which is native and avoids creating DOM elements.
     * @param {string} value - Color value to check
     * @returns {boolean}
     */
    isValidColor: (value) => {
        if (!value || typeof value !== 'string') return false;
        return CSS.supports('color', value);
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
     * @returns {number} Clamped value or min if inputs are invalid
     */
    clamp: (value, min, max) => {
        // Validate inputs are numbers
        if (typeof value !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            window.YPP.Utils?.log('Invalid inputs to clamp function', 'UTILS', 'warn');
            return (typeof min === 'number' && !isNaN(min) && isFinite(min)) ? min : 0;
        }
        
        // Handle NaN and Infinity
        if (isNaN(min) || !isFinite(min)) min = 0;
        if (isNaN(max) || !isFinite(max)) max = 100;
        if (isNaN(value) || !isFinite(value)) {
           return min;
        }
        
        // Ensure min <= max
        if (min > max) {
            [min, max] = [max, min]; // Swap if needed
        }
        
        return Math.min(Math.max(value, min), max);
    }
});

// Alias for convenience
const Utils = window.YPP.Utils;

// =====================================================================
// DEBUG MODE TOGGLE
// =====================================================================

/**
 * Debug mode controller.
 * Toggle from the browser console: YPP.debug.toggle()
 * State persists across page loads via localStorage.
 */
window.YPP.debug = {
    /** @type {boolean} Whether debug logging is currently enabled */
    enabled: localStorage.getItem('ypp-debug') === 'true',

    /**
     * Toggle debug mode on/off and persist the state.
     * @returns {boolean} New enabled state
     */
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('ypp-debug', String(this.enabled));
        const state = this.enabled ? 'ON 🟢' : 'OFF 🔴';
        console.log(`%c[YPP:DEBUG] Debug mode ${state} — reload to see full logs`, 'color:#3ea6ff;font-weight:bold;');
        return this.enabled;
    },

    /**
     * Print a summary of all loaded features and their error counts.
     * Useful for diagnosing which features are active.
     */
    status() {
        const fm = window.YPP?.featureManager;
        if (!fm) { console.warn('[YPP:DEBUG] FeatureManager not initialized yet.'); return; }
        console.group('%c[YPP:DEBUG] Feature Status', 'color:#3ea6ff;font-weight:bold;');
        for (const [name, instance] of Object.entries(fm.features)) {
            const errors = fm.errorCounts[name] ?? 0;
            const active = instance.isActive ?? '?';
            console.log(`%c${name}%c  active=${active}  errors=${errors}`, 'font-weight:bold', 'color:#aaa');
        }
        console.groupEnd();
    }
};

// =====================================================================
// SAFE EXECUTE — top-level one-shot async error wrapper
// =====================================================================

/**
 * Safely execute an async function outside the FeatureManager context.
 * Catches all errors, logs them with context, and returns null on failure.
 * Use this for one-off async operations (e.g. in event handlers).
 *
 * @param {Function} fn - Async function to execute
 * @param {string} [context='UNKNOWN'] - Label for log messages
 * @returns {Promise<any>} Result, or null if an error was thrown
 *
 * @example
 * const result = await YPP.safeExecute(() => fetchData(), 'DataAPI');
 */
window.YPP.safeExecute = async (fn, context = 'UNKNOWN') => {
    try {
        return await fn();
    } catch (error) {
        window.YPP.Utils?.log(`safeExecute error in [${context}]: ${error.message}`, 'UTILS', 'error');
        console.error(`[YPP:${context}]`, error);
        return null;
    }
};

// Legacy EventBus and DOMObserver have been migrated to src/content/core/

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
        return window.YPP.Utils.retry(fn, retries - 1, delay * 2); // Exponential backoff
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

// =====================================================================
// UI ADAPTATION UTILITIES
// =====================================================================

/**
 * Tracks the actual dimensions of the video stream and sets CSS variables
 * to allow the UI to adapt perfectly to the video\'s literal boundaries.
 */
window.YPP.Utils.VideoSizeTracker = {
    _observer: null,
    _videoEl: null,
    _playerNode: null,
    _isActive: false,
    _rafId: null,
    
    init() {
        if (this._isActive) return;
        this.startTracking();
    },

    startTracking() {
        this._isActive = true;
        this._videoEl = document.querySelector('video.video-stream.html5-main-video');
        this._playerNode = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        
        if (!this._videoEl || !this._playerNode) {
            // Wait for it if it isn't ready
            setTimeout(() => { if (this._isActive) this.startTracking(); }, 500);
            return;
        }

        // Apply immediately
        this._updateVars();
        
        // Track resize via ResizeObserver and attribute MutationObserver 
        // to catch style injections by YouTube
        if (window.ResizeObserver) {
            this._observer = new ResizeObserver(() => this._scheduleUpdate());
            this._observer.observe(this._videoEl);
            this._observer.observe(this._playerNode);
        } else {
            this._observer = new MutationObserver(() => this._scheduleUpdate());
            this._observer.observe(this._videoEl, { attributes: true, attributeFilter: ['style', 'class'] });
        }
        
        // Polling fallback to catch inline style jumps
        this._pollInterval = setInterval(() => this._scheduleUpdate(), 2000);
        
        // Also listen to window resize
        window.addEventListener('resize', this._boundScheduleUpdate = this._scheduleUpdate.bind(this));
    },

    _scheduleUpdate() {
        if (this._rafId) return;
        this._rafId = requestAnimationFrame(() => {
            this._updateVars();
            this._rafId = null;
        });
    },

    _updateVars() {
        if (!this._videoEl || !this._playerNode) return;
        
        // Read actual dimensions & offsets
        const videoRect = this._videoEl.getBoundingClientRect();
        const playerRect = this._playerNode.getBoundingClientRect();
        
        // Calculate the relative left offset inside the player container
        const relativeLeft = Math.max(0, videoRect.left - playerRect.left);
        const width = videoRect.width;
        
        // Don't apply if values are 0 (e.g. video hidden)
        if (width <= 0) return;
        
        // Set variables on player node to be consumed by styles.css
        this._playerNode.style.setProperty('--ypp-video-width', `${width}px`);
        this._playerNode.style.setProperty('--ypp-video-left', `${relativeLeft}px`);
    },

    stop() {
        this._isActive = false;
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null; // Prevent double-clear on repeated stop() calls
        }
        if (this._boundScheduleUpdate) {
            window.removeEventListener('resize', this._boundScheduleUpdate);
            this._boundScheduleUpdate = null;
        }
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        // Release element references to aid garbage collection
        this._videoEl = null;
        this._playerNode = null;
    }
};
