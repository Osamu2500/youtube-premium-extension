(function() {
    if (window._yppYtcfgBridgeLoaded) return;
    window._yppYtcfgBridgeLoaded = true;

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'YPP_YTCFG_REQUEST') {
            try {
                window.postMessage({
                    type: 'YPP_YTCFG_RESPONSE',
                    reqId: e.data.reqId,
                    config: {
                        apiKey:        window.ytcfg?.get('INNERTUBE_API_KEY'),
                        context:       window.ytcfg?.get('INNERTUBE_CONTEXT'),
                        visitorData:   window.ytcfg?.get('VISITOR_DATA'),
                        clientVersion: window.ytcfg?.get('INNERTUBE_CLIENT_VERSION') || '2.20240101.01.00',
                        sessionIndex:  window.ytcfg?.get('SESSION_INDEX') || '0',
                        pageId:        window.ytcfg?.get('DELEGATED_SESSION_ID') || window.ytcfg?.get('PAGE_ID')
                    }
                }, '*');
            } catch (err) {
                // Ignore errors
            }
        }
    });
})();
