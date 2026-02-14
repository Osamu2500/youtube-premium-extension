/**
 * Bridge script to access the main world YouTube Player API.
 * Injected by the content script to run in the page context.
 */
(function() {
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
                statsInterval = setInterval(broadcastStats, 1000);
                broadcastStats(); // Immediate update
                // console.log(TAG, 'Stats broadcasting started');
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
