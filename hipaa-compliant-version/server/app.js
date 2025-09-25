/**
 * HIPAA Compliant Photo Collector API
 * Secure authentication, encryption, and AWS S3 integration
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const expressWinston = require('express-winston');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const auditRoutes = require('./routes/audit');
const errorHandler = require('./middleware/errorHandler');
const securityMiddleware = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "blob:", "data:"],
            connectSrc: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Stricter rate limiting for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit auth attempts
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts, please try again later.'
});

// CORS Configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

// Enhanced Winston Logger Configuration with Debug Support
const isDebugMode = process.env.NODE_ENV !== 'production' || process.env.DEBUG_MODE === 'true';

// Lambda-compatible logger configuration
const isLambdaEnvironment = process.env.AWS_LAMBDA_FUNCTION_NAME;
const logTransports = [];

// Always add console transport for Lambda (CloudWatch Logs)
logTransports.push(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    )
}));

// Only add file transports in non-Lambda environments
if (!isLambdaEnvironment) {
    logTransports.push(
        new winston.transports.File({
            filename: './logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.File({
            filename: './logs/combined.log',
            maxsize: 10485760,
            maxFiles: 10,
            tailable: true
        })
    );
}

const logger = winston.createLogger({
    level: isDebugMode ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level.toUpperCase()}] [${service}]: ${message} ${metaStr}`;
        })
    ),
    defaultMeta: {
        service: 'hipaa-photo-collector',
        pid: process.pid,
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: logTransports
});

// Debug utilities
const debugUtils = {
    // Performance timing decorator
    timeFunction: (name, fn) => {
        return async (...args) => {
            const start = process.hrtime.bigint();
            try {
                const result = await fn(...args);
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000; // Convert to ms

                logger.debug('Performance timing', {
                    function: name,
                    duration: `${duration.toFixed(2)}ms`,
                    success: true
                });

                return result;
            } catch (error) {
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000;

                logger.error('Performance timing (with error)', {
                    function: name,
                    duration: `${duration.toFixed(2)}ms`,
                    success: false,
                    error: error.message
                });

                throw error;
            }
        };
    },

    // Memory usage tracker
    logMemoryUsage: (context) => {
        if (!isDebugMode) return;

        const usage = process.memoryUsage();
        logger.debug('Memory usage', {
            context,
            memory: {
                rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
                external: `${Math.round(usage.external / 1024 / 1024)}MB`
            }
        });
    },

    // Request debugging middleware
    debugRequest: (req, res, next) => {
        if (!isDebugMode) return next();

        const requestId = require('crypto').randomUUID().slice(-8);
        req.debugId = requestId;

        logger.debug('Incoming request', {
            requestId,
            method: req.method,
            url: req.url,
            headers: {
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent'],
                'authorization': req.headers.authorization ? '[PRESENT]' : '[MISSING]'
            },
            body: req.method === 'POST' ? '[BODY_PRESENT]' : '[NO_BODY]',
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        const start = process.hrtime.bigint();

        // Override res.json to log responses
        const originalJson = res.json;
        res.json = function(data) {
            const end = process.hrtime.bigint();
            const duration = Number(end - start) / 1000000;

            logger.debug('Response sent', {
                requestId,
                statusCode: res.statusCode,
                duration: `${duration.toFixed(2)}ms`,
                responseSize: JSON.stringify(data).length,
                success: res.statusCode < 400
            });

            return originalJson.call(this, data);
        };

        next();
    }
};

// Add debug utilities to logger
logger.debug = isDebugMode ? logger.debug.bind(logger) : () => {}; // No-op in production
logger.debugUtils = debugUtils;

// Express Winston Logging
app.use(expressWinston.logger({
    winstonInstance: logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: function (req, res) {
        return false;
    }
}));

// Security middleware
app.use(securityMiddleware.auditLog);
app.use(securityMiddleware.requestValidation);

// Debug middleware (only in debug mode)
if (isDebugMode) {
    app.use(debugUtils.debugRequest);
    logger.info('Debug mode enabled - detailed logging active');
    debugUtils.logMemoryUsage('application_startup');
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/upload', uploadRoutes);
app.use('/audit', auditRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Error handling middleware
app.use(expressWinston.errorLogger({
    winstonInstance: logger
}));

app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🔒 HIPAA Compliant Photo Collector API running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Started at: ${new Date().toISOString()}`);
    });
}

module.exports = app;