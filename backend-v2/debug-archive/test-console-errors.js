#!/usr/bin/env node

/**
 * Console Error Detection Script
 * Captures JavaScript errors and network failures
 */

const { chromium } = require('playwright');

class ConsoleErrorDetector {
  constructor() {
    this.browser = null;
    this.errors = [];
    this.networkFailures = [];
  }

  async initialize() {
    console.log('🐛 Starting Console Error Detection...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async checkPageErrors(url, pageName) {
    console.log(`\n🔍 Checking ${pageName} (${url})`);
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    const pageErrors = [];
    const pageNetworkFailures = [];

    // Listen for console errors
    page.on('console', message => {
      if (message.type() === 'error') {
        pageErrors.push({
          page: pageName,
          type: 'console_error',
          message: message.text(),
          location: message.location()
        });
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      pageErrors.push({
        page: pageName,
        type: 'page_error',
        message: error.message,
        stack: error.stack
      });
    });

    // Listen for failed requests
    page.on('response', response => {
      if (!response.ok()) {
        pageNetworkFailures.push({
          page: pageName,
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(2000);
      } catch (e) {
        // Cookie consent already handled or not present
      }

      // Wait for components to load and check for runtime errors
      await page.waitForTimeout(5000);

      // Check for React error boundaries
      const reactErrors = await page.evaluate(() => {
        // Look for common error indicators
        const errorBoundaries = Array.from(document.querySelectorAll('[class*="error"], [data-error]'));
        const emptyContainers = Array.from(document.querySelectorAll('div')).filter(div => 
          div.children.length === 0 && div.textContent.trim() === ''
        );
        
        return {
          errorBoundaries: errorBoundaries.map(el => el.textContent),
          emptyContainers: emptyContainers.length,
          totalElements: document.querySelectorAll('*').length,
          bodyContent: document.body.textContent.trim().length
        };
      });

      console.log(`  📄 Page Content Analysis:`);
      console.log(`    Total DOM elements: ${reactErrors.totalElements}`);
      console.log(`    Body content length: ${reactErrors.bodyContent} chars`);
      console.log(`    Empty containers: ${reactErrors.emptyContainers}`);
      console.log(`    Error boundaries: ${reactErrors.errorBoundaries.length}`);

      if (reactErrors.errorBoundaries.length > 0) {
        console.log(`    Error messages: ${reactErrors.errorBoundaries}`);
      }

      // Collect Network tab equivalent information
      const networkInfo = await page.evaluate(() => {
        return {
          // Check if fetch/API calls are working
          fetchSupported: typeof fetch !== 'undefined',
          localStorageWorks: (() => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          })(),
          cookiesEnabled: navigator.cookieEnabled
        };
      });

      console.log(`  🌐 Browser Environment:`);
      console.log(`    Fetch API: ${networkInfo.fetchSupported}`);
      console.log(`    Local Storage: ${networkInfo.localStorageWorks}`);
      console.log(`    Cookies: ${networkInfo.cookiesEnabled}`);

    } catch (error) {
      pageErrors.push({
        page: pageName,
        type: 'navigation_error',
        message: error.message
      });
    }

    // Report errors for this page
    if (pageErrors.length > 0) {
      console.log(`  ❌ Errors found:`);
      pageErrors.forEach(error => {
        console.log(`    ${error.type}: ${error.message}`);
      });
    } else {
      console.log(`  ✅ No JavaScript errors detected`);
    }

    if (pageNetworkFailures.length > 0) {
      console.log(`  🌐 Network failures:`);
      pageNetworkFailures.forEach(failure => {
        console.log(`    ${failure.status} ${failure.statusText}: ${failure.url}`);
      });
    } else {
      console.log(`  ✅ No network failures detected`);
    }

    this.errors = this.errors.concat(pageErrors);
    this.networkFailures = this.networkFailures.concat(pageNetworkFailures);

    await context.close();
  }

  async run() {
    try {
      await this.initialize();

      const testPages = [
        { url: 'http://localhost:3000', name: 'Homepage' },
        { url: 'http://localhost:3000/login', name: 'Login Page' },
        { url: 'http://localhost:3000/register', name: 'Registration Page' },
        { url: 'http://localhost:3000/book', name: 'Booking Page' },
        { url: 'http://localhost:3000/calendar', name: 'Calendar Page' },
        { url: 'http://localhost:3000/dashboard', name: 'Dashboard Page' }
      ];

      for (const page of testPages) {
        await this.checkPageErrors(page.url, page.name);
      }

      // Summary report
      console.log('\n📊 ERROR DETECTION SUMMARY');
      console.log('=' * 50);
      console.log(`Total JavaScript Errors: ${this.errors.length}`);
      console.log(`Total Network Failures: ${this.networkFailures.length}`);

      if (this.errors.length > 0) {
        console.log('\n🐛 JavaScript Errors by Type:');
        const errorsByType = this.errors.reduce((acc, error) => {
          acc[error.type] = (acc[error.type] || 0) + 1;
          return acc;
        }, {});
        Object.entries(errorsByType).forEach(([type, count]) => {
          console.log(`  ${type}: ${count}`);
        });

        console.log('\n🔴 Most Critical Errors:');
        this.errors.slice(0, 5).forEach((error, i) => {
          console.log(`  ${i + 1}. [${error.page}] ${error.message}`);
        });
      }

      if (this.networkFailures.length > 0) {
        console.log('\n🌐 Network Issues:');
        const failuresByStatus = this.networkFailures.reduce((acc, failure) => {
          acc[failure.status] = (acc[failure.status] || 0) + 1;
          return acc;
        }, {});
        Object.entries(failuresByStatus).forEach(([status, count]) => {
          console.log(`  HTTP ${status}: ${count} failures`);
        });
      }

      console.log('\n🎯 Recommendations:');
      if (this.errors.length === 0 && this.networkFailures.length === 0) {
        console.log('  ✅ No errors detected - investigate component rendering logic');
        console.log('  🔍 Check for missing data dependencies or slow async operations');
      } else {
        console.log('  🔧 Fix JavaScript errors before testing user flows');
        console.log('  🌐 Resolve network connectivity issues');
        console.log('  🐛 Check browser developer tools for more details');
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run error detection
const detector = new ConsoleErrorDetector();
detector.run().catch(console.error);