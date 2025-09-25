# Admin Account Setup for HIPAA Photo Collector Deployment

## 1. Configure AWS CLI for Admin Account

### Set up the admin profile
```bash
# Configure the admin profile
aws configure --profile photo-collector-admin

# When prompted, enter:
# AWS Access Key ID: [photo-collector-admin access key]
# AWS Secret Access Key: [photo-collector-admin secret key]
# Default region name: us-east-1
# Default output format: json
```

### Verify admin account setup
```bash
# Test the admin credentials
aws sts get-caller-identity --profile photo-collector-admin

# Should return:
# {
#     "UserId": "AIDAXXXXXXXXXXXXXX",
#     "Account": "196809699680",
#     "Arn": "arn:aws:iam::196809699680:user/photo-collector-admin"
# }
```

## 2. Apply IAM Policies

### Apply deployment policy to admin account
```bash
# Create the deployment policy
aws iam create-policy \
  --profile photo-collector-admin \
  --policy-name HIPAAPhotoCollectorDeployment \
  --policy-document file://aws-iam-policy.json \
  --description "Full deployment permissions for HIPAA Photo Collector"

# Attach policy to admin user
aws iam attach-user-policy \
  --profile photo-collector-admin \
  --user-name photo-collector-admin \
  --policy-arn arn:aws:iam::196809699680:policy/HIPAAPhotoCollectorDeployment
```

### Apply minimal policy to end-user account
```bash
# Create the minimal end-user policy
aws iam create-policy \
  --profile photo-collector-admin \
  --policy-name HIPAAPhotoCollectorEndUser \
  --policy-document file://end-user-iam-policy.json \
  --description "Minimal permissions for HIPAA Photo Collector end users"

# Remove any existing policies from end-user (if any)
aws iam list-attached-user-policies \
  --profile photo-collector-admin \
  --user-name photo-collector-user1

# Attach minimal policy to end-user
aws iam attach-user-policy \
  --profile photo-collector-admin \
  --user-name photo-collector-user1 \
  --policy-arn arn:aws:iam::196809699680:policy/HIPAAPhotoCollectorEndUser
```

## 3. Deploy Using Admin Account

### Set environment variable for deployment
```bash
# Windows PowerShell
$env:AWS_PROFILE = "photo-collector-admin"

# Windows Command Prompt
set AWS_PROFILE=photo-collector-admin

# Or use --aws-profile flag with serverless
```

### Deploy the application
```bash
cd "C:\Users\dbota\Documents\color correction files 7-21\photo-collector\hipaa-compliant-version\server"

# Install dependencies
npm install

# Deploy using admin profile
npm run deploy:prod -- --aws-profile photo-collector-admin

# Alternative method
$env:AWS_PROFILE = "photo-collector-admin"
npm run deploy:prod
```

## 4. Verify Deployment

### Test the deployed API
```bash
# Get deployment info
npx serverless info --stage prod --aws-profile photo-collector-admin

# Test health endpoint
curl https://[API-ID].execute-api.us-east-1.amazonaws.com/prod/health
```

### Verify S3 bucket access
```bash
# Check bucket exists and is accessible
aws s3 ls s3://dbota-hipaa-photos-prod --profile photo-collector-admin
```

## 5. Security Verification

### Verify end-user permissions are minimal
```bash
# Test end-user can only do basic operations (should work)
aws s3 cp test-file.txt s3://dbota-hipaa-photos-prod/ --profile default

# Test end-user cannot do admin operations (should fail)
aws s3 rm s3://dbota-hipaa-photos-prod/test-file.txt --profile default
aws lambda list-functions --profile default
```

## 6. Production Security Best Practices

1. **Admin Account**:
   - Use MFA (Multi-Factor Authentication)
   - Rotate access keys regularly
   - Only use for deployments
   - Store credentials securely

2. **End-User Account**:
   - Minimal permissions (upload only)
   - Cannot delete objects
   - Cannot access other AWS services
   - Regular audit of permissions

3. **Application Security**:
   - All uploads encrypted with KMS
   - JWT tokens for authentication
   - Rate limiting enabled
   - Audit logging for all operations

## Troubleshooting

### If deployment fails
```bash
# Check which AWS account you're using
aws sts get-caller-identity --profile photo-collector-admin

# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name hipaa-photo-collector-api-prod \
  --profile photo-collector-admin

# View CloudWatch logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/hipaa-photo-collector" \
  --profile photo-collector-admin
```

### If end-user has too many permissions
```bash
# List all policies attached to end-user
aws iam list-attached-user-policies \
  --user-name photo-collector-user1 \
  --profile photo-collector-admin

# Detach unwanted policies
aws iam detach-user-policy \
  --user-name photo-collector-user1 \
  --policy-arn [UNWANTED-POLICY-ARN] \
  --profile photo-collector-admin
```