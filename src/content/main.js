/**
 * YouTube Premium Plus - Main Entry Point
 * Bootstraps the application, loads settings, and handles navigation events.
 */
(function () {
    // Ensure Utils exist before proceeding
    if (!window.YPP || !window.YPP.Utils) {
        console.error('[YPP:MAIN] Utils not found. Bootstrap failed.');
        return;
    }

    const Utils = window.YPP.Utils;
    Utils.log('Script Loading...', 'MAIN');

    /**
     * Main Entry Point - YouTube Premium Plus Extension
     * @description Initializes the feature manager and coordinates all extension features
     */
    window.YPP = window.YPP || {};

    // Define a default settings object if not already present
    window.YPP.getDefaultSettings = window.YPP.getDefaultSettings || function () {
        // This should ideally be defined in CONSTANTS or a dedicated settings module
        // For now, return a basic empty object or a minimal default
        return window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
    };

    const YPPMainApp = {
        /** @type {window.YPP.FeatureManager|null} */
        featureManager: null,
        /** @type {Object} User settings */
        settings: {},
        /** @type {Object} Current page context (e.g., isWatchPage) */
        context: {},
        /** @type {boolean} Initialization state */
        isInitialized: false,
        /** @type {number} Maximum retry attempts for operations like loading settings */
        MAX_RETRY_ATTEMPTS: 3,
        /** @type {number} Delay between retry attempts in milliseconds */
        RETRY_DELAY: 500, // ms

        /**
         * Initialize the extension
         * @async
         */
        async start() {
            if (this.isInitialized) {
                Utils.log('App already initialized.', 'MAIN');
                return;
            }

            try {
                Utils.log('Starting App...', 'MAIN');
                await this.loadSettings();

                // Initialize feature manager after settings are loaded
                this.featureManager = new window.YPP.FeatureManager();
                this.updateContext(); // Initial context update
                this.featureManager.init(this.settings);
                this.setupEvents();
                this.isInitialized = true;
                Utils.log('Extension Initialized Successfully', 'MAIN');
                this.showReadyToast();

                // Add class for global CSS scoping
                document.documentElement.classList.add('ypp-loaded');
            } catch (error) {
                Utils.log(`Critical Bootstrap Error: ${error.message}`, 'MAIN', 'error');
                console.error('[YPP:MAIN] Initialization failed:', error);
                this.handleInitializationError(error);
            }
        },

        /**
         * Load settings from Chrome storage with retry logic.
         * Falls back to default settings if storage fails after retries.
         * @async
         * @param {number} attempt - Current attempt number (for retry)
         */
        async loadSettings(attempt = 1) {
            try {
                // Defensive: Ensure chrome.storage exists
                if (!chrome?.storage?.local) {
                    Utils.log('Chrome storage API not available. Using default settings.', 'MAIN', 'warn');
                    this.settings = window.YPP.getDefaultSettings();
                    return;
                }

                const data = await chrome.storage.local.get('settings');
                this.settings = data.settings || window.YPP.getDefaultSettings();
                Utils.log('Settings Loaded', 'MAIN', 'debug', this.settings);
            } catch (error) {
                Utils.log(`Error loading settings (attempt ${attempt}): ${error.message}`, 'MAIN', 'error');

                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    Utils.log(`Retrying settings load in ${this.RETRY_DELAY}ms...`, 'MAIN');
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                    return this.loadSettings(attempt + 1);
                }

                // Fallback to defaults after all retries
                Utils.log('Using default settings after retry failure', 'MAIN', 'warn');
                this.settings = window.YPP.getDefaultSettings();
            }
        },

        /**
         * Set up global event listeners for SPA navigation and settings changes.
         * Listens to: yt-navigate-finish, chrome.storage.onChanged
         * @returns {void}
         */
        setupEvents() {
            // Handle YouTube's SPA Navigation (yt-navigate-finish)
            window.addEventListener('yt-navigate-finish', () => {
                Utils.log('Navigation detected', 'MAIN');
                this.updateContext();
                // Re-initialize features to handle new page state
                this.featureManager.init(this.settings);
            });

            // Listen for settings changes from Popup
            if (chrome?.storage?.onChanged) {
                chrome.storage.onChanged.addListener((changes, area) => {
                    try {
                        if (area === 'local' && changes.settings) {
                            this.settings = changes.settings.newValue;
                            Utils.log('Settings changed', 'MAIN', 'debug', this.settings);
                            this.featureManager.init(this.settings);
                        }
                    } catch (e) {
                        Utils.log(`Error handling settings change: ${e.message}`, 'MAIN', 'error');
                    }
                });
            } else {
                Utils.log('chrome.storage.onChanged API not available.', 'MAIN', 'warn');
            }
        },

        /**
         * Update the current page context and apply relevant body classes.
         * Populates `this.context` with boolean flags for different page types.
         */
        updateContext() {
            try {
                const pathname = window.location.pathname;
                this.context = {
                    isHome: pathname === '/' || pathname === '/feed/subscriptions',
                    isWatch: pathname.startsWith('/watch'),
                    isSearch: pathname.startsWith('/results'),
                    isChannel: pathname.startsWith('/@') || pathname.startsWith('/channel'),
                };

                // Apply/remove body classes based on context
                if (this.context.isWatch) {
                    document.body.classList.add('ypp-watch-page');
                } else {
                    document.body.classList.remove('ypp-watch-page');
                }
                Utils.log('Context updated', 'MAIN', 'debug', this.context);
            } catch (error) {
                Utils.log(`Error updating context: ${error.message}`, 'MAIN', 'error');
                this.context = {}; // Reset context on error
            }
        },

        /**
         * Displays a toast notification indicating the extension is ready.
         */
        showReadyToast() {
            try {
                Utils.createToast('YouTube Premium+ Ready');
            } catch (error) {
                Utils.log(`Error showing ready toast: ${error.message}`, 'MAIN', 'error');
            }
        },

        /**
         * Handles critical initialization errors.
         * @param {Error} error - The error object.
         */
        handleInitializationError(error) {
            // Potentially display a persistent error message to the user
            // or disable certain functionalities.
            Utils.createToast('YouTube Premium+ failed to load!', 'error');
            Utils.log('Further actions for critical error handling can be implemented here.', 'MAIN', 'error');
        }
    };

    // --- Bootstrap Execution ---
    try {
        // Wait for DOM if it's not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => YPPMainApp.start());
        } else {
            YPPMainApp.start();
        }
    } catch (e) {
        console.error('[YPP] Fatal Bootstrap Error:', e);
        Utils.createToast('YouTube Premium+ encountered a fatal error!', 'error');
    }
})();
