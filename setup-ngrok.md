# Easy HTTPS Setup with ngrok (Alternative Solution)

## Why Use ngrok?
- Provides instant HTTPS URLs
- No certificate warnings on iPhone
- Easy to set up and use
- Works perfectly with iOS Safari

## Setup Steps:

### 1. Install ngrok
1. Go to: https://ngrok.com/download
2. Download ngrok for Windows
3. Extract to a folder (e.g., `C:\ngrok\`)
4. Add to PATH or run from folder

### 2. Start HTTP Server (Terminal 1)
```bash
cd photo-collector
python -m http.server 8000
```

### 3. Start ngrok (Terminal 2)
```bash
ngrok http 8000
```

### 4. Use HTTPS URL on iPhone
ngrok will show something like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8000
```

**Use the HTTPS URL on your iPhone!**

## iPhone Instructions:
1. Open Safari on iPhone
2. Go to the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. No certificate warnings!
4. Camera should work immediately

## Benefits:
✅ No certificate warnings
✅ Works on any network
✅ Easy to share with others
✅ Professional HTTPS setup