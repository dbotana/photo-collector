#!/bin/bash

# HIPAA Setup Verification Script
# Run this to check if HIPAA infrastructure is properly configured

set -e

echo "🔍 HIPAA AWS Infrastructure Verification"
echo "========================================"

BUCKET_NAME="dbota-hipaa-photos-prod"

# Check if required buckets exist
echo ""
echo "📦 Checking S3 Buckets..."

if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "✅ Main bucket exists: $BUCKET_NAME"

    # Check encryption
    echo "🔐 Checking encryption..."
    if aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
        echo "✅ Bucket encryption is enabled"
        aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" | jq -r '.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm'
    else
        echo "❌ Bucket encryption is NOT enabled"
    fi

    # Check versioning
    echo "📚 Checking versioning..."
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" | jq -r '.Status // "Disabled"')
    if [ "$VERSIONING" = "Enabled" ]; then
        echo "✅ Bucket versioning is enabled"
    else
        echo "❌ Bucket versioning is NOT enabled"
    fi

    # Check public access block
    echo "🚫 Checking public access block..."
    if aws s3api get-public-access-block --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
        echo "✅ Public access is blocked"
        aws s3api get-public-access-block --bucket "$BUCKET_NAME" | jq '.PublicAccessBlockConfiguration'
    else
        echo "❌ Public access block is NOT configured"
    fi

else
    echo "❌ Main bucket does NOT exist: $BUCKET_NAME"
fi

# Check access logging bucket
echo ""
echo "📊 Checking Access Logging Bucket..."
ACCESS_LOG_BUCKET="${BUCKET_NAME}-access-logs"
if aws s3api head-bucket --bucket "$ACCESS_LOG_BUCKET" 2>/dev/null; then
    echo "✅ Access logging bucket exists: $ACCESS_LOG_BUCKET"
else
    echo "❌ Access logging bucket does NOT exist: $ACCESS_LOG_BUCKET"
fi

# Check audit logging bucket
echo ""
echo "📋 Checking Audit Logging Bucket..."
AUDIT_LOG_BUCKET="${BUCKET_NAME}-audit-logs"
if aws s3api head-bucket --bucket "$AUDIT_LOG_BUCKET" 2>/dev/null; then
    echo "✅ Audit logging bucket exists: $AUDIT_LOG_BUCKET"
else
    echo "❌ Audit logging bucket does NOT exist: $AUDIT_LOG_BUCKET"
fi

# Check CloudTrail
echo ""
echo "🛤️  Checking CloudTrail..."
if aws cloudtrail describe-trails --trail-name-list hipaa-photo-collector-audit >/dev/null 2>&1; then
    echo "✅ CloudTrail exists: hipaa-photo-collector-audit"

    # Check if logging is enabled
    STATUS=$(aws cloudtrail get-trail-status --name hipaa-photo-collector-audit | jq -r '.IsLogging')
    if [ "$STATUS" = "true" ]; then
        echo "✅ CloudTrail logging is active"
    else
        echo "❌ CloudTrail logging is NOT active"
    fi
else
    echo "❌ CloudTrail does NOT exist: hipaa-photo-collector-audit"
fi

# Check KMS key
echo ""
echo "🔑 Checking KMS Key..."
if aws kms describe-key --key-id alias/hipaa-photo-collector >/dev/null 2>&1; then
    echo "✅ KMS key exists: alias/hipaa-photo-collector"
    KEY_ID=$(aws kms describe-key --key-id alias/hipaa-photo-collector | jq -r '.KeyMetadata.KeyId')
    echo "   Key ID: $KEY_ID"
else
    echo "❌ KMS key does NOT exist: alias/hipaa-photo-collector"
fi

# Test upload with encryption (optional)
echo ""
echo "🧪 Testing Encrypted Upload..."
TEST_FILE="/tmp/hipaa-test-file.txt"
echo "This is a HIPAA test file - $(date)" > "$TEST_FILE"

if aws s3 cp "$TEST_FILE" "s3://$BUCKET_NAME/test-uploads/test-file.txt" --sse aws:kms --sse-kms-key-id alias/hipaa-photo-collector 2>/dev/null; then
    echo "✅ Encrypted upload successful"

    # Clean up test file
    aws s3 rm "s3://$BUCKET_NAME/test-uploads/test-file.txt" >/dev/null 2>&1
    echo "✅ Test file cleaned up"
else
    echo "❌ Encrypted upload failed"
fi

rm -f "$TEST_FILE"

# Summary
echo ""
echo "📊 HIPAA Compliance Summary"
echo "=========================="

# Count what's working
CHECKS=0
PASSED=0

# Main bucket
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    ((PASSED++))
fi
((CHECKS++))

# Encryption
if aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
    ((PASSED++))
fi
((CHECKS++))

# Versioning
VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" 2>/dev/null | jq -r '.Status // "Disabled"')
if [ "$VERSIONING" = "Enabled" ]; then
    ((PASSED++))
fi
((CHECKS++))

# Public access block
if aws s3api get-public-access-block --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
    ((PASSED++))
fi
((CHECKS++))

# CloudTrail
if aws cloudtrail describe-trails --trail-name-list hipaa-photo-collector-audit >/dev/null 2>&1; then
    ((PASSED++))
fi
((CHECKS++))

# KMS
if aws kms describe-key --key-id alias/hipaa-photo-collector >/dev/null 2>&1; then
    ((PASSED++))
fi
((CHECKS++))

echo "✅ Passed: $PASSED/$CHECKS checks"

if [ "$PASSED" -eq "$CHECKS" ]; then
    echo "🎉 HIPAA infrastructure is fully configured!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Update your application .env file with the AWS configuration"
    echo "2. Test the photo upload functionality"
    echo "3. Review CloudTrail logs for audit compliance"
    echo "4. Sign Business Associate Agreement (BAA) with AWS"
else
    echo "⚠️  HIPAA infrastructure is incomplete"
    echo "   Please run the setup script with administrator permissions"
fi