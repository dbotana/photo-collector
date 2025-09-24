/**
 * Secure Upload Routes - HIPAA Compliant
 * Handles encrypted file uploads to AWS S3 with audit logging
 */

const express = require('express');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const auditLogger = require('../utils/auditLogger');
const encryption = require('../utils/encryption');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken } = require('./auth');

const router = express.Router();

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    apiVersion: '2006-03-01',
    sslEnabled: true,
    s3ForcePathStyle: false,
    signatureVersion: 'v4'
});

// KMS for encryption
const kms = new AWS.KMS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

// Validation schema for secure upload
const secureUploadSchema = Joi.object({
    fileName: Joi.string().required(),
    encryptedImage: Joi.string().required(),
    encryptedMetadata: Joi.object().required(),
    hashedPatientId: Joi.string().required(),
    organizationId: Joi.string().required(),
    uploadTimestamp: Joi.string().isoDate().required(),
    originalFilename: Joi.string().required(),
    fileSize: Joi.number().integer().min(1).max(50 * 1024 * 1024).required() // Max 50MB
});

/**
 * POST /upload/secure
 * Secure upload with encryption and HIPAA compliance
 */
router.post('/secure', authenticateToken, validateRequest(secureUploadSchema), async (req, res) => {
    const {
        fileName,
        encryptedImage,
        encryptedMetadata,
        hashedPatientId,
        organizationId,
        uploadTimestamp,
        originalFilename,
        fileSize
    } = req.body;

    const { userId, username, sessionId } = req.user;
    const uploadId = uuidv4();

    try {
        // Verify user has upload permission
        if (!req.user.permissions.includes('upload')) {
            auditLogger.log('warning', 'upload_permission_denied', {
                userId,
                username,
                organizationId,
                sessionId,
                hashedPatientId
            });

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions for upload'
            });
        }

        // Verify organization match
        if (req.user.organizationId !== organizationId) {
            auditLogger.log('warning', 'upload_organization_mismatch', {
                userId,
                username,
                requestedOrg: organizationId,
                userOrg: req.user.organizationId
            });

            return res.status(403).json({
                success: false,
                message: 'Organization access denied'
            });
        }

        // Generate additional encryption layer for S3 storage
        const masterKey = await generateDataKey();
        const doubleEncryptedImage = encryption.encrypt(encryptedImage, masterKey.plaintextKey);

        // Prepare metadata for S3
        const s3Metadata = {
            'upload-id': uploadId,
            'user-id': userId,
            'username': username,
            'organization-id': organizationId,
            'hashed-patient-id': hashedPatientId,
            'upload-timestamp': uploadTimestamp,
            'original-filename': originalFilename,
            'file-size': fileSize.toString(),
            'encryption-algorithm': 'AES-256-GCM',
            'hipaa-compliant': 'true'
        };

        // Construct S3 object key with organization prefix
        const s3Key = `${organizationId}/encrypted-photos/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

        // Upload to S3 with server-side encryption
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: Buffer.from(doubleEncryptedImage, 'base64'),
            ContentType: 'application/octet-stream',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY_ID,
            Metadata: s3Metadata,
            StorageClass: 'STANDARD_IA', // Infrequent Access for cost optimization
            Tagging: `Organization=${organizationId}&HashedPatientId=${hashedPatientId}&UploaderId=${userId}&Compliance=HIPAA`
        };

        const s3Result = await s3.upload(uploadParams).promise();

        // Store encrypted metadata separately
        const metadataKey = `${organizationId}/metadata/${uploadId}.json`;
        const encryptedMetadataBuffer = Buffer.from(JSON.stringify({
            uploadId,
            encryptedMetadata,
            encryptionKeyId: masterKey.keyId,
            s3Location: s3Result.Location,
            s3Key: s3Key,
            uploadTimestamp: new Date().toISOString(),
            userId,
            username,
            organizationId
        }));

        await s3.upload({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: metadataKey,
            Body: encryptedMetadataBuffer,
            ContentType: 'application/json',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY_ID,
            StorageClass: 'STANDARD_IA'
        }).promise();

        // Log successful upload
        auditLogger.log('info', 'secure_upload_success', {
            uploadId,
            userId,
            username,
            organizationId,
            hashedPatientId,
            s3Location: s3Result.Location,
            s3Key: s3Key,
            fileSize,
            originalFilename,
            sessionId
        });

        // Return success response (no sensitive data)
        res.json({
            success: true,
            uploadId: uploadId,
            message: 'File uploaded successfully',
            uploadTimestamp: new Date().toISOString()
        });

    } catch (error) {
        // Log upload failure
        auditLogger.log('error', 'secure_upload_failed', {
            uploadId,
            userId,
            username,
            organizationId,
            hashedPatientId,
            error: error.message,
            sessionId
        });

        console.error('Upload error:', error);

        // Return generic error message
        res.status(500).json({
            success: false,
            message: 'Upload failed. Please try again.'
        });
    }
});

/**
 * GET /upload/history
 * Get upload history for the authenticated user's organization
 */
router.get('/history', authenticateToken, async (req, res) => {
    const { userId, username, organizationId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Max 50 items per page

    try {
        // Verify user has read permission
        if (!req.user.permissions.includes('read')) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        // List objects in the organization's folder
        const listParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Prefix: `${organizationId}/metadata/`,
            MaxKeys: limit,
            StartAfter: page > 1 ? `${organizationId}/metadata/page_${page - 1}` : undefined
        };

        const s3Objects = await s3.listObjectsV2(listParams).promise();
        const uploads = [];

        // Fetch metadata for each object
        for (const obj of s3Objects.Contents || []) {
            try {
                const metadataResponse = await s3.getObject({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: obj.Key
                }).promise();

                const metadata = JSON.parse(metadataResponse.Body.toString());

                // Only return uploads from this user's organization
                if (metadata.organizationId === organizationId) {
                    uploads.push({
                        uploadId: metadata.uploadId,
                        uploadTimestamp: metadata.uploadTimestamp,
                        originalFilename: metadata.originalFilename,
                        username: metadata.username,
                        hashedPatientId: metadata.hashedPatientId
                    });
                }
            } catch (metadataError) {
                console.warn('Failed to read metadata:', metadataError);
            }
        }

        auditLogger.log('info', 'upload_history_accessed', {
            userId,
            username,
            organizationId,
            page,
            resultCount: uploads.length
        });

        res.json({
            success: true,
            uploads: uploads,
            page: page,
            hasMore: s3Objects.IsTruncated || false
        });

    } catch (error) {
        auditLogger.log('error', 'upload_history_error', {
            userId,
            username,
            organizationId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve upload history'
        });
    }
});

/**
 * DELETE /upload/:uploadId
 * Secure deletion of uploaded files (HIPAA right to deletion)
 */
router.delete('/:uploadId', authenticateToken, async (req, res) => {
    const { uploadId } = req.params;
    const { userId, username, organizationId } = req.user;

    try {
        // Verify user has delete permission (admin only)
        if (!req.user.permissions.includes('delete') && req.user.role !== 'admin') {
            auditLogger.log('warning', 'delete_permission_denied', {
                userId,
                username,
                organizationId,
                uploadId
            });

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions for deletion'
            });
        }

        // Find metadata file
        const metadataKey = `${organizationId}/metadata/${uploadId}.json`;

        let metadata;
        try {
            const metadataResponse = await s3.getObject({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: metadataKey
            }).promise();
            metadata = JSON.parse(metadataResponse.Body.toString());
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'Upload not found'
            });
        }

        // Verify organization match
        if (metadata.organizationId !== organizationId) {
            auditLogger.log('warning', 'delete_organization_mismatch', {
                userId,
                username,
                uploadId,
                requestedOrg: organizationId,
                fileOrg: metadata.organizationId
            });

            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Delete encrypted photo
        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: metadata.s3Key
        }).promise();

        // Delete metadata
        await s3.deleteObject({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: metadataKey
        }).promise();

        auditLogger.log('info', 'secure_upload_deleted', {
            uploadId,
            userId,
            username,
            organizationId,
            deletedBy: username,
            s3Key: metadata.s3Key
        });

        res.json({
            success: true,
            message: 'Upload deleted successfully'
        });

    } catch (error) {
        auditLogger.log('error', 'delete_upload_error', {
            uploadId,
            userId,
            username,
            organizationId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: 'Failed to delete upload'
        });
    }
});

/**
 * Generate a data encryption key using AWS KMS
 */
async function generateDataKey() {
    const params = {
        KeyId: process.env.KMS_KEY_ID,
        KeySpec: 'AES_256'
    };

    try {
        const result = await kms.generateDataKey(params).promise();
        return {
            keyId: result.KeyId,
            plaintextKey: result.Plaintext.toString('base64'),
            encryptedKey: result.CiphertextBlob.toString('base64')
        };
    } catch (error) {
        console.error('KMS key generation error:', error);
        throw new Error('Failed to generate encryption key');
    }
}

module.exports = router;