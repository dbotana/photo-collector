/**
 * Minimal Debug Version of HIPAA Photo Collector API
 * For troubleshooting Lambda issues
 */

const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');

const app = express();

// Basic CORS configuration
const corsOptions = {
    origin: ['https://dbotana.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // for legacy browser support
};

app.use(cors(corsOptions));

// Add manual CORS headers for extra compatibility
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'https://dbotana.github.io');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        console.log('Handling OPTIONS request for:', req.originalUrl);
        return res.status(200).json({
            message: 'CORS preflight successful',
            origin: req.headers.origin,
            method: req.method,
            url: req.originalUrl
        });
    }
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add error handling middleware
app.use((error, req, res, next) => {
    console.error('Express Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        error: error.message
    });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-debug',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Demo authentication system
const users = {
    'demo': {
        id: 'user_demo_001',
        username: 'demo',
        name: 'Dr. Demo User',
        organizationId: 'org_demo_001',
        role: 'healthcare_provider',
        password: 'demo123' // In production, this would be hashed
    }
};

app.post('/auth/login', (req, res) => {
    console.log('Auth login requested:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required',
            timestamp: new Date().toISOString()
        });
    }

    const user = users[username];

    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
            timestamp: new Date().toISOString()
        });
    }

    // In production, generate a real JWT token
    const token = `demo_token_${Date.now()}`;

    res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
            id: user.id,
            username: user.username,
            name: user.name,
            organizationId: user.organizationId,
            role: user.role
        },
        timestamp: new Date().toISOString()
    });
});

app.post('/auth/logout', (req, res) => {
    console.log('Auth logout requested');
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString()
    });
});

// Configure AWS S3
const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Real S3 upload endpoint
app.post('/upload', async (req, res) => {
    console.log('Upload requested');
    console.log('Image size:', req.body.image ? req.body.image.length : 'no image');
    console.log('Metadata:', req.body.metadata);

    try {
        const { image, metadata } = req.body;

        if (!image || !metadata) {
            return res.status(400).json({
                success: false,
                message: 'Image and metadata are required',
                timestamp: new Date().toISOString()
            });
        }

        // Generate unique upload ID and file path
        const uploadId = `upload_${Date.now()}`;
        const timestamp = new Date();
        const year = timestamp.getFullYear();
        const month = timestamp.getMonth() + 1;
        const organizationId = metadata.organizationId || 'unknown_org';

        // Create S3 key with proper structure
        const s3Key = `${organizationId}/encrypted-photos/${year}/${month}/${uploadId}.jpg`;

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(image, 'base64');

        // Prepare S3 upload parameters
        const uploadParams = {
            Bucket: 'dbota-hipaa-photos-prod',
            Key: s3Key,
            Body: imageBuffer,
            ContentType: 'image/jpeg',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY_ID || '1bd0c1fc-fee9-404e-9277-2cf102c121d8',
            Metadata: {
                'patient-id-hash': metadata.patientId || '',
                'visit-date': metadata.visitDate || '',
                'organization-id': organizationId,
                'device-model': metadata.deviceModel || '',
                'upload-timestamp': timestamp.toISOString(),
                'file-size': imageBuffer.length.toString(),
                'original-filename': metadata.fileName || 'unknown.jpg'
            }
        };

        console.log('Uploading to S3:', { bucket: uploadParams.Bucket, key: s3Key });

        // Upload to S3
        const result = await s3.upload(uploadParams).promise();

        console.log('S3 upload successful:', result.Location);

        // Also upload metadata as separate file
        const metadataParams = {
            Bucket: 'dbota-hipaa-photos-prod',
            Key: `${organizationId}/metadata/${uploadId}.json`,
            Body: JSON.stringify({
                ...metadata,
                uploadId,
                s3Location: result.Location,
                s3Key,
                uploadTimestamp: timestamp.toISOString(),
                encryptedWithKMS: true
            }, null, 2),
            ContentType: 'application/json',
            ServerSideEncryption: 'aws:kms',
            SSEKMSKeyId: process.env.KMS_KEY_ID || '1bd0c1fc-fee9-404e-9277-2cf102c121d8'
        };

        await s3.upload(metadataParams).promise();

        res.status(200).json({
            success: true,
            message: 'Photo uploaded successfully to HIPAA S3 bucket',
            uploadId: uploadId,
            s3Location: result.Location,
            s3Key: s3Key,
            bucketName: 'dbota-hipaa-photos-prod',
            encrypted: true,
            kmsKeyId: uploadParams.SSEKMSKeyId,
            timestamp: timestamp.toISOString()
        });

    } catch (error) {
        console.error('S3 upload error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to upload to S3',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// OPTIONS requests are now handled in the CORS middleware above

// 404 handler
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;