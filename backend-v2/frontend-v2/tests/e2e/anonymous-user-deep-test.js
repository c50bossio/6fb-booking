#!/usr/bin/env node

/**
 * PHASE 1.1: Anonymous User Perspective Deep Testing
 * UltraThink Deep Analysis - BookedBarber V2
 * 
 * Tests the complete anonymous user journey with comprehensive error detection
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class AnonymousUserDeepTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      performance: {},
      security: {},
      errors: [],
      screenshots: []
    };
  }

  async init() {
    console.log('🚀 PHASE 1.1: Anonymous User Deep Testing - STARTED');
    console.log('🎯 Focus: Landing Page, Booking Flow, Performance, Security');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enhanced error monitoring
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.results.errors.push({
          type: 'console_error',
          message: text,
          timestamp: new Date().toISOString(),
          url: this.page.url()
        });
        console.log(`🔴 CONSOLE ERROR: ${text}`);
      } else if (type === 'warning') {
        this.results.warnings++;
        console.log(`⚠️ WARNING: ${text}`);
      }
    });

    this.page.on('pageerror', error => {
      this.results.errors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        url: this.page.url()
      });
      console.log(`🔥 PAGE ERROR: ${error.message}`);
    });

    this.page.on('requestfailed', request => {
      this.results.errors.push({
        type: 'network_error',
        message: `Failed to load: ${request.url()}`,
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 NETWORK ERROR: ${request.url()} - ${request.failure()?.errorText}`);
    });

    // Set realistic user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Testing: ${testName}`);
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      this.results.passed++;
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      return { status: 'PASSED', duration, error: null };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      console.log(`❌ ${testName} - FAILED: ${error.message} (${duration}ms)`);
      
      // Take failure screenshot
      const screenshotPath = `test-failure-anonymous-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.results.screenshots.push(screenshotPath);
      
      return { status: 'FAILED', duration, error: error.message };
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = `test-anonymous-${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push(screenshotPath);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    return screenshotPath;
  }

  async measurePerformance(pageName) {
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        networkRequests: performance.getEntriesByType('resource').length
      };
    });

    this.results.performance[pageName] = performanceMetrics;
    console.log(`⏱️ Performance [${pageName}]:`, performanceMetrics);
    return performanceMetrics;
  }

  async checkSecurity() {
    const securityHeaders = await this.page.evaluate(() => {
      return {
        csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
        xFrameOptions: 'checked-via-response-headers',
        httpsRedirect: window.location.protocol === 'https:',
        cookieSecure: document.cookie.includes('Secure'),
        url: window.location.href
      };
    });

    // Check response headers
    const response = await this.page.goto(this.page.url());
    const headers = response.headers();
    
    const securityAssessment = {
      csp: headers['content-security-policy'] || 'missing',
      xFrameOptions: headers['x-frame-options'] || 'missing',
      xContentTypeOptions: headers['x-content-type-options'] || 'missing',
      referrerPolicy: headers['referrer-policy'] || 'missing',
      httpsUpgrade: headers['strict-transport-security'] || 'missing'
    };

    this.results.security = securityAssessment;
    console.log('🔐 Security Assessment:', securityAssessment);
    return securityAssessment;
  }

  // Test 1: Landing Page Analysis
  async testLandingPage() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check critical elements
    const title = await this.page.title();
    if (!title || !title.includes('Booked Barber')) {
      throw new Error(`Invalid page title: ${title}`);
    }

    // Check for key landing page elements
    const navigation = await this.page.$('nav, header, [role="navigation"]');
    if (!navigation) {
      throw new Error('Navigation not found');
    }

    const ctaButtons = await this.page.$$('button, a[href*="book"], a[href*="sign"]');
    if (ctaButtons.length === 0) {
      throw new Error('No call-to-action buttons found');
    }

    // Check responsive design
    await this.page.setViewport({ width: 375, height: 667 }); // Mobile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mobileLayout = await this.page.evaluate(() => {
      return {
        hasHamburgerMenu: document.querySelector('[class*="mobile"], [class*="hamburger"], [class*="menu"]') !== null,
        navVisible: window.getComputedStyle(document.querySelector('nav')).display !== 'none'
      };
    });

    await this.page.setViewport({ width: 1920, height: 1080 }); // Desktop
    
    await this.measurePerformance('landing_page');
    await this.checkSecurity();
    await this.takeScreenshot('landing-page');

    console.log('✅ Landing page elements verified');
    console.log(`✅ Mobile responsiveness: ${mobileLayout.hasHamburgerMenu ? 'Good' : 'Needs review'}`);
  }

  // Test 2: Navigation and Information Architecture
  async testNavigationFlow() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    
    // Test main navigation links
    const navLinks = await this.page.$$('nav a, header a');
    console.log(`Found ${navLinks.length} navigation links`);

    if (navLinks.length > 0) {
      // Test first few navigation links
      for (let i = 0; i < Math.min(5, navLinks.length); i++) {
        try {
          const href = await navLinks[i].evaluate(el => el.href);
          if (href && !href.includes('javascript:') && !href.includes('mailto:')) {
            await navLinks[i].click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const currentUrl = this.page.url();
            const title = await this.page.title();
            console.log(`📍 Navigation test: ${href} → ${currentUrl} (${title})`);
            
            // Check if page loaded properly
            const hasContent = await this.page.$('main, [role="main"], .content');
            if (!hasContent) {
              console.warn(`⚠️ Page may have loading issues: ${currentUrl}`);
              this.results.warnings++;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Navigation link ${i} failed: ${error.message}`);
          this.results.warnings++;
        }
      }
    }

    await this.takeScreenshot('navigation-flow');
  }

  // Test 3: Booking Flow (Guest User)
  async testGuestBookingFlow() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    
    // Look for booking CTA
    const bookingButton = await this.page.$('a[href*="book"], button[class*="book"], a[href*="/book"]');
    
    if (bookingButton) {
      await bookingButton.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const bookingUrl = this.page.url();
      console.log(`📅 Booking page loaded: ${bookingUrl}`);
      
      // Check booking form elements
      const bookingElements = await this.page.evaluate(() => {
        return {
          serviceSelection: document.querySelector('select, [class*="service"], [data-testid*="service"]') !== null,
          dateTimePicker: document.querySelector('input[type="date"], [class*="calendar"], [class*="date"]') !== null,
          contactForm: document.querySelector('input[type="email"], input[name*="email"]') !== null,
          submitButton: document.querySelector('button[type="submit"], button[class*="submit"]') !== null
        };
      });
      
      console.log('📋 Booking form elements:', bookingElements);
      
      // Test form interaction
      const emailInput = await this.page.$('input[type="email"], input[name*="email"]');
      if (emailInput) {
        await emailInput.type('test@example.com');
        console.log('✅ Email input working');
      }
      
      await this.measurePerformance('booking_page');
      await this.takeScreenshot('booking-flow');
      
    } else {
      console.warn('⚠️ No booking button found on landing page');
      this.results.warnings++;
    }
  }

  // Test 4: Form Validation and Error Handling
  async testFormValidation() {
    // Navigate to a page with forms (contact, sign up, etc.)
    await this.page.goto(`${this.baseUrl}/book`, { waitUntil: 'networkidle0' });
    
    // Test form validation
    const forms = await this.page.$$('form');
    
    for (const form of forms) {
      try {
        // Try to submit empty form
        const submitButton = await form.$('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check for validation messages
          const validationMessages = await this.page.$$('.error, [class*="error"], [aria-invalid="true"]');
          console.log(`📝 Form validation: ${validationMessages.length} validation messages found`);
          
          if (validationMessages.length > 0) {
            console.log('✅ Form validation working');
          }
        }
      } catch (error) {
        console.warn(`⚠️ Form testing error: ${error.message}`);
        this.results.warnings++;
      }
    }
    
    await this.takeScreenshot('form-validation');
  }

  // Test 5: Performance Under Different Conditions
  async testPerformanceConditions() {
    console.log('🚀 Testing performance under different conditions...');
    
    // Test slow connection simulation
    await this.page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100 // 100ms
    });
    
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    await this.measurePerformance('slow_network');
    
    // Reset network conditions
    await this.page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
    
    await this.takeScreenshot('performance-test');
  }

  // Test 6: Accessibility and Usability
  async testAccessibility() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    
    const accessibilityCheck = await this.page.evaluate(() => {
      return {
        altTexts: Array.from(document.querySelectorAll('img')).every(img => img.alt || img.getAttribute('aria-label')),
        headingStructure: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        ariaLabels: document.querySelectorAll('[aria-label], [aria-labelledby]').length,
        focusableElements: document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length,
        skipLinks: document.querySelector('a[href*="#main"], a[href*="#content"]') !== null
      };
    });
    
    console.log('♿ Accessibility assessment:', accessibilityCheck);
    
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    await this.page.keyboard.press('Tab');
    
    const focusedElement = await this.page.evaluate(() => {
      return document.activeElement ? {
        tagName: document.activeElement.tagName,
        className: document.activeElement.className,
        hasVisibleFocus: window.getComputedStyle(document.activeElement).outline !== 'none'
      } : null;
    });
    
    console.log('⌨️ Keyboard navigation test:', focusedElement);
    
    await this.takeScreenshot('accessibility-test');
  }

  async generateReport() {
    const reportData = {
      testSuite: 'Anonymous User Deep Testing',
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: `${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`,
        errorCount: this.results.errors.length
      },
      performance: this.results.performance,
      security: this.results.security,
      screenshots: this.results.screenshots,
      criticalIssues: this.results.errors.filter(error => 
        error.type === 'page_error' || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('TypeError')
      )
    };

    const reportPath = `anonymous-user-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log('\n📊 ANONYMOUS USER TESTING SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${reportData.summary.totalTests}`);
    console.log(`Passed: ${reportData.summary.passed}`);
    console.log(`Failed: ${reportData.summary.failed}`);
    console.log(`Warnings: ${reportData.summary.warnings}`);
    console.log(`Success Rate: ${reportData.summary.successRate}`);
    console.log(`Critical Errors: ${reportData.criticalIssues.length}`);
    console.log(`Performance Issues: ${Object.keys(this.results.performance).length > 0 ? 'Measured' : 'None'}`);
    console.log(`Security Assessment: ${this.results.security ? 'Completed' : 'Pending'}`);
    console.log(`Report saved: ${reportPath}`);
    
    if (this.results.screenshots.length > 0) {
      console.log(`\n📸 Screenshots captured: ${this.results.screenshots.length}`);
      this.results.screenshots.forEach(screenshot => console.log(`  - ${screenshot}`));
    }

    if (reportData.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      reportData.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.message}`);
      });
    }

    return reportData;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runAllTests() {
    try {
      await this.init();

      // Core anonymous user journey tests
      await this.runTest('Landing Page Analysis', () => this.testLandingPage());
      await this.runTest('Navigation Flow', () => this.testNavigationFlow());
      await this.runTest('Guest Booking Flow', () => this.testGuestBookingFlow());
      await this.runTest('Form Validation', () => this.testFormValidation());
      await this.runTest('Performance Conditions', () => this.testPerformanceConditions());
      await this.runTest('Accessibility & Usability', () => this.testAccessibility());

      const report = await this.generateReport();
      return report;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AnonymousUserDeepTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Anonymous User Deep Testing completed!');
      console.log(`📈 Success Rate: ${report.summary.successRate}`);
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Anonymous User Testing failed:', error);
      process.exit(1);
    });
}

module.exports = AnonymousUserDeepTester;