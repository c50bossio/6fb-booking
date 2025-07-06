#!/usr/bin/env node

/**
 * Frontend-Only Puppeteer Test Suite for BookedBarber V2 Consolidated Features
 * Tests UI components and layout without requiring backend API
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

class FrontendTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async init() {
    console.log('🚀 Starting BookedBarber V2 Frontend-Only Test Suite');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Suppress API errors for frontend-only testing
    await this.page.evaluateOnNewDocument(() => {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        console.log('🔇 Intercepted API call:', args[0]);
        return Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'API not available in test mode' })
        });
      };
    });
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    try {
      await testFunction();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED', error: null });
      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
      
      const screenshotPath = `test-failure-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  }

  async waitForPageLoad() {
    await this.page.waitForSelector('body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for React hydration
  }

  async takeScreenshot(name) {
    const screenshotPath = `test-${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot: ${screenshotPath}`);
    return screenshotPath;
  }

  // Test UI Structure and Layout
  async testUIStructure() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    await this.waitForPageLoad();
    
    const title = await this.page.title();
    if (!title || title.includes('404')) {
      throw new Error(`Invalid page title: ${title}`);
    }

    // Check for basic layout elements
    const navigation = await this.page.$('nav, [role="navigation"], header');
    if (!navigation) {
      throw new Error('No navigation found');
    }

    const mainContent = await this.page.$('main, [role="main"], .main-content');
    if (!mainContent) {
      throw new Error('No main content area found');
    }

    await this.takeScreenshot('homepage-structure');
    console.log('✅ Basic page structure is present');
  }

  // Test Unified Analytics Dashboard Layout
  async testAnalyticsLayout() {
    await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
    await this.waitForPageLoad();

    // Check for analytics page elements
    const pageHeading = await this.page.$('h1, .page-title, [data-testid="page-title"]');
    if (!pageHeading) {
      throw new Error('No page heading found');
    }

    // Look for analytics content (even if it shows loading/error states)
    const contentElements = await this.page.$$('.card, .chart, .analytics, [class*="analytics"], [class*="dashboard"]');
    console.log(`Found ${contentElements.length} analytics content elements`);

    // Check for tab structure
    const tabElements = await this.page.$$('[role="tab"], .tab, [class*="tab"]');
    if (tabElements.length > 0) {
      console.log(`Found ${tabElements.length} tab elements`);
      
      // Test tab interaction
      if (tabElements.length > 1) {
        await tabElements[1].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Tab interaction works');
      }
    }

    await this.takeScreenshot('analytics-layout');
  }

  // Test Financial Center Layout
  async testFinancialLayout() {
    await this.page.goto(`${this.baseUrl}/finance/unified`, { waitUntil: 'networkidle0' });
    await this.waitForPageLoad();

    const contentElements = await this.page.$$('.card, .financial, .revenue, .payment, [class*="financial"]');
    console.log(`Found ${contentElements.length} financial content elements`);

    if (contentElements.length === 0) {
      // Check if there's an error state or loading state that's expected
      const errorOrLoadingElements = await this.page.$$('.loading, .error, .skeleton, [class*="loading"], [class*="error"]');
      if (errorOrLoadingElements.length > 0) {
        console.log(`Found ${errorOrLoadingElements.length} loading/error state elements (acceptable for API-less test)`);
      } else {
        throw new Error('No financial content or loading states found');
      }
    }

    await this.takeScreenshot('financial-layout');
  }

  // Test Customer Management Layout
  async testCustomerLayout() {
    await this.page.goto(`${this.baseUrl}/customers`, { waitUntil: 'networkidle0' });
    await this.waitForPageLoad();

    const contentElements = await this.page.$$('.card, .customer, .client, .table, [class*="customer"], [class*="client"]');
    console.log(`Found ${contentElements.length} customer content elements`);

    // Test search functionality (UI only)
    const searchInput = await this.page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test search');
      await new Promise(resolve => setTimeout(resolve, 500));
      await searchInput.click({ clickCount: 3 }); // Select all
      await searchInput.press('Backspace'); // Clear
      console.log('✅ Search input interaction works');
    }

    await this.takeScreenshot('customer-layout');
  }

  // Test Responsive Behavior
  async testResponsiveDesign() {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
      await this.waitForPageLoad();
      
      const bodyHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (bodyHeight < 100) {
        throw new Error(`Page too short on ${viewport.name}: ${bodyHeight}px`);
      }
      
      await this.takeScreenshot(`responsive-${viewport.name}`);
      console.log(`✅ ${viewport.name}: ${bodyHeight}px height`);
    }

    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  // Test Component Rendering and Interactions
  async testComponentInteractions() {
    await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
    await this.waitForPageLoad();

    // Test button interactions
    const buttons = await this.page.$$('button:not([disabled])');
    if (buttons.length > 0) {
      console.log(`Found ${buttons.length} interactive buttons`);
      
      // Test clicking a button (avoid form submissions)
      const safeButtons = await this.page.$$('button[type="button"], button:not([type])');
      if (safeButtons.length > 0) {
        await safeButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Button interaction works');
      }
    }

    // Test form inputs
    const inputs = await this.page.$$('input, select, textarea');
    if (inputs.length > 0) {
      console.log(`Found ${inputs.length} form elements`);
      
      // Test typing in first input
      const textInputs = await this.page.$$('input[type="text"], input[type="search"], input:not([type])');
      if (textInputs.length > 0) {
        await textInputs[0].type('test input');
        await new Promise(resolve => setTimeout(resolve, 500));
        await textInputs[0].click({ clickCount: 3 });
        await textInputs[0].press('Backspace');
        console.log('✅ Input interaction works');
      }
    }

    await this.takeScreenshot('component-interactions');
  }

  async generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'Frontend-Only',
      baseUrl: this.baseUrl,
      results: this.results,
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`
      }
    };

    const reportPath = `frontend-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log('\n📊 FRONTEND TEST SUMMARY');
    console.log('========================');
    console.log(`Total Tests: ${reportData.summary.totalTests}`);
    console.log(`Passed: ${reportData.summary.passed}`);
    console.log(`Failed: ${reportData.summary.failed}`);
    console.log(`Success Rate: ${reportData.summary.successRate}`);
    console.log(`Report saved: ${reportPath}`);

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

      await this.runTest('UI Structure', () => this.testUIStructure());
      await this.runTest('Analytics Layout', () => this.testAnalyticsLayout());
      await this.runTest('Financial Layout', () => this.testFinancialLayout());
      await this.runTest('Customer Layout', () => this.testCustomerLayout());
      await this.runTest('Responsive Design', () => this.testResponsiveDesign());
      await this.runTest('Component Interactions', () => this.testComponentInteractions());

      const report = await this.generateReport();
      return report;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FrontendTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Frontend testing completed!');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = FrontendTester;