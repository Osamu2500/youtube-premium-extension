/**
 * YouTube Premium Plus - Main Entry Point
 * Bootstraps the application, loads settings, and handles navigation events
 */
(function () {
    'use strict';

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
                
                // Load settings and initialize features
                await this.loadSettings();
                this.initFeatureManager();
                this.updateContext();
                this.setupEvents();

                // Mark as initialized
                this.isInitialized = true;
                this.bootstrapLock = false;

                const loadTime = (performance.now() - startTime).toFixed(2);
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

            // Check if Utils are available after wait
            if (!window.YPP?.Utils) {
                throw new Error('Core utilities not loaded after timeout');
            }
        },

        /**
         * Wait for a condition to be true
         * @private
         * @param {Function} condition - Function that returns true when condition is met
         * @param {number} timeout - Maximum wait time in ms
         * @returns {Promise<boolean>}
         */
        waitFor(condition, timeout = 10000) {
            return new Promise((resolve, reject) => {
                if (condition()) {
                    resolve(true);
                    return;
                }

                let elapsed = 0;
                const interval = setInterval(() => {
                    elapsed += 100;
                    if (condition()) {
                        clearInterval(interval);
                        resolve(true);
                    } else if (elapsed >= timeout) {
                        clearInterval(interval);
                        resolve(false);
                    }
                }, 100);
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

            this.featureManager = new window.YPP.FeatureManager();

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
                this.settings = await this.Utils.loadSettings();
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
                this.settings = window.YPP.getDefaultSettings();
            }
        },

        /**
         * Save settings to Chrome storage
         * @async
         * @param {Object} newSettings - Settings to save
         */
        async saveSettings(newSettings) {
            try {
                this.settings = { ...this.settings, ...newSettings };
                await chrome.storage.local.set({ settings: this.settings });
                this.Utils?.log('Settings saved', 'MAIN', 'debug');
            } catch (error) {
                this.Utils?.log(`Error saving settings: ${error.message}`, 'MAIN', 'error');
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

            // Handle YouTube SPA navigation
            const handleNavigation = () => {
                if (this._navTimeout) cancelAnimationFrame(this._navTimeout);
                this._navTimeout = requestAnimationFrame(() => {
                    this.Utils?.log('Navigation detected', 'MAIN', 'debug');
                    this.updateContext();
                    if (this.featureManager) {
                        this.featureManager.init(this.settings);
                    }
                });
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
                                this.settings = newSettings;
                                this.Utils?.log('Settings updated from popup', 'MAIN', 'debug');

                                if (this.featureManager) {
                                    this.featureManager.init(this.settings);
                                }
                            }
                        }
                    } catch (error) {
                        this.Utils?.log(`Error handling settings change: ${error.message}`, 'MAIN', 'error');
                    }
                };
                chrome.storage.onChanged.addListener(storageHandler);
                this.eventListeners.push({ target: chrome.storage.onChanged, event: 'storage', handler: storageHandler });
            } else {
                this.Utils?.log('chrome.storage.onChanged API not available', 'MAIN', 'warn');
            }

            // Listen for direct messages for instant updates
            const messageHandler = (request, sender, sendResponse) => {
                if (request.action === 'UPDATE_SETTINGS' && request.settings) {
                    this.settings = request.settings;
                    this.Utils?.log('Instant settings update received', 'MAIN', 'debug');
                    if (this.featureManager) {
                        this.featureManager.init(this.settings);
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
            this.eventListeners.push({ target: chrome.runtime.onMessage, event: 'message', handler: messageHandler });
        },

        /**
         * Remove all event listeners (cleanup)
         * @private
         */
        removeEventListeners() {
            this.eventListeners.forEach(({ target, event, handler }) => {
                try {
                    if (target.removeEventListener) {
                        target.removeEventListener(event, handler);
                    } else if (target.removeListener) {
                        target.removeListener(handler);
                    }
                } catch (error) {
                    // Ignore cleanup errors
                }
            });
            this.eventListeners = [];
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
                
                // Cache previous context for comparison
                this.context = {
                    isHome: pathname === '/' || pathname === '/index' || pathname === '/feed/subscriptions',
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

                // Apply context classes to body
                // Update context classes
                body.classList.toggle('ypp-watch-page', this.context.isWatch);
                body.classList.toggle('ypp-shorts-page', this.context.isShortsPage);
                body.classList.toggle('ypp-home-page', this.context.isHome);
                body.classList.toggle('ypp-search-page', this.context.isSearch);
                body.classList.toggle('ypp-channel-page', this.context.isChannel);

                // Re-apply premium theme class (critical for layout)
                if (this.settings?.premiumTheme) {
                    body.classList.add('yt-premium-plus-theme');
                }

                this.Utils?.log('Context updated', 'MAIN', 'debug', this.context);

            } catch (error) {
                this.Utils?.log(`Error updating context: ${error.message}`, 'MAIN', 'error');
                // Reset context on error with full shape
                this.context = {
                    isHome: false,
                    isWatch: false,
                    isSearch: false,
                    isChannel: false,
                    isShorts: false,
                    isShortsPage: false,
                    isPlaylist: false,
                    isTrending: false,
                    isSubscriptions: false,
                    isLibrary: false,
                    isHistory: false
                };
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
