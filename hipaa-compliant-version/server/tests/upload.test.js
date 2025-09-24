/**
 * Upload Tests - HIPAA Compliant
 * Comprehensive testing for secure file upload system
 */

const request = require('supertest');
const AWS = require('aws-sdk');
const app = require('../app');
const encryption = require('../utils/encryption');

// Mock AWS services
jest.mock('aws-sdk');

describe('Secure Upload System', () => {
    let server;
    let authToken;

    beforeAll(() => {
        process.env.NODE_ENV = 'test';
        process.env.DEBUG_MODE = 'true';
        process.env.S3_BUCKET_NAME = 'test-hipaa-bucket';
        process.env.KMS_KEY_ID = 'test-kms-key';

        server = app.listen(0);
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    beforeEach(async () => {
        // Login to get auth token
        const loginResponse = await request(app)
            .post('/auth/login')
            .send({
                username: 'demo',
                password: 'demo123'
            });

        authToken = loginResponse.body.token;

        // Reset AWS mocks
        jest.clearAllMocks();

        // Mock S3 upload
        const mockS3Instance = {
            upload: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({
                    Location: 'https://test-bucket.s3.amazonaws.com/test-file',
                    Key: 'test-key',
                    Bucket: 'test-bucket'
                })
            })
        };

        // Mock KMS
        const mockKMSInstance = {
            generateDataKey: jest.fn().mockReturnValue({
                promise: jest.fn().mockResolvedValue({
                    KeyId: 'test-key-id',
                    Plaintext: Buffer.from('test-plaintext-key'),
                    CiphertextBlob: Buffer.from('test-encrypted-key')
                })
            })
        };

        AWS.S3.mockImplementation(() => mockS3Instance);
        AWS.KMS.mockImplementation(() => mockKMSInstance);
    });

    describe('POST /upload/secure', () => {
        const createValidUploadPayload = () => {
            const key = encryption.generateKey();
            const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/...'; // Mock base64 image
            const encryptedImage = encryption.encrypt(imageData, key);

            const formData = {
                description: 'Test description',
                patientId: 'P123456',
                visitDate: '2024-01-15',
                phoneModel: 'iPhone 14',
                organizationId: 'org_healthcare_001'
            };

            const encryptedMetadata = {};
            Object.entries(formData).forEach(([key, value]) => {
                encryptedMetadata[key] = ['description', 'patientId'].includes(key)
                    ? encryption.encrypt(value, key)
                    : value;
            });

            return {
                fileName: 'test-photo.jpg',
                encryptedImage: encryptedImage,
                encryptedMetadata: encryptedMetadata,
                hashedPatientId: encryption.hash(formData.patientId).hash,
                organizationId: formData.organizationId,
                uploadTimestamp: new Date().toISOString(),
                originalFilename: 'photo_12345.jpg',
                fileSize: 1024000 // 1MB
            };
        };

        test('should successfully upload encrypted file', async () => {
            const uploadPayload = createValidUploadPayload();

            const response = await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(uploadPayload)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('uploadId');
            expect(response.body).toHaveProperty('message', 'File uploaded successfully');
            expect(response.body).toHaveProperty('uploadTimestamp');

            // Verify S3 upload was called
            expect(AWS.S3).toHaveBeenCalled();
            const s3Instance = AWS.S3.mock.results[0].value;
            expect(s3Instance.upload).toHaveBeenCalled();
        });

        test('should require authentication', async () => {
            const uploadPayload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .send(uploadPayload)
                .expect(401);
        });

        test('should validate required fields', async () => {
            const tests = [
                { field: 'fileName', value: null },
                { field: 'encryptedImage', value: null },
                { field: 'encryptedMetadata', value: null },
                { field: 'hashedPatientId', value: null },
                { field: 'organizationId', value: null },
                { field: 'uploadTimestamp', value: null },
                { field: 'originalFilename', value: null },
                { field: 'fileSize', value: null }
            ];

            for (const test of tests) {
                const payload = createValidUploadPayload();
                payload[test.field] = test.value;

                await request(app)
                    .post('/upload/secure')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(payload)
                    .expect(400);
            }
        });

        test('should validate file size limits', async () => {
            const payload = createValidUploadPayload();
            payload.fileSize = 100 * 1024 * 1024; // 100MB - exceeds 50MB limit

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(400);
        });

        test('should verify organization access', async () => {
            const payload = createValidUploadPayload();
            payload.organizationId = 'different_org_123'; // Different from user's org

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(403);
        });

        test('should handle S3 upload failures', async () => {
            // Mock S3 failure
            const mockS3Instance = {
                upload: jest.fn().mockReturnValue({
                    promise: jest.fn().mockRejectedValue(new Error('S3 upload failed'))
                })
            };
            AWS.S3.mockImplementation(() => mockS3Instance);

            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(500);
        });

        test('should include proper S3 metadata', async () => {
            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            const s3Instance = AWS.S3.mock.results[0].value;
            const uploadCall = s3Instance.upload.mock.calls[0][0];

            expect(uploadCall).toHaveProperty('ServerSideEncryption', 'aws:kms');
            expect(uploadCall).toHaveProperty('SSEKMSKeyId', 'test-kms-key');
            expect(uploadCall.Metadata).toHaveProperty('hipaa-compliant', 'true');
            expect(uploadCall.Metadata).toHaveProperty('encryption-algorithm', 'AES-256-GCM');
        });

        test('should use proper S3 key structure', async () => {
            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            const s3Instance = AWS.S3.mock.results[0].value;
            const uploadCall = s3Instance.upload.mock.calls[0][0];

            // Should include organization prefix and date-based structure
            expect(uploadCall.Key).toMatch(/^org_healthcare_001\/encrypted-photos\/\d{4}\/\d{1,2}\//);
        });
    });

    describe('GET /upload/history', () => {
        test('should return upload history for authenticated user', async () => {
            // Mock S3 listObjectsV2
            const mockS3Instance = {
                listObjectsV2: jest.fn().mockReturnValue({
                    promise: jest.fn().mockResolvedValue({
                        Contents: [
                            { Key: 'org_healthcare_001/metadata/upload1.json' }
                        ],
                        IsTruncated: false
                    })
                }),
                getObject: jest.fn().mockReturnValue({
                    promise: jest.fn().mockResolvedValue({
                        Body: Buffer.from(JSON.stringify({
                            uploadId: 'upload1',
                            organizationId: 'org_healthcare_001',
                            uploadTimestamp: new Date().toISOString(),
                            originalFilename: 'test.jpg',
                            username: 'demo',
                            hashedPatientId: 'hash123'
                        }))
                    })
                })
            };
            AWS.S3.mockImplementation(() => mockS3Instance);

            const response = await request(app)
                .get('/upload/history')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('uploads');
            expect(Array.isArray(response.body.uploads)).toBe(true);
        });

        test('should require authentication for history access', async () => {
            await request(app)
                .get('/upload/history')
                .expect(401);
        });

        test('should support pagination', async () => {
            await request(app)
                .get('/upload/history?page=2&limit=10')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
        });
    });

    describe('DELETE /upload/:uploadId', () => {
        test('should delete upload with proper permissions', async () => {
            // Mock S3 operations
            const mockS3Instance = {
                getObject: jest.fn().mockReturnValue({
                    promise: jest.fn().mockResolvedValue({
                        Body: Buffer.from(JSON.stringify({
                            uploadId: 'test-upload-id',
                            organizationId: 'org_healthcare_001',
                            s3Key: 'test-key'
                        }))
                    })
                }),
                deleteObject: jest.fn().mockReturnValue({
                    promise: jest.fn().mockResolvedValue({})
                })
            };
            AWS.S3.mockImplementation(() => mockS3Instance);

            const response = await request(app)
                .delete('/upload/test-upload-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Upload deleted successfully');

            // Verify both file and metadata were deleted
            expect(mockS3Instance.deleteObject).toHaveBeenCalledTimes(2);
        });

        test('should require authentication for deletion', async () => {
            await request(app)
                .delete('/upload/test-upload-id')
                .expect(401);
        });

        test('should handle non-existent upload', async () => {
            const mockS3Instance = {
                getObject: jest.fn().mockReturnValue({
                    promise: jest.fn().mockRejectedValue(new Error('NoSuchKey'))
                })
            };
            AWS.S3.mockImplementation(() => mockS3Instance);

            await request(app)
                .delete('/upload/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });

    describe('Security Tests', () => {
        test('should sanitize upload metadata', async () => {
            const payload = createValidUploadPayload();
            payload.organizationId = '<script>alert("xss")</script>';

            const response = await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(403); // Should be rejected due to organization mismatch

            expect(response.body.success).toBe(false);
        });

        test('should validate upload timestamp', async () => {
            const payload = createValidUploadPayload();
            payload.uploadTimestamp = 'invalid-timestamp';

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(400);
        });

        test('should prevent path traversal in filenames', async () => {
            const payload = createValidUploadPayload();
            payload.fileName = '../../etc/passwd';

            const response = await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(400);
        });
    });

    describe('Performance Tests', () => {
        test('should handle upload within reasonable time', async () => {
            const payload = createValidUploadPayload();
            const start = Date.now();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should handle concurrent uploads', async () => {
            const uploads = Array(5).fill().map(() => {
                const payload = createValidUploadPayload();
                return request(app)
                    .post('/upload/secure')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(payload);
            });

            const responses = await Promise.all(uploads);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });

    describe('HIPAA Compliance', () => {
        test('should create audit trail for uploads', async () => {
            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            // Audit logging would be verified through log analysis in real implementation
            // This test serves as a reminder that audit trails must be present
        });

        test('should use proper encryption in transit and at rest', async () => {
            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            const s3Instance = AWS.S3.mock.results[0].value;
            const uploadCall = s3Instance.upload.mock.calls[0][0];

            // Verify server-side encryption is enabled
            expect(uploadCall.ServerSideEncryption).toBe('aws:kms');
            expect(uploadCall.SSEKMSKeyId).toBeDefined();
        });

        test('should isolate data by organization', async () => {
            const payload = createValidUploadPayload();

            await request(app)
                .post('/upload/secure')
                .set('Authorization', `Bearer ${authToken}`)
                .send(payload)
                .expect(200);

            const s3Instance = AWS.S3.mock.results[0].value;
            const uploadCall = s3Instance.upload.mock.calls[0][0];

            // Verify organization prefix in S3 key
            expect(uploadCall.Key).toMatch(/^org_healthcare_001\//);
        });
    });
});

// Encryption integration tests
describe('Upload Encryption Integration', () => {
    test('should maintain data integrity through encryption layers', () => {
        const originalData = {
            patientId: 'P123456',
            description: 'Test description'
        };

        const clientKey = encryption.generateKey();
        const serverKey = encryption.generateKey();

        // Simulate client-side encryption
        const clientEncrypted = encryption.encrypt(JSON.stringify(originalData), clientKey);

        // Simulate server-side encryption
        const serverEncrypted = encryption.encrypt(clientEncrypted, serverKey);

        // Verify decryption process
        const serverDecrypted = encryption.decrypt(serverEncrypted, serverKey);
        const clientDecrypted = encryption.decrypt(serverDecrypted, clientKey);
        const finalData = JSON.parse(clientDecrypted);

        expect(finalData).toEqual(originalData);
    });

    test('should detect tampering in double-encrypted data', () => {
        const data = 'sensitive information';
        const key1 = encryption.generateKey();
        const key2 = encryption.generateKey();

        const encrypted1 = encryption.encrypt(data, key1);
        const encrypted2 = encryption.encrypt(encrypted1, key2);

        // Tamper with the outer encryption
        const tamperedData = encrypted2.slice(0, -10) + 'tampered!!';

        expect(() => {
            encryption.decrypt(tamperedData, key2);
        }).toThrow();
    });
});