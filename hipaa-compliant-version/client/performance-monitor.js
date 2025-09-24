/**
 * Performance Monitor - HIPAA Compliant
 * Client-side performance monitoring with privacy protection
 */

class PerformanceMonitor {
    constructor() {
        this.isEnabled = this.shouldEnableMonitoring();
        this.metrics = [];
        this.maxMetrics = 100; // Prevent memory overflow

        if (this.isEnabled) {
            this.initializeMonitoring();
        }
    }

    shouldEnableMonitoring() {
        // Only enable in development or when explicitly requested
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isExplicitlyEnabled = localStorage.getItem('hipaa_performance_monitoring') === 'true';

        return isDevelopment || isExplicitlyEnabled;
    }

    initializeMonitoring() {
        this.startTime = performance.now();

        // Monitor page load performance
        this.monitorPageLoad();

        // Monitor user interactions
        this.monitorUserInteractions();

        // Monitor API calls
        this.monitorNetworkRequests();

        // Monitor memory usage
        this.monitorMemoryUsage();

        console.log('📊 Performance monitoring enabled - HIPAA compliant');
    }

    monitorPageLoad() {
        window.addEventListener('load', () => {
            if ('PerformanceNavigationTiming' in window) {
                const navigation = performance.getEntriesByType('navigation')[0];

                this.recordMetric('page_load', {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    totalTime: navigation.loadEventEnd - navigation.fetchStart,
                    dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                    tcpConnect: navigation.connectEnd - navigation.connectStart,
                    ttfb: navigation.responseStart - navigation.requestStart
                });
            }
        });
    }

    monitorUserInteractions() {
        // Monitor authentication flow
        this.monitorAuthentication();

        // Monitor photo capture/upload
        this.monitorPhotoOperations();

        // Monitor form interactions
        this.monitorFormInteractions();
    }

    monitorAuthentication() {
        // Track login performance
        const originalLogin = window.securePhotoCollector?.performLogin;
        if (originalLogin) {
            window.securePhotoCollector.performLogin = async function(...args) {
                const start = performance.now();

                try {
                    const result = await originalLogin.apply(this, args);

                    window.performanceMonitor?.recordMetric('auth_login_success', {
                        duration: performance.now() - start,
                        timestamp: Date.now()
                    });

                    return result;
                } catch (error) {
                    window.performanceMonitor?.recordMetric('auth_login_error', {
                        duration: performance.now() - start,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    throw error;
                }
            };
        }
    }

    monitorPhotoOperations() {
        // Monitor camera access
        this.wrapMethod('openCamera', 'camera_open');
        this.wrapMethod('capturePhoto', 'photo_capture');
        this.wrapMethod('secureUpload', 'photo_upload');
    }

    monitorFormInteractions() {
        // Monitor form filling time (privacy-safe)
        const formFields = ['patientId', 'description', 'phoneModel'];

        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                let startTime = null;

                field.addEventListener('focus', () => {
                    startTime = performance.now();
                });

                field.addEventListener('blur', () => {
                    if (startTime) {
                        this.recordMetric('form_interaction', {
                            field: fieldId,
                            duration: performance.now() - startTime,
                            hasValue: field.value.length > 0 // Don't log actual values for privacy
                        });
                    }
                });
            }
        });
    }

    wrapMethod(methodName, metricName) {
        const collector = window.securePhotoCollector;
        if (collector && collector[methodName]) {
            const originalMethod = collector[methodName];

            collector[methodName] = async function(...args) {
                const start = performance.now();

                try {
                    const result = await originalMethod.apply(this, args);

                    window.performanceMonitor?.recordMetric(`${metricName}_success`, {
                        duration: performance.now() - start,
                        timestamp: Date.now()
                    });

                    return result;
                } catch (error) {
                    window.performanceMonitor?.recordMetric(`${metricName}_error`, {
                        duration: performance.now() - start,
                        error: error.message,
                        timestamp: Date.now()
                    });
                    throw error;
                }
            };
        }
    }

    monitorNetworkRequests() {
        // Override fetch to monitor API calls
        const originalFetch = window.fetch;

        window.fetch = async (url, options) => {
            const start = performance.now();

            try {
                const response = await originalFetch(url, options);

                this.recordMetric('api_request', {
                    url: this.sanitizeUrl(url),
                    method: options?.method || 'GET',
                    status: response.status,
                    duration: performance.now() - start,
                    success: response.ok
                });

                return response;
            } catch (error) {
                this.recordMetric('api_request_error', {
                    url: this.sanitizeUrl(url),
                    method: options?.method || 'GET',
                    duration: performance.now() - start,
                    error: error.message
                });
                throw error;
            }
        };
    }

    sanitizeUrl(url) {
        // Remove sensitive information from URLs
        try {
            const urlObj = new URL(url, window.location.origin);
            // Keep only path, remove query parameters that might contain sensitive data
            return urlObj.pathname;
        } catch {
            return '[INVALID_URL]';
        }
    }

    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                this.recordMetric('memory_usage', {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                });
            }, 30000); // Every 30 seconds
        }
    }

    recordMetric(type, data) {
        if (!this.isEnabled) return;

        const metric = {
            type,
            data: this.sanitizeMetricData(data),
            timestamp: Date.now(),
            sessionId: this.getSessionId()
        };

        this.metrics.push(metric);

        // Prevent memory overflow
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        // Log to console in debug mode
        if (debugLogger?.isDebugMode) {
            debugLogger.debug('performance', `Performance metric: ${type}`, data, 'performance');
        }
    }

    sanitizeMetricData(data) {
        // Remove any potentially sensitive information
        const sanitized = { ...data };

        // Remove any fields that might contain PHI
        delete sanitized.patientId;
        delete sanitized.patientData;
        delete sanitized.description;
        delete sanitized.formData;

        return sanitized;
    }

    getSessionId() {
        // Generate or retrieve non-identifying session ID
        let sessionId = sessionStorage.getItem('performance_session_id');
        if (!sessionId) {
            sessionId = 'perf_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('performance_session_id', sessionId);
        }
        return sessionId;
    }

    getMetrics(filter = null) {
        if (!this.isEnabled) return [];

        let filtered = this.metrics;

        if (filter) {
            if (filter.type) {
                filtered = filtered.filter(m => m.type === filter.type);
            }
            if (filter.since) {
                filtered = filtered.filter(m => m.timestamp >= filter.since);
            }
        }

        return filtered;
    }

    getPerformanceSummary() {
        if (!this.isEnabled) return null;

        const summary = {
            sessionStart: this.startTime,
            totalMetrics: this.metrics.length,
            sessionDuration: performance.now() - this.startTime,
            categories: {}
        };

        // Group metrics by type
        this.metrics.forEach(metric => {
            if (!summary.categories[metric.type]) {
                summary.categories[metric.type] = {
                    count: 0,
                    avgDuration: 0,
                    totalDuration: 0,
                    errors: 0
                };
            }

            const cat = summary.categories[metric.type];
            cat.count++;

            if (metric.data.duration) {
                cat.totalDuration += metric.data.duration;
                cat.avgDuration = cat.totalDuration / cat.count;
            }

            if (metric.data.error) {
                cat.errors++;
            }
        });

        return summary;
    }

    exportMetrics() {
        if (!this.isEnabled) return null;

        const exportData = {
            summary: this.getPerformanceSummary(),
            metrics: this.getMetrics(),
            exportTime: new Date().toISOString(),
            userAgent: navigator.userAgent,
            connection: this.getConnectionInfo()
        };

        return exportData;
    }

    getConnectionInfo() {
        if ('connection' in navigator) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }
        return null;
    }

    downloadMetrics() {
        if (!this.isEnabled) return;

        const exportData = this.exportMetrics();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `hipaa-performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    clearMetrics() {
        this.metrics = [];
    }

    // Static method to enable/disable monitoring
    static enable() {
        localStorage.setItem('hipaa_performance_monitoring', 'true');
        window.location.reload();
    }

    static disable() {
        localStorage.removeItem('hipaa_performance_monitoring');
        window.location.reload();
    }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
    window.performanceMonitor = new PerformanceMonitor();

    // Add utilities to window for console access
    if (window.performanceMonitor.isEnabled) {
        window.hipaaPerformance = {
            getMetrics: (filter) => window.performanceMonitor.getMetrics(filter),
            getSummary: () => window.performanceMonitor.getPerformanceSummary(),
            export: () => window.performanceMonitor.exportMetrics(),
            download: () => window.performanceMonitor.downloadMetrics(),
            clear: () => window.performanceMonitor.clearMetrics(),
            enable: () => PerformanceMonitor.enable(),
            disable: () => PerformanceMonitor.disable()
        };
    }
}