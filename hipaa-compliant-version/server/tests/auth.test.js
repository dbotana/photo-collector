/**
 * Authentication Tests - HIPAA Compliant
 * Comprehensive testing for secure authentication system
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../app');

describe('Authentication System', () => {
    let server;

    beforeAll(() => {
        process.env.NODE_ENV = 'test';
        process.env.DEBUG_MODE = 'true';
        server = app.listen(0); // Random port for testing
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    describe('POST /auth/login', () => {
        test('should successfully authenticate valid credentials', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'demo123'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user', 'demo');
            expect(response.body).toHaveProperty('organizationId');
            expect(response.body).toHaveProperty('expiresIn', 3600);

            // Verify JWT token structure
            const decoded = jwt.decode(response.body.token);
            expect(decoded).toHaveProperty('userId');
            expect(decoded).toHaveProperty('username', 'demo');
            expect(decoded).toHaveProperty('organizationId');
            expect(decoded).toHaveProperty('sessionId');
        });

        test('should reject invalid username', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'invalid_user',
                    password: 'demo123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Invalid credentials');
            expect(response.body).not.toHaveProperty('token');
        });

        test('should reject invalid password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'wrong_password'
                })
                .expect(401);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Invalid credentials');
        });

        test('should validate required fields', async () => {
            // Missing username
            await request(app)
                .post('/auth/login')
                .send({ password: 'demo123' })
                .expect(400);

            // Missing password
            await request(app)
                .post('/auth/login')
                .send({ username: 'demo' })
                .expect(400);

            // Empty request
            await request(app)
                .post('/auth/login')
                .send({})
                .expect(400);
        });

        test('should handle rate limiting for excessive attempts', async () => {
            const attempts = [];

            // Make multiple rapid requests
            for (let i = 0; i < 6; i++) {
                attempts.push(
                    request(app)
                        .post('/auth/login')
                        .send({
                            username: 'attacker',
                            password: 'wrong'
                        })
                );
            }

            const responses = await Promise.all(attempts);

            // At least one should be rate limited
            const rateLimited = responses.some(res => res.status === 429);
            expect(rateLimited).toBe(true);
        });

        test('should sanitize input data', async () => {
            const maliciousPayload = {
                username: '<script>alert("xss")</script>',
                password: 'DROP TABLE users; --'
            };

            const response = await request(app)
                .post('/auth/login')
                .send(maliciousPayload)
                .expect(401);

            // Should not crash and should handle malicious input safely
            expect(response.body).toHaveProperty('success', false);
        });
    });

    describe('POST /auth/logout', () => {
        let authToken;

        beforeEach(async () => {
            // Login to get token
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'demo123'
                });

            authToken = loginResponse.body.token;
        });

        test('should successfully logout with valid token', async () => {
            const response = await request(app)
                .post('/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Logged out successfully');
        });

        test('should require authentication token', async () => {
            await request(app)
                .post('/auth/logout')
                .expect(401);
        });

        test('should reject invalid token', async () => {
            await request(app)
                .post('/auth/logout')
                .set('Authorization', 'Bearer invalid_token')
                .expect(403);
        });
    });

    describe('GET /auth/verify', () => {
        let authToken;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'demo123'
                });

            authToken = loginResponse.body.token;
        });

        test('should verify valid token', async () => {
            const response = await request(app)
                .get('/auth/verify')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('username', 'demo');
        });

        test('should reject missing token', async () => {
            await request(app)
                .get('/auth/verify')
                .expect(401);
        });
    });

    describe('Security Features', () => {
        test('should include security headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
        });

        test('should validate content-type for POST requests', async () => {
            await request(app)
                .post('/auth/login')
                .set('Content-Type', 'text/plain')
                .send('invalid data')
                .expect(400);
        });

        test('should prevent request size attacks', async () => {
            const largePayload = {
                username: 'a'.repeat(1000000), // 1MB username
                password: 'password'
            };

            await request(app)
                .post('/auth/login')
                .send(largePayload)
                .expect(413); // Request entity too large
        });
    });

    describe('HIPAA Compliance', () => {
        test('should log authentication attempts', async () => {
            // This would need to check audit logs in a real implementation
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'demo123'
                })
                .expect(200);

            // Verify audit trail exists (implementation dependent)
            expect(response.body.success).toBe(true);
        });

        test('should not expose sensitive information in errors', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'password'
                })
                .expect(401);

            // Should use generic error message
            expect(response.body.message).toBe('Invalid credentials');
            expect(response.body).not.toHaveProperty('userFound');
            expect(response.body).not.toHaveProperty('passwordMatch');
        });
    });

    describe('Performance Tests', () => {
        test('should respond to login within reasonable time', async () => {
            const start = Date.now();

            await request(app)
                .post('/auth/login')
                .send({
                    username: 'demo',
                    password: 'demo123'
                })
                .expect(200);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
        });

        test('should handle concurrent login requests', async () => {
            const requests = Array(10).fill().map(() =>
                request(app)
                    .post('/auth/login')
                    .send({
                        username: 'demo',
                        password: 'demo123'
                    })
            );

            const responses = await Promise.all(requests);

            // All requests should succeed
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});

// Encryption utility tests
describe('Encryption Utilities', () => {
    const encryption = require('../utils/encryption');

    test('should encrypt and decrypt data correctly', () => {
        const plaintext = 'Sensitive HIPAA data';
        const key = encryption.generateKey();

        const encrypted = encryption.encrypt(plaintext, key);
        const decrypted = encryption.decrypt(encrypted, key);

        expect(decrypted).toBe(plaintext);
        expect(encrypted).not.toBe(plaintext);
        expect(encrypted.length).toBeGreaterThan(plaintext.length);
    });

    test('should generate secure random keys', () => {
        const key1 = encryption.generateKey();
        const key2 = encryption.generateKey();

        expect(key1).not.toBe(key2);
        expect(key1.length).toBe(encryption.KEY_LENGTH);
        expect(Buffer.isBuffer(key1)).toBe(true);
    });

    test('should hash sensitive data consistently', () => {
        const data = 'patient_id_12345';
        const salt = Buffer.from('test_salt');

        const hash1 = encryption.hash(data, salt);
        const hash2 = encryption.hash(data, salt);

        expect(hash1.hash).toBe(hash2.hash);
        expect(hash1.salt).toBe(hash2.salt);
    });

    test('should verify hashed data correctly', () => {
        const data = 'sensitive_data';
        const hashedData = encryption.hash(data);

        const isValid = encryption.verifyHash(data, hashedData.hash, hashedData.salt);
        const isInvalid = encryption.verifyHash('wrong_data', hashedData.hash, hashedData.salt);

        expect(isValid).toBe(true);
        expect(isInvalid).toBe(false);
    });

    test('should encrypt PHI data with metadata', () => {
        const phiData = {
            patientId: 'P123456',
            diagnosis: 'Hypertension',
            notes: 'Patient stable'
        };

        const key = encryption.generateKey();
        const encrypted = encryption.encryptPHI(phiData, key);

        expect(encrypted).toHaveProperty('encrypted_data');
        expect(encrypted).toHaveProperty('integrity_hash');
        expect(encrypted).toHaveProperty('encrypted_at');

        const decrypted = encryption.decryptPHI(encrypted, key);
        expect(decrypted).toEqual(phiData);
    });

    test('should detect data tampering', () => {
        const phiData = { patientId: 'P123456' };
        const key = encryption.generateKey();
        const encrypted = encryption.encryptPHI(phiData, key);

        // Tamper with the encrypted data
        encrypted.encrypted_data = 'tampered_data';

        expect(() => {
            encryption.decryptPHI(encrypted, key);
        }).toThrow('Data integrity check failed');
    });
});