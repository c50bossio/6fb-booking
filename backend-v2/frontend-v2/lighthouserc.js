module.exports = {
  ci: {
    collect: {
      // Number of runs to average for more reliable results
      numberOfRuns: 3,
      
      // URLs to test - focusing on calendar system
      url: [
        'http://localhost:3000/',                    // Homepage
        'http://localhost:3000/dashboard',           // Dashboard
        'http://localhost:3000/calendar',            // Calendar page
        'http://localhost:3000/analytics',           // Analytics
        'http://localhost:3000/settings'             // Settings
      ],
      
      // Chrome flags for testing
      settings: {
        chromeFlags: '--no-sandbox --headless --disable-gpu',
        // Preset for performance-focused testing
        preset: 'perf',
        // Custom throttling for realistic mobile conditions
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    },
    
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.95}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['warn', {minScore: 0.8}],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', {maxNumericValue: 1500}],
        'largest-contentful-paint': ['error', {maxNumericValue: 2500}],
        'cumulative-layout-shift': ['error', {maxNumericValue: 0.1}],
        'total-blocking-time': ['error', {maxNumericValue: 200}],
        
        // Bundle size and resource optimization
        'resource-summary:script:size': ['error', {maxNumericValue: 1048576}], // 1MB
        'resource-summary:stylesheet:size': ['warn', {maxNumericValue: 204800}], // 200KB
        'resource-summary:document:size': ['warn', {maxNumericValue: 51200}], // 50KB
        'resource-summary:other:size': ['warn', {maxNumericValue: 512000}], // 500KB
        
        // Calendar-specific performance metrics
        'uses-text-compression': 'error',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        
        // Accessibility for calendar system
        'color-contrast': 'error',
        'heading-order': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        'keyboard-navigation': 'error',
        'focus-traps': 'error'
      }
    },
    
    upload: {
      target: 'temporary-public-storage'
    },
    
    // Server configuration for testing
    server: {
      command: 'npm run build && npm run start',
      port: 3000,
      // Wait for server to be ready
      waitForConnection: {
        interval: 1000,
        timeout: 60000
      }
    }
  }
}