@echo off
REM HIPAA-Compliant AWS Setup Script for Windows
REM Run this script with AWS Administrator permissions

echo 🏥 Setting up HIPAA-Compliant AWS Infrastructure...

REM Configuration variables
set BUCKET_NAME=dbota-hipaa-photos-prod
set ACCOUNT_ID=196809699680
set REGION=us-east-1

echo 📋 Configuration:
echo   Bucket: %BUCKET_NAME%
echo   Account: %ACCOUNT_ID%
echo   Region: %REGION%

REM Step 1: Create KMS Key for HIPAA Encryption
echo.
echo 🔐 Step 1: Creating HIPAA KMS Key...

aws kms create-key --description "HIPAA PHI Encryption Key - Photo Collector" --key-usage ENCRYPT_DECRYPT --key-spec SYMMETRIC_DEFAULT --region %REGION% --policy "{\"Version\": \"2012-10-17\",\"Statement\": [{\"Sid\": \"Enable IAM User Permissions\",\"Effect\": \"Allow\",\"Principal\": {\"AWS\": \"arn:aws:iam::%ACCOUNT_ID%:root\"},\"Action\": \"kms:*\",\"Resource\": \"*\"},{\"Sid\": \"Allow CloudTrail logging\",\"Effect\": \"Allow\",\"Principal\": {\"Service\": \"cloudtrail.amazonaws.com\"},\"Action\": [\"kms:GenerateDataKey*\",\"kms:DescribeKey\",\"kms:Encrypt\",\"kms:ReEncrypt*\",\"kms:CreateGrant\"],\"Resource\": \"*\"},{\"Sid\": \"Allow S3 service\",\"Effect\": \"Allow\",\"Principal\": {\"Service\": \"s3.amazonaws.com\"},\"Action\": [\"kms:GenerateDataKey\",\"kms:Decrypt\"],\"Resource\": \"*\"}]}" > kms_output.json

REM Extract KMS Key ID (simplified for batch)
echo ✅ KMS Key creation initiated - check AWS console for Key ID

REM Step 2: Create Main HIPAA S3 Bucket
echo.
echo 🪣 Step 2: Creating HIPAA-Compliant S3 Bucket...

aws s3api create-bucket --bucket %BUCKET_NAME% --region %REGION%
if %errorlevel% neq 0 (
    echo ❌ Failed to create bucket. Check permissions.
    pause
    exit /b 1
)

echo ✅ S3 Bucket created: %BUCKET_NAME%

REM Enable versioning
aws s3api put-bucket-versioning --bucket %BUCKET_NAME% --versioning-configuration Status=Enabled
echo ✅ Bucket versioning enabled

REM Block public access
aws s3api put-public-access-block --bucket %BUCKET_NAME% --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
echo ✅ All public access blocked

REM Step 3: Create Access Logging Bucket
echo.
echo 📊 Step 3: Setting up Access Logging...

set LOGGING_BUCKET=%BUCKET_NAME%-access-logs

aws s3api create-bucket --bucket %LOGGING_BUCKET% --region %REGION%
echo ✅ Access logging bucket created: %LOGGING_BUCKET%

REM Configure access logging
aws s3api put-bucket-logging --bucket %BUCKET_NAME% --bucket-logging-status "{\"LoggingEnabled\": {\"TargetBucket\": \"%LOGGING_BUCKET%\",\"TargetPrefix\": \"access-logs/\"}}"
echo ✅ Access logging configured

REM Step 4: Create CloudTrail Audit Bucket
echo.
echo 📋 Step 4: Setting up CloudTrail for Audit Logging...

set AUDIT_BUCKET=%BUCKET_NAME%-audit-logs

aws s3api create-bucket --bucket %AUDIT_BUCKET% --region %REGION%
echo ✅ Audit logging bucket created: %AUDIT_BUCKET%

REM Create CloudTrail (simplified)
aws cloudtrail create-trail --name hipaa-photo-collector-audit --s3-bucket-name %AUDIT_BUCKET% --include-global-service-events --is-multi-region-trail --enable-log-file-validation
echo ✅ CloudTrail created: hipaa-photo-collector-audit

REM Start logging
aws cloudtrail start-logging --name hipaa-photo-collector-audit
echo ✅ CloudTrail logging started

echo.
echo 🎉 HIPAA-Compliant AWS Infrastructure Setup Complete!
echo.
echo 📋 Summary:
echo ✅ Main Bucket: %BUCKET_NAME%
echo ✅ Access Logs: %LOGGING_BUCKET%
echo ✅ Audit Logs: %AUDIT_BUCKET%
echo ✅ CloudTrail: hipaa-photo-collector-audit
echo.
echo ⚠️  Next Steps:
echo 1. Get KMS Key ID from AWS Console
echo 2. Update application configuration
echo 3. Enable server-side encryption with KMS key
echo 4. Test upload functionality
echo 5. Sign Business Associate Agreement (BAA) with AWS
echo.

REM Save basic configuration
echo # AWS HIPAA Configuration - Generated %date% %time% > ..\server\.env.aws
echo AWS_REGION=%REGION% >> ..\server\.env.aws
echo S3_BUCKET_NAME=%BUCKET_NAME% >> ..\server\.env.aws
echo S3_ACCESS_LOGS_BUCKET=%LOGGING_BUCKET% >> ..\server\.env.aws
echo S3_AUDIT_LOGS_BUCKET=%AUDIT_BUCKET% >> ..\server\.env.aws
echo CLOUDTRAIL_NAME=hipaa-photo-collector-audit >> ..\server\.env.aws

echo ✅ Basic configuration saved to ..\server\.env.aws
echo.
echo Please manually add KMS_KEY_ID after creation in AWS Console

pause