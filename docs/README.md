# HIPAA Compliant Photo Collector - GitHub Pages Deployment

This is the production deployment of the HIPAA-compliant photo collector application.

## 🚀 Live Demo

**URL**: `https://YOUR_USERNAME.github.io/photo-collector/`

## 🏥 HIPAA Compliance Features

- **End-to-End Encryption**: All PHI data encrypted before transmission
- **Patient ID Hashing**: Patient identifiers are cryptographically hashed
- **Audit Logging**: Comprehensive audit trail for compliance
- **Secure Authentication**: JWT-based session management
- **Access Controls**: Role-based access with session timeout

## 🔧 Backend Requirements

This client application requires a separate backend API server to be fully functional. The backend should provide:

### Required API Endpoints

1. **Authentication**: `POST /auth/login`
2. **Secure Upload**: `POST /upload/secure`
3. **Session Management**: `POST /auth/refresh`, `POST /auth/logout`

### Backend Deployment Options

1. **AWS Lambda + API Gateway** (Recommended)
   - Deploy the server code from `../hipaa-compliant-version/server/`
   - Configure API Gateway with proper CORS settings
   - Update the API URL in this application

2. **Self-hosted Server**
   - Deploy the Node.js server to your hosting provider
   - Ensure HTTPS is enabled
   - Configure proper CORS headers

## 📋 Setup Instructions

### 1. Update API Configuration

Edit the `index.html` file and update the API URL:

```javascript
window.HIPAA_CONFIG = {
    API_BASE_URL: 'https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod',
    ENVIRONMENT: 'production',
    DEBUG_MODE: false
};
```

### 2. Configure Your Backend

Deploy the backend server code and ensure these endpoints are available:
- Authentication endpoint with CORS enabled
- File upload endpoint with proper encryption
- AWS S3 integration with HIPAA compliance

### 3. Test the Deployment

1. Access the GitHub Pages URL
2. Try logging in (requires working backend)
3. Test photo capture and upload functionality
4. Verify encryption and security features

## 🔐 Security Considerations

### Production Checklist

- [ ] Backend API deployed with HTTPS
- [ ] CORS properly configured for GitHub Pages domain
- [ ] AWS S3 bucket configured with KMS encryption
- [ ] CloudTrail logging enabled for audit compliance
- [ ] Rate limiting enabled on API endpoints
- [ ] Session timeouts properly configured

### HIPAA Compliance Requirements

1. **Business Associate Agreement (BAA)** signed with AWS
2. **Access controls** implemented for all users
3. **Audit logs** regularly reviewed
4. **Encryption** enabled for data at rest and in transit
5. **Security incident response** procedures in place

## 📁 File Structure

```
docs/
├── index.html                 # Main application page
├── style.css                  # Application styles
├── secure-photo-collector.js  # Main application logic
├── performance-monitor.js     # Performance monitoring
├── manifest.json             # PWA manifest
└── README.md                 # This file
```

## 🛠️ Development

To modify this application:

1. Edit files in the `docs/` directory
2. Test locally with a local server: `python -m http.server 8000`
3. Commit changes to trigger GitHub Pages deployment

## 📞 Support

For HIPAA compliance questions or technical support:
- Review the AWS HIPAA whitepaper
- Consult with your organization's compliance team
- Test thoroughly before handling real PHI data

---

**⚠️ Important**: This application handles Protected Health Information (PHI). Ensure all compliance requirements are met before use in production.