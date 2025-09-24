# 📸 Photo Collector PWA

A mobile-first Progressive Web App for clinical photography with AWS S3 integration. Users can install this as a native mobile app and use it completely offline.

## ✨ Features

- 📱 **Progressive Web App**: Install as native mobile app
- 📷 **Camera Capture**: Direct photo capture on mobile devices
- 📁 **Gallery Upload**: Select from existing photos
- 🔄 **Offline Capable**: Queue uploads when offline, sync when online
- 👤 **Patient Data**: Capture Patient ID, Visit Date, Phone Model
- 🏷️ **Smart Naming**: Auto-rename photos with patient info + timestamp
- ☁️ **AWS S3 Integration**: Direct upload with metadata
- 📊 **Upload Progress**: Real-time progress with retry logic
- 🔒 **Secure**: User credentials stored locally, not in code

## 🚀 **Production Deployment** ⭐

**This PWA is designed to be hosted online so users can install it as a native mobile app.**

### **Deployment Status**: ✅ **Successfully Tested**
- GitHub Pages deployment confirmed working
- PWA installation verified on mobile devices
- All offline features functional

### **Quick Deploy Steps:**
1. **Run deployment script**: `python prepare-deploy.py`
2. **Upload `deploy/` folder** to GitHub Pages, Netlify, or Vercel
3. **Share HTTPS URL** - users can install as native app!

**📖 Full instructions**: See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)

---

## 🧪 **Local Development**

For development and testing only:

```bash
cd photo-collector

# Quick test (HTTP - limited PWA features)
python -m http.server 8000

# Full PWA testing (HTTPS - recommended)
python https-server.py
```

**Note**: For production, users should access the deployed HTTPS version for full PWA functionality.

## 📁 **Repository Structure**

```
photo-collector/
├── Core App Files
│   ├── index.html              # Main app interface
│   ├── style.css               # PWA-optimized styling
│   ├── script.js               # App logic + PWA features
│   ├── manifest.json           # PWA configuration
│   └── sw.js                   # Service Worker (offline)
├── Configuration
│   ├── config.js               # AWS credentials (local only)
│   ├── config.template.js      # Template for deployment
│   └── .gitignore              # Excludes secrets
├── Assets
│   └── icons/                  # PWA icons (all sizes)
├── Development Tools
│   ├── https-server.py         # HTTPS server for testing
│   ├── prepare-deploy.py       # Creates deployment folder
│   └── convert-icons.html      # Icon format converter
├── Deployment
│   └── deploy/                 # Ready-to-upload folder
└── Documentation
    ├── README.md               # This file
    ├── DEPLOYMENT-GUIDE.md     # Step-by-step hosting
    └── CLAUDE.md               # Technical documentation
```

## ☁️ **AWS S3 Configuration**

Users need their own S3 bucket and credentials to store photos:

### **Quick Setup:**
1. **Create S3 bucket** in AWS Console
2. **Set CORS policy** (allow web uploads)
3. **Create IAM user** with S3 upload permissions
4. **Enter credentials** in the deployed app

### **Detailed Guide:**
See the original AWS setup section in [CLAUDE.md](CLAUDE.md) for step-by-step instructions.

---

## 💡 **Key Features Explained**

### **Progressive Web App (PWA)**
- **Install as native app** on mobile devices
- **Works offline** - photos captured and queued
- **Auto-sync** when connection restored
- **App-like experience** - no browser UI when installed

### **Smart Photo Naming**
Photos are automatically renamed with format:
```
PatientID_YYYY-MM-DD_PhoneModel_timestamp.jpg
```
Example: `PATIENT123_2024-01-15_iPhone14Pro_2024-01-15T10-30-45Z.jpg`

### **Clinical Workflow**
1. **Install PWA** on mobile device
2. **Enter patient info** (ID, visit date, phone model)
3. **Capture or select photo**
4. **Add description**
5. **Upload to S3** with metadata

---

---
