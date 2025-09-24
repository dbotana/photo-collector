class PhotoCollector {
    constructor() {
        this.currentStream = null;
        this.capturedImage = null;
        this.s3 = null;
        this.isUploading = false;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.retryCount = 0;
        this.maxRetries = 3;

        try {
            this.initializeElements();
            this.attachEventListeners();
            this.checkBrowserSupport();
            this.loadS3Config();
        } catch (error) {
            console.error('Failed to initialize PhotoCollector:', error);
            this.showMessage('Failed to initialize the application. Please refresh the page.', 'error');
        }
    }

    initializeElements() {
        const elementIds = [
            'cameraBtn', 'uploadBtn', 'fileInput', 'cameraContainer', 'cameraVideo',
            'captureBtn', 'closeCameraBtn', 'previewSection', 'previewImage', 'removeImageBtn',
            'description', 'uploadToS3Btn', 'progressContainer', 'progressFill', 'progressText',
            'messageContainer', 's3Bucket', 's3Region', 's3AccessKey', 's3SecretKey'
        ];

        this.elements = {};
        const missingElements = [];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missingElements.push(id);
            } else {
                this.elements[id] = element;
            }
        });

        if (missingElements.length > 0) {
            throw new Error(`Missing required DOM elements: ${missingElements.join(', ')}`);
        }
    }

    attachEventListeners() {
        // Wrap event listeners with error handling
        const safeEventListener = (element, event, handler) => {
            element.addEventListener(event, (e) => {
                try {
                    handler(e);
                } catch (error) {
                    console.error(`Error in ${event} handler:`, error);
                    this.showMessage('An unexpected error occurred. Please try again.', 'error');
                }
            });
        };

        safeEventListener(this.elements.cameraBtn, 'click', () => this.openCamera());
        safeEventListener(this.elements.uploadBtn, 'click', () => this.openFileDialog());
        safeEventListener(this.elements.fileInput, 'change', (e) => this.handleFileSelect(e));
        safeEventListener(this.elements.captureBtn, 'click', () => this.capturePhoto());
        safeEventListener(this.elements.closeCameraBtn, 'click', () => this.closeCamera());
        safeEventListener(this.elements.removeImageBtn, 'click', () => this.removeImage());
        safeEventListener(this.elements.uploadToS3Btn, 'click', () => this.uploadToS3());

        // Save S3 config when changed
        [this.elements.s3Bucket, this.elements.s3Region, this.elements.s3AccessKey, this.elements.s3SecretKey]
            .forEach(input => safeEventListener(input, 'change', () => this.saveS3Config()));

        // Handle network changes
        window.addEventListener('online', () => {
            this.showMessage('Network connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.showMessage('Network connection lost. Please check your internet connection.', 'error');
        });
    }

    async openCamera() {
        try {
            // Check if camera is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access is not supported in this browser');
            }

            this.showMessage('Requesting camera access...', 'info');

            // Try different camera configurations
            const constraints = [
                {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                {
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                {
                    video: true
                }
            ];

            let stream = null;
            let lastError = null;

            for (const constraint of constraints) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraint);
                    break;
                } catch (err) {
                    lastError = err;
                    console.warn('Camera constraint failed:', constraint, err);
                }
            }

            if (!stream) {
                throw lastError || new Error('All camera configurations failed');
            }

            this.currentStream = stream;
            this.elements.cameraVideo.srcObject = stream;

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.elements.cameraVideo.onloadedmetadata = resolve;
                this.elements.cameraVideo.onerror = reject;
                setTimeout(reject, 5000); // 5 second timeout
            });

            this.elements.cameraContainer.classList.remove('hidden');
            this.clearMessages();

        } catch (error) {
            console.error('Camera access error:', error);

            let errorMessage = 'Failed to access camera. ';

            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please allow camera permissions and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No camera found on this device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Camera is already in use by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Camera does not support the required settings.';
            } else {
                errorMessage += error.message || 'Please check your camera and permissions.';
            }

            this.showMessage(errorMessage, 'error');
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

            if (!context) {
                throw new Error('Failed to get canvas context');
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw the video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob with error handling
            canvas.toBlob((blob) => {
                if (!blob) {
                    this.showMessage('Failed to capture photo. Please try again.', 'error');
                    return;
                }

                try {
                    this.capturedImage = new File([blob], `photo_${Date.now()}.jpg`, {
                        type: 'image/jpeg'
                    });

                    const imageUrl = URL.createObjectURL(blob);
                    this.displayImagePreview(imageUrl);
                    this.closeCamera();
                    this.showMessage('Photo captured successfully!', 'success');
                } catch (error) {
                    console.error('Error processing captured photo:', error);
                    this.showMessage('Failed to process captured photo.', 'error');
                }
            }, 'image/jpeg', 0.8);

        } catch (error) {
            console.error('Photo capture error:', error);
            this.showMessage('Failed to capture photo: ' + error.message, 'error');
        }
    }

    openFileDialog() {
        this.elements.fileInput.click();
    }

    handleFileSelect(event) {
        try {
            const file = event.target.files[0];

            if (!file) {
                return; // User cancelled
            }

            // Validate file type
            if (!this.supportedTypes.includes(file.type)) {
                throw new Error(`Unsupported file type: ${file.type}. Supported types: ${this.supportedTypes.join(', ')}`);
            }

            // Validate file size
            if (file.size > this.maxFileSize) {
                throw new Error(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(this.maxFileSize / 1024 / 1024)}MB)`);
            }

            // Check if file is corrupted (basic check)
            if (file.size === 0) {
                throw new Error('Selected file appears to be empty or corrupted');
            }

            this.capturedImage = file;

            const imageUrl = URL.createObjectURL(file);

            // Test if image can be loaded
            const img = new Image();
            img.onload = () => {
                this.displayImagePreview(imageUrl);
                this.showMessage('Image loaded successfully!', 'success');
            };

            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                this.showMessage('Failed to load image. File may be corrupted.', 'error');
            };

            img.src = imageUrl;

        } catch (error) {
            console.error('File selection error:', error);
            this.showMessage(error.message || 'Failed to process selected file.', 'error');
        } finally {
            // Clear the input to allow selecting the same file again
            event.target.value = '';
        }
    }

    displayImagePreview(imageUrl) {
        this.elements.previewImage.src = imageUrl;
        this.elements.previewSection.classList.remove('hidden');
        this.elements.description.focus();
    }

    removeImage() {
        this.capturedImage = null;
        this.elements.previewImage.src = '';
        this.elements.previewSection.classList.add('hidden');
        this.elements.description.value = '';
        this.clearMessages();
    }

    async uploadToS3() {
        if (this.isUploading) {
            this.showMessage('Upload already in progress. Please wait.', 'info');
            return;
        }

        if (!navigator.onLine) {
            this.showMessage('No internet connection. Please check your network and try again.', 'error');
            return;
        }

        if (!this.capturedImage) {
            this.showMessage('Please capture or select an image first.', 'error');
            return;
        }

        const configValidation = this.validateS3Config();
        if (!configValidation.valid) {
            this.showMessage(`S3 Configuration Error: ${configValidation.message}`, 'error');
            return;
        }

        this.isUploading = true;
        this.retryCount = 0;

        await this.attemptUpload();
    }

    async attemptUpload() {
        try {
            this.showMessage(`Uploading... ${this.retryCount > 0 ? `(Attempt ${this.retryCount + 1})` : ''}`, 'info');

            await this.initializeS3();

            const description = this.elements.description.value.trim();
            const timestamp = new Date().toISOString();
            const sanitizedFileName = this.capturedImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `TestUploads/${timestamp}_${sanitizedFileName}`;

            this.showProgress(0);
            this.elements.uploadToS3Btn.disabled = true;
            this.elements.uploadToS3Btn.textContent = 'Uploading...';

            const uploadParams = {
                Bucket: this.elements.s3Bucket.value.trim(),
                Key: fileName,
                Body: this.capturedImage,
                ContentType: this.capturedImage.type,
                Metadata: {
                    'description': description || 'No description provided',
                    'upload-timestamp': timestamp,
                    'original-filename': this.capturedImage.name,
                    'file-size': this.capturedImage.size.toString(),
                    'app-version': '1.0.0'
                }
            };

            const upload = this.s3.upload(uploadParams);

            upload.on('httpUploadProgress', (progress) => {
                if (progress.total > 0) {
                    const percentage = Math.round((progress.loaded / progress.total) * 100);
                    this.updateProgress(percentage);
                }
            });

            const result = await upload.promise();

            this.showMessage(`✅ Upload successful! File uploaded to: ${result.Location}`, 'success');
            this.hideProgress();

            // Reset form after successful upload
            setTimeout(() => {
                this.removeImage();
            }, 3000);

            this.retryCount = 0;

        } catch (error) {
            console.error('S3 upload error:', error);

            const errorMessage = this.getUploadErrorMessage(error);

            if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.showMessage(`${errorMessage} Retrying in 3 seconds... (${this.retryCount}/${this.maxRetries})`, 'info');

                setTimeout(() => {
                    this.attemptUpload();
                }, 3000);

                return;
            }

            this.showMessage(`❌ Upload failed: ${errorMessage}`, 'error');
            this.hideProgress();
        } finally {
            if (this.retryCount >= this.maxRetries || !this.shouldRetry()) {
                this.isUploading = false;
                this.elements.uploadToS3Btn.disabled = false;
                this.elements.uploadToS3Btn.textContent = '☁️ Upload to S3';
            }
        }
    }

    shouldRetry(error) {
        // Don't retry on authentication/permission errors
        const noRetryErrors = ['InvalidAccessKeyId', 'SignatureDoesNotMatch', 'AccessDenied', 'NoSuchBucket'];
        return !noRetryErrors.includes(error.code);
    }

    getUploadErrorMessage(error) {
        const errorMessages = {
            'InvalidAccessKeyId': 'Invalid AWS Access Key ID',
            'SignatureDoesNotMatch': 'Invalid AWS Secret Access Key',
            'AccessDenied': 'Access denied - check your S3 permissions',
            'NoSuchBucket': 'S3 bucket does not exist',
            'NetworkError': 'Network connection failed',
            'RequestTimeout': 'Upload timed out'
        };

        return errorMessages[error.code] || error.message || 'Unknown upload error';
    }

    async initializeS3() {
        try {
            if (typeof AWS === 'undefined') {
                throw new Error('AWS SDK is not loaded. Please refresh the page and try again.');
            }

            const config = {
                accessKeyId: this.elements.s3AccessKey.value.trim(),
                secretAccessKey: this.elements.s3SecretKey.value.trim(),
                region: this.elements.s3Region.value.trim(),
                maxRetries: 3,
                retryDelayOptions: {
                    base: 1000
                }
            };

            AWS.config.update(config);

            this.s3 = new AWS.S3({
                apiVersion: '2006-03-01',
                params: {
                    Bucket: this.elements.s3Bucket.value.trim()
                },
                httpOptions: {
                    timeout: 30000 // 30 second timeout
                }
            });

            // Test connection with a simple head bucket operation
            try {
                await this.s3.headBucket({ Bucket: this.elements.s3Bucket.value.trim() }).promise();
            } catch (error) {
                if (error.code === 'NotFound') {
                    throw new Error('S3 bucket not found');
                } else if (error.code === 'Forbidden') {
                    throw new Error('Access denied to S3 bucket');
                }
                throw error;
            }

        } catch (error) {
            console.error('S3 initialization error:', error);
            throw new Error(`Failed to initialize S3: ${error.message}`);
        }
    }

    validateS3Config() {
        const bucket = this.elements.s3Bucket.value.trim();
        const region = this.elements.s3Region.value.trim();
        const accessKey = this.elements.s3AccessKey.value.trim();
        const secretKey = this.elements.s3SecretKey.value.trim();

        if (!bucket) {
            return { valid: false, message: 'S3 bucket name is required' };
        }

        if (!region) {
            return { valid: false, message: 'AWS region is required' };
        }

        if (!accessKey) {
            return { valid: false, message: 'AWS Access Key ID is required' };
        }

        if (!secretKey) {
            return { valid: false, message: 'AWS Secret Access Key is required' };
        }

        // Basic validation patterns
        const bucketPattern = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
        if (!bucketPattern.test(bucket)) {
            return { valid: false, message: 'Invalid bucket name format' };
        }

        const regionPattern = /^[a-z0-9-]+$/;
        if (!regionPattern.test(region)) {
            return { valid: false, message: 'Invalid region format' };
        }

        const accessKeyPattern = /^[A-Z0-9]{20}$/;
        if (!accessKeyPattern.test(accessKey)) {
            return { valid: false, message: 'Invalid Access Key ID format' };
        }

        if (secretKey.length !== 40) {
            return { valid: false, message: 'Invalid Secret Access Key length' };
        }

        return { valid: true };
    }

    saveS3Config() {
        const config = {
            bucket: this.elements.s3Bucket.value,
            region: this.elements.s3Region.value,
            accessKey: this.elements.s3AccessKey.value,
            secretKey: this.elements.s3SecretKey.value
        };
        localStorage.setItem('photoCollectorS3Config', JSON.stringify(config));
    }

    loadS3Config() {
        try {
            // Default S3 configuration
            const defaultConfig = {
                bucket: 'photo-collector1',
                region: 'us-east-1',
                accessKey: 'photo-collector-user1',
                secretKey: 'Photo-collector-password'
            };

            const saved = localStorage.getItem('photoCollectorS3Config');
            let config = defaultConfig;

            if (saved) {
                try {
                    const savedConfig = JSON.parse(saved);
                    // Validate that config is an object and merge with defaults
                    if (typeof savedConfig === 'object' && savedConfig !== null) {
                        config = { ...defaultConfig, ...savedConfig };
                    }
                } catch (parseError) {
                    console.warn('Invalid S3 config format in localStorage, using defaults');
                    localStorage.removeItem('photoCollectorS3Config');
                }
            }

            // Apply configuration to form fields
            this.elements.s3Bucket.value = config.bucket;
            this.elements.s3Region.value = config.region;
            this.elements.s3AccessKey.value = config.accessKey;
            this.elements.s3SecretKey.value = config.secretKey;

            // Save the current configuration (including defaults) to localStorage
            this.saveS3Config();

        } catch (error) {
            console.error('Error loading S3 config:', error);
            localStorage.removeItem('photoCollectorS3Config');
            this.showMessage('Error loading S3 configuration. Using default settings.', 'info');
        }
    }

    showProgress(percentage) {
        this.elements.progressContainer.classList.remove('hidden');
        this.updateProgress(percentage);
    }

    updateProgress(percentage) {
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}%`;
    }

    hideProgress() {
        this.elements.progressContainer.classList.add('hidden');
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = '0%';
    }

    showMessage(message, type = 'info') {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        this.elements.messageContainer.appendChild(messageEl);

        // Auto-remove success and info messages
        if (type !== 'error') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }

        // Scroll message into view
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    clearMessages() {
        this.elements.messageContainer.innerHTML = '';
    }

    checkBrowserSupport() {
        const unsupported = [];

        if (!navigator.mediaDevices) {
            unsupported.push('Camera access');
        }

        if (!window.File || !window.FileReader) {
            unsupported.push('File handling');
        }

        if (!window.localStorage) {
            unsupported.push('Local storage');
        }

        if (typeof AWS === 'undefined') {
            unsupported.push('AWS SDK');
        }

        if (unsupported.length > 0) {
            this.showMessage(`⚠️ Some features may not work: ${unsupported.join(', ')}. Please use a modern browser.`, 'error');
        }
    }

    // Memory cleanup
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
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.photoCollector = new PhotoCollector();
    } catch (error) {
        console.error('Failed to initialize PhotoCollector:', error);
        document.body.innerHTML = '<div style="text-align:center;padding:50px;"><h2>Application Error</h2><p>Failed to initialize the photo collector. Please refresh the page.</p></div>';
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.photoCollector) {
        window.photoCollector.cleanup();
    }
});

// Service Worker Registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
}