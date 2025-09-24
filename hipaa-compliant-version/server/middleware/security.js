/**
 * Security Middleware - HIPAA Compliance
 * Request validation, audit logging, and security headers
 */

const auditLogger = require('../utils/auditLogger');
const rateLimit = require('express-rate-limit');

/**
 * Audit logging middleware
 */
const auditLog = (req, res, next) => {
    // Log all API requests for audit purposes
    const logData = {
        method: req.method,
        url: req.url,
        clientIP: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        contentLength: req.headers['content-length'],
        referrer: req.headers['referrer'] || req.headers['referer']
    };

    // Add user info if authenticated
    if (req.headers.authorization) {
        logData.hasAuth = true;
        // Don't log the actual token for security
    }

    // Skip logging for health checks to reduce noise
    if (req.url !== '/health') {
        auditLogger.log('info', 'api_request', logData);
    }

    next();
};

/**
 * Request validation middleware
 */
const requestValidation = (req, res, next) => {
    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'];

        if (!contentType) {
            auditLogger.log('warning', 'missing_content_type', {
                method: req.method,
                url: req.url,
                clientIP: req.ip
            });

            return res.status(400).json({
                success: false,
                message: 'Content-Type header is required'
            });
        }

        // Only allow JSON for API endpoints
        if (!contentType.includes('application/json')) {
            auditLogger.log('warning', 'invalid_content_type', {
                method: req.method,
                url: req.url,
                contentType: contentType,
                clientIP: req.ip
            });

            return res.status(400).json({
                success: false,
                message: 'Only application/json content type is supported'
            });
        }
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (contentLength > maxSize) {
        auditLogger.log('warning', 'request_too_large', {
            method: req.method,
            url: req.url,
            contentLength: contentLength,
            maxSize: maxSize,
            clientIP: req.ip
        });

        return res.status(413).json({
            success: false,
            message: 'Request entity too large'
        });
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
        /\.\.\//g, // Path traversal
        /<script/gi, // XSS
        /union\s+select/gi, // SQL injection
        /javascript:/gi, // JavaScript protocol
        /data:/gi // Data protocol
    ];

    const requestData = JSON.stringify({
        url: req.url,
        query: req.query,
        body: req.body
    });

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestData)) {
            auditLogger.log('warning', 'suspicious_request_pattern', {
                method: req.method,
                url: req.url,
                pattern: pattern.source,
                clientIP: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(400).json({
                success: false,
                message: 'Invalid request format'
            });
        }
    }

    next();
};

/**
 * HIPAA compliance headers
 */
const hipaaHeaders = (req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HIPAA compliance headers
    res.setHeader('X-HIPAA-Compliant', 'true');
    res.setHeader('X-Data-Classification', 'PHI');

    // Cache control for sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    next();
};

/**
 * IP whitelist middleware (for production environments)
 */
const ipWhitelist = (allowedIPs = []) => {
    return (req, res, next) => {
        if (process.env.NODE_ENV === 'production' && allowedIPs.length > 0) {
            const clientIP = req.ip || req.connection.remoteAddress;

            if (!allowedIPs.includes(clientIP)) {
                auditLogger.log('warning', 'ip_not_whitelisted', {
                    clientIP: clientIP,
                    url: req.url,
                    userAgent: req.headers['user-agent']
                });

                return res.status(403).json({
                    success: false,
                    message: 'Access denied from this IP address'
                });
            }
        }
        next();
    };
};

/**
 * Enhanced rate limiting for sensitive endpoints
 */
const sensitiveEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Very limited requests for sensitive operations
    message: 'Too many requests to sensitive endpoint',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        auditLogger.log('warning', 'rate_limit_exceeded_sensitive', {
            clientIP: req.ip,
            url: req.url,
            userAgent: req.headers['user-agent']
        });

        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded for sensitive operations'
        });
    }
});

/**
 * Request sanitization
 */
const sanitizeRequest = (req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
                // Remove potential XSS
                req.query[key] = req.query[key].replace(/<[^>]*>/g, '');
            }
        }
    }

    // Sanitize body (for JSON requests)
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }

    next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].trim();
                // Basic XSS prevention
                obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}

module.exports = {
    auditLog,
    requestValidation,
    hipaaHeaders,
    ipWhitelist,
    sensitiveEndpointLimiter,
    sanitizeRequest
};