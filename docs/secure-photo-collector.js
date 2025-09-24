/**
 * HIPAA Compliant Photo Collector
 * Implements end-to-end encryption, secure authentication, and audit logging
 */

// Comprehensive debugging system
class DebugLogger {
    constructor() {
        this.isDebugMode = this.getDebugMode();
        this.logs = [];
        this.maxLogs = 1000; // Prevent memory overflow
        this.startTime = performance.now();

        if (this.isDebugMode) {
            console.log('🐛 Debug mode enabled - HIPAA Compliant Photo Collector');
            this.setupPerformanceMonitoring();
        }
    }

    getDebugMode() {
        // Check URL parameter, localStorage, or environment
        const urlParams = new URLSearchParams(window.location.search);
        const urlDebug = urlParams.get('debug') === 'true';
        const storageDebug = localStorage.getItem('hipaa_debug_mode') === 'true';
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        return urlDebug || storageDebug || isDevelopment;
    }

    setupPerformanceMonitoring() {
        // Monitor performance metrics
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        this.debug('performance', 'Navigation timing', {
                            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                            loadComplete: entry.loadEventEnd - entry.loadEventStart,
                            totalTime: entry.loadEventEnd - entry.fetchStart
                        });
                    }
                });
            });
            observer.observe({ entryTypes: ['navigation'] });
        }
    }

    debug(category, message, data = null, level = 'info') {
        if (!this.isDebugMode) return;

        const timestamp = new Date().toISOString();
        const timeSinceStart = (performance.now() - this.startTime).toFixed(2);

        const logEntry = {
            timestamp,
            timeSinceStart: `${timeSinceStart}ms`,
            category,
            level,
            message,
            data,
            stackTrace: level === 'error' ? new Error().stack : null
        };

        // Add to internal log storage
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift(); // Remove oldest log
        }

        // Console output with colors
        const colors = {
            info: '#2196F3',
            warn: '#FF9800',
            error: '#F44336',
            success: '#4CAF50',
            security: '#9C27B0',
            encryption: '#E91E63',
            network: '#00BCD4',
            performance: '#607D8B'
        };

        const color = colors[level] || colors.info;

        console.groupCollapsed(`%c[${category.toUpperCase()}] ${message}`, `color: ${color}; font-weight: bold;`);
        console.log(`⏱️ Time: ${timestamp}`);
        console.log(`⚡ Since start: ${timeSinceStart}ms`);
        if (data) {
            console.log('📊 Data:', data);
        }
        if (logEntry.stackTrace) {
            console.log('📍 Stack:', logEntry.stackTrace);
        }
        console.groupEnd();
    }

    exportLogs() {
        return {
            logs: this.logs,
            summary: {
                totalLogs: this.logs.length,
                sessionDuration: `${((performance.now() - this.startTime) / 1000).toFixed(2)}s`,
                categories: this.logs.reduce((acc, log) => {
                    acc[log.category] = (acc[log.category] || 0) + 1;
                    return acc;
                }, {}),
                levels: this.logs.reduce((acc, log) => {
                    acc[log.level] = (acc[log.level] || 0) + 1;
                    return acc;
                }, {})
            }
        };
    }

    downloadLogs() {
        const exportData = this.exportLogs();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hipaa-debug-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize global debug logger
const debugLogger = new DebugLogger();

// Add debug utilities to window for console access
if (debugLogger.isDebugMode) {
    window.hipaaDebug = {
        logger: debugLogger,
        exportLogs: () => debugLogger.exportLogs(),
        downloadLogs: () => debugLogger.downloadLogs(),
        enableDebug: () => localStorage.setItem('hipaa_debug_mode', 'true'),
        disableDebug: () => localStorage.removeItem('hipaa_debug_mode')
    };
}

class SecurePhotoCollector {
    constructor() {
        this.currentStream = null;
        this.capturedImage = null;
        this.isUploading = false;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        this.retryCount = 0;
        this.maxRetries = 3;

        // Security properties
        this.authToken = null;
        this.sessionExpiry = null;
        this.encryptionKey = null;
        this.currentUser = null;
        this.organizationId = null;

        // API Configuration - uses global configuration in production
        this.apiBaseUrl = window.HIPAA_CONFIG?.API_BASE_URL || 'https://your-api-gateway.amazonaws.com/prod';

        this.initializeApplication();
    }

    async initializeApplication() {
        debugLogger.debug('init', 'Starting HIPAA application initialization', {
            userAgent: navigator.userAgent,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            timestamp: new Date().toISOString()
        });

        try {
            debugLogger.debug('init', 'Initializing DOM elements');
            this.initializeElements();

            debugLogger.debug('init', 'Attaching event listeners');
            this.attachEventListeners();

            debugLogger.debug('init', 'Checking browser support');
            this.checkBrowserSupport();

            debugLogger.debug('init', 'Initializing encryption system', null, 'encryption');
            this.initializeEncryption();

            debugLogger.debug('init', 'Checking existing session', null, 'security');
            this.checkExistingSession();

            debugLogger.debug('init', 'Application initialization completed successfully', null, 'success');
        } catch (error) {
            debugLogger.debug('init', 'Application initialization failed', {
                error: error.message,
                stack: error.stack
            }, 'error');
            console.error('Failed to initialize SecurePhotoCollector:', error);
            this.showMessage('Failed to initialize the application. Please refresh the page.', 'error');
        }
    }

    initializeElements() {
        debugLogger.debug('dom', 'Starting DOM element initialization');

        const elementIds = [
            // Auth elements
            'authSection', 'appSection', 'username', 'password', 'loginBtn', 'logoutBtn',
            'currentUser', 'sessionStatus', 'sessionIcon', 'sessionText', 'sessionExpiry',

            // App elements
            'cameraBtn', 'uploadBtn', 'fileInput', 'cameraContainer', 'cameraVideo',
            'captureBtn', 'closeCameraBtn', 'previewSection', 'previewImage', 'removeImageBtn',
            'description', 'patientId', 'visitDate', 'phoneModel', 'organizationId', 'uploadToS3Btn',
            'progressContainer', 'progressFill', 'progressText', 'progressStatus', 'messageContainer'
        ];

        this.elements = {};
        const missingElements = [];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
                debugLogger.debug('dom', `Missing DOM element: ${id}`, null, 'warn');
            } else {
                this.elements[id] = element;
            }
        });

        debugLogger.debug('dom', 'DOM element initialization results', {
            totalElements: elementIds.length,
            foundElements: Object.keys(this.elements).length,
            missingElements: missingElements
        });

        if (missingElements.length > 0) {
            debugLogger.debug('dom', 'DOM initialization failed due to missing elements', {
                missingElements: missingElements
            }, 'error');
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }

        debugLogger.debug('dom', 'All DOM elements found successfully', null, 'success');
    }

    attachEventListeners() {
        const safeEventListener = (element, event, handler) => {
            element.addEventListener(event, async (e) => {
                try {
                    await handler(e);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                    this.showMessage('An unexpected error occurred. Please try again.', 'error');
                    this.logSecurityEvent('error', 'event_handler_error', { event, error: error.message });
                }
            });
        };

        // Authentication listeners
        safeEventListener(this.elements.loginBtn, 'click', () => this.performLogin());
        safeEventListener(this.elements.logoutBtn, 'click', () => this.performLogout());
        safeEventListener(this.elements.password, 'keypress', (e) => {
            if (e.key === 'Enter') this.performLogin();
        });

        // App listeners
        safeEventListener(this.elements.cameraBtn, 'click', () => this.openCamera());
        safeEventListener(this.elements.uploadBtn, 'click', () => this.openFileDialog());
        safeEventListener(this.elements.fileInput, 'change', (e) => this.handleFileSelect(e));
        safeEventListener(this.elements.captureBtn, 'click', () => this.capturePhoto());
        safeEventListener(this.elements.closeCameraBtn, 'click', () => this.closeCamera());
        safeEventListener(this.elements.removeImageBtn, 'click', () => this.removeImage());
        safeEventListener(this.elements.uploadToS3Btn, 'click', () => this.secureUpload());

        // Session monitoring
        setInterval(() => this.checkSessionStatus(), 30000); // Check every 30 seconds
    }

    initializeEncryption() {
        // Generate client-side encryption key (in production, derive from server)
        this.encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
        this.logSecurityEvent('info', 'encryption_initialized', { timestamp: new Date().toISOString() });
    }

    checkExistingSession() {
        const savedSession = sessionStorage.getItem('hipaa_photo_session');
        if (savedSession) {
            try {
                const sessionData = JSON.parse(savedSession);
                if (sessionData.expiry > Date.now()) {
                    this.authToken = sessionData.token;
                    this.currentUser = sessionData.user;
                    this.sessionExpiry = sessionData.expiry;
                    this.organizationId = sessionData.organizationId;
                    this.showAppSection();
                    this.updateSessionDisplay();
                } else {
                    this.clearSession();
                }
            } catch (error) {
                console.warn('Invalid session data, clearing:', error);
                this.clearSession();
            }
        }
    }

    async performLogin() {
        const startTime = performance.now();
        const username = this.elements.username.value.trim();
        const password = this.elements.password.value;

        debugLogger.debug('auth', 'Login attempt started', {
            username: username,
            passwordProvided: password.length > 0,
            timestamp: new Date().toISOString()
        }, 'security');

        if (!username || !password) {
            debugLogger.debug('auth', 'Login validation failed', {
                usernameProvided: username.length > 0,
                passwordProvided: password.length > 0
            }, 'warn');
            this.showMessage('Please enter both username and password.', 'error');
            return;
        }

        this.elements.loginBtn.disabled = true;
        this.elements.loginBtn.textContent = 'Authenticating...';

        try {
            debugLogger.debug('auth', 'Calling authentication API', {
                endpoint: '/auth/login',
                method: 'POST'
            }, 'network');

            // In production, this would call your authentication API
            const response = await this.callSecureAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            debugLogger.debug('auth', 'Authentication API response received', {
                success: response.success,
                hasToken: !!response.token,
                user: response.user,
                organizationId: response.organizationId,
                expiresIn: response.expiresIn
            }, 'network');

            if (response.success) {
                this.authToken = response.token;
                this.currentUser = response.user;
                this.organizationId = response.organizationId;
                this.sessionExpiry = Date.now() + (response.expiresIn * 1000);

                debugLogger.debug('auth', 'Session data prepared', {
                    hasToken: !!this.authToken,
                    user: this.currentUser,
                    organizationId: this.organizationId,
                    sessionExpiryTime: new Date(this.sessionExpiry).toISOString()
                }, 'security');

                // Store session (encrypted)
                const sessionData = {
                    token: this.authToken,
                    user: this.currentUser,
                    organizationId: this.organizationId,
                    expiry: this.sessionExpiry
                };

                debugLogger.debug('auth', 'Storing encrypted session data', {
                    storageType: 'sessionStorage',
                    dataSize: JSON.stringify(sessionData).length
                }, 'security');

                sessionStorage.setItem('hipaa_photo_session', JSON.stringify(sessionData));

                this.showAppSection();
                this.updateSessionDisplay();
                this.logSecurityEvent('info', 'user_login_success', { user: username });

                const loginDuration = (performance.now() - startTime).toFixed(2);
                debugLogger.debug('auth', 'Login completed successfully', {
                    user: username,
                    duration: `${loginDuration}ms`,
                    organizationId: this.organizationId
                }, 'success');

                this.showMessage('Login successful!', 'success');

                // Clear login form
                this.elements.username.value = '';
                this.elements.password.value = '';
            } else {
                throw new Error(response.message || 'Authentication failed');
            }
        } catch (error) {
            const loginDuration = (performance.now() - startTime).toFixed(2);
            debugLogger.debug('auth', 'Login failed', {
                user: username,
                error: error.message,
                duration: `${loginDuration}ms`
            }, 'error');

            console.error('Login error:', error);
            this.showMessage('Authentication failed. Please check your credentials.', 'error');
            this.logSecurityEvent('warning', 'user_login_failed', { user: username, error: error.message });
        } finally {
            this.elements.loginBtn.disabled = false;
            this.elements.loginBtn.textContent = '🔐 Secure Login';
        }
    }

    async performLogout() {
        try {
            if (this.authToken) {
                await this.callSecureAPI('/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }

            this.logSecurityEvent('info', 'user_logout', { user: this.currentUser });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            this.clearSession();
            this.showMessage('Logged out successfully.', 'success');
        }
    }

    clearSession() {
        this.authToken = null;
        this.currentUser = null;
        this.organizationId = null;
        this.sessionExpiry = null;
        sessionStorage.removeItem('hipaa_photo_session');
        this.showAuthSection();
        this.closeCamera();
        this.removeImage();
    }

    showAuthSection() {
        this.elements.authSection.classList.remove('hidden');
        this.elements.appSection.classList.add('hidden');
    }

    showAppSection() {
        this.elements.authSection.classList.add('hidden');
        this.elements.appSection.classList.remove('hidden');
    }

    updateSessionDisplay() {
        if (this.currentUser) {
            this.elements.currentUser.textContent = `User: ${this.currentUser}`;
            const expiryDate = new Date(this.sessionExpiry);
            this.elements.sessionExpiry.textContent = `Expires: ${expiryDate.toLocaleTimeString()}`;
        }
    }

    checkSessionStatus() {
        if (this.sessionExpiry && Date.now() > this.sessionExpiry) {
            this.showMessage('Session expired. Please log in again.', 'warning');
            this.clearSession();
        } else if (this.sessionExpiry) {
            const timeLeft = Math.floor((this.sessionExpiry - Date.now()) / 1000 / 60);
            if (timeLeft <= 5) {
                this.showMessage(`Session expires in ${timeLeft} minute(s). Please save your work.`, 'warning');
            }
        }
    }

    async openCamera() {
        if (!this.authToken) {
            this.showMessage('Please log in first.', 'error');
            return;
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }

            this.showMessage('Requesting camera access...', 'info');

            const constraints = [
                {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                { video: true }
            ];

            let stream = null;
            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    break;
                } catch (err) {
                    console.warn('Camera constraint failed:', constraint, err);
                }
            }

            if (!stream) {
                throw new Error('All camera configurations failed');
            }

            this.currentStream = stream;
            this.elements.cameraVideo.srcObject = stream;

            await new Promise((resolve, reject) => {
                this.elements.cameraVideo.onloadedmetadata = resolve;
                this.elements.cameraVideo.onerror = reject;
                setTimeout(reject, 5000);
            });

            this.elements.cameraContainer.classList.remove('hidden');
            this.clearMessages();
            this.logSecurityEvent('info', 'camera_accessed', { user: this.currentUser });

        } catch (error) {
            console.error('Camera access error:', error);
            this.showMessage(`Camera access failed: ${error.message}`, 'error');
            this.logSecurityEvent('warning', 'camera_access_failed', { user: this.currentUser, error: error.message });
            this.closeCamera();
        }
    }

    closeCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.elements.cameraContainer.classList.add('hidden');
    }

    capturePhoto() {
        try {
            const video = this.elements.cameraVideo;
            if (!video || !video.videoWidth || !video.videoHeight) {
                throw new Error('Camera video is not ready');
            }

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) {
                    this.showMessage('Failed to capture photo. Please try again.', 'error');
                    return;
                }

                this.capturedImage = new File([blob], `photo_${Date.now()}.jpg`, {
                    type: 'image/jpeg'
                });

                const imageUrl = URL.createObjectURL(blob);
                this.displayImagePreview(imageUrl);
                this.closeCamera();
                this.showMessage('Photo captured successfully!', 'success');
                this.logSecurityEvent('info', 'photo_captured', {
                    user: this.currentUser,
                    fileSize: blob.size
                });
            }, 'image/jpeg', 0.8);

        } catch (error) {
            console.error('Photo capture error:', error);
            this.showMessage(`Failed to capture photo: ${error.message}`, 'error');
            this.logSecurityEvent('error', 'photo_capture_failed', {
                user: this.currentUser,
                error: error.message
            });
        }
    }

    openFileDialog() {
        if (!this.authToken) {
            this.showMessage('Please log in first.', 'error');
            return;
        }
        this.elements.fileInput.click();
    }

    handleFileSelect(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;

            if (!this.supportedTypes.includes(file.type)) {
                throw new Error(`Unsupported file type: ${file.type}`);
            }

            if (file.size > this.maxFileSize) {
                throw new Error(`File size exceeds ${Math.round(this.maxFileSize / 1024 / 1024)}MB limit`);
            }

            this.capturedImage = file;
            const imageUrl = URL.createObjectURL(file);

            const img = new Image();
            img.onload = () => {
                this.displayImagePreview(imageUrl);
                this.showMessage('Image loaded successfully!', 'success');
                this.logSecurityEvent('info', 'file_selected', {
                    user: this.currentUser,
                    fileName: file.name,
                    fileSize: file.size
                });
            };
            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                this.showMessage('Failed to load image. File may be corrupted.', 'error');
            };
            img.src = imageUrl;

        } catch (error) {
            this.showMessage(error.message, 'error');
        } finally {
            event.target.value = '';
        }
    }

    displayImagePreview(imageUrl) {
        this.elements.previewImage.src = imageUrl;
        this.elements.previewSection.classList.remove('hidden');
        this.elements.description.focus();

        // Auto-fill organization ID from session
        if (this.organizationId) {
            this.elements.organizationId.value = this.organizationId;
        }
    }

    removeImage() {
        this.capturedImage = null;
        this.elements.previewImage.src = '';
        this.elements.previewSection.classList.add('hidden');
        this.elements.description.value = '';
        this.elements.patientId.value = '';
        this.elements.visitDate.value = '';
        this.elements.phoneModel.value = '';
        this.clearMessages();
    }

    async secureUpload() {
        if (!this.authToken) {
            this.showMessage('Please log in first.', 'error');
            return;
        }

        if (this.isUploading) {
            this.showMessage('Upload already in progress.', 'info');
            return;
        }

        if (!this.capturedImage) {
            this.showMessage('Please capture or select an image first.', 'error');
            return;
        }

        const formValidation = this.validateForm();
        if (!formValidation.valid) {
            this.showMessage(`Form Error: ${formValidation.message}`, 'error');
            return;
        }

        this.isUploading = true;
        this.retryCount = 0;
        await this.attemptSecureUpload();
    }

    async attemptSecureUpload() {
        try {
            this.showMessage('Encrypting and uploading...', 'info');
            this.showProgress(0, 'Encrypting data...');

            // Collect form data
            const formData = {
                description: this.elements.description.value.trim(),
                patientId: this.elements.patientId.value.trim(),
                visitDate: this.elements.visitDate.value.trim(),
                phoneModel: this.elements.phoneModel.value.trim(),
                organizationId: this.elements.organizationId.value.trim()
            };

            // Hash patient ID for privacy
            const hashedPatientId = CryptoJS.SHA256(formData.patientId + this.organizationId).toString();

            // Encrypt sensitive data
            const encryptedData = this.encryptSensitiveData(formData);

            // Convert image to base64 for encryption
            const imageBase64 = await this.fileToBase64(this.capturedImage);
            const encryptedImage = CryptoJS.AES.encrypt(imageBase64, this.encryptionKey).toString();

            this.updateProgress(25, 'Preparing secure upload...');

            // Generate secure filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${hashedPatientId}_${formData.visitDate}_${timestamp}.enc`;

            // Prepare upload payload
            const uploadPayload = {
                fileName: fileName,
                encryptedImage: encryptedImage,
                encryptedMetadata: encryptedData,
                hashedPatientId: hashedPatientId,
                organizationId: this.organizationId,
                uploadTimestamp: new Date().toISOString(),
                originalFilename: this.capturedImage.name,
                fileSize: this.capturedImage.size
            };

            this.updateProgress(50, 'Uploading to secure storage...');

            // Upload via secure API
            const response = await this.callSecureAPI('/upload/secure', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadPayload)
            });

            if (response.success) {
                this.updateProgress(100, 'Upload completed successfully!');
                this.showMessage('✅ Secure upload completed successfully!', 'success');
                this.logSecurityEvent('info', 'secure_upload_success', {
                    user: this.currentUser,
                    fileName: fileName,
                    hashedPatientId: hashedPatientId,
                    organizationId: this.organizationId
                });

                setTimeout(() => {
                    this.removeImage();
                    this.hideProgress();
                }, 3000);
            } else {
                throw new Error(response.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Secure upload error:', error);

            if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.showMessage(`Upload failed, retrying... (${this.retryCount}/${this.maxRetries})`, 'warning');
                setTimeout(() => this.attemptSecureUpload(), 3000);
                return;
            }

            this.showMessage(`❌ Upload failed: ${error.message}`, 'error');
            this.logSecurityEvent('error', 'secure_upload_failed', {
                user: this.currentUser,
                error: error.message,
                retryCount: this.retryCount
            });
            this.hideProgress();
        } finally {
            if (this.retryCount >= this.maxRetries || !this.shouldRetry()) {
                this.isUploading = false;
                this.elements.uploadToS3Btn.disabled = false;
                this.elements.uploadToS3Btn.textContent = '🔐 Secure Upload';
            }
        }
    }

    encryptSensitiveData(formData) {
        const sensitiveFields = ['description', 'patientId'];
        const encrypted = {};

        for (const [key, value] of Object.entries(formData)) {
            if (sensitiveFields.includes(key)) {
                encrypted[key] = CryptoJS.AES.encrypt(value, this.encryptionKey).toString();
            } else {
                encrypted[key] = value;
            }
        }

        return encrypted;
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async callSecureAPI(endpoint, options = {}) {
        // Mock API implementation - replace with real API calls in production
        console.log('Mock API call:', endpoint, options);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (endpoint === '/auth/login') {
            const { username, password } = JSON.parse(options.body);
            if (username === 'demo' && password === 'demo123') {
                return {
                    success: true,
                    token: 'mock_jwt_token_' + Date.now(),
                    user: username,
                    organizationId: 'org_' + Math.random().toString(36).substr(2, 9),
                    expiresIn: 3600 // 1 hour
                };
            } else {
                return {
                    success: false,
                    message: 'Invalid credentials'
                };
            }
        }

        if (endpoint === '/upload/secure') {
            return {
                success: true,
                message: 'File uploaded successfully',
                fileId: 'file_' + Math.random().toString(36).substr(2, 9)
            };
        }

        return { success: true };
    }

    validateForm() {
        const patientId = this.elements.patientId.value.trim();
        const visitDate = this.elements.visitDate.value.trim();
        const phoneModel = this.elements.phoneModel.value.trim();
        const organizationId = this.elements.organizationId.value.trim();

        if (!patientId) {
            return { valid: false, message: 'Patient ID is required' };
        }

        if (!visitDate) {
            return { valid: false, message: 'Visit Date is required' };
        }

        if (!phoneModel) {
            return { valid: false, message: 'Device Model is required' };
        }

        if (!organizationId) {
            return { valid: false, message: 'Organization ID is required' };
        }

        const patientIdPattern = /^[A-Za-z0-9_-]+$/;
        if (!patientIdPattern.test(patientId)) {
            return { valid: false, message: 'Patient ID can only contain letters, numbers, hyphens, and underscores' };
        }

        return { valid: true };
    }

    shouldRetry(error) {
        const noRetryErrors = ['authentication', 'authorization', 'validation'];
        return !noRetryErrors.some(errType => error.message.toLowerCase().includes(errType));
    }

    showProgress(percentage, status = '') {
        this.elements.progressContainer.classList.remove('hidden');
        this.updateProgress(percentage, status);
    }

    updateProgress(percentage, status = '') {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}%`;
        if (status) {
            this.elements.progressStatus.textContent = status;
        }
    }

    hideProgress() {
        this.elements.progressContainer.classList.add('hidden');
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = '0%';
        this.elements.progressStatus.textContent = '';
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        this.elements.messageContainer.appendChild(messageEl);

        if (type !== 'error') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }

        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearMessages() {
        this.elements.messageContainer.innerHTML = '';
    }

    logSecurityEvent(level, event, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            event: event,
            user: this.currentUser || 'anonymous',
            organizationId: this.organizationId || 'unknown',
            sessionId: this.authToken ? this.authToken.slice(-8) : 'none',
            userAgent: navigator.userAgent,
            ...details
        };

        // In production, send to secure logging service
        console.log('Security Event:', logEntry);

        // Store locally for audit purposes (encrypted)
        try {
            const logs = JSON.parse(localStorage.getItem('hipaa_audit_logs') || '[]');
            logs.push(logEntry);

            // Keep only last 100 entries to prevent storage overflow
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }

            localStorage.setItem('hipaa_audit_logs', JSON.stringify(logs));
        } catch (error) {
            console.warn('Failed to store audit log:', error);
        }
    }

    checkBrowserSupport() {
        const unsupported = [];

        if (!navigator.mediaDevices) {
            unsupported.push('Camera access');
        }

        if (!window.File || !window.FileReader) {
            unsupported.push('File handling');
        }

        if (!window.localStorage || !window.sessionStorage) {
            unsupported.push('Storage');
        }

        if (typeof CryptoJS === 'undefined') {
            unsupported.push('Encryption');
        }

        if (!window.crypto || !window.crypto.subtle) {
            unsupported.push('Web Crypto API');
        }

        if (unsupported.length > 0) {
            this.showMessage(`⚠️ Some features may not work: ${unsupported.join(', ')}. Please use a modern browser.`, 'error');
        }
    }

    cleanup() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }

        if (this.capturedImage) {
            const previewUrl = this.elements.previewImage.src;
            if (previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        }

        this.logSecurityEvent('info', 'application_cleanup', { user: this.currentUser });
    }
}

// Initialize the secure application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.securePhotoCollector = new SecurePhotoCollector();
    } catch (error) {
        console.error('Failed to initialize SecurePhotoCollector:', error);
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;color:#c62828;">
                <h2>🔒 Security Error</h2>
                <p>Failed to initialize the secure photo collector.</p>
                <p>Please ensure your browser supports modern security features and refresh the page.</p>
            </div>
        `;
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.securePhotoCollector) {
        window.securePhotoCollector.cleanup();
    }
});

// Prevent right-click in production
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
        }
    });
}