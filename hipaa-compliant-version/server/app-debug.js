/**
 * Minimal Debug Version of HIPAA Photo Collector API
 * For troubleshooting Lambda issues
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Basic CORS configuration
const corsOptions = {
    origin: ['https://dbotana.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Add error handling middleware
app.use((error, req, res, next) => {
    console.error('Express Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        error: error.message
    });
});

// Simple health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0-debug',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Simple auth test endpoint
app.post('/auth/login', (req, res) => {
    console.log('Auth login requested:', req.body);
    res.status(401).json({
        success: false,
        message: 'Invalid credentials - debug mode',
        timestamp: new Date().toISOString()
    });
});

// Handle OPTIONS requests for CORS
app.options('*', cors(corsOptions));

// 404 handler
app.use('*', (req, res) => {
    console.log('404 - Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;