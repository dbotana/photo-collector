// AWS S3 Configuration Template
// Copy this file to config.js and fill in your actual AWS credentials
// config.js is excluded from git for security

const AWS_CONFIG = {
    bucket: 'your-s3-bucket-name',
    region: 'us-east-1', // or your preferred region
    accessKey: 'YOUR_AWS_ACCESS_KEY_ID_HERE',
    secretKey: 'YOUR_AWS_SECRET_ACCESS_KEY_HERE'
};

// Example:
// const AWS_CONFIG = {
//     bucket: 'photo-collector1',
//     region: 'us-east-1',
//     accessKey: 'AKIAIOSFODNN7EXAMPLE',
//     secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
// };