import { sendError } from '../shared/response.js';

/**
 * Global Error Handler Middleware
 * Catches all errors and sends a formatted response
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
            errorCode: err.errorCode
        });
    }

    // Production Mode
    if (err.isOperational) {
        return sendError(res, err.message, err.statusCode, { errorCode: err.errorCode });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return sendError(res, 'Something went very wrong!', 500);
};

export default globalErrorHandler;
