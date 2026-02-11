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

    const YPPMainApp = {
        // =========================================================================
        // STATE
        // =========================================================================
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
                Utils?.log('Bootstrap already in progress', 'MAIN', 'warn');
                return;
            }

            if (this.isInitialized) {
                Utils?.log('App already initialized', 'MAIN', 'warn');
                return;
            }

            this.bootstrapLock = true;

            try {
                // Wait for core dependencies
                await this.waitForDependencies();

                const startTime = performance.now();
                Utils?.log('Starting App...', 'MAIN');

                await this.loadSettings();
                this.initFeatureManager();
                this.updateContext();
                this.setupEvents();

                this.isInitialized = true;
                this.bootstrapLock = false;

                const loadTime = (performance.now() - startTime).toFixed(2);
                Utils?.log(`Extension Initialized Successfully in ${loadTime}ms`, 'MAIN');

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
                Utils?.log('Waiting for Utils...', 'MAIN', 'debug');
                await this.waitFor(() => window.YPP?.Utils !== undefined, timeout);
            }

            // Wait for CONSTANTS
            if (!window.YPP?.CONSTANTS) {
                Utils?.log('Waiting for CONSTANTS...', 'MAIN', 'debug');
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
                Utils?.log('FeatureManager not found, checking for inline definition...', 'MAIN', 'warn');

                // FeatureManager might be defined inline in main.js
                if (typeof YPPMainApp.defineFeatureManager === 'function') {
                    this.defineFeatureManager();
                } else {
                    throw new Error('FeatureManager class not found');
                }
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
                // Check for Chrome storage API
                if (!chrome?.storage?.local) {
                    Utils?.log('Chrome storage API not available, using defaults', 'MAIN', 'warn');
                    this.settings = window.YPP.getDefaultSettings();
                    return;
                }

                const data = await chrome.storage.local.get('settings');
                this.settings = data.settings || window.YPP.getDefaultSettings();

                Utils?.log(`Settings Loaded (attempt ${attempt})`, 'MAIN', 'debug');

            } catch (error) {
                Utils?.log(`Error loading settings (attempt ${attempt}): ${error.message}`, 'MAIN', 'error');

                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    await Utils?.timeout(this.RETRY_DELAY);
                    return this.loadSettings(attempt + 1);
                }

                // Fallback to defaults
                Utils?.log('Using default settings after retry failure', 'MAIN', 'warn');
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
                Utils?.log('Settings saved', 'MAIN', 'debug');
            } catch (error) {
                Utils?.log(`Error saving settings: ${error.message}`, 'MAIN', 'error');
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
            // Handle YouTube SPA navigation
            const handleNavigation = () => {
                Utils?.log('Navigation detected', 'MAIN', 'debug');
                this.updateContext();
                if (this.featureManager) {
                    this.featureManager.init(this.settings);
                }
            };

            // Listen for page navigation
            window.addEventListener('yt-navigate-finish', handleNavigation);

            // Also listen for yt-page-data-updated for some YouTube versions
            window.addEventListener('yt-page-data-updated', handleNavigation);

            // Listen for settings changes from popup
            if (chrome?.storage?.onChanged) {
                chrome.storage.onChanged.addListener((changes, area) => {
                    try {
                        if (area === 'local' && changes.settings) {
                            const newSettings = changes.settings.newValue;
                            if (newSettings) {
                                this.settings = newSettings;
                                Utils?.log('Settings updated from popup', 'MAIN', 'debug');

                                if (this.featureManager) {
                                    this.featureManager.init(this.settings);
                                }
                            }
                        }
                    } catch (error) {
                        Utils?.log(`Error handling settings change: ${error.message}`, 'MAIN', 'error');
                    }
                });
            } else {
                Utils?.log('chrome.storage.onChanged API not available', 'MAIN', 'warn');
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
            try {
                const pathname = window.location.pathname;
                const search = window.location.search;

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
                if (body) {
                    // Update context classes
                    body.classList.toggle('ypp-watch-page', this.context.isWatch);
                    body.classList.toggle('ypp-shorts-page', this.context.isShorts);
                    body.classList.toggle('ypp-home-page', this.context.isHome);
                    body.classList.toggle('ypp-search-page', this.context.isSearch);

                    // Re-apply premium theme class (critical for layout)
                    if (this.settings?.premiumTheme) {
                        body.classList.add('yt-premium-plus-theme');
                    }
                }

                Utils?.log('Context updated', 'MAIN', 'debug', this.context);

            } catch (error) {
                Utils?.log(`Error updating context: ${error.message}`, 'MAIN', 'error');
                // Reset context on error
                this.context = {
                    isHome: false,
                    isWatch: false,
                    isSearch: false,
                    isChannel: false,
                    isShorts: false
                };
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
                Utils?.createToast(message);
            } catch (error) {
                Utils?.log(`Error showing ready toast: ${error.message}`, 'MAIN', 'error');
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
            Utils?.log(`Critical Bootstrap Error: ${error.message}`, 'MAIN', 'error');
            console.error('[YPP:MAIN] Initialization failed:', error);

            // Show error toast
            try {
                Utils?.createToast('YouTube Premium+ failed to load!', 'error');
            } catch (e) {
                // Last resort fallback
                console.error('[YPP] Fatal error:', error);
            }

            // Log suggestions
            Utils?.log('Check console for details. Extension features may be unavailable.', 'MAIN', 'error');
        },

        /**
         * Handle non-critical errors
         * @param {string} component - Component where error occurred
         * @param {Error} error - The error object
         */
        handleError(component, error) {
            Utils?.log(`Error in ${component}: ${error.message}`, 'MAIN', 'error');
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
                Utils?.log('Cannot reinit: not initialized', 'MAIN', 'warn');
                return;
            }

            Utils?.log('Reinitializing features...', 'MAIN');
            this.updateContext();
            if (this.featureManager) {
                this.featureManager.init(this.settings);
            }
        },

        /**
         * Cleanup and disable all features
         */
        cleanup() {
            Utils?.log('Cleaning up...', 'MAIN');

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
            Utils?.createToast?.('YouTube Premium+ encountered a fatal error!', 'error');
        } catch (e) {
            // Last resort
        }
    }

    // Expose app to global scope
    window.YPP.MainApp = YPPMainApp;
})();
