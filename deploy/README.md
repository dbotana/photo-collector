# Photo Collector Web App

A mobile-friendly web application for capturing photos using device cameras or uploading from gallery, with direct upload to Amazon S3 storage.

## Features

- 📷 **Camera Capture**: Take photos directly using device camera (iOS/Android)
- 📁 **Gallery Upload**: Upload existing photos from device gallery
- 📱 **Mobile Optimized**: Large touch targets (60px+) and responsive design
- ☁️ **S3 Integration**: Direct upload to Amazon S3 with metadata
- 📊 **Progress Tracking**: Real-time upload progress indicator
- 💬 **User Feedback**: Success/error messages for all operations
- 🔒 **Secure Storage**: S3 credentials saved locally in browser
- 🎯 **Cross-Platform**: Works on iPhone, Android, and desktop

## 🚀 **Deploy for End Users (Recommended)**

**For end users to install this as a mobile app**, you need to host it online with HTTPS:

### **Quick Deploy (5 minutes):**
1. **Upload to GitHub Pages** (free hosting)
2. **Share the public URL** with users
3. **Users install as native mobile app** from their phones

**👉 See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for step-by-step instructions**

---

## 🧪 **Local Development Testing**

### 1. Start the Application
```bash
# Clone or download the project files
cd photo-collector

# For local testing only:
python -m http.server 8000
# Access at: http://localhost:8000
```

### 2. Pre-configured S3 Bucket
The app is **automatically configured** with a test S3 bucket:
- **Bucket**: `photo-collector1` (TestUploads folder)
- **Region**: `us-east-1`
- **Credentials**: Pre-configured for immediate testing

### 3. Test and Use
- Grant camera permissions when prompted
- Take photos or upload from gallery
- Add descriptions and upload to S3

---

## 📱 Mobile App Installation (PWA)

Photo Collector can be installed as a native mobile app on your phone! Here are the exact steps:

### 🍎 iPhone Installation (iOS 11.3+)

#### Step 1: Start HTTPS Server (Required for iOS)
```bash
cd photo-collector

# For full PWA features on iOS, use HTTPS:
python https-server.py
```

#### Step 2: Connect iPhone
1. **Connect iPhone to same WiFi** as your computer
2. **Find your computer's IP address**:
   - Windows: Run `ipconfig` and look for "IPv4 Address"
   - Mac: Run `hostname -I` or check System Preferences → Network

#### Step 3: Install on iPhone
1. **Open Safari** on iPhone (NOT Chrome - PWA won't work)
2. **Visit**: `https://YOUR-IP-ADDRESS:8443`
   - Example: `https://192.168.1.100:8443`
3. **Accept security warning** (tap "Advanced" → "Proceed")
4. **Tap the Share button** (square with up arrow)
5. **Scroll down** and tap **"Add to Home Screen"**
6. **Tap "Add"** - the app icon will appear on your home screen!

### 🤖 Android Installation

#### Step 1: Start Server
```bash
cd photo-collector
python -m http.server 8000 --bind 0.0.0.0
```

#### Step 2: Install on Android
1. **Open Chrome** on Android
2. **Visit**: `http://YOUR-IP-ADDRESS:8000`
3. **Look for "Install Photo Collector" banner** at bottom of screen
4. **Tap "Install"** - app will be added to home screen and app drawer

### 💻 Desktop Installation
1. **Open Chrome/Edge/Firefox**
2. **Visit**: `http://localhost:8000`
3. **Click the install icon** (⊕) in the address bar
4. **Click "Install"** - app opens in dedicated window

## 🔧 Troubleshooting PWA Installation

### "Install" Button Not Showing?

**For iPhone**: iOS doesn't show automatic install prompts. Always use Safari → Share → "Add to Home Screen"

**For Android/Desktop**: Install prompts appear only when these conditions are met:
1. ✅ **HTTPS connection** (or localhost for testing)
2. ✅ **Valid manifest.json** file
3. ✅ **Service Worker** registered successfully
4. ✅ **Required icons** present (192px and 512px minimum)
5. ✅ **Not already installed**

### Quick Checks:
1. **Open browser console** (F12) and look for errors
2. **Check Application tab** → Manifest to see if it loads
3. **Verify Service Worker** is registered in Application → Service Workers
4. **Try incognito/private browsing** mode

### Manual Installation (Always Works):
- **iPhone**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu (⋮) → Add to Home Screen
- **Desktop**: Browser Menu → Install [App Name]

### iPhone Testing Checklist
- ✅ **Camera opens** when "Take Photo" is tapped
- ✅ **Large buttons** are easy to tap (optimized for touch)
- ✅ **Photo gallery** opens when "Upload from Gallery" is tapped
- ✅ **Preview shows** captured/selected images properly
- ✅ **Upload works** to S3 with progress indicator
- ✅ **No horizontal scrolling** (responsive design)

### Troubleshooting iPhone Issues

**Camera doesn't work?**
- Use Safari browser (not Chrome/Firefox)
- Ensure HTTP (not HTTPS) for local testing
- Check camera permissions in Safari settings

**Can't connect from iPhone?**
- Verify both devices on same WiFi network
- Check Windows Firewall (may block port 8000)
- Try `http://YOUR-IP:8000` in iPhone browser first

**Upload fails?**
- Pre-configured S3 should work immediately
- Check internet connection on both devices
- Look for error messages in the app

---

## AWS S3 Setup Guide

### Step 1: Create S3 Bucket

1. **Log into AWS Console**: https://aws.amazon.com/console/
2. **Navigate to S3**: Services → Storage → S3
3. **Create Bucket**:
   - Click "Create bucket"
   - **Bucket name**: Choose a globally unique name (e.g., `my-photo-collector-2024`)
   - **Region**: Select your preferred region (e.g., `us-east-1`)
   - **Block Public Access**: Keep default settings (recommended)
   - Click "Create bucket"

### Step 2: Configure CORS Policy

S3 buckets need CORS configuration to allow web uploads:

1. **Select your bucket** → **Permissions** tab
2. **Cross-origin resource sharing (CORS)** section
3. **Click "Edit"** and paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ]
    }
]
```

4. **Click "Save changes"**

### Step 3: Create IAM User

Create a dedicated user with limited S3 permissions:

1. **Navigate to IAM**: Services → Security → IAM
2. **Users** → **Add users**
3. **User details**:
   - **User name**: `photo-collector-user`
   - **Select AWS credential type**: Access key - Programmatic access
4. **Set permissions**: Attach existing policies directly
5. **Create policy** (if needed):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:HeadBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        }
    ]
}
```

**Replace `YOUR-BUCKET-NAME`** with your actual bucket name.

6. **Review and create user**
7. **Save the Access Key ID and Secret Access Key** (you won't see them again!)

### Step 4: Configure App Settings

In the Photo Collector app:

1. **Click "S3 Configuration"** to expand settings
2. **Enter your details**:
   - **S3 Bucket Name**: Your bucket name (e.g., `my-photo-collector-2024`)
   - **AWS Region**: Your bucket's region (e.g., `us-east-1`)
   - **AWS Access Key ID**: From IAM user creation (20 characters)
   - **AWS Secret Access Key**: From IAM user creation (40 characters)
3. **Settings save automatically** in browser storage

---

## iPhone/Mobile Testing Guide

### Method 1: Local Network Access (Recommended)

This allows testing camera functionality on your iPhone:

#### 1. Find Your Computer's IP Address

**Windows**:
```cmd
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.100`)

**Mac/Linux**:
```bash
ifconfig | grep inet
```
Look for your local IP (usually starts with `192.168.` or `10.`)

#### 2. Start Server with Network Binding

```bash
cd photo-collector

# Windows
python -m http.server 8000 --bind 0.0.0.0

# Mac/Linux
python3 -m http.server 8000 --bind 0.0.0.0
```

#### 3. Access from iPhone

1. **Connect iPhone to same WiFi network** as your computer
2. **Open Safari on iPhone**
3. **Navigate to**: `http://YOUR-IP-ADDRESS:8000`
   - Example: `http://192.168.1.100:8000`
4. **Allow camera access** when prompted
5. **Add to Home Screen** (optional): Safari menu → "Add to Home Screen"

### Method 2: HTTPS for Production Testing

For full camera functionality, iPhone requires HTTPS:

#### Option A: Using ngrok (Easy)

1. **Install ngrok**: https://ngrok.com/download
2. **Start your local server**:
   ```bash
   python -m http.server 8000
   ```
3. **In another terminal**:
   ```bash
   ngrok http 8000
   ```
4. **Use the HTTPS URL** provided by ngrok (e.g., `https://abc123.ngrok.io`)

#### Option B: Self-Signed Certificate

1. **Generate certificate**:
   ```bash
   # Create self-signed certificate
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```

2. **Start HTTPS server**:
   ```python
   # https_server.py
   import http.server
   import ssl
   import socketserver

   PORT = 8443
   Handler = http.server.SimpleHTTPRequestHandler

   with socketserver.TCPServer(("", PORT), Handler) as httpd:
       httpd.socket = ssl.wrap_socket(httpd.socket,
                                    certfile='./cert.pem',
                                    keyfile='./key.pem',
                                    server_side=True)
       print(f"HTTPS Server at https://localhost:{PORT}")
       httpd.serve_forever()
   ```

3. **Run**: `python https_server.py`
4. **Access**: `https://YOUR-IP:8443` (accept security warning)

### iPhone-Specific Testing Checklist

- ✅ **Camera Access**: Should prompt for permission
- ✅ **Touch Targets**: Buttons should be easily tappable (60px+)
- ✅ **Viewport**: No horizontal scrolling, proper scaling
- ✅ **File Upload**: "Choose File" should open photo library
- ✅ **Photo Preview**: Images display properly before upload
- ✅ **Keyboard**: Text input should work without layout issues
- ✅ **Progress**: Upload progress should be visible
- ✅ **Notifications**: Success/error messages display properly

---

## Troubleshooting

### Camera Issues on iPhone

**Problem**: Camera button doesn't work
- **Solution**: Ensure using HTTPS or local IP address
- **Check**: Safari → Settings → Camera access allowed

**Problem**: "Camera not supported"
- **Solution**: Use Safari browser (Chrome/Firefox have limitations)
- **Check**: iOS version (requires iOS 11+)

### S3 Upload Issues

**Problem**: "Access Denied" error
- **Check**: IAM policy includes both bucket and object permissions
- **Verify**: Bucket name matches exactly (case-sensitive)
- **Test**: Try uploading a small test file first

**Problem**: CORS errors in browser console
- **Solution**: Verify CORS policy is saved correctly
- **Check**: AllowedOrigins includes "*" or your specific domain
- **Wait**: CORS changes may take a few minutes to propagate

**Problem**: "Invalid Access Key" error
- **Check**: No extra spaces in Access Key ID or Secret Key
- **Verify**: Keys are from the correct IAM user
- **Test**: Keys work in AWS CLI: `aws s3 ls s3://your-bucket-name`

### Network/Connectivity Issues

**Problem**: Can't access from iPhone
- **Check**: Both devices on same WiFi network
- **Verify**: Computer firewall allows incoming connections on port 8000
- **Test**: Try accessing from another device first

**Problem**: Slow uploads
- **Solution**: Use WiFi instead of cellular data
- **Check**: Image size (app compresses to ~80% quality)
- **Consider**: Upload during off-peak hours

---

## Development and Testing

### Running Tests

The app includes comprehensive test suites:

```bash
# Run automated tests
python run-tests.py

# Test individual components
# - Browser compatibility: /test.html
# - S3 functionality: /test-s3.html
# - Mobile responsiveness: /test-mobile.html
# - Debug tools: /debug-test.html
```

### File Structure

```
photo-collector/
├── index.html              # Main application
├── style.css               # Mobile-first responsive styles
├── script.js               # Core JavaScript functionality
├── README.md               # This file
├── CLAUDE.md               # Technical documentation
├── TESTING.md              # Testing procedures
├── run-tests.py           # Automated test runner
├── test.html              # Browser compatibility tests
├── test-s3.html           # S3 upload tests
├── test-mobile.html       # Mobile responsiveness tests
├── debug-test.html        # Development debugging
└── create-test-image.html # Test image generator
```

### Browser Compatibility

- **Chrome 53+** (recommended for development)
- **Safari 11+** (required for iOS camera access)
- **Firefox 36+** (camera support varies)
- **Edge 12+** (basic functionality)

**Note**: Camera access requires HTTPS except on localhost

---

## Security Considerations

### Production Deployment

- **Use HTTPS**: Required for camera access on mobile devices
- **Environment Variables**: Store AWS credentials server-side
- **Server-Side Upload**: Consider using signed URLs instead of client credentials
- **CORS Policy**: Restrict to specific domains in production
- **Content Security Policy**: Add CSP headers for additional security

### Development/Testing

- **Local Storage**: AWS credentials stored in browser localStorage
- **Limited Scope**: IAM user has minimal S3 permissions only
- **Temporary Access**: Consider using AWS STS temporary credentials
- **Network Security**: Use local network access for mobile testing

---

## Support

### Getting Help

1. **Check Browser Console**: F12 → Console tab for error messages
2. **Test on Desktop First**: Ensure basic functionality works
3. **Verify S3 Setup**: Use AWS CLI to test bucket access
4. **Mobile Issues**: Try different browsers (Safari recommended for iOS)

### Common Solutions

- **Camera not working**: Use HTTPS or local network IP
- **Upload failing**: Check S3 credentials and CORS policy
- **Layout issues**: Test different screen sizes in browser dev tools
- **Performance problems**: Check image file sizes and network speed

For technical details, see `CLAUDE.md` and `TESTING.md`.
