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
     * Main Application Controller
     * Manages extension lifecycle, settings, and feature coordination
     */
    class App {
        constructor() {
            /** @type {window.YPP.FeatureManager} */
            this.featureManager = new window.YPP.FeatureManager();
            /** @type {Object|null} User settings */
            this.settings = null;
            /** @type {boolean} Initialization state */
            this.isInitialized = false;
        }

        /**
         * Main start sequence. Loads settings, initializes features, and sets up event listeners.
         * @returns {Promise<void>}
         */
        async start() {
            if (this.isInitialized) return;

            try {
                Utils.log('Starting App...', 'MAIN');
                await this.loadSettings();

                // Initialize all features with loaded settings
                this.featureManager.init(this.settings);

                this.setupEvents();

                // Visual confirmation
                Utils.createToast('YouTube Premium+ Ready');

                // Add class for global CSS scoping
                document.documentElement.classList.add('ypp-loaded');
                this.isInitialized = true;
            } catch (err) {
                Utils.log(`Critical Bootstrap Error: ${err.message}`, 'MAIN', 'error');
                console.error(err);
            }
        }

        /**
         * Load settings from Chrome Storage with defaults fallback.
         * Handles errors gracefully and falls back to DEFAULT_SETTINGS.
         * @returns {Promise<void>}
         */
        async loadSettings() {
            return new Promise((resolve) => {
                try {
                    // Defensive: Ensure chrome.storage exists
                    if (!chrome?.storage?.local) {
                        Utils.log('Chrome storage API not available', 'MAIN', 'error');
                        this.settings = window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
                        resolve();
                        return;
                    }

                    chrome.storage.local.get('settings', (data) => {
                        // Check for Chrome API errors
                        if (chrome.runtime.lastError) {
                            Utils.log(`Storage API Error: ${chrome.runtime.lastError.message}`, 'MAIN', 'error');
                            this.settings = window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
                            resolve();
                            return;
                        }

                        this.settings = data.settings || window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
                        resolve();
                    });
                } catch (e) {
                    Utils.log(`Settings Load Error: ${e?.message || 'Unknown error'}`, 'MAIN', 'error');
                    this.settings = window.YPP?.CONSTANTS?.DEFAULT_SETTINGS || {};
                    resolve();
                }
            });
        }

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

            // Initial context check
            this.updateContext();

            // Listen for settings changes from Popup
            chrome.storage.onChanged.addListener((changes, area) => {
                try {
                    if (area === 'local' && changes.settings) {
                        this.settings = changes.settings.newValue;
                        Utils.log('Settings changed', 'MAIN');
                        this.featureManager.init(this.settings);
                    }
                } catch (e) {
                    Utils.log(`Error handling settings change: ${e.message}`, 'MAIN', 'error');
                }
            });
        }

        /**
         * Update body classes based on current URL path.
         * Adds 'ypp-watch-page' class when on /watch page.
         * @returns {void}
         */
        updateContext() {
            const path = window.location.pathname;
            const isWatchPage = path === '/watch';

            if (isWatchPage) {
                document.body.classList.add('ypp-watch-page');
            } else {
                document.body.classList.remove('ypp-watch-page');
            }
        }
    }

    // --- Bootstrap Execution ---
    try {
        const app = new App();

        // Wait for DOM if it's not ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => app.start());
        } else {
            app.start();
        }
    } catch (e) {
        console.error('[YPP] Fatal Bootstrap Error:', e);
    }
})();
