/**
 * Custom Application Error Class
 * Standardizes error reporting across the application
 */
class AppError extends Error {
    constructor(statusCode, message, errorCode = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
