# 📱 Photo Collector PWA - Installation Guide

## Overview

Photo Collector is now a **Progressive Web App (PWA)** that can be installed directly on mobile devices and desktop computers, providing a native app-like experience with offline capabilities.

## 🚀 Quick Installation

### For iPhone/iPad (iOS 11.3+)

1. **Open Safari** (Chrome/Firefox won't work for PWA installation on iOS)
2. **Navigate** to your Photo Collector URL: `http://your-server-ip:8000`
3. **Tap the Share button** (square with up arrow) at the bottom of Safari
4. **Scroll down** and tap **"Add to Home Screen"**
5. **Customize the name** (optional) and tap **"Add"**
6. **Find the app** on your home screen with a custom icon

### For Android (Chrome 76+)

1. **Open Chrome browser**
2. **Navigate** to your Photo Collector URL
3. **Tap the banner** that appears: "Install Photo Collector"
   - OR tap the **⋮ menu** → **"Add to Home screen"**
4. **Tap "Install"** in the confirmation dialog
5. **App will be added** to your home screen and app drawer

### For Desktop (Chrome, Edge, Firefox)

1. **Open your browser**
2. **Navigate** to the Photo Collector URL
3. **Look for the install icon** (⊕) in the address bar
   - OR click the **install banner** that appears
4. **Click "Install"** in the popup dialog
5. **App opens** in its own window, separate from browser

## ✨ PWA Features

### 🔋 Offline Capabilities

- **Works without internet** for photo capture and form filling
- **Queues uploads** automatically when offline
- **Processes queue** when connection is restored
- **Visual status indicator** shows online/offline state

### 📱 Native App Experience

- **Runs in standalone mode** (no browser UI)
- **Custom app icon** and splash screen
- **Faster loading** with cached resources
- **Push notifications** support (future enhancement)

### 🔄 Smart Upload Queue

- **Automatic queuing** when network is unavailable
- **Retry mechanism** for failed uploads (3 attempts)
- **Background processing** when connection returns
- **User notifications** for queue status

## 📋 Setup Checklist

### Prerequisites

- [ ] **HTTPS connection** (required for full PWA features)
- [ ] **Modern browser** (Safari 11.3+, Chrome 76+, Firefox 79+, Edge 79+)
- [ ] **Network connectivity** for initial download
- [ ] **Storage space** (~2MB for cached files)

### Server Setup

```bash
# For local testing with HTTPS (recommended)
# Install and use mkcert for local SSL certificates

# Option 1: Using Python with HTTPS
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
python https-server.py  # Use the HTTPS server script

# Option 2: Using ngrok for public HTTPS
ngrok http 8000  # Provides public HTTPS URL

# Option 3: HTTP (limited PWA features)
python -m http.server 8000 --bind 0.0.0.0
```

### Icon Setup

1. **Download icon generator**: Open `generate-icons.html` in browser
2. **Generate all sizes**: Click download buttons for each icon size
3. **Convert to PNG**: Use online converter (convertio.co, cloudconvert.com)
4. **Create icons folder**:
   ```
   photo-collector/
   ├── icons/
   │   ├── icon-72x72.png
   │   ├── icon-96x96.png
   │   ├── icon-128x128.png
   │   ├── icon-144x144.png
   │   ├── icon-152x152.png
   │   ├── icon-192x192.png
   │   ├── icon-384x384.png
   │   └── icon-512x512.png
   ```

## 🎯 Platform-Specific Instructions

### iOS Safari

**Important**: Only Safari supports PWA installation on iOS

1. **Enable JavaScript**: Settings → Safari → Advanced → JavaScript (ON)
2. **Allow Location Access** (for camera): Settings → Privacy → Location Services → Safari → While Using App
3. **Camera Permissions**: Will be prompted when first accessing camera
4. **Storage**: Apps can store up to 50MB offline data

**Troubleshooting iOS**:
- If install option doesn't appear: Try refreshing the page
- Camera not working: Check HTTPS (required for camera on iOS)
- App not loading: Clear Safari cache and try again

### Android Chrome

**Optimal Experience**: Chrome provides the best PWA support on Android

1. **Enable PWA features**: Chrome → Settings → Site Settings → Desktop site (OFF)
2. **Allow notifications**: Grant permission when prompted
3. **Background sync**: Works automatically for upload queue

**Troubleshooting Android**:
- Install banner not showing: Check if already installed or dismissed
- Upload queue not working: Ensure background sync is enabled
- Slow performance: Clear app data in Settings → Apps → Photo Collector

### Desktop Installation

**Benefits**: Dedicated app window, faster access, keyboard shortcuts

**Shortcuts** (when installed):
- `Ctrl/Cmd + R`: Refresh
- `F11`: Fullscreen mode
- `Ctrl/Cmd + W`: Close app

## 📊 Offline Storage Details

### What's Cached
- **App files**: HTML, CSS, JavaScript (~500KB)
- **AWS SDK**: External library (~1.5MB)
- **Configuration**: S3 settings (localStorage)
- **Form data**: Patient info (temporary)

### What's NOT Cached
- **Photos**: Images are not stored offline
- **S3 uploads**: Queued uploads stored temporarily in IndexedDB
- **User data**: Only current session data

## 🛠️ Development & Testing

### Testing PWA Features

```bash
# Check PWA compliance
Chrome DevTools → Lighthouse → PWA Audit

# Test offline functionality
Chrome DevTools → Network → Offline checkbox

# Simulate slow connection
Chrome DevTools → Network → Slow 3G

# Check service worker
Chrome DevTools → Application → Service Workers
```

### Debugging

**Common Issues**:
- **Manifest errors**: Check browser console for manifest.json issues
- **Service worker issues**: Inspect in DevTools → Application tab
- **Icon problems**: Verify icon files exist and are correct size
- **HTTPS issues**: PWA requires HTTPS for full functionality

### Force Update

```javascript
// Force service worker update (for developers)
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});
```

## 🔐 Security Considerations

### Production Deployment

- **HTTPS Required**: Essential for PWA features and camera access
- **Content Security Policy**: Add CSP headers
- **Secure Headers**: X-Frame-Options, X-Content-Type-Options
- **Domain Restrictions**: Configure CORS for specific domains only

### Privacy

- **No Data Collection**: App doesn't track user behavior
- **Local Storage Only**: Configuration stored locally
- **AWS Credentials**: Keep config.js secure, never commit to git
- **Photo Metadata**: Includes patient info in S3 metadata

## 📞 Support & Troubleshooting

### Common Solutions

| Issue | Solution |
|-------|----------|
| Install option not appearing | Use supported browser, ensure HTTPS |
| Camera not working | Grant permissions, use HTTPS |
| Uploads failing offline | Check upload queue, wait for connection |
| App not updating | Force refresh (Ctrl+Shift+R) |
| Slow loading | Check network, clear cache |

### Browser Compatibility

| Feature | iOS Safari | Android Chrome | Desktop Chrome | Firefox | Edge |
|---------|------------|----------------|----------------|---------|------|
| Install | ✅ | ✅ | ✅ | ✅ | ✅ |
| Offline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Camera | ⚠️ HTTPS | ✅ | ✅ | ✅ | ✅ |
| Notifications | ❌ | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ❌ | ✅ | ✅ | ⚠️ Limited | ✅ |

**Legend**: ✅ Full Support, ⚠️ Partial/Conditional, ❌ Not Supported

## 🚨 Emergency Procedures

### Reset App Data

1. **Browser Settings** → Site Data → Remove all data for app domain
2. **Or on mobile**: Long press app icon → App Info → Storage → Clear Data

### Reinstall PWA

1. **Remove from home screen**: Long press → Remove/Delete
2. **Clear browser data** for the site
3. **Visit site again** and reinstall

### Recovery Mode

If app becomes unresponsive:
1. Force close the app
2. Clear site data
3. Visit URL directly in browser
4. Check console for errors
5. Reinstall if necessary

---

## 📋 Quick Reference

### Installation Commands
```bash
# Local HTTPS development
mkcert -install
mkcert localhost
python https-server.py

# Public HTTPS (ngrok)
ngrok http 8000

# HTTP (limited features)
python -m http.server 8000
```

### URLs to Remember
- **Local HTTP**: `http://localhost:8000`
- **Local HTTPS**: `https://localhost:8443`
- **Network Access**: `http://YOUR-IP:8000`
- **ngrok**: Use provided HTTPS URL

For technical support, check the browser console and service worker status in DevTools.