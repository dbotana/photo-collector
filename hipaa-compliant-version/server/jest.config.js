/**
 * Jest Configuration for HIPAA Compliant Photo Collector
 */

module.exports = {
    testEnvironment: 'node',

    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js',
        '**/*.(test|spec).js'
    ],

    // Coverage settings
    collectCoverage: true,
    collectCoverageFrom: [
        'app.js',
        'routes/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/coverage/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json-summary'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Setup and teardown
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Test timeout
    testTimeout: 30000,

    // Module paths
    moduleDirectories: ['node_modules', '<rootDir>'],

    // Transform settings
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/'
    ],

    // Verbose output
    verbose: true,

    // Error handling
    bail: false,
    errorOnDeprecated: true,

    // Mock settings
    clearMocks: true,
    restoreMocks: true,

    // Security-specific test configuration
    globals: {
        TEST_MODE: true,
        MOCK_AWS: true
    },

    // Test reporters
    reporters: [
        'default',
        ['jest-junit', {
            outputDirectory: './test-results',
            outputName: 'junit.xml'
        }],
        ['jest-html-reporters', {
            publicPath: './test-results',
            filename: 'test-report.html',
            expand: true,
            hideIcon: false
        }]
    ]
};