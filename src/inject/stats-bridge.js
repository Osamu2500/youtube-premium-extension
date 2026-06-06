/**
 * Bridge script to access the main world YouTube Player API.
 * Injected by the content script to run in the page context.
 */
(function() {
    if (window.__YPP_STATS_BRIDGE_INJECTED) return;
    window.__YPP_STATS_BRIDGE_INJECTED = true;

    const TAG = '[YPP-Bridge]';
    let statsInterval = null;

    function getPlayer() {
        return document.getElementById('movie_player');
    }

    function broadcastStats() {
        const player = getPlayer();
        if (!player || !player.getStatsForNerds) return;

        const stats = player.getStatsForNerds();
        // Dispatch event for content script to catch
        window.dispatchEvent(new CustomEvent('ypp-stats-update', { detail: stats }));
    }

    // Listen for commands from Content Script
    window.addEventListener('ypp-cmd-toggle-stats', (e) => {
        if (e.detail && e.detail.enabled) {
            if (!statsInterval) {
                statsInterval = setInterval(() => {
                    if (document.hidden) return;
                    if (!document.getElementById('movie_player')) {
                        clearInterval(statsInterval);
                        statsInterval = null;
                        return;
                    }
                    broadcastStats();
                }, 1000);
                broadcastStats(); // Immediate update
            }
        } else {
            if (statsInterval) {
                clearInterval(statsInterval);
                statsInterval = null;
                // console.log(TAG, 'Stats broadcasting stopped');
            }
        }
    });

    console.log(TAG, 'Loaded');
})();
