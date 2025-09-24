/**
 * Encryption Utilities - HIPAA Compliant
 * AES encryption/decryption for PHI data
 */

const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Generate a cryptographically secure random key
 */
function generateKey() {
    return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Derive key from password using PBKDF2
 */
function deriveKey(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(SALT_LENGTH);
    }

    const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
    return { key, salt };
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(plaintext, key, associatedData = null) {
    try {
        // Convert key if it's a string
        const encryptionKey = typeof key === 'string' ? Buffer.from(key, 'base64') : key;

        // Ensure key is the right length
        if (encryptionKey.length !== KEY_LENGTH) {
            throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, got ${encryptionKey.length}`);
        }

        // Generate random IV
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher with proper parameters
        const cipher = crypto.createCipherGCM(ALGORITHM, encryptionKey, iv);

        // Add associated data for authentication (if provided)
        if (associatedData) {
            cipher.setAAD(Buffer.from(associatedData));
        }

        // Encrypt data
        let ciphertext = cipher.update(plaintext, 'utf8');
        cipher.final();

        // Get authentication tag
        const tag = cipher.getAuthTag();

        // Combine IV + ciphertext + tag
        const result = Buffer.concat([
            iv,
            ciphertext,
            tag
        ]).toString('base64');

        return result;

    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Encryption failed');
    }
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedData, key, associatedData = null) {
    try {
        // Convert key if it's a string
        const encryptionKey = typeof key === 'string' ? Buffer.from(key, 'base64') : key;

        // Ensure key is the right length
        if (encryptionKey.length !== KEY_LENGTH) {
            throw new Error(`Invalid key length. Expected ${KEY_LENGTH} bytes, got ${encryptionKey.length}`);
        }

        // Parse encrypted data
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract components
        const iv = combined.slice(0, IV_LENGTH);
        const ciphertext = combined.slice(IV_LENGTH, combined.length - TAG_LENGTH);
        const tag = combined.slice(combined.length - TAG_LENGTH);

        // Create decipher
        const decipher = crypto.createDecipherGCM(ALGORITHM, encryptionKey, iv);
        decipher.setAuthTag(tag);

        // Add associated data for authentication (if provided)
        if (associatedData) {
            decipher.setAAD(Buffer.from(associatedData));
        }

        // Decrypt data
        let plaintext = decipher.update(ciphertext, null, 'utf8');
        plaintext += decipher.final('utf8');

        return plaintext;

    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Decryption failed');
    }
}

/**
 * Hash sensitive data (one-way)
 */
function hash(data, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(SALT_LENGTH);
    }

    const hashedData = crypto.pbkdf2Sync(data, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    return {
        hash: hashedData.toString('base64'),
        salt: salt.toString('base64')
    };
}

/**
 * Verify hashed data
 */
function verifyHash(data, hashedData, salt) {
    const saltBuffer = Buffer.from(salt, 'base64');
    const computedHash = crypto.pbkdf2Sync(data, saltBuffer, ITERATIONS, KEY_LENGTH, 'sha256');

    return computedHash.toString('base64') === hashedData;
}

/**
 * Generate secure random string
 */
function generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('base64');
}

/**
 * Create HMAC for data integrity
 */
function createHMAC(data, key) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('base64');
}

/**
 * Verify HMAC
 */
function verifyHMAC(data, hmacValue, key) {
    const computedHmac = createHMAC(data, key);
    return crypto.timingSafeEqual(
        Buffer.from(hmacValue, 'base64'),
        Buffer.from(computedHmac, 'base64')
    );
}

/**
 * Encrypt PHI data with metadata
 */
function encryptPHI(phiData, masterKey) {
    const timestamp = new Date().toISOString();
    const dataWithMetadata = {
        data: phiData,
        encrypted_at: timestamp,
        version: '1.0'
    };

    const serializedData = JSON.stringify(dataWithMetadata);
    const encryptedData = encrypt(serializedData, masterKey, timestamp);

    // Create integrity hash
    const integrityHash = createHMAC(encryptedData, masterKey);

    return {
        encrypted_data: encryptedData,
        integrity_hash: integrityHash,
        encrypted_at: timestamp
    };
}

/**
 * Decrypt PHI data with verification
 */
function decryptPHI(encryptedPHI, masterKey) {
    const { encrypted_data, integrity_hash, encrypted_at } = encryptedPHI;

    // Verify integrity
    if (!verifyHMAC(encrypted_data, integrity_hash, masterKey)) {
        throw new Error('Data integrity check failed');
    }

    // Decrypt data
    const decryptedData = decrypt(encrypted_data, masterKey, encrypted_at);
    const parsedData = JSON.parse(decryptedData);

    // Verify metadata
    if (parsedData.encrypted_at !== encrypted_at) {
        throw new Error('Metadata mismatch detected');
    }

    return parsedData.data;
}

/**
 * Secure key derivation for patient data
 */
function derivePatientKey(organizationMasterKey, patientId, additionalContext = '') {
    const keyMaterial = `${patientId}:${additionalContext}:patient_key`;
    return crypto.pbkdf2Sync(
        keyMaterial,
        organizationMasterKey,
        ITERATIONS,
        KEY_LENGTH,
        'sha256'
    );
}

/**
 * Wipe sensitive data from memory (best effort)
 */
function wipeSensitiveData(buffer) {
    if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
    }
}

module.exports = {
    generateKey,
    deriveKey,
    encrypt,
    decrypt,
    hash,
    verifyHash,
    generateSecureRandom,
    createHMAC,
    verifyHMAC,
    encryptPHI,
    decryptPHI,
    derivePatientKey,
    wipeSensitiveData,

    // Constants
    ALGORITHM,
    KEY_LENGTH,
    IV_LENGTH,
    SALT_LENGTH,
    ITERATIONS
};