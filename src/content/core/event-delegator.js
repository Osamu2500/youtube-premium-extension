window.YPP = window.YPP || {};
window.YPP.core = window.YPP.core || {};

/**
 * Global Event Delegator
 * Reduces memory footprint by replacing hundreds of individual .onclick 
 * listeners with a single document-level listener.
 */
window.YPP.core.EventDelegator = class EventDelegator {
    constructor() {
        this.registry = new Map();
        this._handleClick = this._handleClick.bind(this);
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        document.body.addEventListener('click', this._handleClick, true); // Use capture phase for reliability
        this.isRunning = true;
    }

    stop() {
        if (!this.isRunning) return;
        document.body.removeEventListener('click', this._handleClick, true);
        this.isRunning = false;
    }

    register(action, callback) {
        if (!action || typeof callback !== 'function') return;
        this.registry.set(action, callback);
    }

    unregister(action) {
        this.registry.delete(action);
    }

    _handleClick(e) {
        if (this.registry.size === 0) return;
        
        // Find the closest ancestor with data-ypp-action
        const target = e.target.closest('[data-ypp-action]');
        if (!target) return;

        const action = target.getAttribute('data-ypp-action');
        const callback = this.registry.get(action);

        if (callback) {
            e.stopPropagation(); // Stop YouTube from hijacking our clicks
            e.preventDefault();
            const payload = target.getAttribute('data-ypp-payload');
            try {
                callback(e, target, payload);
            } catch (err) {
                console.error(`[YPP:EventDelegator] Error in action '${action}':`, err);
            }
        }
    }
};
