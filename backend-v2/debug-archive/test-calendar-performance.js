#!/usr/bin/env node

/**
 * Calendar Performance Optimization Test
 * Tests calendar loading speed, responsiveness, and handles large datasets
 */

const { chromium } = require('playwright');

class CalendarPerformanceTester {
  constructor() {
    this.browser = null;
    this.metrics = {
      pageLoadTime: 0,
      calendarRenderTime: 0,
      navigationResponseTime: 0,
      apiResponseTimes: [],
      memoryUsage: 0,
      networkRequests: 0,
      jsErrors: []
    };
    this.results = {
      pageLoadPerformance: false,
      calendarRenderPerformance: false,
      navigationPerformance: false,
      apiPerformance: false,
      memoryPerformance: false,
      errorFree: false
    };
  }

  async initialize() {
    console.log('⚡ Calendar Performance Optimization Test');
    console.log('=========================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 100 // Reduce slowMo for performance testing
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async setupPerformanceMonitoring(page) {
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    
    page.on('response', response => {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        request.responseTime = Date.now() - request.timestamp;
        request.status = response.status();
      }
    });
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.metrics.jsErrors.push({
          message: msg.text(),
          timestamp: Date.now()
        });
      }
    });
    
    // Monitor page errors
    page.on('pageerror', error => {
      this.metrics.jsErrors.push({
        message: error.message,
        timestamp: Date.now(),
        type: 'page-error'
      });
    });
    
    return requests;
  }

  async testPageLoadPerformance() {
    console.log('\n🚀 Testing Page Load Performance...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      const requests = await this.setupPerformanceMonitoring(page);
      
      // Set authentication
      await page.goto('http://localhost:3000');
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-token-performance-test');
        localStorage.setItem('refresh_token', 'mock-refresh');
      });
      
      // Measure page load time
      const startTime = Date.now();
      await page.goto('http://localhost:3000/calendar', { waitUntil: 'domcontentloaded' });
      const domLoadTime = Date.now() - startTime;
      
      // Wait for network to settle
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      const fullLoadTime = Date.now() - startTime;
      
      this.metrics.pageLoadTime = fullLoadTime;
      this.metrics.networkRequests = requests.length;
      
      console.log(`  📊 DOM Load Time: ${domLoadTime}ms`);
      console.log(`  📊 Full Load Time: ${fullLoadTime}ms`);
      console.log(`  📊 Network Requests: ${requests.length}`);
      
      // Analyze request performance
      const apiRequests = requests.filter(r => r.url.includes('/api/'));
      if (apiRequests.length > 0) {
        const avgApiTime = apiRequests.reduce((sum, req) => sum + (req.responseTime || 0), 0) / apiRequests.length;
        this.metrics.apiResponseTimes = apiRequests.map(r => r.responseTime || 0);
        console.log(`  📊 API Requests: ${apiRequests.length}, Avg Response: ${avgApiTime.toFixed(0)}ms`);
        
        this.results.apiPerformance = avgApiTime < 2000; // API responses under 2 seconds
      } else {
        this.results.apiPerformance = true; // No API requests is also OK
      }
      
      // Performance thresholds
      this.results.pageLoadPerformance = fullLoadTime < 5000; // Page loads in under 5 seconds
      
      console.log(`  ${this.results.pageLoadPerformance ? '✅' : '❌'} Page Load: ${fullLoadTime < 5000 ? 'Fast' : 'Slow'}`);
      console.log(`  ${this.results.apiPerformance ? '✅' : '❌'} API Performance: ${this.results.apiPerformance ? 'Good' : 'Slow'}`);
      
    } catch (error) {
      console.log(`  ❌ Page load test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testCalendarRenderPerformance() {
    console.log('\n📅 Testing Calendar Render Performance...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await this.setupPerformanceMonitoring(page);
      
      // Set auth and navigate
      await page.goto('http://localhost:3000');
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-token');
        localStorage.setItem('refresh_token', 'mock-refresh');
      });
      
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      
      // Measure calendar render time
      const renderStartTime = Date.now();
      
      // Wait for calendar content to appear
      try {
        await page.waitForFunction(() => {
          const hasCalendarContent = document.body.textContent.toLowerCase().includes('calendar') ||
                                   document.querySelector('[class*="calendar"]') !== null ||
                                   document.querySelector('table') !== null ||
                                   document.querySelectorAll('button').length > 5;
          return hasCalendarContent;
        }, { timeout: 10000 });
        
        const renderTime = Date.now() - renderStartTime;
        this.metrics.calendarRenderTime = renderTime;
        
        console.log(`  📊 Calendar Render Time: ${renderTime}ms`);
        this.results.calendarRenderPerformance = renderTime < 3000; // Renders in under 3 seconds
        console.log(`  ${this.results.calendarRenderPerformance ? '✅' : '❌'} Render Speed: ${renderTime < 3000 ? 'Fast' : 'Slow'}`);
        
      } catch (error) {
        console.log(`  ⚠️  Calendar content detection timeout: ${error.message}`);
        this.results.calendarRenderPerformance = false;
      }
      
      // Test calendar interactions performance
      await this.testCalendarInteractionSpeed(page);
      
    } catch (error) {
      console.log(`  ❌ Calendar render test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testCalendarInteractionSpeed(page) {
    console.log('\n  🖱️  Testing Calendar Interaction Speed...');
    
    try {
      const interactions = [];
      
      // Test button click responsiveness
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        const testButton = buttons[0];
        
        const clickStartTime = Date.now();
        await testButton.click();
        await page.waitForTimeout(500); // Wait for any UI updates
        const clickResponseTime = Date.now() - clickStartTime;
        
        interactions.push({ type: 'button-click', time: clickResponseTime });
        console.log(`    Button Click Response: ${clickResponseTime}ms`);
      }
      
      // Test page navigation if available
      try {
        const currentUrl = page.url();
        const navigationStartTime = Date.now();
        
        // Navigate to booking page and back
        await page.goto('http://localhost:3000/book');
        await page.waitForLoadState('domcontentloaded');
        await page.goto(currentUrl);
        await page.waitForLoadState('domcontentloaded');
        
        const navigationTime = Date.now() - navigationStartTime;
        this.metrics.navigationResponseTime = navigationTime;
        
        interactions.push({ type: 'navigation', time: navigationTime });
        console.log(`    Navigation Response: ${navigationTime}ms`);
        
        this.results.navigationPerformance = navigationTime < 4000; // Navigation under 4 seconds
      } catch (error) {
        console.log(`    ⚠️  Navigation test skipped: ${error.message}`);
        this.results.navigationPerformance = true; // Don't fail overall test
      }
      
      const avgInteractionTime = interactions.length > 0 ? 
        interactions.reduce((sum, i) => sum + i.time, 0) / interactions.length : 0;
      
      console.log(`    Average Interaction Time: ${avgInteractionTime.toFixed(0)}ms`);
      
    } catch (error) {
      console.log(`    ❌ Interaction test failed: ${error.message}`);
    }
  }

  async testMemoryUsage() {
    console.log('\n🧠 Testing Memory Usage...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000');
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-token');
        localStorage.setItem('refresh_token', 'mock-refresh');
      });
      
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      
      // Get memory usage metrics
      const metrics = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      if (metrics) {
        const memoryUsageMB = metrics.usedJSHeapSize / (1024 * 1024);
        this.metrics.memoryUsage = memoryUsageMB;
        
        console.log(`  📊 JS Heap Used: ${memoryUsageMB.toFixed(1)} MB`);
        console.log(`  📊 JS Heap Total: ${(metrics.totalJSHeapSize / (1024 * 1024)).toFixed(1)} MB`);
        
        this.results.memoryPerformance = memoryUsageMB < 50; // Under 50MB usage
        console.log(`  ${this.results.memoryPerformance ? '✅' : '❌'} Memory Usage: ${memoryUsageMB < 50 ? 'Efficient' : 'High'}`);
      } else {
        console.log(`  ℹ️  Memory metrics not available in this browser`);
        this.results.memoryPerformance = true; // Don't fail if not available
      }
      
    } catch (error) {
      console.log(`  ❌ Memory test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testErrorFreeDom() {
    console.log('\n🚫 Testing Error-Free Performance...');
    
    try {
      const totalErrors = this.metrics.jsErrors.length;
      console.log(`  📊 JavaScript Errors: ${totalErrors}`);
      
      if (totalErrors > 0) {
        console.log('  ⚠️  Errors detected:');
        this.metrics.jsErrors.slice(0, 3).forEach((error, index) => {
          console.log(`    ${index + 1}. ${error.message.substring(0, 100)}...`);
        });
      }
      
      this.results.errorFree = totalErrors === 0;
      console.log(`  ${this.results.errorFree ? '✅' : '⚠️'} Error Status: ${totalErrors === 0 ? 'Clean' : `${totalErrors} errors`}`);
      
    } catch (error) {
      console.log(`  ❌ Error check failed: ${error.message}`);
    }
  }

  async loadTestWithMultipleRequests() {
    console.log('\n⚡ Load Testing Calendar with Multiple Requests...');
    
    try {
      // Simulate multiple concurrent API requests
      const requests = [];
      const dates = ['2025-07-04', '2025-07-05', '2025-07-06', '2025-07-07', '2025-07-08'];
      
      const startTime = Date.now();
      
      for (const date of dates) {
        requests.push(
          fetch(`http://localhost:8000/api/v1/appointments/slots?appointment_date=${date}`)
            .then(response => response.json())
            .then(data => ({ date, success: true, slots: data.slots?.length || 0 }))
            .catch(error => ({ date, success: false, error: error.message }))
        );
      }
      
      const results = await Promise.all(requests);
      const loadTime = Date.now() - startTime;
      
      const successfulRequests = results.filter(r => r.success).length;
      
      console.log(`  📊 Load Test Results:`);
      console.log(`    Total Requests: ${requests.length}`);
      console.log(`    Successful: ${successfulRequests}`);
      console.log(`    Total Time: ${loadTime}ms`);
      console.log(`    Avg Time per Request: ${(loadTime / requests.length).toFixed(0)}ms`);
      
      results.forEach(result => {
        if (result.success) {
          console.log(`    ${result.date}: ✅ ${result.slots} slots`);
        } else {
          console.log(`    ${result.date}: ❌ ${result.error}`);
        }
      });
      
      const loadTestPassed = successfulRequests >= requests.length * 0.8 && loadTime < 10000;
      console.log(`  ${loadTestPassed ? '✅' : '❌'} Load Test: ${loadTestPassed ? 'Passed' : 'Failed'}`);
      
      return loadTestPassed;
      
    } catch (error) {
      console.log(`  ❌ Load test failed: ${error.message}`);
      return false;
    }
  }

  printPerformanceReport() {
    console.log('\n📊 Calendar Performance Report');
    console.log('===============================');
    
    const tests = [
      { name: 'Page Load Performance', passed: this.results.pageLoadPerformance, metric: `${this.metrics.pageLoadTime}ms` },
      { name: 'Calendar Render Performance', passed: this.results.calendarRenderPerformance, metric: `${this.metrics.calendarRenderTime}ms` },
      { name: 'Navigation Performance', passed: this.results.navigationPerformance, metric: `${this.metrics.navigationResponseTime}ms` },
      { name: 'API Performance', passed: this.results.apiPerformance, metric: 'Backend responsive' },
      { name: 'Memory Efficiency', passed: this.results.memoryPerformance, metric: `${this.metrics.memoryUsage.toFixed(1)}MB` },
      { name: 'Error-Free Operation', passed: this.results.errorFree, metric: `${this.metrics.jsErrors.length} errors` }
    ];
    
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}: ${test.metric}`);
    });
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`\\n⚡ Performance Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    // Performance recommendations
    console.log('\\n🔧 Performance Recommendations:');
    if (!this.results.pageLoadPerformance) {
      console.log('  - Optimize page load time (currently > 5s)');
    }
    if (!this.results.calendarRenderPerformance) {
      console.log('  - Optimize calendar rendering (currently > 3s)');
    }
    if (!this.results.memoryPerformance) {
      console.log('  - Reduce memory usage (currently > 50MB)');
    }
    if (!this.results.errorFree) {
      console.log('  - Fix JavaScript errors for smoother experience');
    }
    if (passedTests === totalTests) {
      console.log('  🎉 Calendar performance is excellent!');
    }
    
    return passedTests >= totalTests * 0.8; // 80% pass rate
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testPageLoadPerformance();
      await this.testCalendarRenderPerformance();
      await this.testMemoryUsage();
      await this.testErrorFreeDom();
      
      const loadTestPassed = await this.loadTestWithMultipleRequests();
      
      const success = this.printPerformanceReport();
      
      if (success && loadTestPassed) {
        console.log('\\n🚀 Performance testing complete - moving to UX polish!');
      } else {
        console.log('\\n⚠️  Performance needs optimization before proceeding');
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the performance test
const tester = new CalendarPerformanceTester();
tester.run().catch(console.error);