/**
 * ErrorHandler - Centralized error tracking utility
 *
 * Tracks errors per component, provides structured retrieval, and supports
 * custom messages. Exposed on window.YPP for use by any feature.
 *
 * Usage:
 *   window.YPP.errorHandler.handleError(error, 'MyFeature');
 *   window.YPP.errorHandler.getErrors(); // → ['MyFeature: ...']
 */
window.YPP = window.YPP || {};

class ErrorHandler {
    constructor() {
        /** @type {string[]} Accumulated error messages */
        this.errors = [];
    }

    /**
     * Log and store an error message.
     * @param {string|Error} error - Error object or message string
     */
    logError(error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.errors.push(msg);
        console.error('[YPP:ErrorHandler]', msg);
    }

    /**
     * Retrieve all recorded error messages.
     * @returns {string[]}
     */
    getErrors() {
        return this.errors.slice(); // return a copy to prevent external mutation
    }

    /**
     * Clear all recorded errors.
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * Handle an error with an optional custom prefix message.
     * @param {Error} error - The caught error
     * @param {string} [customMessage] - Optional context prefix
     */
    handleError(error, customMessage = '') {
        const msg = customMessage
            ? `${customMessage}: ${error?.message ?? String(error)}`
            : (error?.message ?? String(error));
        this.logError(msg);
    }
}

// Singleton — available globally for features that need it
window.YPP.errorHandler = new ErrorHandler();
