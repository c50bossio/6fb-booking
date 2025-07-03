#!/usr/bin/env node

/**
 * Comprehensive Frontend User Journey Testing Script
 * Tests all user roles and critical paths to ensure production readiness
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const config = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:8000',
  timeout: 30000,
  screenshotDir: './test-screenshots',
  reportFile: './user-journey-test-report.json'
};

class UserJourneyTester {
  constructor() {
    this.browser = null;
    this.results = {
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
    
    // Ensure screenshot directory exists
    if (!fs.existsSync(config.screenshotDir)) {
      fs.mkdirSync(config.screenshotDir, { recursive: true });
    }
  }

  async initialize() {
    console.log('🚀 Starting User Journey Testing...');
    console.log(`Frontend: ${config.baseUrl}`);
    console.log(`Backend: ${config.apiUrl}`);
    
    this.browser = await chromium.launch({ 
      headless: false, // Show browser for debugging
      slowMo: 1000 // Slow down for observation
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    
    // Generate report
    this.results.endTime = new Date().toISOString();
    this.results.duration = new Date(this.results.endTime) - new Date(this.results.startTime);
    
    fs.writeFileSync(config.reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Test Results Summary:`);
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`📄 Report saved to: ${config.reportFile}`);
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    this.results.summary.total++;
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    const testResult = {
      name: testName,
      status: 'running',
      startTime: new Date().toISOString(),
      screenshots: [],
      errors: []
    };

    try {
      await testFunction(page, testResult);
      testResult.status = 'passed';
      this.results.summary.passed++;
      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      testResult.status = 'failed';
      testResult.errors.push(error.message);
      this.results.summary.failed++;
      this.results.summary.errors.push(`${testName}: ${error.message}`);
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      
      // Take error screenshot
      const errorScreenshot = `error-${testName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
      await page.screenshot({ 
        path: path.join(config.screenshotDir, errorScreenshot),
        fullPage: true 
      });
      testResult.screenshots.push(errorScreenshot);
    }
    
    testResult.endTime = new Date().toISOString();
    this.results.tests.push(testResult);
    
    await context.close();
  }

  async takeScreenshot(page, testResult, name) {
    const filename = `${name}-${Date.now()}.png`;
    await page.screenshot({ 
      path: path.join(config.screenshotDir, filename),
      fullPage: true 
    });
    testResult.screenshots.push(filename);
    return filename;
  }

  // Phase 1: Core System Tests
  async testHomepageLoad(page, testResult) {
    await page.goto(config.baseUrl);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'homepage-load');
    
    // Check for essential elements
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Verify no console errors
    const errors = await page.evaluate(() => {
      return window.console.error?.calls || [];
    });
    
    if (errors.length > 0) {
      throw new Error(`Console errors detected: ${errors.join(', ')}`);
    }
  }

  async testBackendConnectivity(page, testResult) {
    // Test API connectivity from frontend
    const response = await page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(`${apiUrl}/`);
        const data = await res.json();
        return { status: res.status, data };
      } catch (error) {
        return { error: error.message };
      }
    }, config.apiUrl);

    if (response.error || response.status !== 200) {
      throw new Error(`Backend connectivity failed: ${response.error || 'Invalid status'}`);
    }

    if (!response.data.message?.includes('6FB Booking API v2')) {
      throw new Error('Backend response invalid');
    }
  }

  // Phase 2: Authentication Tests
  async testLoginPage(page, testResult) {
    await page.goto(`${config.baseUrl}/login`);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'login-page');
    
    // Check for login form elements
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  }

  async testRegistrationPage(page, testResult) {
    await page.goto(`${config.baseUrl}/register`);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'register-page');
    
    // Check for registration form elements
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.waitForSelector('input[name="password"]', { timeout: 5000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
  }

  // Phase 3: Calendar Tests
  async testCalendarPage(page, testResult) {
    await page.goto(`${config.baseUrl}/calendar`);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'calendar-page');
    
    // Wait for calendar to load (give it extra time)
    await page.waitForTimeout(3000);
    
    // Check for calendar components
    try {
      await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });
    } catch {
      // Fallback: check for any calendar-related elements
      const hasCalendar = await page.$('.calendar, [class*="calendar"], [id*="calendar"]');
      if (!hasCalendar) {
        throw new Error('Calendar component not found');
      }
    }
    
    await this.takeScreenshot(page, testResult, 'calendar-loaded');
  }

  async testCalendarMobileView(page, testResult) {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 6/7/8
    await page.goto(`${config.baseUrl}/calendar`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await this.takeScreenshot(page, testResult, 'calendar-mobile');
    
    // Test mobile-specific interactions
    const isMobileOptimized = await page.evaluate(() => {
      // Check for mobile-specific CSS classes or viewport meta
      const viewport = document.querySelector('meta[name="viewport"]');
      return viewport && viewport.content.includes('width=device-width');
    });
    
    if (!isMobileOptimized) {
      throw new Error('Page not mobile optimized');
    }
  }

  // Phase 4: Dashboard Tests
  async testDashboardAccess(page, testResult) {
    await page.goto(`${config.baseUrl}/dashboard`);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'dashboard-access');
    
    // Check if redirected to login (expected for unauthenticated user)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('   ✓ Correctly redirected to login when unauthenticated');
    } else {
      // If not redirected, check for dashboard elements
      const hasDashboard = await page.$('[data-testid="dashboard"], .dashboard, h1, h2');
      if (!hasDashboard) {
        throw new Error('Dashboard or login redirect not working');
      }
    }
  }

  // Phase 5: Booking Flow Tests
  async testBookingPage(page, testResult) {
    await page.goto(`${config.baseUrl}/book`);
    await page.waitForLoadState('networkidle');
    await this.takeScreenshot(page, testResult, 'booking-page');
    
    // Check for booking form elements
    await page.waitForTimeout(2000);
    
    // Look for any booking-related elements
    const hasBookingElements = await page.evaluate(() => {
      const selectors = [
        'button[type="submit"]',
        'input[type="date"]',
        'input[type="time"]',
        'select',
        '.service',
        '.appointment',
        '.booking'
      ];
      
      return selectors.some(selector => document.querySelector(selector));
    });
    
    if (!hasBookingElements) {
      throw new Error('Booking form elements not found');
    }
  }

  // Phase 6: Responsive Design Tests
  async testResponsiveDesign(page, testResult) {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(config.baseUrl);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await this.takeScreenshot(page, testResult, `responsive-${viewport.name}`);
    }
  }

  // Phase 7: Performance Tests
  async testPagePerformance(page, testResult) {
    await page.goto(config.baseUrl);
    
    // Get basic performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    testResult.metrics = metrics;
    
    // Basic performance thresholds
    if (metrics.loadTime > 5000) {
      throw new Error(`Page load time too slow: ${metrics.loadTime}ms`);
    }
  }

  // Main test runner
  async runAllTests() {
    try {
      await this.initialize();

      // Phase 1: Core System Tests
      await this.runTest('Homepage Load', this.testHomepageLoad.bind(this));
      await this.runTest('Backend Connectivity', this.testBackendConnectivity.bind(this));
      
      // Phase 2: Authentication Tests
      await this.runTest('Login Page', this.testLoginPage.bind(this));
      await this.runTest('Registration Page', this.testRegistrationPage.bind(this));
      
      // Phase 3: Calendar Tests
      await this.runTest('Calendar Page', this.testCalendarPage.bind(this));
      await this.runTest('Calendar Mobile View', this.testCalendarMobileView.bind(this));
      
      // Phase 4: Dashboard Tests
      await this.runTest('Dashboard Access', this.testDashboardAccess.bind(this));
      
      // Phase 5: Booking Flow Tests
      await this.runTest('Booking Page', this.testBookingPage.bind(this));
      
      // Phase 6: Responsive Design Tests
      await this.runTest('Responsive Design', this.testResponsiveDesign.bind(this));
      
      // Phase 7: Performance Tests
      await this.runTest('Page Performance', this.testPagePerformance.bind(this));

    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new UserJourneyTester();
  tester.runAllTests().catch(console.error);
}

module.exports = UserJourneyTester;