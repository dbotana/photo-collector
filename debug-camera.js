// iPhone Camera Debugging Script
// This script provides enhanced debugging for iOS camera issues

class iPhoneCameraDebugger {
    constructor() {
        this.debugLog = [];
        this.init();
    }

    init() {
        this.log('=== iPhone Camera Debugger Initialized ===');
        this.detectDevice();
        this.checkBrowserCapabilities();
        this.checkSecurityContext();
        this.setupDebugUI();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;

        this.debugLog.push(logEntry);

        // Console logging with colors
        const styles = {
            info: 'color: blue',
            error: 'color: red; font-weight: bold',
            warning: 'color: orange; font-weight: bold',
            success: 'color: green; font-weight: bold'
        };

        console.log(`%c${logEntry}`, styles[type] || styles.info);

        // Update debug UI
        this.updateDebugUI(logEntry, type);
    }

    detectDevice() {
        const ua = navigator.userAgent;

        this.log('User Agent: ' + ua);

        // Detect iOS
        if (/iPad|iPhone|iPod/.test(ua)) {
            const isIPhone = /iPhone/.test(ua);
            const isIPad = /iPad/.test(ua);

            this.log(`✓ iOS Device Detected: ${isIPhone ? 'iPhone' : isIPad ? 'iPad' : 'iPod'}`, 'success');

            // Extract iOS version
            const iosMatch = ua.match(/OS (\d+)_(\d+)/);
            if (iosMatch) {
                const iosVersion = `${iosMatch[1]}.${iosMatch[2]}`;
                this.log(`✓ iOS Version: ${iosVersion}`, 'success');

                const majorVersion = parseInt(iosMatch[1]);
                if (majorVersion >= 11) {
                    this.log('✓ iOS 11+ detected - Camera API supported', 'success');
                } else {
                    this.log(`❌ iOS ${majorVersion} - Camera API may not be supported`, 'error');
                }
            }

            // Check browser
            this.checkiOSBrowser(ua);
        } else {
            this.log('ℹ Non-iOS device detected', 'info');
        }
    }

    checkiOSBrowser(ua) {
        if (ua.includes('Safari') && !ua.includes('CriOS') && !ua.includes('FxiOS')) {
            this.log('✓ Using Safari - Camera should work', 'success');
        } else if (ua.includes('CriOS')) {
            this.log('❌ Chrome on iOS detected - Camera access limited', 'error');
            this.log('💡 Switch to Safari for camera access', 'warning');
        } else if (ua.includes('FxiOS')) {
            this.log('❌ Firefox on iOS detected - Camera access limited', 'error');
            this.log('💡 Switch to Safari for camera access', 'warning');
        } else {
            this.log('⚠ Unknown iOS browser - Camera may not work', 'warning');
        }
    }

    checkBrowserCapabilities() {
        this.log('--- Browser Capabilities Check ---');

        // Check MediaDevices API
        if (navigator.mediaDevices) {
            this.log('✓ MediaDevices API available', 'success');

            if (navigator.mediaDevices.getUserMedia) {
                this.log('✓ getUserMedia available', 'success');
            } else {
                this.log('❌ getUserMedia not available', 'error');
            }

            // Check for enumerateDevices (optional)
            if (navigator.mediaDevices.enumerateDevices) {
                this.checkDevices();
            }
        } else {
            this.log('❌ MediaDevices API not available', 'error');

            // Check for legacy getUserMedia
            const legacyGetUserMedia = navigator.getUserMedia ||
                                     navigator.webkitGetUserMedia ||
                                     navigator.mozGetUserMedia;

            if (legacyGetUserMedia) {
                this.log('⚠ Legacy getUserMedia available', 'warning');
            } else {
                this.log('❌ No camera API available', 'error');
            }
        }
    }

    async checkDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            this.log(`✓ Found ${videoDevices.length} camera(s)`, 'success');

            videoDevices.forEach((device, index) => {
                this.log(`  Camera ${index + 1}: ${device.label || 'Unknown Camera'}`);
            });
        } catch (error) {
            this.log(`⚠ Could not enumerate devices: ${error.message}`, 'warning');
        }
    }

    checkSecurityContext() {
        this.log('--- Security Context Check ---');

        if (location.protocol === 'https:') {
            this.log('✓ HTTPS detected - Camera access allowed', 'success');
        } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            this.log('✓ Localhost detected - Camera access allowed', 'success');
        } else if (location.hostname.match(/192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./)) {
            this.log('⚠ Local network HTTP - Camera may work on iOS Safari', 'warning');
            this.log('💡 For production, use HTTPS', 'info');
        } else {
            this.log('❌ Insecure context - Camera access blocked', 'error');
            this.log('💡 Camera requires HTTPS on iOS in production', 'warning');
        }
    }

    setupDebugUI() {
        // Create debug panel
        const debugPanel = document.createElement('div');
        debugPanel.id = 'ios-debug-panel';
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 300px;
            max-height: 200px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 10px;
            overflow-y: auto;
            z-index: 10000;
            display: none;
        `;

        const toggleButton = document.createElement('button');
        toggleButton.textContent = '🔍 Debug';
        toggleButton.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 10001;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 12px;
            cursor: pointer;
        `;

        toggleButton.onclick = () => {
            const isVisible = debugPanel.style.display === 'block';
            debugPanel.style.display = isVisible ? 'none' : 'block';
            toggleButton.style.display = isVisible ? 'block' : 'none';
        };

        document.body.appendChild(debugPanel);
        document.body.appendChild(toggleButton);

        this.debugPanel = debugPanel;
    }

    updateDebugUI(message, type) {
        if (!this.debugPanel) return;

        const colors = {
            error: '#ff4444',
            warning: '#ffaa00',
            success: '#44ff44',
            info: '#ffffff'
        };

        const logLine = document.createElement('div');
        logLine.style.color = colors[type] || colors.info;
        logLine.textContent = message;

        this.debugPanel.appendChild(logLine);
        this.debugPanel.scrollTop = this.debugPanel.scrollHeight;
    }

    async testCameraAccess() {
        this.log('--- Camera Access Test ---');

        try {
            this.log('🎥 Requesting camera access...', 'info');

            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            this.log('✅ Camera access GRANTED!', 'success');
            this.log('📹 Video stream obtained successfully', 'success');

            // Log stream details
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                const track = videoTracks[0];
                const settings = track.getSettings();
                this.log(`📐 Resolution: ${settings.width}x${settings.height}`, 'info');
                this.log(`📷 Camera: ${track.label}`, 'info');
            }

            // Clean up
            stream.getTracks().forEach(track => track.stop());
            this.log('🛑 Camera released', 'info');

            return true;

        } catch (error) {
            this.log(`❌ Camera access FAILED: ${error.name}`, 'error');
            this.log(`📝 Error message: ${error.message}`, 'error');

            // Provide specific guidance based on error type
            this.provideCameraErrorGuidance(error);

            return false;
        }
    }

    provideCameraErrorGuidance(error) {
        const guidance = {
            'NotAllowedError': [
                '📱 User denied camera permission',
                '💡 Go to Safari Settings → Camera → Allow',
                '💡 Or try refreshing and clicking "Allow" when prompted'
            ],
            'NotFoundError': [
                '📷 No camera found on device',
                '💡 Make sure camera is not blocked by another app',
                '💡 Try closing other camera apps'
            ],
            'NotReadableError': [
                '🔒 Camera is being used by another app',
                '💡 Close other camera apps and try again',
                '💡 Try restarting Safari'
            ],
            'OverconstrainedError': [
                '⚙️ Camera settings not supported',
                '💡 Trying fallback camera settings...'
            ],
            'SecurityError': [
                '🔒 Security restrictions prevent camera access',
                '💡 Make sure you\'re using HTTPS or localhost',
                '💡 Check if camera is blocked in browser settings'
            ]
        };

        const errorGuidance = guidance[error.name];
        if (errorGuidance) {
            errorGuidance.forEach(tip => this.log(tip, 'warning'));
        }
    }

    // Test with fallback constraints
    async testCameraFallback() {
        this.log('🔄 Trying fallback camera settings...', 'info');

        const fallbackConstraints = [
            { video: { facingMode: 'user' } },
            { video: true },
            { video: { width: 640, height: 480 } }
        ];

        for (const constraints of fallbackConstraints) {
            try {
                this.log(`🧪 Testing: ${JSON.stringify(constraints)}`, 'info');
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                this.log('✅ Fallback camera access successful!', 'success');
                stream.getTracks().forEach(track => track.stop());
                return true;
            } catch (error) {
                this.log(`❌ Fallback failed: ${error.name}`, 'warning');
            }
        }

        this.log('💥 All camera access attempts failed', 'error');
        return false;
    }

    // Export debug log
    exportDebugLog() {
        const logText = this.debugLog.join('\n');
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'iphone-camera-debug.txt';
        a.click();

        URL.revokeObjectURL(url);
        this.log('📄 Debug log exported', 'success');
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    window.iPhoneDebugger = new iPhoneCameraDebugger();

    // Add global test functions
    window.testCamera = () => window.iPhoneDebugger.testCameraAccess();
    window.testCameraFallback = () => window.iPhoneDebugger.testCameraFallback();
    window.exportDebugLog = () => window.iPhoneDebugger.exportDebugLog();

    console.log('iPhone Camera Debugger ready!');
    console.log('Run testCamera() to test camera access');
    console.log('Run exportDebugLog() to save debug info');
});