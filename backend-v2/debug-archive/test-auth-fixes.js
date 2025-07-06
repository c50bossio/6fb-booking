#!/usr/bin/env node

/**
 * Test script to verify authentication fixes
 * Tests that pages handle 403/401 errors gracefully
 */

const { chromium } = require('playwright');

class AuthFixTester {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async initialize() {
    console.log('🔧 Testing Authentication Fixes...');
    this.browser = await chromium.launch({ 
      headless: true,
      timeout: 30000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testPageLoading(url, pageName) {
    console.log(`\n🔍 Testing ${pageName}: ${url}`);
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    const errors = [];
    const networkFailures = [];
    let loadSuccess = false;

    // Listen for console errors
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    // Listen for network failures
    page.on('response', response => {
      if (!response.ok() && response.status() !== 401 && response.status() !== 403) {
        // Only log non-auth failures as errors (401/403 are expected and should be handled)
        networkFailures.push(`${response.status()} ${response.statusText()}: ${response.url()}`);
      }
    });

    try {
      await page.goto(url, { timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Handle cookie consent if present
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(2000);
      } catch (e) {
        // Cookie consent not present or already handled
      }

      // Wait for page to settle
      await page.waitForTimeout(3000);

      // Check if page loaded successfully
      const pageContent = await page.evaluate(() => {
        return {
          hasContent: document.body.textContent.trim().length > 100,
          title: document.title,
          hasLoadingIndicator: !!document.querySelector('[data-testid="loading"], .loading, .spinner'),
          hasErrorMessage: !!document.querySelector('[data-error], .error, [class*="error"]'),
          currentUrl: window.location.href
        };
      });

      loadSuccess = pageContent.hasContent && !pageContent.hasErrorMessage;
      
      console.log(`  📄 Page Analysis:`);
      console.log(`    Title: ${pageContent.title}`);
      console.log(`    Has Content: ${pageContent.hasContent}`);
      console.log(`    Loading Indicator: ${pageContent.hasLoadingIndicator}`);
      console.log(`    Error State: ${pageContent.hasErrorMessage}`);
      console.log(`    Final URL: ${pageContent.currentUrl}`);

      if (pageContent.currentUrl.includes('/login')) {
        console.log(`    ✅ Properly redirected to login for protected page`);
        loadSuccess = true; // Redirect to login is expected behavior
      }

    } catch (error) {
      errors.push(`Navigation error: ${error.message}`);
    }

    // Report results
    if (loadSuccess) {
      console.log(`  ✅ ${pageName} loads successfully`);
    } else {
      console.log(`  ❌ ${pageName} failed to load properly`);
    }

    if (errors.length > 0) {
      console.log(`  🐛 JavaScript Errors (${errors.length}):`);
      errors.slice(0, 3).forEach(error => {
        console.log(`    - ${error.substring(0, 100)}...`);
      });
    } else {
      console.log(`  ✅ No JavaScript errors`);
    }

    if (networkFailures.length > 0) {
      console.log(`  🌐 Network Issues (${networkFailures.length}):`);
      networkFailures.slice(0, 3).forEach(failure => {
        console.log(`    - ${failure}`);
      });
    } else {
      console.log(`  ✅ No unexpected network failures`);
    }

    this.results.push({
      page: pageName,
      url,
      loadSuccess,
      errors: errors.length,
      networkFailures: networkFailures.length
    });

    await context.close();
  }

  async run() {
    try {
      await this.initialize();

      // Test key pages with auth requirements
      const testPages = [
        { url: 'http://localhost:3000', name: 'Homepage' },
        { url: 'http://localhost:3000/book', name: 'Booking Page (Guest)' },
        { url: 'http://localhost:3000/calendar', name: 'Calendar Page (Auth Required)' },
        { url: 'http://localhost:3000/dashboard', name: 'Dashboard Page (Auth Required)' },
        { url: 'http://localhost:3000/login', name: 'Login Page' },
      ];

      for (const page of testPages) {
        await this.testPageLoading(page.url, page.name);
      }

      // Summary
      console.log('\n📊 AUTH FIXES TEST SUMMARY');
      console.log('=' .repeat(50));
      
      const successCount = this.results.filter(r => r.loadSuccess).length;
      console.log(`✅ Successful page loads: ${successCount}/${this.results.length}`);
      
      const totalErrors = this.results.reduce((sum, r) => sum + r.errors, 0);
      console.log(`🐛 Total JavaScript errors: ${totalErrors}`);
      
      const totalNetworkIssues = this.results.reduce((sum, r) => sum + r.networkFailures, 0);
      console.log(`🌐 Total network issues: ${totalNetworkIssues}`);

      console.log('\n🎯 Test Results:');
      this.results.forEach(result => {
        const status = result.loadSuccess ? '✅' : '❌';
        console.log(`  ${status} ${result.page}`);
      });

      if (successCount === this.results.length && totalErrors === 0) {
        console.log('\n🎉 All authentication fixes working correctly!');
        console.log('   Pages handle unauthenticated states gracefully');
        console.log('   No JavaScript errors detected');
        console.log('   Protected pages redirect to login as expected');
      } else {
        console.log('\n⚠️  Some issues remain:');
        if (successCount < this.results.length) {
          console.log('   - Some pages failed to load properly');
        }
        if (totalErrors > 0) {
          console.log('   - JavaScript errors still present');
        }
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run auth fix tests
const tester = new AuthFixTester();
tester.run().catch(console.error);