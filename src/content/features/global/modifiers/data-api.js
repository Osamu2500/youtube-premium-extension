/**
 * Feature: Data API Extractor
 * Extracts YouTube's internal API keys and context for use in other features.
 * This allows us to access the Innertube API if needed for metadata.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DataAPI = class DataAPI extends window.YPP.features.BaseFeature {
    constructor() {
        super('DataAPI');
        this.apiKey = null;
        this.clientName = null;
        this.clientVersion = null;
        this.context = null;
        this.loggedOnly = false;
        this._extracted = false;     // Guard: scrape script tags only once per session
        this._cachedHeaders = null;  // Cache: avoid new object on every getHeaders() call
    }

    disable() {
        // Nothing to disable for data API since it just holds static scraped data
    }

    init() {
        this.extractData();
        // Log for debugging (remove in prod if noisy)
        // this.utils?.log('Initialized: ' + (this.apiKey ? 'Success' : 'Failed'), 'DATA-API', 'debug');
    }

    extractData() {
        if (this._extracted) return; // Guard: only scan script tags once per session
        try {
            // Content scripts live in an isolated world — can't access window.ytcfg directly.
            // Scrape from inline <script> tags instead.
            this.scrapeFromScriptTags();

            if (this.apiKey) {
                this._extracted = true; // Success — no more script tag iterations needed
            }
        } catch (e) {
            this.utils?.log('Extraction error', 'DATA-API', 'error', e);
        }
    }

    scrapeFromScriptTags() {
        // Look for the ytcfg.set({...}) script
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent && script.textContent.includes('INNERTUBE_API_KEY')) {
                const content = script.textContent;
                
                // Simple regex extraction (faster than parsing full JS)
                const keyMatch = content.match(/"INNERTUBE_API_KEY":\s*"([^"]+)"/);
                const versionMatch = content.match(/"INNERTUBE_CLIENT_VERSION":\s*"([^"]+)"/);
                const nameMatch = content.match(/"INNERTUBE_CLIENT_NAME":\s*"([^"]+)"/);
                
                if (keyMatch) this.apiKey = keyMatch[1];
                if (versionMatch) this.clientVersion = versionMatch[1];
                if (nameMatch) this.clientName = nameMatch[1];
                
                if (this.apiKey) break; // Found it
            }
        }
    }

    getHeaders() {
        if (!this.apiKey) return null;
        // Cache result — headers are stable for the entire session
        if (!this._cachedHeaders) {
            this._cachedHeaders = {
                'X-Goog-Visitor-Id': this.context?.client?.visitorData || '',
                'X-Youtube-Client-Name': this.clientName || '1',
                'X-Youtube-Client-Version': this.clientVersion || '2.20210101.00.00'
            };
        }
        return this._cachedHeaders;
    }
};
