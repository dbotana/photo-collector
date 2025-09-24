# HIPAA Compliant Photo Collector - Deployment Guide

## Overview

This document provides comprehensive deployment instructions for the HIPAA-compliant photo collector application, including infrastructure setup, security configurations, and compliance requirements.

## Pre-Deployment Checklist

### 1. HIPAA Compliance Requirements
- [ ] **Business Associate Agreement (BAA)** signed with AWS
- [ ] **Risk Assessment** completed and documented
- [ ] **Security Officer** assigned and trained
- [ ] **Incident Response Plan** established
- [ ] **Employee Training** on HIPAA requirements completed

### 2. AWS Account Setup
- [ ] AWS account with **Organizations** enabled
- [ ] **CloudTrail** enabled for all regions
- [ ] **Config** enabled for compliance monitoring
- [ ] **GuardDuty** enabled for threat detection
- [ ] **Security Hub** enabled for centralized security findings

### 3. Infrastructure Requirements
- [ ] VPC with private subnets
- [ ] Application Load Balancer with SSL termination
- [ ] Auto Scaling Groups for high availability
- [ ] RDS with encryption at rest
- [ ] ElastiCache for session storage
- [ ] CloudWatch for monitoring and alerting

## AWS Infrastructure Setup

### 1. S3 Bucket Configuration

```bash
# Create HIPAA-compliant S3 bucket
aws s3api create-bucket \
    --bucket your-hipaa-photo-bucket \
    --region us-east-1 \
    --create-bucket-configuration LocationConstraint=us-east-1

# Enable versioning (required for HIPAA)
aws s3api put-bucket-versioning \
    --bucket your-hipaa-photo-bucket \
    --versioning-configuration Status=Enabled

# Enable server-side encryption
aws s3api put-bucket-encryption \
    --bucket your-hipaa-photo-bucket \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms",
                "KMSMasterKeyID": "your-kms-key-id"
            },
            "BucketKeyEnabled": true
        }]
    }'

# Block public access (critical for HIPAA)
aws s3api put-public-access-block \
    --bucket your-hipaa-photo-bucket \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Enable access logging
aws s3api put-bucket-logging \
    --bucket your-hipaa-photo-bucket \
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "your-access-logs-bucket",
            "TargetPrefix": "hipaa-photo-bucket-logs/"
        }
    }'
```

### 2. KMS Key Setup

```bash
# Create KMS key for encryption
aws kms create-key \
    --description "HIPAA Photo Collector Encryption Key" \
    --key-usage ENCRYPT_DECRYPT \
    --key-spec SYMMETRIC_DEFAULT \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Enable IAM User Permissions",
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::ACCOUNT-ID:root"
                },
                "Action": "kms:*",
                "Resource": "*"
            },
            {
                "Sid": "Allow use of the key for S3",
                "Effect": "Allow",
                "Principal": {
                    "Service": "s3.amazonaws.com"
                },
                "Action": [
                    "kms:Decrypt",
                    "kms:GenerateDataKey"
                ],
                "Resource": "*"
            }
        ]
    }'

# Create alias for the key
aws kms create-alias \
    --alias-name alias/hipaa-photo-collector \
    --target-key-id your-key-id
```

### 3. CloudFormation Template

Create `infrastructure/hipaa-infrastructure.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'HIPAA Compliant Photo Collector Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [development, staging, production]

  OrganizationName:
    Type: String
    Description: Healthcare organization name

Resources:
  # VPC and Networking
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${OrganizationName}-hipaa-vpc'
        - Key: Environment
          Value: !Ref Environment

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']

  # KMS Key
  HIPAAKMSKey:
    Type: AWS::KMS::Key
    Properties:
      Description: 'HIPAA Photo Collector Encryption Key'
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'

  # S3 Bucket
  HIPAAPhotoBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${OrganizationName}-hipaa-photos-${Environment}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: aws:kms
              KMSMasterKeyID: !Ref HIPAAKMSKey
            BucketKeyEnabled: true
      VersioningConfiguration:
        Status: Enabled
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      LoggingConfiguration:
        DestinationBucketName: !Ref AccessLogsBucket
        LogFilePrefix: hipaa-photos-access-logs/

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VPC-ID'

  KMSKeyId:
    Description: KMS Key ID for encryption
    Value: !Ref HIPAAKMSKey
    Export:
      Name: !Sub '${AWS::StackName}-KMS-Key'
```

## Application Deployment

### 1. Docker Setup

Create `Dockerfile` in the server directory:

```dockerfile
FROM node:18-alpine

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create app directory with restricted permissions
WORKDIR /usr/src/app
RUN chown -R node:node /usr/src/app

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies as node user
USER node
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=node:node . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "app.js"]
```

### 2. Docker Compose for Development

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - KMS_KEY_ID=${KMS_KEY_ID}
    volumes:
      - ./server/logs:/usr/src/app/logs
      - ./server/.env:/usr/src/app/.env:ro
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hipaa_photo_collector
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./client:/usr/share/nginx/html:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

### 3. Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hipaa-photo-collector
  namespace: healthcare
  labels:
    app: hipaa-photo-collector
    compliance: hipaa
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hipaa-photo-collector
  template:
    metadata:
      labels:
        app: hipaa-photo-collector
    spec:
      serviceAccountName: hipaa-photo-collector-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: app
        image: your-registry/hipaa-photo-collector:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: hipaa-secrets
              key: jwt-secret
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: logs-volume
          mountPath: /usr/src/app/logs
      volumes:
      - name: logs-volume
        persistentVolumeClaim:
          claimName: hipaa-logs-pvc
```

## Security Configuration

### 1. SSL/TLS Setup

```bash
# Generate SSL certificate using Let's Encrypt
certbot --nginx -d your-domain.com -d www.your-domain.com

# Or use AWS Certificate Manager for AWS deployments
aws acm request-certificate \
    --domain-name your-domain.com \
    --subject-alternative-names www.your-domain.com \
    --validation-method DNS
```

### 2. Nginx Configuration

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline';" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    upstream app {
        server app:3000;
    }

    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        ssl_certificate /etc/ssl/certs/fullchain.pem;
        ssl_certificate_key /etc/ssl/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # Client certificate verification (optional for enhanced security)
        # ssl_client_certificate /etc/ssl/certs/ca.pem;
        # ssl_verify_client on;

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /auth/ {
            limit_req zone=auth burst=5 nodelay;
            proxy_pass http://app/auth/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Monitoring and Alerting

### 1. CloudWatch Setup

```yaml
# CloudWatch Logs Group
LogGroup:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: /aws/ecs/hipaa-photo-collector
    RetentionInDays: 90

# CloudWatch Alarms
HighErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: HIPAA-PhotoCollector-HighErrorRate
    AlarmDescription: High error rate detected
    MetricName: ErrorRate
    Namespace: AWS/ApplicationELB
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSAlarmTopic

UnauthorizedAccessAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: HIPAA-PhotoCollector-UnauthorizedAccess
    AlarmDescription: Multiple unauthorized access attempts
    MetricName: 4XXError
    Namespace: AWS/ApplicationELB
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
```

## Compliance and Auditing

### 1. AWS Config Rules

```yaml
S3BucketPublicReadProhibited:
  Type: AWS::Config::ConfigRule
  Properties:
    ConfigRuleName: s3-bucket-public-read-prohibited
    Source:
      Owner: AWS
      SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED

S3BucketSSLRequestsOnly:
  Type: AWS::Config::ConfigRule
  Properties:
    ConfigRuleName: s3-bucket-ssl-requests-only
    Source:
      Owner: AWS
      SourceIdentifier: S3_BUCKET_SSL_REQUESTS_ONLY

EncryptedVolumes:
  Type: AWS::Config::ConfigRule
  Properties:
    ConfigRuleName: encrypted-volumes
    Source:
      Owner: AWS
      SourceIdentifier: ENCRYPTED_VOLUMES
```

### 2. Backup Strategy

```bash
# Create backup Lambda function
aws lambda create-function \
    --function-name hipaa-photo-backup \
    --runtime python3.9 \
    --role arn:aws:iam::ACCOUNT:role/lambda-execution-role \
    --handler backup.lambda_handler \
    --code fileb://backup-function.zip \
    --timeout 300 \
    --environment Variables='{
        "SOURCE_BUCKET":"your-hipaa-photo-bucket",
        "BACKUP_BUCKET":"your-backup-bucket",
        "KMS_KEY_ID":"your-kms-key-id"
    }'

# Schedule daily backups
aws events put-rule \
    --name hipaa-daily-backup \
    --schedule-expression "rate(1 day)"
```

## Deployment Steps

### 1. Initial Deployment

```bash
# 1. Clone repository
git clone https://github.com/your-org/hipaa-photo-collector.git
cd hipaa-photo-collector/hipaa-compliant-version

# 2. Set up environment variables
cp server/.env.example server/.env
# Edit .env with your actual values

# 3. Deploy infrastructure
aws cloudformation deploy \
    --template-file infrastructure/hipaa-infrastructure.yaml \
    --stack-name hipaa-photo-collector-infra \
    --parameter-overrides \
        Environment=production \
        OrganizationName=YourOrg \
    --capabilities CAPABILITY_IAM

# 4. Build and deploy application
docker build -t hipaa-photo-collector ./server
docker tag hipaa-photo-collector:latest your-registry/hipaa-photo-collector:latest
docker push your-registry/hipaa-photo-collector:latest

# 5. Deploy to Kubernetes
kubectl apply -f k8s/
```

### 2. Post-Deployment Verification

```bash
# Test health endpoint
curl -k https://your-domain.com/health

# Test authentication
curl -X POST https://your-domain.com/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"demo","password":"demo123"}'

# Verify SSL configuration
nmap --script ssl-enum-ciphers -p 443 your-domain.com

# Check S3 bucket security
aws s3api get-bucket-encryption --bucket your-hipaa-photo-bucket
aws s3api get-public-access-block --bucket your-hipaa-photo-bucket
```

## Maintenance and Updates

### 1. Security Updates

- **Monthly security patches** for OS and dependencies
- **Quarterly vulnerability assessments**
- **Annual penetration testing**
- **Continuous monitoring** of security advisories

### 2. Backup Verification

- **Daily automated backups**
- **Weekly backup restoration tests**
- **Monthly disaster recovery drills**

### 3. Compliance Audits

- **Quarterly internal audits**
- **Annual external HIPAA compliance audits**
- **Continuous audit log monitoring**

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Check JWT secret configuration
   - Verify token expiration settings
   - Review audit logs for failed attempts

2. **Upload Failures**
   - Verify S3 bucket permissions
   - Check KMS key access
   - Review encryption configurations

3. **Performance Issues**
   - Monitor CloudWatch metrics
   - Check database connections
   - Review application logs

### Log Locations

- **Application logs**: `/usr/src/app/logs/combined.log`
- **Audit logs**: `/usr/src/app/logs/audit.log`
- **Security logs**: `/usr/src/app/logs/security.log`
- **Error logs**: `/usr/src/app/logs/error.log`

## Support and Contacts

- **Technical Support**: tech-support@yourorganization.com
- **Security Officer**: security@yourorganization.com
- **Compliance Officer**: compliance@yourorganization.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Reviewed By**: [Security Officer Name]