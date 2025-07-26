import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Revenue Analytics Demo E2E tests
 * 
 * Optimized for:
 * - Six Figure Barber business workflows
 * - Revenue analytics feature testing
 * - Demo environment validation
 * - Cross-browser compatibility
 * - Performance monitoring
 * - Accessibility compliance
 */

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/revenue-analytics-demo-e2e.test.ts',
  
  // Test execution settings
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 5000 // 5 seconds for assertions
  },
  
  // Fail the build on CI if test dependencies are missing
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,
  
  // Run tests in parallel
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'reports/e2e-html' }],
    ['json', { outputFile: 'reports/e2e-results.json' }],
    ['junit', { outputFile: 'reports/e2e-junit.xml' }]
  ],
  
  // Global test settings
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context settings
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Accessibility settings
    colorScheme: 'light',
    reducedMotion: 'reduce', // Respect accessibility preferences
    
    // Viewport settings for consistent testing
    viewport: { width: 1280, height: 720 },
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },
  
  // Test projects for different browsers and conditions
  projects: [
    // Desktop Chrome - Primary testing environment
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Revenue analytics specific settings
        permissions: ['clipboard-read', 'clipboard-write'],
        contextOptions: {
          // Enable web APIs needed for demo
          permissions: ['clipboard-read']
        }
      },
    },
    
    // Desktop Firefox - Cross-browser validation
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Desktop Safari - WebKit testing
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile Chrome - Mobile responsiveness
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific demo settings
        hasTouch: true,
        isMobile: true
      },
    },
    
    // Mobile Safari - iOS testing
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true
      },
    },
    
    // Tablet testing - Medium screen sizes
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        hasTouch: true
      },
    },
    
    // High contrast mode testing - Accessibility
    {
      name: 'High Contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'prefers-contrast': 'high'
        }
      },
    },
    
    // Slow network simulation - Performance testing
    {
      name: 'Slow Network',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow 3G connection
        contextOptions: {
          // Slow network simulation
          offline: false
        }
      },
    }
  ],
  
  // Global setup and teardown
  globalSetup: require.resolve('./playwright.global-setup.ts'),
  globalTeardown: require.resolve('./playwright.global-teardown.ts'),
  
  // Web server configuration for local development
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
  
  // Output directory for test artifacts
  outputDir: 'reports/e2e-artifacts/',
  
  // Custom test configuration
  metadata: {
    component: 'revenue-analytics-demo',
    businessContext: 'six-figure-barber-methodology',
    testTypes: ['workflow', 'performance', 'accessibility', 'mobile'],
    version: '1.0.0'
  }
})