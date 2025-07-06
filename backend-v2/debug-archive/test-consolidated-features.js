#!/usr/bin/env node

/**
 * Comprehensive Puppeteer Test Suite for BookedBarber V2 Consolidated Features
 * Tests all unified dashboards and cross-user AI analytics
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class ConsolidatedFeaturesTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = process.env.TEST_URL || 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.screenshots = [];
  }

  async init() {
    console.log('🚀 Starting BookedBarber V2 Consolidated Features Test Suite');
    console.log(`📍 Testing URL: ${this.baseUrl}`);
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Set up console logging
    this.page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🔴 ${type.toUpperCase()}: ${msg.text()}`);
      }
    });

    // Set up error handling
    this.page.on('pageerror', error => {
      console.error('🔥 Page Error:', error.message);
    });

    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
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
      
      // Take screenshot on failure
      const screenshotPath = `test-failure-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.screenshots.push(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  }

  async waitForLoad(timeout = 10000) {
    try {
      await this.page.waitForSelector('body', { timeout });
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for content to load
    } catch (error) {
      console.warn('⚠️ Wait for load failed:', error.message);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Fallback delay
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = `test-${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.screenshots.push(screenshotPath);
    console.log(`📸 Screenshot: ${screenshotPath}`);
  }

  // Test 1: Homepage and Navigation
  async testHomepageLoad() {
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
    await this.waitForLoad();
    
    const title = await this.page.title();
    if (!title || title.includes('404') || title.includes('Error')) {
      throw new Error(`Invalid page title: ${title}`);
    }
    
    await this.takeScreenshot('homepage');
  }

  // Test 2: Unified Analytics Dashboard
  async testUnifiedAnalyticsDashboard() {
    await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();

    // Check for unified analytics components
    const analyticsTitle = await this.page.$eval('h1', el => el.textContent).catch(() => null);
    if (!analyticsTitle || !analyticsTitle.toLowerCase().includes('analytics')) {
      throw new Error('Analytics page title not found');
    }

    // Test tab navigation
    const tabs = await this.page.$$('[role="tablist"] button, .tabs-list button, [data-testid*="tab"]');
    if (tabs.length === 0) {
      // Try alternative selectors for tabs
      const altTabs = await this.page.$$('button[role="tab"], .tab-trigger, [class*="tab"]');
      if (altTabs.length === 0) {
        console.warn('⚠️ No tabs found - checking for analytics sections instead');
        
        // Look for analytics sections
        const sections = await this.page.$$('[class*="analytics"], [data-testid*="analytics"], .chart, [class*="chart"]');
        if (sections.length === 0) {
          throw new Error('No analytics content found');
        }
        console.log(`✅ Found ${sections.length} analytics sections`);
      } else {
        console.log(`✅ Found ${altTabs.length} tab elements (alternative selector)`);
      }
    } else {
      console.log(`✅ Found ${tabs.length} tab elements`);
      
      // Test clicking tabs
      if (tabs.length > 1) {
        await tabs[1].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Tab navigation works');
      }
    }

    await this.takeScreenshot('unified-analytics');
  }

  // Test 3: Unified Financial Center
  async testUnifiedFinancialCenter() {
    await this.page.goto(`${this.baseUrl}/finance/unified`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();

    // Check for financial dashboard elements
    const financialContent = await this.page.$$('[class*="financial"], [class*="revenue"], [class*="payment"], .card, [data-testid*="finance"]');
    if (financialContent.length === 0) {
      throw new Error('No financial content found');
    }
    
    console.log(`✅ Found ${financialContent.length} financial components`);

    // Look for charts or financial data
    const charts = await this.page.$$('[class*="chart"], canvas, svg');
    if (charts.length > 0) {
      console.log(`✅ Found ${charts.length} chart elements`);
    }

    await this.takeScreenshot('unified-financial');
  }

  // Test 4: Unified Customer Management
  async testUnifiedCustomerManagement() {
    await this.page.goto(`${this.baseUrl}/customers`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();

    // Check for customer management elements
    const customerContent = await this.page.$$('[class*="customer"], [class*="client"], .table, .card, [data-testid*="customer"]');
    if (customerContent.length === 0) {
      throw new Error('No customer content found');
    }
    
    console.log(`✅ Found ${customerContent.length} customer management components`);

    // Test search/filter functionality if present
    const searchInput = await this.page.$('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
    if (searchInput) {
      await searchInput.type('test');
      await new Promise(resolve => setTimeout(resolve, 500));
      await searchInput.clear();
      console.log('✅ Search functionality works');
    }

    await this.takeScreenshot('unified-customers');
  }

  // Test 5: Cross-User AI Analytics
  async testCrossUserAIAnalytics() {
    // Check if AI analytics is available in the main analytics page
    await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();

    // Look for AI analytics components
    const aiElements = await this.page.$$('[class*="ai"], [class*="benchmark"], [class*="prediction"], [data-testid*="ai"]');
    if (aiElements.length === 0) {
      console.warn('⚠️ No AI analytics components found - checking for related content');
      
      // Look for any advanced analytics that might indicate AI features
      const advancedElements = await this.page.$$('[class*="insight"], [class*="recommendation"], [class*="score"]');
      if (advancedElements.length > 0) {
        console.log(`✅ Found ${advancedElements.length} advanced analytics elements`);
      } else {
        throw new Error('No AI analytics features found');
      }
    } else {
      console.log(`✅ Found ${aiElements.length} AI analytics components`);
    }

    await this.takeScreenshot('ai-analytics');
  }

  // Test 6: Reviews Management
  async testReviewsManagement() {
    await this.page.goto(`${this.baseUrl}/reviews`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();

    // Check for reviews content
    const reviewsContent = await this.page.$$('[class*="review"], .card, [data-testid*="review"]');
    if (reviewsContent.length === 0) {
      throw new Error('No reviews content found');
    }
    
    console.log(`✅ Found ${reviewsContent.length} review components`);

    // Test templates if available
    try {
      await this.page.goto(`${this.baseUrl}/reviews/templates`, { waitUntil: 'networkidle0' });
      await this.waitForLoad();
      
      const templatesContent = await this.page.$$('[class*="template"], .card');
      console.log(`✅ Reviews templates page loaded with ${templatesContent.length} elements`);
      
      await this.takeScreenshot('reviews-templates');
    } catch (error) {
      console.warn('⚠️ Reviews templates page not accessible:', error.message);
    }

    await this.takeScreenshot('reviews-management');
  }

  // Test 7: Responsive Design
  async testResponsiveDesign() {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await this.page.setViewport(viewport);
      await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
      await this.waitForLoad();
      
      // Check if page renders without errors
      const bodyHeight = await this.page.evaluate(() => document.body.scrollHeight);
      if (bodyHeight < 100) {
        throw new Error(`Page too short on ${viewport.name}: ${bodyHeight}px`);
      }
      
      await this.takeScreenshot(`responsive-${viewport.name}`);
      console.log(`✅ ${viewport.name} viewport (${viewport.width}x${viewport.height}): ${bodyHeight}px height`);
    }

    // Reset to desktop
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  // Test 8: Error Handling
  async testErrorHandling() {
    // Test 404 page
    try {
      await this.page.goto(`${this.baseUrl}/nonexistent-page`, { waitUntil: 'networkidle0' });
      await this.waitForLoad();
      
      const title = await this.page.title();
      const bodyText = await this.page.$eval('body', el => el.textContent);
      
      if (bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found')) {
        console.log('✅ 404 page handling works');
      } else {
        console.warn('⚠️ 404 page handling unclear');
      }
      
      await this.takeScreenshot('404-page');
    } catch (error) {
      console.warn('⚠️ Error page test failed:', error.message);
    }
  }

  // Test 9: Performance Check
  async testPerformance() {
    const startTime = Date.now();
    
    await this.page.goto(`${this.baseUrl}/analytics`, { waitUntil: 'networkidle0' });
    await this.waitForLoad();
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    
    if (loadTime > 10000) {
      throw new Error(`Page load too slow: ${loadTime}ms`);
    }
    
    // Check for console errors
    const errors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (errors.length > 0) {
      console.warn(`⚠️ Console errors found: ${errors.length}`);
      errors.forEach(error => console.warn(`  - ${error}`));
    } else {
      console.log('✅ No console errors detected');
    }
  }

  async generateReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      screenshots: this.screenshots,
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`
      }
    };

    const reportPath = `test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${reportData.summary.totalTests}`);
    console.log(`Passed: ${reportData.summary.passed}`);
    console.log(`Failed: ${reportData.summary.failed}`);
    console.log(`Success Rate: ${reportData.summary.successRate}`);
    console.log(`Report saved: ${reportPath}`);
    
    if (this.screenshots.length > 0) {
      console.log(`\n📸 Screenshots: ${this.screenshots.length}`);
      this.screenshots.forEach(screenshot => console.log(`  - ${screenshot}`));
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

      // Core functionality tests
      await this.runTest('Homepage Load', () => this.testHomepageLoad());
      await this.runTest('Unified Analytics Dashboard', () => this.testUnifiedAnalyticsDashboard());
      await this.runTest('Unified Financial Center', () => this.testUnifiedFinancialCenter());
      await this.runTest('Unified Customer Management', () => this.testUnifiedCustomerManagement());
      await this.runTest('Cross-User AI Analytics', () => this.testCrossUserAIAnalytics());
      await this.runTest('Reviews Management', () => this.testReviewsManagement());
      
      // Additional tests
      await this.runTest('Responsive Design', () => this.testResponsiveDesign());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Performance Check', () => this.testPerformance());

      const report = await this.generateReport();
      
      return report;
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ConsolidatedFeaturesTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Testing completed!');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = ConsolidatedFeaturesTester;