/**
 * Authentication Routes - HIPAA Compliant
 * Secure user authentication with JWT tokens and audit logging
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const auditLogger = require('../utils/auditLogger');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// Mock user database - replace with secure database in production
const users = {
    'demo': {
        id: 'user_001',
        username: 'demo',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // demo123
        organizationId: 'org_healthcare_001',
        role: 'healthcare_provider',
        permissions: ['read', 'write', 'upload'],
        isActive: true,
        lastLogin: null,
        createdAt: '2023-01-01T00:00:00Z'
    }
    // Add more users as needed
};

// Session storage - replace with Redis or secure session store in production
const activeSessions = new Map();

// Validation schemas
const loginSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(100).required()
});

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', validateRequest(loginSchema), async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    try {
        // Rate limiting check (additional to global limiter)
        const recentAttempts = Array.from(activeSessions.values())
            .filter(session => session.clientIP === clientIP && session.loginAttempts > 0)
            .reduce((sum, session) => sum + session.loginAttempts, 0);

        if (recentAttempts >= 3) {
            auditLogger.log('warning', 'excessive_login_attempts', {
                username,
                clientIP,
                attempts: recentAttempts
            });

            return res.status(429).json({
                success: false,
                message: 'Too many login attempts. Please try again later.'
            });
        }

        // Find user
        const user = users[username];
        if (!user) {
            auditLogger.log('warning', 'login_user_not_found', {
                username,
                clientIP
            });

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            auditLogger.log('warning', 'login_inactive_user', {
                username,
                clientIP
            });

            return res.status(401).json({
                success: false,
                message: 'Account is disabled'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            auditLogger.log('warning', 'login_invalid_password', {
                username,
                clientIP
            });

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const sessionId = uuidv4();
        const tokenPayload = {
            userId: user.id,
            username: user.username,
            organizationId: user.organizationId,
            role: user.role,
            permissions: user.permissions,
            sessionId: sessionId
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'your-super-secret-jwt-key', {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            issuer: 'hipaa-photo-collector',
            audience: 'hipaa-client'
        });

        // Store session
        const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour
        activeSessions.set(sessionId, {
            userId: user.id,
            username: user.username,
            organizationId: user.organizationId,
            clientIP: clientIP,
            userAgent: req.headers['user-agent'],
            createdAt: new Date(),
            expiresAt: expiresAt,
            loginAttempts: 0
        });

        // Update user last login
        users[username].lastLogin = new Date().toISOString();

        // Log successful login
        auditLogger.log('info', 'login_success', {
            userId: user.id,
            username: user.username,
            organizationId: user.organizationId,
            sessionId: sessionId,
            clientIP: clientIP,
            userAgent: req.headers['user-agent']
        });

        res.json({
            success: true,
            token: token,
            user: username,
            organizationId: user.organizationId,
            expiresIn: 3600, // seconds
            permissions: user.permissions
        });

    } catch (error) {
        auditLogger.log('error', 'login_error', {
            username,
            clientIP,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Authentication service error'
        });
    }
});

/**
 * POST /auth/logout
 * Invalidate user session
 */
router.post('/logout', authenticateToken, (req, res) => {
    const { sessionId } = req.user;

    try {
        // Remove session
        if (activeSessions.has(sessionId)) {
            activeSessions.delete(sessionId);
        }

        auditLogger.log('info', 'logout_success', {
            userId: req.user.userId,
            username: req.user.username,
            sessionId: sessionId,
            clientIP: req.ip
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        auditLogger.log('error', 'logout_error', {
            userId: req.user.userId,
            sessionId: sessionId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Logout service error'
        });
    }
});

/**
 * GET /auth/verify
 * Verify token validity and refresh if needed
 */
router.get('/verify', authenticateToken, (req, res) => {
    const { sessionId, userId, username, organizationId } = req.user;

    try {
        // Check if session exists
        const session = activeSessions.get(sessionId);
        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session expired'
            });
        }

        // Check session expiry
        if (new Date() > session.expiresAt) {
            activeSessions.delete(sessionId);
            return res.status(401).json({
                success: false,
                message: 'Session expired'
            });
        }

        res.json({
            success: true,
            user: {
                userId,
                username,
                organizationId
            },
            expiresAt: session.expiresAt
        });

    } catch (error) {
        auditLogger.log('error', 'token_verification_error', {
            userId: req.user.userId,
            sessionId: sessionId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Token verification error'
        });
    }
});

/**
 * Authentication middleware
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key', (err, user) => {
        if (err) {
            auditLogger.log('warning', 'invalid_token', {
                clientIP: req.ip,
                error: err.message
            });

            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
}

/**
 * Clean up expired sessions (run periodically)
 */
function cleanupExpiredSessions() {
    const now = new Date();
    const expiredSessions = [];

    for (const [sessionId, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
            expiredSessions.push(sessionId);
        }
    }

    expiredSessions.forEach(sessionId => {
        activeSessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
        auditLogger.log('info', 'sessions_cleaned_up', {
            expiredCount: expiredSessions.length
        });
    }
}

// Run cleanup every 15 minutes
setInterval(cleanupExpiredSessions, 15 * 60 * 1000);

// Export middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;