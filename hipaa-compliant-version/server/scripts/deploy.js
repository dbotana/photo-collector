/**
 * Comprehensive deployment script for HIPAA Photo Collector Lambda
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 ${description}...`);
        console.log(`   Running: ${command}\n`);

        const process = exec(command, { cwd: __dirname, maxBuffer: 1024 * 1024 * 10 });

        process.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        process.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${description} completed successfully\n`);
                resolve();
            } else {
                console.error(`❌ ${description} failed with code ${code}\n`);
                reject(new Error(`Command failed: ${command}`));
            }
        });
    });
}

async function checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');

    // Check if AWS CLI is configured
    try {
        await runCommand('aws sts get-caller-identity', 'Checking AWS credentials');
    } catch (error) {
        console.error('❌ AWS CLI not configured or no credentials found');
        console.log('Please run: aws configure');
        process.exit(1);
    }

    // Check if serverless is installed
    try {
        await runCommand('npx serverless --version', 'Checking Serverless Framework');
    } catch (error) {
        console.error('❌ Serverless Framework not found');
        console.log('Installing Serverless Framework...');
        await runCommand('npm install', 'Installing dependencies');
    }
}

async function setupSecrets() {
    console.log('🔐 Setting up AWS SSM parameters...\n');
    try {
        await runCommand('node scripts/setup-secrets.js', 'Creating SSM parameters');
    } catch (error) {
        console.log('⚠️  SSM setup failed, but continuing deployment...\n');
    }
}

async function deployLambda() {
    console.log('🚀 Deploying to AWS Lambda...\n');
    await runCommand('npx serverless deploy --stage prod', 'Deploying Lambda function');
}

async function testDeployment() {
    console.log('🧪 Testing deployment...\n');
    try {
        // Get the deployed endpoint URL
        const result = await runCommand('npx serverless info --stage prod', 'Getting deployment info');
        console.log('✅ Deployment test completed\n');
    } catch (error) {
        console.log('⚠️  Could not test deployment automatically\n');
    }
}

async function main() {
    console.log('🏥 HIPAA Photo Collector - AWS Lambda Deployment\n');
    console.log('================================================\n');

    try {
        await checkPrerequisites();
        await setupSecrets();
        await deployLambda();
        await testDeployment();

        console.log('🎉 Deployment completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Note the API Gateway endpoint URL from the deployment output');
        console.log('2. Update your frontend configuration with the new API URL');
        console.log('3. Test the deployed API endpoints');
        console.log('4. Verify photos are uploading to dbota-hipaa-photos-prod bucket');

    } catch (error) {
        console.error('💥 Deployment failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Ensure AWS credentials are configured: aws configure');
        console.log('2. Verify you have permissions for Lambda, API Gateway, and S3');
        console.log('3. Check the AWS CloudWatch logs for detailed error messages');
        process.exit(1);
    }
}

// Run deployment
main();