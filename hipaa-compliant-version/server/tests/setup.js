/**
 * Jest Test Setup - HIPAA Compliant Testing Environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DEBUG_MODE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.S3_BUCKET_NAME = 'test-hipaa-bucket';
process.env.KMS_KEY_ID = 'test-kms-key-id';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_REGION = 'us-east-1';
process.env.AUDIT_SALT = 'test-audit-salt';

// Set up global test utilities
global.testUtils = {
    // Create mock user data
    createMockUser: () => ({
        id: 'test_user_001',
        username: 'test_user',
        organizationId: 'test_org_001',
        permissions: ['read', 'write', 'upload'],
        role: 'healthcare_provider'
    }),

    // Create mock JWT token
    createMockToken: () => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            global.testUtils.createMockUser(),
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    },

    // Create mock encrypted data
    createMockEncryptedData: () => {
        const encryption = require('../utils/encryption');
        const key = encryption.generateKey();
        const data = 'test sensitive data';
        return {
            key: key.toString('base64'),
            encrypted: encryption.encrypt(data, key),
            original: data
        };
    },

    // Mock AWS services
    mockAWS: () => {
        const AWS = require('aws-sdk');

        // Mock S3
        AWS.S3 = jest.fn(() => ({
            upload: jest.fn(() => ({
                promise: jest.fn(() => Promise.resolve({
                    Location: 'https://test-bucket.s3.amazonaws.com/test-key',
                    Key: 'test-key',
                    Bucket: 'test-bucket'
                }))
            })),
            getObject: jest.fn(() => ({
                promise: jest.fn(() => Promise.resolve({
                    Body: Buffer.from(JSON.stringify({ test: 'data' }))
                }))
            })),
            deleteObject: jest.fn(() => ({
                promise: jest.fn(() => Promise.resolve())
            })),
            listObjectsV2: jest.fn(() => ({
                promise: jest.fn(() => Promise.resolve({
                    Contents: [],
                    IsTruncated: false
                }))
            }))
        }));

        // Mock KMS
        AWS.KMS = jest.fn(() => ({
            generateDataKey: jest.fn(() => ({
                promise: jest.fn(() => Promise.resolve({
                    KeyId: 'test-key-id',
                    Plaintext: Buffer.from('test-plaintext-key'),
                    CiphertextBlob: Buffer.from('test-encrypted-key')
                }))
            }))
        }));
    },

    // Wait for async operations
    waitFor: (condition, timeout = 5000) => {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                if (condition()) {
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
};

// Set up test database (if using a database)
beforeAll(async () => {
    // Initialize test database or mock storage
    console.log('🧪 Setting up test environment...');

    // Mock AWS services
    global.testUtils.mockAWS();

    // Create test directories
    const fs = require('fs');
    const path = require('path');

    const testDirs = [
        path.join(__dirname, '../logs'),
        path.join(__dirname, '../test-results')
    ];

    testDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
});

// Clean up after all tests
afterAll(async () => {
    console.log('🧪 Cleaning up test environment...');

    // Clear any test data
    // Close database connections
    // Clean up temporary files
});

// Set up before each test
beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset timers if using fake timers
    if (jest.isMockFunction(setTimeout)) {
        jest.clearAllTimers();
    }
});

// Set up after each test
afterEach(() => {
    // Clean up any test-specific data
    // Reset state
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection in tests:', reason);
});

// Suppress console.log in tests unless debugging
if (!process.env.DEBUG_TESTS) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: console.warn, // Keep warnings
        error: console.error // Keep errors
    };
}

// Security test helpers
global.securityTestUtils = {
    // XSS test vectors
    xssVectors: [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script>alert(1)</script>',
        "';alert('xss');//",
        '<body onload=alert(1)>'
    ],

    // SQL injection test vectors
    sqlInjectionVectors: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "admin'/*",
        "' OR 1=1--",
        "'; EXEC xp_cmdshell('dir'); --"
    ],

    // Path traversal test vectors
    pathTraversalVectors: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
    ],

    // Command injection test vectors
    commandInjectionVectors: [
        '; cat /etc/passwd',
        '| whoami',
        '&& dir',
        '`whoami`',
        '$(whoami)',
        '; rm -rf /',
        '| nc -l 4444'
    ],

    // Generate malicious file content
    generateMaliciousFile: (type) => {
        const maliciousFiles = {
            executable: Buffer.from([0x4D, 0x5A]), // PE header
            script: Buffer.from('<script>alert("malicious")</script>'),
            php: Buffer.from('<?php system($_GET["cmd"]); ?>'),
            html: Buffer.from('<html><script>location="http://evil.com"</script></html>')
        };
        return maliciousFiles[type] || Buffer.from('malicious content');
    }
};

console.log('✅ Test environment setup complete');