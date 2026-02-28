'use strict';

class ErrorHandler {
    constructor() {
        this.errors = [];
    }

    logError(error) {
        this.errors.push(error);
        console.error('Error:', error);
    }

    getErrors() {
        return this.errors;
    }

    clearErrors() {
        this.errors = [];
    }

    handleError(error, customMessage = '') {
        this.logError(customMessage ? `${customMessage}: ${error.message}` : error);
    }
}

const errorHandler = new ErrorHandler();

// Example usage
function riskyOperation() {
    try {
        // some operation that can throw
    } catch (error) {
        errorHandler.handleError(error, 'Failed to complete risky operation');
    }
}

module.exports = errorHandler;
