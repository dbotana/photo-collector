# HIPAA Photo Collector - AWS Lambda Deployment Guide

## Prerequisites

1. **AWS CLI configured**
   ```bash
   aws configure
   ```

2. **Node.js 18+ and npm installed**
   ```bash
   node --version  # Should be 18+
   npm --version
   ```

3. **Required AWS Permissions**
   Your AWS user/role needs permissions for:
   - Lambda functions
   - API Gateway
   - S3 (dbota-hipaa-photos-prod bucket)
   - KMS (key: 1bd0c1fc-fee9-404e-9277-2cf102c121d8)
   - CloudWatch Logs
   - IAM (for creating execution roles)
   - AWS Systems Manager (SSM) Parameter Store

## Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
cd hipaa-compliant-version/server
npm install
npm run setup-secrets    # Creates secure SSM parameters
npm run deploy:prod      # Deploys to AWS Lambda
```

### Option 2: Step-by-Step Deployment

```bash
# 1. Install dependencies
cd hipaa-compliant-version/server
npm install

# 2. Set up AWS SSM parameters (secure secrets)
npm run setup-secrets

# 3. Deploy to Lambda
npm run deploy:prod

# 4. Get deployment info
npx serverless info --stage prod
```

### Option 3: Manual Deployment Script

```bash
cd hipaa-compliant-version/server
node scripts/deploy.js
```

## Configuration

The Lambda function is configured with these environment variables:

- `S3_BUCKET_NAME`: dbota-hipaa-photos-prod
- `KMS_KEY_ID`: 1bd0c1fc-fee9-404e-9277-2cf102c121d8
- `ALLOWED_ORIGINS`: https://dbotana.github.io
- `AWS_REGION`: us-east-1

Secure secrets are stored in AWS SSM Parameter Store:
- `/hipaa-photo-collector/jwt-secret`
- `/hipaa-photo-collector/audit-salt`
- `/hipaa-photo-collector/session-secret`

## Post-Deployment Steps

1. **Note the API Gateway URL** from deployment output
2. **Update frontend configuration** in `docs/index.html`:
   ```javascript
   window.HIPAA_CONFIG = {
       API_BASE_URL: 'https://YOUR-NEW-API-ID.execute-api.us-east-1.amazonaws.com/prod',
       ENVIRONMENT: 'production',
       DEBUG_MODE: false
   };
   ```

3. **Test the API endpoints**:
   ```bash
   curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/health
   ```

4. **Verify S3 bucket access**
5. **Test photo upload functionality**

## Monitoring and Logs

### View Lambda Logs
```bash
npm run logs                    # View recent logs
npx serverless logs -f api -t   # Tail logs in real-time
```

### CloudWatch Logs
- Log Group: `/aws/lambda/hipaa-photo-collector-api-prod-api`

### Metrics to Monitor
- Lambda duration and errors
- API Gateway 4xx/5xx responses
- S3 upload success/failure rates

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Verify AWS credentials: `aws sts get-caller-identity`
   - Check IAM permissions for Lambda, S3, KMS

2. **"Module not found" errors**
   - Run `npm install` in the server directory
   - Check that all dependencies are in package.json

3. **S3 upload failures**
   - Verify bucket exists: `aws s3 ls s3://dbota-hipaa-photos-prod`
   - Check KMS key permissions
   - Review CloudWatch logs for detailed errors

4. **CORS errors from frontend**
   - Ensure `ALLOWED_ORIGINS` includes your frontend URL
   - Check API Gateway CORS configuration

### Debug Mode

Enable debug logging:
```bash
# In AWS Lambda environment variables, set:
DEBUG_LOGGING=true
```

### Rollback Deployment

```bash
# Remove the current deployment
npx serverless remove --stage prod

# Or deploy a previous version
git checkout <previous-commit>
npm run deploy:prod
```

## Security Notes

- All secrets are encrypted using AWS KMS
- API uses JWT tokens for authentication
- All data is encrypted at rest and in transit
- Audit logging is enabled for all operations
- Rate limiting is enforced

## Cost Optimization

- Lambda is configured with 512MB memory
- 30-second timeout
- No unnecessary dependencies packaged
- AWS SDK excluded (provided by Lambda runtime)

## Support

For issues:
1. Check CloudWatch logs
2. Review API Gateway metrics
3. Verify S3 and KMS permissions
4. Test endpoints with curl/Postman