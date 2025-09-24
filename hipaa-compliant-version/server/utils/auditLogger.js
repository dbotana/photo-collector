/**
 * HIPAA Compliant Audit Logger
 * Comprehensive audit trail for all security-relevant events
 */

const winston = require('winston');
const crypto = require('crypto');

// Audit log configuration
const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'hipaa-photo-collector-audit',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Separate audit log file
        new winston.transports.File({
            filename: './logs/audit.log',
            level: 'info',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // Security events file
        new winston.transports.File({
            filename: './logs/security.log',
            level: 'warn',
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // Console output for development
        ...(process.env.NODE_ENV !== 'production' ? [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ] : [])
    ]
});

/**
 * HIPAA event categories and their required fields
 */
const EVENT_CATEGORIES = {
    // Authentication events
    AUTHENTICATION: {
        login_success: ['userId', 'username', 'organizationId', 'clientIP', 'sessionId'],
        login_failed: ['username', 'clientIP', 'error'],
        logout: ['userId', 'username', 'sessionId'],
        session_expired: ['userId', 'username', 'sessionId'],
        password_changed: ['userId', 'username', 'organizationId'],

        // Authorization events
        access_granted: ['userId', 'resource', 'action', 'organizationId'],
        access_denied: ['userId', 'resource', 'action', 'reason'],
        permission_escalation: ['userId', 'oldRole', 'newRole', 'changedBy'],

        // Data access events
        phi_accessed: ['userId', 'resourceId', 'patientId', 'organizationId'],
        phi_created: ['userId', 'resourceId', 'patientId', 'organizationId'],
        phi_modified: ['userId', 'resourceId', 'patientId', 'organizationId'],
        phi_deleted: ['userId', 'resourceId', 'patientId', 'organizationId', 'deletedBy'],

        // File operations
        file_uploaded: ['userId', 'fileName', 'fileSize', 'patientId', 'organizationId'],
        file_downloaded: ['userId', 'fileName', 'patientId', 'organizationId'],
        file_deleted: ['userId', 'fileName', 'patientId', 'organizationId', 'deletedBy'],

        // System events
        system_startup: ['version', 'environment'],
        system_shutdown: ['reason'],
        configuration_changed: ['setting', 'oldValue', 'newValue', 'changedBy'],
        backup_created: ['backupId', 'size', 'duration'],
        backup_restored: ['backupId', 'restoredBy'],

        // Security events
        intrusion_detected: ['source', 'type', 'severity'],
        vulnerability_detected: ['component', 'severity', 'description'],
        encryption_key_rotated: ['keyId', 'rotatedBy'],
        audit_log_accessed: ['userId', 'logFile', 'reason']
    }
};

/**
 * Log an audit event
 */
function log(level, eventType, eventData = {}) {
    try {
        // Generate unique event ID
        const eventId = crypto.randomUUID();

        // Prepare audit entry
        const auditEntry = {
            eventId: eventId,
            eventType: eventType,
            level: level.toUpperCase(),
            timestamp: new Date().toISOString(),
            source: 'hipaa-photo-collector-api',
            ...eventData
        };

        // Add session context if available
        if (eventData.req && eventData.req.user) {
            auditEntry.sessionContext = {
                userId: eventData.req.user.userId,
                username: eventData.req.user.username,
                organizationId: eventData.req.user.organizationId,
                sessionId: eventData.req.user.sessionId
            };
            delete auditEntry.req; // Remove req object to avoid circular references
        }

        // Add request context if available
        if (eventData.clientIP) {
            auditEntry.networkContext = {
                clientIP: eventData.clientIP,
                userAgent: eventData.userAgent || 'unknown'
            };
        }

        // Hash sensitive data
        if (auditEntry.patientId) {
            auditEntry.hashedPatientId = hashSensitiveData(auditEntry.patientId);
            delete auditEntry.patientId; // Remove unhashed patient ID
        }

        // Ensure no passwords or tokens are logged
        sanitizeAuditEntry(auditEntry);

        // Log the event
        auditLogger.log(level, JSON.stringify(auditEntry));

        // For critical security events, also log to separate security channel
        if (['error', 'warn'].includes(level) || eventType.includes('security') || eventType.includes('intrusion')) {
            logSecurityEvent(auditEntry);
        }

        return eventId;

    } catch (error) {
        // Fallback logging if audit logging fails
        console.error('Audit logging failed:', error);
        winston.createLogger({
            transports: [new winston.transports.Console()]
        }).error('AUDIT_LOG_FAILURE', {
            originalEvent: eventType,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Log security-critical events
 */
function logSecurityEvent(auditEntry) {
    // In production, this could send to SIEM, alert systems, etc.
    const securityLogger = winston.createLogger({
        transports: [
            new winston.transports.File({
                filename: './logs/security-alerts.log',
                level: 'info'
            })
        ]
    });

    securityLogger.warn('SECURITY_EVENT', {
        ...auditEntry,
        severity: determineSeverity(auditEntry.eventType),
        requiresResponse: requiresImmediateResponse(auditEntry.eventType)
    });
}

/**
 * Hash sensitive data for audit logging
 */
function hashSensitiveData(data) {
    return crypto.createHash('sha256')
        .update(data + process.env.AUDIT_SALT || 'default-audit-salt')
        .digest('hex')
        .substring(0, 16); // First 16 chars for readability
}

/**
 * Remove sensitive data from audit entries
 */
function sanitizeAuditEntry(entry) {
    const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'authorization',
        'cookie',
        'session',
        'csrf'
    ];

    function sanitizeObject(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const lowerKey = key.toLowerCase();

                // Check if field is sensitive
                if (sensitiveFields.some(field => lowerKey.includes(field))) {
                    obj[key] = '[REDACTED]';
                }

                // Recursively sanitize nested objects
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        }
    }

    sanitizeObject(entry);
}

/**
 * Determine event severity
 */
function determineSeverity(eventType) {
    const highSeverityEvents = [
        'intrusion_detected',
        'unauthorized_access',
        'data_breach',
        'system_compromise',
        'privilege_escalation'
    ];

    const mediumSeverityEvents = [
        'login_failed',
        'access_denied',
        'configuration_changed',
        'encryption_key_rotated'
    ];

    if (highSeverityEvents.some(event => eventType.includes(event))) {
        return 'HIGH';
    } else if (mediumSeverityEvents.some(event => eventType.includes(event))) {
        return 'MEDIUM';
    }

    return 'LOW';
}

/**
 * Check if event requires immediate response
 */
function requiresImmediateResponse(eventType) {
    const criticalEvents = [
        'intrusion_detected',
        'data_breach',
        'system_compromise',
        'unauthorized_phi_access',
        'multiple_login_failures'
    ];

    return criticalEvents.some(event => eventType.includes(event));
}

/**
 * Query audit logs (for compliance reporting)
 */
function queryAuditLogs(filters = {}) {
    return new Promise((resolve, reject) => {
        // This is a simplified implementation
        // In production, you'd use a proper log aggregation system
        const query = {
            from: filters.from || new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            to: filters.to || new Date(),
            userId: filters.userId,
            organizationId: filters.organizationId,
            eventType: filters.eventType,
            level: filters.level
        };

        // Implementation would depend on your log storage system
        // This could query Elasticsearch, CloudWatch, Splunk, etc.
        resolve({
            query: query,
            results: [],
            message: 'Audit log query functionality requires log aggregation system'
        });
    });
}

/**
 * Generate compliance report
 */
function generateComplianceReport(organizationId, dateRange) {
    const reportId = crypto.randomUUID();

    log('info', 'compliance_report_generated', {
        reportId: reportId,
        organizationId: organizationId,
        dateRange: dateRange,
        generatedBy: 'system'
    });

    return {
        reportId: reportId,
        organizationId: organizationId,
        dateRange: dateRange,
        generatedAt: new Date().toISOString(),
        status: 'generated',
        downloadUrl: `/reports/${reportId}.pdf` // Placeholder
    };
}

/**
 * Export functions for HIPAA compliance
 */
module.exports = {
    log,
    logSecurityEvent,
    queryAuditLogs,
    generateComplianceReport,
    hashSensitiveData,
    EVENT_CATEGORIES
};