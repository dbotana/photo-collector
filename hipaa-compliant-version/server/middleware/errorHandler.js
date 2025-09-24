/**
 * Error Handler Middleware - HIPAA Compliant
 * Secure error handling that doesn't expose sensitive information
 */

const winston = require('winston');

const errorHandler = (err, req, res, next) => {
    const logger = winston.createLogger({
        transports: [
            new winston.transports.File({ filename: './logs/error.log' }),
            new winston.transports.Console()
        ]
    });

    // Log the full error internally
    logger.error('Application Error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
    });

    // Determine error status
    const status = err.statusCode || err.status || 500;

    // Create safe error response (no sensitive data exposure)
    let errorResponse = {
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString()
    };

    // Customize message based on error type
    if (status === 400) {
        errorResponse.message = 'Bad request';
    } else if (status === 401) {
        errorResponse.message = 'Unauthorized';
    } else if (status === 403) {
        errorResponse.message = 'Forbidden';
    } else if (status === 404) {
        errorResponse.message = 'Not found';
    } else if (status === 413) {
        errorResponse.message = 'Request entity too large';
    } else if (status === 429) {
        errorResponse.message = 'Too many requests';
    }

    // In development, include more details
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        errorResponse.details = err.message;
        if (process.env.DEBUG_MODE === 'true') {
            errorResponse.stack = err.stack;
        }
    }

    res.status(status).json(errorResponse);
};

module.exports = errorHandler;