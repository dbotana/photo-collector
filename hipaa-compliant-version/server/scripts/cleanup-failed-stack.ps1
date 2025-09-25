# PowerShell script to clean up failed CloudFormation stack
# This script removes the failed stack so deployment can proceed

Write-Host "🔧 HIPAA Photo Collector - Stack Cleanup Script" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""

# Set AWS profile to admin
$env:AWS_PROFILE = "photo-collector-admin"
Write-Host "[INFO] Using AWS Profile: photo-collector-admin" -ForegroundColor Cyan

# Check if the failed stack exists
Write-Host "[INFO] Checking for failed CloudFormation stack..." -ForegroundColor Yellow
try {
    $stackStatus = aws cloudformation describe-stacks --stack-name hipaa-photo-collector-api-prod --query 'Stacks[0].StackStatus' --output text 2>$null

    if ($stackStatus) {
        Write-Host "[INFO] Found stack with status: $stackStatus" -ForegroundColor Cyan

        if ($stackStatus -eq "CREATE_FAILED" -or $stackStatus -eq "ROLLBACK_COMPLETE") {
            Write-Host "[WARNING] Stack is in failed state, removing it..." -ForegroundColor Yellow

            # Delete the failed stack
            aws cloudformation delete-stack --stack-name hipaa-photo-collector-api-prod
            Write-Host "[OK] Stack deletion initiated" -ForegroundColor Green

            # Wait for deletion to complete
            Write-Host "[INFO] Waiting for stack deletion to complete..." -ForegroundColor Yellow
            aws cloudformation wait stack-delete-complete --stack-name hipaa-photo-collector-api-prod
            Write-Host "[OK] Stack deletion completed" -ForegroundColor Green

        } else {
            Write-Host "[WARNING] Stack exists but not in failed state: $stackStatus" -ForegroundColor Yellow
            Write-Host "You may need to manually remove it if deployment continues to fail." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[OK] No existing stack found" -ForegroundColor Green
    }

} catch {
    Write-Host "[OK] No existing stack found or unable to check" -ForegroundColor Green
}

Write-Host ""
Write-Host "[SUCCESS] Stack cleanup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "[INFO] Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run deploy:admin" -ForegroundColor White
Write-Host "2. The deployment should now succeed" -ForegroundColor White