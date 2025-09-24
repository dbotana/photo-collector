# AWS HIPAA Compliance Setup - Execution Guide

## Current Status
Your current AWS user `photo-collector-user1` has limited permissions and cannot create the required HIPAA infrastructure. You need administrator-level access to set up HIPAA-compliant resources.

## 🚨 **IMPORTANT: Permission Requirements**

To execute the HIPAA setup, you need an AWS user or role with the following permissions:

### Required AWS Services Access:
- **S3**: Full access to create and configure buckets
- **KMS**: Full access to create and manage encryption keys
- **CloudTrail**: Full access to create audit trails
- **IAM**: Read access to verify permissions

## 📋 **Step-by-Step Execution Instructions**

### **Option 1: Use AWS Administrator Account**

1. **Switch to AWS Administrator Account**:
   ```bash
   aws configure --profile admin
   # Enter your administrator AWS Access Key ID
   # Enter your administrator AWS Secret Access Key
   # Enter region: us-east-1
   # Enter output format: json

   # Use the admin profile
   export AWS_PROFILE=admin
   ```

2. **Execute the HIPAA Setup Script**:
   ```bash
   cd hipaa-compliant-version/infrastructure
   chmod +x setup-hipaa-aws.sh
   ./setup-hipaa-aws.sh
   ```

### **Option 2: Create IAM Policy for Current User**

If you have IAM permissions, attach the admin policy to your current user:

1. **Attach the HIPAA Admin Policy**:
   ```bash
   aws iam create-policy \
       --policy-name HIPAAPhotoCollectorAdminPolicy \
       --policy-document file://hipaa-admin-policy.json

   aws iam attach-user-policy \
       --user-name photo-collector-user1 \
       --policy-arn arn:aws:iam::196809699680:policy/HIPAAPhotoCollectorAdminPolicy
   ```

2. **Execute the Setup Script**:
   ```bash
   ./setup-hipaa-aws.sh
   ```

### **Option 3: Manual AWS Console Setup**

If CLI access is limited, you can set up via AWS Console:

#### **3.1: Create KMS Key**
1. Go to AWS KMS Console → Create Key
2. Choose "Symmetric" and "Encrypt and decrypt"
3. Add alias: `hipaa-photo-collector`
4. Use the key policy from the setup script

#### **3.2: Create S3 Buckets**
1. **Main Bucket**: `dbota-hipaa-photos-prod`
   - Enable versioning
   - Enable server-side encryption with KMS key
   - Block all public access
   - Enable access logging

2. **Access Logs Bucket**: `dbota-hipaa-photos-prod-access-logs`

3. **Audit Logs Bucket**: `dbota-hipaa-photos-prod-audit-logs`

#### **3.3: Create CloudTrail**
1. Go to CloudTrail Console → Create Trail
2. Name: `hipaa-photo-collector-audit`
3. Enable log file validation
4. Enable multi-region
5. Use KMS encryption with your key

## 🔍 **Verification**

After setup, run the verification script:

```bash
cd hipaa-compliant-version/infrastructure
chmod +x verify-hipaa-setup.sh
./verify-hipaa-setup.sh
```

## 📊 **Expected Results**

When successfully completed, you should see:

```
🎉 HIPAA infrastructure is fully configured!
✅ Passed: 6/6 checks

📋 Next Steps:
1. Update your application .env file with the AWS configuration
2. Test the photo upload functionality
3. Review CloudTrail logs for audit compliance
4. Sign Business Associate Agreement (BAA) with AWS
```

## 📁 **Generated Configuration Files**

After successful setup, you'll find:
- `../server/.env.aws` - AWS configuration for your application
- CloudTrail logs in the audit bucket
- Encrypted S3 storage ready for PHI data

## ⚠️ **Security Reminders**

1. **Never commit AWS credentials** to version control
2. **Use environment variables** for sensitive configuration
3. **Enable MFA** on all AWS accounts handling PHI
4. **Review CloudTrail logs** regularly
5. **Sign BAA with AWS** before storing any PHI

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Permission Denied Errors**:
   - Verify IAM permissions
   - Switch to administrator account
   - Check AWS CLI configuration

2. **Bucket Already Exists**:
   - Change bucket names in the script
   - Ensure globally unique bucket names

3. **KMS Key Access Denied**:
   - Verify KMS permissions in IAM policy
   - Check key policy allows your account access

4. **CloudTrail Creation Failed**:
   - Ensure S3 bucket policy allows CloudTrail
   - Verify KMS key allows CloudTrail access

### **Getting Help:**

If you encounter issues:
1. Check AWS CloudFormation events for detailed error messages
2. Review IAM policy simulator for permission issues
3. Contact AWS Support for HIPAA-specific guidance
4. Consult AWS HIPAA whitepaper for compliance requirements

## 📞 **Next Steps After Setup**

1. **Update Application Configuration**:
   ```bash
   cp server/.env.aws server/.env.production
   ```

2. **Test Upload Functionality**:
   ```bash
   cd server
   npm test -- --grep "upload"
   ```

3. **Deploy Application** with new AWS configuration

4. **Schedule Compliance Review** with security team

---

**🏥 Remember**: HIPAA compliance requires ongoing monitoring, regular audits, and proper staff training. This setup provides the technical foundation, but organizational policies and procedures are equally important.