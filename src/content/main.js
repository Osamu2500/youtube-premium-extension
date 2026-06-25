/**
 * YouTube Premium Plus - Main Entry Point
 * Bootstraps the application, loads settings, and handles navigation events
 */
(function () {
    'use strict';

    // ── YouTube-only guard ────────────────────────────────────────────────────
    // Defence-in-depth: bail immediately if this script somehow runs outside
    // www.youtube.com (e.g. manifest misconfiguration in the future).
    if (window.location.hostname !== 'www.youtube.com') return;

    // =========================================================================
    // BOOTSTRAP
    // =========================================================================

    /**
     * Main Entry Point - YouTube Premium Plus Extension
     * @description Initializes the feature manager and coordinates all extension features
     */
    window.YPP = window.YPP || {};

    // Default settings getter (before CONSTANTS may be loaded)
    window.YPP.getDefaultSettings = window.YPP.getDefaultSettings || function () {
        return window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
    };

    // Helper for safe logging before Utils is fully loaded
    const safeLog = (msg, level = 'warn') => {
        console[level]?.(`[YPP:MAIN] ${msg}`);
    };

    const YPPMainApp = {
        // =========================================================================
        // STATE
        // =========================================================================
        /** @type {Object} Shortcuts to Utils */
        get Utils() { return window.YPP.Utils; },

        /** @type {window.YPP.FeatureManager|null} */
        featureManager: null,
        /** @type {Object} User settings */
        settings: {},
        /** @type {Object} Current page context */
        context: {},
        /** @type {boolean} Initialization state */
        isInitialized: false,
        /** @type {boolean} Bootstrap lock */
        bootstrapLock: false,
        /** @type {Array} Event listeners for cleanup */
        eventListeners: [],
        /** @type {number} Maximum retry attempts */
        MAX_RETRY_ATTEMPTS: 3,
        /** @type {number} Retry delay in ms */
        RETRY_DELAY: 500,
        /** @type {number} Initialization timeout */
        INIT_TIMEOUT: 30000,

        // =========================================================================
        // INITIALIZATION
        // =========================================================================

        /**
         * Initialize the extension
         * @async
         */
        async start() {
            // Prevent multiple initialization attempts
            if (this.bootstrapLock) {
                this.Utils?.log('Bootstrap already in progress', 'MAIN', 'warn');
                return;
            }

            if (this.isInitialized) {
                this.Utils?.log('App already initialized', 'MAIN', 'warn');
                return;
            }

            this.bootstrapLock = true;

            try {
                const startTime = performance.now();
                this.Utils?.log('Starting App...', 'MAIN');

                // Wait for core dependencies before proceeding
                await this.waitForDependencies();
                
                // Initialize Shared Stores
                try {
                    if (window.YPP.WatchedStore && typeof window.YPP.WatchedStore.load === 'function') {
                        await window.YPP.WatchedStore.load();
                    }
                } catch (e) {
                    this.Utils?.log('Failed to load WatchedStore', 'MAIN', 'warn');
                }
                
                // Load settings and initialize features
                await this.loadSettings();
                this.initFeatureManager();
                
                // Initial feature application BEFORE page managers
                if (this.featureManager) {
                    this.featureManager.init(this.settings);
                }

                // Initialize Page Managers
                if (window.YPP.managers) {
                    this.pageManagers = [
                        new window.YPP.managers.GlobalLayoutManager(this.Utils, this.settings),
                        new window.YPP.managers.HomePageManager(this.Utils, this.settings),
                        new window.YPP.managers.SubscriptionsPageManager(this.Utils, this.settings),
                        new window.YPP.managers.SearchPageManager(this.Utils, this.settings),
                        new window.YPP.managers.WatchPageManager(this.Utils, this.settings)
                    ];
                    
                    if (window.YPP.managers.ThumbnailColorManager) {
                        this.thumbnailColorManager = new window.YPP.managers.ThumbnailColorManager();
                        this.thumbnailColorManager.updateSettings(this.settings);
                    }
                } else {
                    this.pageManagers = [];
                }

                this.updateContext();
                this.setupEvents();

                // Mark as initialized
                this.isInitialized = true;
                this.bootstrapLock = false;

                const loadTime = (performance.now() - startTime).toFixed(2);
                console.log('%c[YPP] YouTube Premium Plus Global Initialized!', 'color: #a78bfa; font-weight: bold; font-size: 12px;');
                this.Utils?.log(`Extension Initialized Successfully in ${loadTime}ms`, 'MAIN');

                // Visual feedback
                this.showReadyToast();
                document.documentElement.classList.add('ypp-loaded');

            } catch (error) {
                this.bootstrapLock = false;
                this.handleCriticalError(error);
            }
        },

        /**
         * Wait for core dependencies to load
         * @private
         * @async
         */
        async waitForDependencies() {
            const timeout = this.INIT_TIMEOUT;

            // Wait for Utils
            if (!window.YPP?.Utils) {
                safeLog('Waiting for Utils...', 'debug');
                await this.waitFor(() => window.YPP?.Utils !== undefined, timeout);
            }

            // Wait for CONSTANTS
            if (!window.YPP?.CONSTANTS) {
                safeLog('Waiting for CONSTANTS...', 'debug');
                await this.waitFor(() => window.YPP?.CONSTANTS !== undefined, timeout);
            }

            // Check if Utils and CONSTANTS are available after wait
            if (!window.YPP?.Utils || !window.YPP?.CONSTANTS) {
                throw new Error('Core utilities or CONSTANTS not loaded after timeout');
            }
        },

        /**
         * Wait for a condition to be true.
         * Uses requestAnimationFrame for zero-overhead polling instead of
         * attaching a heavy MutationObserver to the entire document subtree.
         * @private
         * @param {Function} condition - Function that returns true when condition is met
         * @param {number} timeout - Maximum wait time in ms
         * @returns {Promise<boolean>}
         */
        waitFor(condition, timeout = 10000) {
            return new Promise((resolve) => {
                if (condition()) {
                    resolve(true);
                    return;
                }

                let startTime = performance.now();
                let delay = 16;
                let timerId = null;

                const check = () => {
                    if (condition()) {
                        resolve(true);
                        return;
                    }

                    if (performance.now() - startTime > timeout) {
                        resolve(false);
                        return;
                    }

                    delay = Math.min(delay * 1.5, 500); // Exponential backoff max 500ms
                    timerId = setTimeout(check, delay);
                };

                timerId = setTimeout(check, delay);
            });
        },

        /**
         * Initialize the feature manager
         * @private
         */
        initFeatureManager() {
            // Check for FeatureManager
            if (!window.YPP?.FeatureManager) {
                this.Utils?.log('FeatureManager class not found on window.YPP', 'MAIN', 'error');
                throw new Error('FeatureManager class not found');
            }

            // Initialize and start the global shared DOMObserver
            // NOTE: The class lives at window.YPP.core.DOMObserver, not window.YPP.Utils.DOMObserver
            window.YPP.sharedObserver = window.YPP.sharedObserver || new window.YPP.core.DOMObserver();
            window.YPP.sharedObserver.start();

            this.featureManager = new window.YPP.FeatureManager();
            window.YPP.featureManager = this.featureManager;

            if (!this.featureManager || typeof this.featureManager.init !== 'function') {
                throw new Error('FeatureManager initialization failed');
            }
        },

        // =========================================================================
        // SETTINGS
        // =========================================================================

        /**
         * Load settings from Chrome storage with retry logic
         * @private
         * @async
         * @param {number} attempt - Current attempt number
         */
        async loadSettings(attempt = 1) {
            try {
                // Critical: Check if extension context is valid
                if (!chrome.runtime?.id) {
                     throw new Error('Extension context invalidated');
                }

                // Use centralized settings loader from Utils
                this.settings = { ...this.settings, ...(await this.Utils.loadSettings()) };
                this.Utils?.log(`Settings Loaded (attempt ${attempt})`, 'MAIN', 'debug');

            } catch (error) {
                this.Utils?.log(`Error loading settings (attempt ${attempt}): ${error.message}`, 'MAIN', 'error');

                if (error.message.includes('context invalidated')) {
                    // Abort immediately if context is dead
                    return;
                }

                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    // Wait and retry
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                    return this.loadSettings(attempt + 1);
                }

                // Fallback to defaults
                this.Utils?.log('Using default settings after retry failure', 'MAIN', 'warn');
                this.settings = { ...this.settings, ...window.YPP.getDefaultSettings() };
            }
        },

        /**
         * Save settings to Chrome storage
         * @async
         * @param {Object} newSettings - Settings to save
         */
        async saveSettings(newSettings) {
            this.settings = { ...this.settings, ...newSettings };
            try {
                if (chrome.runtime?.id) {
                    await chrome.runtime.sendMessage({
                        action: 'UPDATE_SETTINGS_DELTA',
                        delta: newSettings
                    });
                    this.Utils?.log('Settings delta sent to Service Worker', 'MAIN', 'debug');
                } else {
                    throw new Error('No chrome runtime context');
                }
            } catch (error) {
                this.Utils?.log(`Error communicating with Service Worker: ${error.message}. Falling back to local storage.`, 'MAIN', 'warn');
                await chrome.storage.local.set({ settings: this.settings });
            }
        },

        // =========================================================================
        // EVENT HANDLING
        // =========================================================================

        /**
         * Set up global event listeners for SPA navigation and settings changes
         * @private
         */
        setupEvents() {
            // Clean up existing listeners first
            this.removeEventListeners();
            
            // Track Chrome API listeners separately
            this._chromeListeners = [];

            const NAV_DEBOUNCE_MS = 50;
            const handleNavigation = () => {
                if (this._navTimeout) clearTimeout(this._navTimeout);
                this._navTimeout = setTimeout(() => {
                    this._navTimeout = null;

                    this.Utils?.log('Navigation detected', 'MAIN', 'debug');
                    this.updateContext();

                    if (window.YPP.events) {
                        const url = window.location.href;
                        window.YPP.events.emit('app:pageChange', url);

                        if (window.location.pathname.startsWith('/watch')) {
                            const urlParams = new URLSearchParams(window.location.search);
                            const videoId = urlParams.get('v');
                            if (videoId) {
                                window.YPP.events.emit('app:videoChange', videoId);
                                if (window.YPP.Utils && window.YPP.Utils.VideoSizeTracker) {
                                    window.YPP.Utils.VideoSizeTracker.init();
                                }
                            }
                        } else {
                            if (window.YPP.Utils && window.YPP.Utils.VideoSizeTracker) {
                                window.YPP.Utils.VideoSizeTracker.stop();
                            }
                        }
                    }

                    if (this.featureManager) {
                        try {
                            this.featureManager.init(this.settings);
                        } catch (error) {
                            this.Utils?.log(`Error initializing features on navigation: ${error.message}`, 'MAIN', 'error');
                        }
                    }
                }, NAV_DEBOUNCE_MS);
            };

            // Listen for page navigation and track listener
            window.addEventListener('yt-navigate-finish', handleNavigation);
            this.eventListeners.push({ target: window, event: 'yt-navigate-finish', handler: handleNavigation });

            // Also listen for yt-page-data-updated for some YouTube versions
            window.addEventListener('yt-page-data-updated', handleNavigation);
            this.eventListeners.push({ target: window, event: 'yt-page-data-updated', handler: handleNavigation });

            // Listen for settings changes from popup
            if (chrome?.storage?.onChanged) {
                const storageHandler = (changes, area) => {
                    try {
                        if (area === 'local' && changes.settings) {
                            const newSettings = changes.settings.newValue;
                            if (newSettings) {
                                this.settings = { ...this.settings, ...newSettings };
                                this.Utils?.log('Settings updated from storage event', 'MAIN', 'debug');
                                this._queueSettingsUpdate();
                                
                                if (this.pageManagers) {
                                    this.pageManagers.forEach(m => m.updateSettings(this.settings));
                                }
                                if (this.thumbnailColorManager) {
                                    this.thumbnailColorManager.updateSettings(this.settings);
                                }
                            }
                        }
                    } catch (error) {
                        this.Utils?.log(`Error handling settings change: ${error.message}`, 'MAIN', 'error');
                    }
                };
                chrome.storage.onChanged.addListener(storageHandler);
                this._chromeListeners.push({ api: chrome.storage.onChanged, handler: storageHandler });
            } else {
                this.Utils?.log('chrome.storage.onChanged API not available', 'MAIN', 'warn');
            }

            // Listen for direct messages for instant updates
            if (chrome?.runtime?.onMessage) {
                const messageHandler = (request, sender, sendResponse) => {
                    if (request.action === 'UPDATE_SETTINGS' && request.settings) {
                        // Merge incoming settings over current state
                        this.settings = { ...this.settings, ...request.settings };
                        this.Utils?.log('Instant settings update received', 'MAIN', 'debug');
                        this._queueSettingsUpdate();
                        
                        if (this.pageManagers) {
                            this.pageManagers.forEach(m => m.updateSettings(this.settings));
                        }
                        if (this.thumbnailColorManager) {
                            this.thumbnailColorManager.updateSettings(this.settings);
                        }

                        sendResponse({ success: true });
                    }
                    
                    if (request.action === 'FORCE_THEME_UPDATE') {
                        this.Utils?.log('Force theme update received', 'MAIN', 'info');
                        const themeManager = this.featureManager?.getFeature('theme');
                        if (themeManager && typeof themeManager.forceReload === 'function') {
                            themeManager.forceReload();
                        }
                        sendResponse({ success: true });
                    }
                };
                chrome.runtime.onMessage.addListener(messageHandler);
                this._chromeListeners.push({ api: chrome.runtime.onMessage, handler: messageHandler });
            }
        },

        /**
         * Queues a debounced update to FeatureManager
         * @private
         */
        _queueSettingsUpdate() {
            if (this._settingsUpdateTimeout) clearTimeout(this._settingsUpdateTimeout);
            this._settingsUpdateTimeout = setTimeout(() => {
                this._settingsUpdateTimeout = null;
                if (this.featureManager) {
                    try {
                        this.featureManager.init(this.settings);
                    } catch (error) {
                        this.Utils?.log(`Error re-initializing features: ${error.message}`, 'MAIN', 'error');
                    }
                }
            }, 100);
        },

        /**
         * Remove all event listeners (cleanup)
         * @private
         */
        removeEventListeners() {
            // Remove DOM listeners
            this.eventListeners.forEach(({ target, event, handler }) => {
                try {
                    if (target && typeof target.removeEventListener === 'function') {
                        target.removeEventListener(event, handler);
                    }
                } catch (error) {
                    // Ignore cleanup errors
                }
            });
            this.eventListeners = [];

            // Remove Chrome API listeners
            if (this._chromeListeners) {
                this._chromeListeners.forEach(({ api, handler }) => {
                    try {
                        if (api && typeof api.removeListener === 'function') {
                            api.removeListener(handler);
                        }
                    } catch (e) {}
                });
                this._chromeListeners = [];
            }
        },

        // =========================================================================
        // CONTEXT
        // =========================================================================

        /**
         * Update the current page context and apply relevant body classes
         * @private
         */
        updateContext() {
            this.Utils?.startPerf('updateContext');
            try {
                const pathname = window.location.pathname;
                const body = document.body;

                if (!body) {
                    // Body might not be ready yet
                    return;
                }
                
                // Compute new context
                // NOTE: isHome intentionally excludes /feed/subscriptions to avoid
                // overlapping with isSubscriptions and setting contradictory CSS classes.
                const newContext = {
                    isHome: pathname === '/' || pathname === '/index',
                    isWatch: pathname.startsWith('/watch'),
                    isSearch: pathname.startsWith('/results'),
                    isChannel: pathname.startsWith('/@') || pathname.startsWith('/channel') || pathname.startsWith('/c/'),
                    isShorts: pathname.startsWith('/shorts/') || pathname === '/shorts',
                    isShortsPage: pathname.startsWith('/shorts/'),
                    isPlaylist: pathname.startsWith('/playlist'),
                    isTrending: pathname === '/feed/trending',
                    isSubscriptions: pathname === '/feed/subscriptions',
                    isLibrary: pathname === '/feed/library',
                    isHistory: pathname === '/feed/history'
                };

                const contextHashObj = {
                    theme: this.settings?.premiumTheme,
                    zen: this.settings?.zenMode,
                    focus: this.settings?.enableFocusMode,
                    cinema: this.settings?.cinemaMode,
                    minimal: this.settings?.minimalMode,
                    detox: this.settings?.dopamineDetox
                };
                const contextId = `${pathname}-${JSON.stringify(contextHashObj)}`;
                
                if (this._lastContextId === contextId) {
                    // No context or theme change occurred; bypass heavy DOM updates
                    return;
                }
                this._lastContextId = contextId;
                this.context = newContext;

                // Apply context classes to body in a single paint frame
                requestAnimationFrame(() => {
                    if (!document.body) return;
                    
                    const classes = new Set(document.body.classList);
                    
                    // Only remove old YPP context classes, preserving theme and feature state classes
                    const CONTEXT_CLASSES = [
                        'ypp-watch-page', 'ypp-shorts-page', 'ypp-home-page',
                        'ypp-search-page', 'ypp-channel-page', 'ypp-playlist-page',
                        'ypp-library-page', 'ypp-history-page', 'ypp-subscriptions-page',
                        'ypp-feed-page'
                    ];

                    for (const cls of classes) {
                        if (CONTEXT_CLASSES.includes(cls)) {
                            classes.delete(cls);
                        }
                    }

                    if (this.context.isWatch) classes.add('ypp-watch-page');
                    if (this.context.isShortsPage) classes.add('ypp-shorts-page');
                    if (this.context.isHome) classes.add('ypp-home-page');
                    if (this.context.isSearch) classes.add('ypp-search-page');
                    if (this.context.isChannel) classes.add('ypp-channel-page');
                    if (this.context.isPlaylist) classes.add('ypp-playlist-page');
                    if (this.context.isLibrary) classes.add('ypp-library-page');
                    if (this.context.isHistory) classes.add('ypp-history-page');
                    if (this.context.isSubscriptions) classes.add('ypp-subscriptions-page');

                    if (this.settings?.premiumTheme) {
                        classes.add('yt-premium-plus-theme');
                    } else {
                        classes.delete('yt-premium-plus-theme');
                    }
                    
                    document.body.className = Array.from(classes).join(' ');
                });

                // Route to appropriate page managers cleanly
                const currentUrl = window.location.href;
                if (this.pageManagers) {
                    const newManager = this.pageManagers.find(m => m.matches(currentUrl));
                    
                    if (newManager !== this._activeManager) {
                        if (this._activeManager) this._activeManager.deactivate();
                        if (newManager) newManager.activate(currentUrl);
                        this._activeManager = newManager;
                    } else if (newManager) {
                        // Keep the active manager updated without deactivating it
                        newManager.activate(currentUrl);
                    }
                }


                this.Utils?.log('Context updated', 'MAIN', 'debug', this.context);

            } catch (error) {
                this.Utils?.log(`Error updating context: ${error.message}`, 'MAIN', 'error');
                // Reset context dynamically while preserving shape to avoid brittle hardcoding
                if (this.context && typeof this.context === 'object') {
                    Object.keys(this.context).forEach(key => {
                        this.context[key] = false;
                    });
                } else {
                    this.context = {};
                }
            } finally {
                this.Utils?.endPerf('updateContext');
            }
        },


        // =========================================================================
        // NOTIFICATIONS
        // =========================================================================

        /**
         * Display a toast notification
         * @param {string} message - Message to display
         * @param {string} [type] - Toast type
         */
        showReadyToast(message = 'YouTube Premium+ Ready') {
            try {
                this.Utils?.createToast(message);
            } catch (error) {
                this.Utils?.log(`Error showing ready toast: ${error.message}`, 'MAIN', 'error');
            }
        },

        // =========================================================================
        // ERROR HANDLING
        // =========================================================================

        /**
         * Handle critical initialization errors
         * @private
         * @param {Error} error - The error object
         */
        handleCriticalError(error) {
            this.Utils?.log(`Critical Bootstrap Error: ${error.message}`, 'MAIN', 'error');
            console.error('[YPP:MAIN] Initialization failed:', error);

            // Show error toast
            try {
                this.Utils?.createToast?.('YouTube Premium+ failed to load!', 'error');
            } catch (e) {
                // Last resort fallback
                console.error('[YPP] Fatal error showing toast:', e);
            }

            // Log suggestions
            this.Utils?.log('Check console for details. Extension features may be unavailable.', 'MAIN', 'error');
        },

        /**
         * Handle non-critical errors
         * @param {string} component - Component where error occurred
         * @param {Error} error - The error object
         */
        handleError(component, error) {
            this.Utils?.log(`Error in ${component}: ${error.message}`, 'MAIN', 'error');
            console.error(`[YPP:${component}] Error:`, error);
        },

        // =========================================================================
        // PUBLIC API
        // =========================================================================

        /**
         * Get current settings
         * @returns {Object}
         */
        getSettings() {
            return { ...this.settings };
        },

        /**
         * Get current context
         * @returns {Object}
         */
        getContext() {
            return { ...this.context };
        },

        /**
         * Check if extension is initialized
         * @returns {boolean}
         */
        isReady() {
            return this.isInitialized;
        },

        /**
         * Re-initialize features (useful for debugging)
         */
        reinit() {
            if (!this.isInitialized) {
                this.Utils?.log('Cannot reinit: not initialized', 'MAIN', 'warn');
                return;
            }

            this.Utils?.log('Reinitializing features...', 'MAIN');
            this.updateContext();
            if (this.featureManager) {
                this.featureManager.init(this.settings);
            }
        },

        /**
         * Cleanup and disable all features
         */
        cleanup() {
            this.Utils?.log('Cleaning up...', 'MAIN');
            
            if (this._navTimeout) clearTimeout(this._navTimeout);
            if (this._settingsUpdateTimeout) clearTimeout(this._settingsUpdateTimeout);

            // Remove event listeners
            this.removeEventListeners();

            if (this.featureManager) {
                this.featureManager.disableAll?.();
            }

            this.isInitialized = false;
            document.documentElement.classList.remove('ypp-loaded');
        }
    };

    // =========================================================================
    // BOOTSTRAP EXECUTION
    // =========================================================================

    try {
        // Wait for DOM if needed
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => YPPMainApp.start());
        } else {
            // DOM already loaded, start immediately
            YPPMainApp.start();
        }
    } catch (error) {
        console.error('[YPP] Fatal Bootstrap Error:', error);
        try {
            window.YPP?.Utils?.createToast?.('YouTube Premium+ encountered a fatal error!', 'error');
        } catch (e) {
            // Last resort
            console.error('[YPP] Could not show fatal error toast:', e);
        }
    }

    // Expose app to global scope
    window.YPP.MainApp = YPPMainApp;
})();
