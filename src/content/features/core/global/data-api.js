/**
 * Feature: Data API Extractor
 * Extracts YouTube's internal API keys and context for use in other features.
 * This allows us to access the Innertube API if needed for metadata.
 */
window.YPP = window.YPP || {};
window.YPP.features = window.YPP.features || {};

window.YPP.features.DataAPI = class DataAPI {
    constructor() {
        this.apiKey = null;
        this.clientName = null;
        this.clientVersion = null;
        this.context = null;
        this.loggedOnly = false;
    }

    init() {
        this.extractData();
        // Log for debugging (remove in prod if noisy)
        // console.log('[YPP DataAPI] Initialized:', this.apiKey ? 'Success' : 'Failed');
    }

    extractData() {
        try {
            // Method 1: ytcfg global object (most reliable if script runs after it)
            // Since we are in an extension content script, we might not have direct access to page window variables
            // correctly without injection. However, sometimes we can scrape it from the DOM.
            
            // Actually, content scripts live in an isolated world. We can't access 'window.ytcfg' directly.
            // We need to inject a script to get it, OR scrape it from <script> tags.
            
            this.scrapeFromScriptTags();
            
            if (!this.apiKey) {
                // Fallback: try to find it in the darker corners of the DOM
            }

        } catch (e) {
            console.error('[YPP DataAPI] Extraction error:', e);
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
        return {
            'X-Goog-Visitor-Id': this.context?.client?.visitorData || '',
            'X-Youtube-Client-Name': this.clientName || '1',
            'X-Youtube-Client-Version': this.clientVersion || '2.20210101.00.00'
        };
    }
};
