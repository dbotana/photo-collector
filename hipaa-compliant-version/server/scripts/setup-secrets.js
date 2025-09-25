/**
 * Setup AWS SSM Parameters for HIPAA Photo Collector
 * This script creates secure parameters in AWS Systems Manager
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');

// Configure AWS
const ssm = new AWS.SSM({ region: 'us-east-1' });

// Generate secure random strings
function generateSecureSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

async function createSSMParameter(name, value, description, type = 'SecureString') {
    try {
        const params = {
            Name: name,
            Value: value,
            Description: description,
            Type: type,
            Overwrite: true,
            KeyId: '1bd0c1fc-fee9-404e-9277-2cf102c121d8' // Your KMS key
        };

        await ssm.putParameter(params).promise();
        console.log(`✅ Created parameter: ${name}`);
    } catch (error) {
        if (error.code === 'ParameterAlreadyExists') {
            console.log(`⚠️  Parameter already exists: ${name}`);
        } else {
            console.error(`❌ Error creating parameter ${name}:`, error.message);
        }
    }
}

async function setupSecrets() {
    console.log('🔐 Setting up AWS SSM Parameters for HIPAA Photo Collector...\n');

    // Generate secure secrets
    const jwtSecret = generateSecureSecret(64);
    const auditSalt = generateSecureSecret(32);
    const sessionSecret = generateSecureSecret(32);

    const parameters = [
        {
            name: '/hipaa-photo-collector/jwt-secret',
            value: jwtSecret,
            description: 'JWT signing secret for HIPAA Photo Collector API'
        },
        {
            name: '/hipaa-photo-collector/audit-salt',
            value: auditSalt,
            description: 'Salt for hashing sensitive audit data'
        },
        {
            name: '/hipaa-photo-collector/session-secret',
            value: sessionSecret,
            description: 'Session encryption secret'
        }
    ];

    // Create all parameters
    for (const param of parameters) {
        await createSSMParameter(param.name, param.value, param.description);
    }

    console.log('\n🎉 All SSM parameters have been set up successfully!');
    console.log('📝 Note: These parameters are encrypted using your KMS key');
    console.log('🔒 Parameters created:');
    parameters.forEach(param => {
        console.log(`   - ${param.name}`);
    });
}

// Run the setup
setupSecrets().catch(error => {
    console.error('💥 Error setting up secrets:', error);
    process.exit(1);
});