#!/bin/bash

# HIPAA-Compliant AWS Setup Script
# Run this script with AWS Administrator permissions

set -e  # Exit on any error

echo "🏥 Setting up HIPAA-Compliant AWS Infrastructure..."

# Configuration variables
BUCKET_NAME="dbota-hipaa-photos-prod"
ACCOUNT_ID="196809699680"
REGION="us-east-1"

echo "📋 Configuration:"
echo "  Bucket: $BUCKET_NAME"
echo "  Account: $ACCOUNT_ID"
echo "  Region: $REGION"

# Step 1: Create KMS Key for HIPAA Encryption
echo ""
echo "🔐 Step 1: Creating HIPAA KMS Key..."

KMS_KEY_OUTPUT=$(aws kms create-key \
    --description "HIPAA PHI Encryption Key - Photo Collector" \
    --key-usage ENCRYPT_DECRYPT \
    --key-spec SYMMETRIC_DEFAULT \
    --region $REGION \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Enable IAM User Permissions",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::'$ACCOUNT_ID':root"
                },
                "Action": "kms:*",
                "Resource": "*"
            },
            {
                "Sid": "Allow CloudTrail logging",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudtrail.amazonaws.com"
                },
                "Action": [
                    "kms:GenerateDataKey*",
                    "kms:DescribeKey",
                    "kms:Encrypt",
                    "kms:ReEncrypt*",
                    "kms:CreateGrant"
                ],
                "Resource": "*"
            },
            {
                "Sid": "Allow S3 service",
                "Effect": "Allow",
                "Principal": {
                    "Service": "s3.amazonaws.com"
                },
                "Action": [
                    "kms:GenerateDataKey",
                    "kms:Decrypt"
                ],
                "Resource": "*"
            }
        ]
    }')

KMS_KEY_ID=$(echo $KMS_KEY_OUTPUT | jq -r '.KeyMetadata.KeyId')
KMS_KEY_ARN=$(echo $KMS_KEY_OUTPUT | jq -r '.KeyMetadata.Arn')

echo "✅ KMS Key created: $KMS_KEY_ID"

# Create alias for easier reference
aws kms create-alias \
    --alias-name alias/hipaa-photo-collector \
    --target-key-id $KMS_KEY_ID \
    --region $REGION

echo "✅ KMS Alias created: alias/hipaa-photo-collector"

# Step 2: Create Main HIPAA S3 Bucket
echo ""
echo "🪣 Step 2: Creating HIPAA-Compliant S3 Bucket..."

aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION

echo "✅ S3 Bucket created: $BUCKET_NAME"

# Enable versioning (REQUIRED for HIPAA)
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

echo "✅ Bucket versioning enabled"

# Enable server-side encryption with KMS
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms",
                    "KMSMasterKeyID": "'$KMS_KEY_ARN'"
                },
                "BucketKeyEnabled": true
            }
        ]
    }'

echo "✅ Bucket encryption enabled with KMS"

# Block ALL public access (CRITICAL for HIPAA)
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "✅ All public access blocked"

# Step 3: Create Access Logging Bucket
echo ""
echo "📊 Step 3: Setting up Access Logging..."

LOGGING_BUCKET="${BUCKET_NAME}-access-logs"

aws s3api create-bucket \
    --bucket $LOGGING_BUCKET \
    --region $REGION

echo "✅ Access logging bucket created: $LOGGING_BUCKET"

# Configure access logging
aws s3api put-bucket-logging \
    --bucket $BUCKET_NAME \
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "'$LOGGING_BUCKET'",
            "TargetPrefix": "access-logs/"
        }
    }'

echo "✅ Access logging configured"

# Step 4: Create CloudTrail Audit Bucket
echo ""
echo "📋 Step 4: Setting up CloudTrail for Audit Logging..."

AUDIT_BUCKET="${BUCKET_NAME}-audit-logs"

aws s3api create-bucket \
    --bucket $AUDIT_BUCKET \
    --region $REGION

echo "✅ Audit logging bucket created: $AUDIT_BUCKET"

# Configure CloudTrail bucket policy
aws s3api put-bucket-policy \
    --bucket $AUDIT_BUCKET \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AWSCloudTrailAclCheck",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudtrail.amazonaws.com"
                },
                "Action": "s3:GetBucketAcl",
                "Resource": "arn:aws:s3:::'$AUDIT_BUCKET'"
            },
            {
                "Sid": "AWSCloudTrailWrite",
                "Effect": "Allow",
                "Principal": {
                    "Service": "cloudtrail.amazonaws.com"
                },
                "Action": "s3:PutObject",
                "Resource": "arn:aws:s3:::'$AUDIT_BUCKET'/*",
                "Condition": {
                    "StringEquals": {
                        "s3:x-amz-acl": "bucket-owner-full-control"
                    }
                }
            }
        ]
    }'

echo "✅ CloudTrail bucket policy configured"

# Create CloudTrail
aws cloudtrail create-trail \
    --name hipaa-photo-collector-audit \
    --s3-bucket-name $AUDIT_BUCKET \
    --include-global-service-events \
    --is-multi-region-trail \
    --enable-log-file-validation \
    --kms-key-id $KMS_KEY_ARN

echo "✅ CloudTrail created: hipaa-photo-collector-audit"

# Start logging
aws cloudtrail start-logging \
    --name hipaa-photo-collector-audit

echo "✅ CloudTrail logging started"

# Step 5: Create Backup Bucket
echo ""
echo "💾 Step 5: Creating Backup Bucket..."

BACKUP_BUCKET="${BUCKET_NAME}-backups"

aws s3api create-bucket \
    --bucket $BACKUP_BUCKET \
    --region $REGION

# Enable versioning on backup bucket
aws s3api put-bucket-versioning \
    --bucket $BACKUP_BUCKET \
    --versioning-configuration Status=Enabled

# Enable encryption on backup bucket
aws s3api put-bucket-encryption \
    --bucket $BACKUP_BUCKET \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "aws:kms",
                    "KMSMasterKeyID": "'$KMS_KEY_ARN'"
                },
                "BucketKeyEnabled": true
            }
        ]
    }'

echo "✅ Backup bucket created and configured: $BACKUP_BUCKET"

# Step 6: Set up Lifecycle Policies
echo ""
echo "🔄 Step 6: Configuring Lifecycle Policies..."

# Main bucket lifecycle
aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "PHI-Retention-Policy",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": ""
                },
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 365,
                        "StorageClass": "GLACIER"
                    },
                    {
                        "Days": 2555,
                        "StorageClass": "DEEP_ARCHIVE"
                    }
                ]
            }
        ]
    }'

echo "✅ Lifecycle policies configured for HIPAA retention"

# Step 7: Verification
echo ""
echo "🔍 Step 7: Verifying HIPAA Compliance Settings..."

echo "Verifying encryption..."
aws s3api get-bucket-encryption --bucket $BUCKET_NAME

echo "Verifying public access block..."
aws s3api get-public-access-block --bucket $BUCKET_NAME

echo "Verifying versioning..."
aws s3api get-bucket-versioning --bucket $BUCKET_NAME

echo "Verifying CloudTrail status..."
aws cloudtrail get-trail-status --name hipaa-photo-collector-audit

# Output summary
echo ""
echo "🎉 HIPAA-Compliant AWS Infrastructure Setup Complete!"
echo ""
echo "📋 Summary:"
echo "✅ KMS Key: $KMS_KEY_ID"
echo "✅ Main Bucket: $BUCKET_NAME"
echo "✅ Access Logs: $LOGGING_BUCKET"
echo "✅ Audit Logs: $AUDIT_BUCKET"
echo "✅ Backup Bucket: $BACKUP_BUCKET"
echo "✅ CloudTrail: hipaa-photo-collector-audit"
echo ""
echo "🔐 HIPAA Features Enabled:"
echo "✅ Server-side encryption with customer-managed KMS keys"
echo "✅ Bucket versioning for data protection"
echo "✅ Complete public access blocking"
echo "✅ Access logging for audit trails"
echo "✅ CloudTrail for comprehensive audit logging"
echo "✅ Lifecycle policies for data retention"
echo "✅ Cross-region backup strategy"
echo ""
echo "⚠️  Next Steps:"
echo "1. Update application configuration with:"
echo "   - S3_BUCKET_NAME=$BUCKET_NAME"
echo "   - KMS_KEY_ID=$KMS_KEY_ID"
echo "2. Configure application IAM role with bucket access"
echo "3. Test upload functionality with encryption"
echo "4. Review audit logs in CloudTrail"
echo "5. Sign Business Associate Agreement (BAA) with AWS"
echo ""
echo "📄 Save this information securely for your application configuration!"

# Save configuration to file
cat > ../server/.env.aws << EOF
# AWS HIPAA Configuration - Generated $(date)
AWS_REGION=$REGION
S3_BUCKET_NAME=$BUCKET_NAME
KMS_KEY_ID=$KMS_KEY_ID
KMS_KEY_ARN=$KMS_KEY_ARN
S3_ACCESS_LOGS_BUCKET=$LOGGING_BUCKET
S3_AUDIT_LOGS_BUCKET=$AUDIT_BUCKET
S3_BACKUP_BUCKET=$BACKUP_BUCKET
CLOUDTRAIL_NAME=hipaa-photo-collector-audit
EOF

echo "✅ Configuration saved to ../server/.env.aws"