/**
 * Audit Routes - HIPAA Compliant
 * Secure audit log access and compliance reporting
 */

const express = require('express');
const { authenticateToken } = require('./auth');
const auditLogger = require('../utils/auditLogger');

const router = express.Router();

/**
 * GET /audit/logs
 * Retrieve audit logs (admin only)
 */
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        // Check admin permissions
        if (req.user.role !== 'admin') {
            auditLogger.log('warning', 'audit_access_denied', {
                userId: req.user.userId,
                username: req.user.username,
                attemptedResource: 'audit_logs'
            });

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to access audit logs'
            });
        }

        const filters = {
            from: req.query.from,
            to: req.query.to,
            userId: req.query.userId,
            organizationId: req.query.organizationId || req.user.organizationId,
            eventType: req.query.eventType,
            level: req.query.level
        };

        const auditLogs = await auditLogger.queryAuditLogs(filters);

        auditLogger.log('info', 'audit_logs_accessed', {
            userId: req.user.userId,
            username: req.user.username,
            filters: filters
        });

        res.json({
            success: true,
            ...auditLogs
        });

    } catch (error) {
        auditLogger.log('error', 'audit_logs_access_error', {
            userId: req.user.userId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve audit logs'
        });
    }
});

/**
 * POST /audit/report
 * Generate compliance report
 */
router.post('/report', authenticateToken, async (req, res) => {
    try {
        // Check admin permissions
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions to generate reports'
            });
        }

        const { dateRange } = req.body;

        if (!dateRange || !dateRange.from || !dateRange.to) {
            return res.status(400).json({
                success: false,
                message: 'Date range is required'
            });
        }

        const report = auditLogger.generateComplianceReport(
            req.user.organizationId,
            dateRange
        );

        res.json({
            success: true,
            report: report
        });

    } catch (error) {
        auditLogger.log('error', 'compliance_report_error', {
            userId: req.user.userId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Failed to generate compliance report'
        });
    }
});

module.exports = router;