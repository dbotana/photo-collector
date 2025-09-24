# Photo Collector App - Technical Documentation

## Application Structure

This is a single-page web application for photo capture and S3 upload functionality. The app follows a modular class-based architecture with clear separation of concerns.

## File Structure

```
photo-collector/
├── index.html          # Main HTML structure and layout
├── style.css           # Responsive CSS with mobile-first design
├── script.js           # Core JavaScript functionality
├── README.md           # User documentation
└── CLAUDE.md           # Technical documentation (this file)
```

## Core Components

### 1. HTML Structure (`index.html`)

**Purpose**: Semantic HTML structure with accessibility considerations

**Key Sections**:
- `header`: App title and description
- `capture-section`: Camera/upload controls
- `camera-container`: Video stream display (hidden by default)
- `preview-section`: Image preview and description input
- `config-section`: S3 configuration inputs (collapsible)
- `message-container`: Dynamic feedback messages

**External Dependencies**:
- AWS SDK v2.1563.0 (CDN)
- Custom CSS and JavaScript files

### 2. Styling (`style.css`)

**Design Philosophy**: Mobile-first responsive design

**Key Features**:
- **Touch Optimization**: 60px+ button heights, 88px camera capture button
- **Progressive Enhancement**: Base styles for mobile, media queries for desktop
- **Visual Hierarchy**: Gradient backgrounds, card-based layout, clear typography
- **State Management**: `.hidden` utility class, hover/active states
- **Accessibility**: Focus indicators, sufficient color contrast

**CSS Architecture**:
- Reset and base styles
- Component-specific styles (buttons, camera, preview, etc.)
- Utility classes
- Media queries for responsive behavior

### 3. JavaScript Application (`script.js`)

**Architecture**: ES6 class-based single-page application

#### Main Class: `PhotoCollector`

**Initialization Flow**:
1. `constructor()` - Sets up initial state
2. `initializeElements()` - Caches DOM references
3. `attachEventListeners()` - Binds event handlers
4. `loadS3Config()` - Restores saved configuration

**Core Methods**:

##### Camera Management
- `openCamera()` - Requests camera access with optimal constraints
- `closeCamera()` - Properly releases camera resources
- `capturePhoto()` - Captures frame to canvas, converts to File object

##### File Handling
- `openFileDialog()` - Triggers file input
- `handleFileSelect()` - Validates and processes selected files
- `displayImagePreview()` - Shows preview with removal option

##### S3 Integration
- `uploadToS3()` - Main upload orchestration method
- `initializeS3()` - Configures AWS SDK instance
- `validateS3Config()` - Ensures required credentials are present

##### User Experience
- `showProgress()` / `updateProgress()` / `hideProgress()` - Upload progress
- `showMessage()` / `clearMessages()` - User feedback system
- `saveS3Config()` / `loadS3Config()` - Persistent configuration

## Data Flow

### 1. Image Capture Flow
```
User clicks "Take Photo"
→ requestCamera()
→ getUserMedia()
→ Video stream displayed
→ User clicks capture
→ Canvas capture
→ Convert to File object
→ Display preview
```

### 2. File Upload Flow
```
User clicks "Upload from Gallery"
→ File input dialog
→ File validation
→ Create File object
→ Display preview
```

### 3. S3 Upload Flow
```
User clicks "Upload to S3"
→ Validate configuration
→ Initialize AWS SDK
→ Create upload parameters
→ Start upload with progress tracking
→ Handle success/error states
```

## Error Handling Strategy

### Current Implementation
- Basic try/catch blocks around async operations
- User-friendly error messages in UI
- Console logging for debugging

### Areas for Improvement (see enhanced version)
- Network connectivity checks
- File size and type validation
- Retry mechanisms for failed uploads
- Graceful camera access failures
- S3 credential validation
- Memory management for large files

## Browser Compatibility

**Supported APIs**:
- `navigator.mediaDevices.getUserMedia()` - Camera access
- `Canvas.toBlob()` - Image capture
- `FileReader API` - File handling
- `localStorage` - Configuration persistence
- `AWS SDK` - S3 uploads

**Minimum Browser Versions**:
- Chrome 53+, Firefox 36+, Safari 11+, Edge 12+

## Security Considerations

**Current Implementation**:
- Client-side credential storage in localStorage
- CORS-enabled S3 bucket required
- HTTPS required for camera access (production)

**Security Notes**:
- AWS credentials visible to client
- No server-side validation
- Suitable for trusted environments only

## Performance Characteristics

**Optimizations**:
- Image compression (JPEG, 0.8 quality)
- Progress tracking for large uploads
- DOM element caching
- Event delegation where appropriate

**Memory Considerations**:
- Canvas elements created/destroyed per capture
- File objects held in memory during upload
- Stream cleanup on camera close

## Configuration Management

**S3 Settings**:
- Bucket name, region, access keys
- Stored in localStorage with JSON serialization
- Auto-save on input change
- Auto-restore on page load

**Upload Parameters**:
- Metadata includes: description, timestamp, original filename
- File naming: `photos/{timestamp}_{originalname}`
- Content-Type automatically detected

## Extension Points

**Easy Enhancements**:
- Multiple image formats
- Image editing/filters
- Batch uploads
- Upload history
- Server-side processing
- Progressive Web App features

**API Integration**:
- Other cloud storage providers
- Image recognition services
- Metadata enrichment
- Social sharing

## Development Commands

```bash
# Local development server (required for camera access)
python -m http.server 8000
# or
npx http-server

# Access at: http://localhost:8000
```

## Testing Strategy

**Manual Testing Areas**:
1. Camera permissions and functionality
2. File upload validation
3. S3 configuration and upload
4. Mobile responsiveness
5. Error handling scenarios
6. Cross-browser compatibility

**Automated Testing Considerations**:
- Unit tests for utility functions
- Integration tests for S3 uploads
- E2E tests for user workflows
- Accessibility testing