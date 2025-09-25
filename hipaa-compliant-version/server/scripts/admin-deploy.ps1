# PowerShell script for deploying HIPAA Photo Collector using admin account
# This script sets up the admin profile and deploys the application

Write-Host "HIPAA Photo Collector - Admin Deployment Script" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version
    Write-Host "[OK] AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Set AWS profile to admin
$env:AWS_PROFILE = "photo-collector-admin"
Write-Host "[INFO] Using AWS Profile: photo-collector-admin" -ForegroundColor Cyan

# Verify admin account
Write-Host "[INFO] Verifying admin account credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "[OK] Admin account verified:" -ForegroundColor Green
    Write-Host "   User ARN: $($identity.Arn)" -ForegroundColor White
    Write-Host "   Account ID: $($identity.Account)" -ForegroundColor White
} catch {
    Write-Host "[ERROR] Failed to verify admin credentials." -ForegroundColor Red
    Write-Host "Please run: aws configure --profile photo-collector-admin" -ForegroundColor Yellow
    exit 1
}

# Apply IAM policies
Write-Host ""
Write-Host "[INFO] Setting up IAM policies..." -ForegroundColor Yellow

# Create deployment policy for admin
Write-Host "Creating deployment policy for admin account..." -ForegroundColor Cyan
try {
    aws iam create-policy `
        --policy-name HIPAAPhotoCollectorDeployment `
        --policy-document file://aws-iam-policy.json `
        --description "Full deployment permissions for HIPAA Photo Collector"
    Write-Host "[OK] Deployment policy created" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Policy might already exist, continuing..." -ForegroundColor Yellow
}

# Attach policy to admin user
Write-Host "Attaching deployment policy to admin user..." -ForegroundColor Cyan
try {
    aws iam attach-user-policy `
        --user-name photo-collector-admin `
        --policy-arn "arn:aws:iam::196809699680:policy/HIPAAPhotoCollectorDeployment"
    Write-Host "[OK] Policy attached to admin user" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Policy might already be attached, continuing..." -ForegroundColor Yellow
}

# Create minimal policy for end user
Write-Host "Creating minimal policy for end user..." -ForegroundColor Cyan
try {
    aws iam create-policy `
        --policy-name HIPAAPhotoCollectorEndUser `
        --policy-document file://end-user-iam-policy.json `
        --description "Minimal permissions for HIPAA Photo Collector end users"
    Write-Host "[OK] End user policy created" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Policy might already exist, continuing..." -ForegroundColor Yellow
}

# Attach minimal policy to end user
Write-Host "Attaching minimal policy to end user..." -ForegroundColor Cyan
try {
    aws iam attach-user-policy `
        --user-name photo-collector-user1 `
        --policy-arn "arn:aws:iam::196809699680:policy/HIPAAPhotoCollectorEndUser"
    Write-Host "[OK] Policy attached to end user" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Policy might already be attached, continuing..." -ForegroundColor Yellow
}

# Install npm dependencies
Write-Host ""
Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
npm install

# Deploy the application
Write-Host ""
Write-Host "[INFO] Deploying to AWS Lambda..." -ForegroundColor Yellow
try {
    npm run deploy:prod
    Write-Host ""
    Write-Host "[SUCCESS] Deployment completed successfully!" -ForegroundColor Green

    # Get deployment info
    Write-Host ""
    Write-Host "[INFO] Deployment Information:" -ForegroundColor Cyan
    npx serverless info --stage prod

} catch {
    Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}

# Next steps
Write-Host ""
Write-Host "[INFO] Next Steps:" -ForegroundColor Green
Write-Host "1. Copy the API Gateway URL from the deployment output above" -ForegroundColor White
Write-Host "2. Update your frontend configuration in docs/index.html" -ForegroundColor White
Write-Host "3. Test the deployed API endpoints" -ForegroundColor White
Write-Host "4. Verify photos upload to dbota-hipaa-photos-prod bucket" -ForegroundColor White
Write-Host ""
Write-Host "[SECURITY] Security Notes:" -ForegroundColor Yellow
Write-Host "- Admin account has full deployment permissions" -ForegroundColor White
Write-Host "- End user (photo-collector-user1) has minimal S3 upload permissions only" -ForegroundColor White
Write-Host "- All data is encrypted with KMS key: 1bd0c1fc-fee9-404e-9277-2cf102c121d8" -ForegroundColor White

Write-Host ""
Write-Host "[SUCCESS] Admin deployment complete!" -ForegroundColor Green