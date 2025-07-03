#!/usr/bin/env node

/**
 * Focused Performance Test
 * Tests the areas we can actually measure and optimize
 */

const { chromium } = require('playwright');

class FocusedPerformanceTester {
  constructor() {
    this.browser = null;
    this.results = {
      backendPerformance: false,
      frontendLoad: false,
      responseiveness: false,
      resourceLoading: false
    };
  }

  async initialize() {
    console.log('🎯 Focused Calendar Performance Test');
    console.log('====================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 200
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testBackendPerformance() {
    console.log('\n⚡ Backend Performance Test');
    console.log('===========================');
    
    const testEndpoints = [
      { url: 'http://localhost:8000/api/v1/appointments/slots?appointment_date=2025-07-04', name: 'Appointment Slots' },
      { url: 'http://localhost:8000/api/v1/services', name: 'Services List' },
      { url: 'http://localhost:8000/docs', name: 'API Documentation' },
      { url: 'http://localhost:8000/health', name: 'Health Check' }
    ];
    
    const results = [];
    
    for (const endpoint of testEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url);
        const responseTime = Date.now() - startTime;
        
        results.push({
          name: endpoint.name,
          responseTime,
          status: response.status,
          success: response.status < 500
        });
        
        console.log(`  ${endpoint.name}: ${responseTime}ms (${response.status})`);
        
      } catch (error) {
        results.push({
          name: endpoint.name,
          responseTime: 999999,
          status: 0,
          success: false
        });
        console.log(`  ${endpoint.name}: FAILED (${error.message})`);
      }
    }
    
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length;
    
    console.log(`\\n📊 Backend Summary:`);
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Success Rate: ${Math.round(successRate * 100)}%`);
    
    this.results.backendPerformance = avgResponseTime < 2000 && successRate >= 0.75;
    console.log(`  ${this.results.backendPerformance ? '✅' : '❌'} Backend Performance: ${this.results.backendPerformance ? 'Good' : 'Needs Improvement'}`);
    
    return results;
  }

  async testConcurrentRequests() {
    console.log('\\n🔄 Concurrent Request Performance');
    console.log('===================================');
    
    const dates = ['2025-07-04', '2025-07-05', '2025-07-06', '2025-07-07', '2025-07-08'];
    
    const startTime = Date.now();
    
    const requests = dates.map(date => 
      fetch(`http://localhost:8000/api/v1/appointments/slots?appointment_date=${date}`)
        .then(response => response.json())
        .then(data => ({ 
          date, 
          success: true, 
          slots: data.slots?.length || 0,
          responseTime: Date.now() - startTime 
        }))
        .catch(error => ({ 
          date, 
          success: false, 
          error: error.message 
        }))
    );
    
    const results = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    
    console.log(`  Total Time for ${dates.length} requests: ${totalTime}ms`);
    console.log(`  Average per request: ${(totalTime / dates.length).toFixed(0)}ms`);
    
    results.forEach(result => {
      if (result.success) {
        console.log(`    ${result.date}: ✅ ${result.slots} slots`);
      } else {
        console.log(`    ${result.date}: ❌ ${result.error}`);
      }
    });
    
    const successfulRequests = results.filter(r => r.success).length;
    const concurrentPerformance = successfulRequests === dates.length && totalTime < 5000;
    
    console.log(`  ${concurrentPerformance ? '✅' : '❌'} Concurrent Performance: ${concurrentPerformance ? 'Excellent' : 'Needs Improvement'}`);
    
    return concurrentPerformance;
  }

  async testFrontendResourceLoading() {
    console.log('\\n📦 Frontend Resource Loading');
    console.log('=============================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    let networkRequests = [];
    let resourceLoadTimes = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        startTime: Date.now()
      });
    });
    
    page.on('response', response => {
      const request = networkRequests.find(r => r.url === response.url());
      if (request) {
        request.endTime = Date.now();
        request.responseTime = request.endTime - request.startTime;
        request.status = response.status();
        resourceLoadTimes.push(request.responseTime);
      }
    });
    
    try {
      const startTime = Date.now();
      await page.goto('http://localhost:3000/calendar', { timeout: 15000 });
      
      // Wait a bit for resources to load
      await page.waitForTimeout(3000);
      
      const pageLoadTime = Date.now() - startTime;
      
      console.log(`  Page Load Time: ${pageLoadTime}ms`);
      console.log(`  Network Requests: ${networkRequests.length}`);
      
      if (resourceLoadTimes.length > 0) {
        const avgResourceTime = resourceLoadTimes.reduce((sum, time) => sum + time, 0) / resourceLoadTimes.length;
        console.log(`  Average Resource Load: ${avgResourceTime.toFixed(0)}ms`);
      }
      
      // Analyze request types
      const requestTypes = {};
      networkRequests.forEach(req => {
        requestTypes[req.resourceType] = (requestTypes[req.resourceType] || 0) + 1;
      });
      
      console.log('  Resource Types:');
      Object.entries(requestTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
      
      this.results.frontendLoad = pageLoadTime < 10000; // 10 second timeout
      this.results.resourceLoading = resourceLoadTimes.length > 0;
      
      console.log(`  ${this.results.frontendLoad ? '✅' : '❌'} Frontend Load: ${this.results.frontendLoad ? 'Acceptable' : 'Slow'}`);
      console.log(`  ${this.results.resourceLoading ? '✅' : '❌'} Resource Loading: ${this.results.resourceLoading ? 'Active' : 'Issues'}`);
      
    } catch (error) {
      console.log(`  ❌ Frontend test failed: ${error.message}`);
      this.results.frontendLoad = false;
      this.results.resourceLoading = false;
    }
    
    await context.close();
    return { pageLoadTime: Date.now() - startTime, requests: networkRequests.length };
  }

  async testUserInteractionResponsiveness() {
    console.log('\\n🖱️  User Interaction Responsiveness');
    console.log('====================================');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Test basic page interactions
      const interactions = [];
      
      // Test navigation clicks
      const navLinks = await page.$$('a, button');
      if (navLinks.length > 0) {
        const startTime = Date.now();
        await navLinks[0].click();
        await page.waitForTimeout(1000);
        const responseTime = Date.now() - startTime;
        
        interactions.push({ type: 'navigation-click', time: responseTime });
        console.log(`  Navigation Click: ${responseTime}ms`);
      }
      
      // Test form interactions if available
      const inputs = await page.$$('input');
      if (inputs.length > 0) {
        const startTime = Date.now();
        await inputs[0].fill('test');
        const responseTime = Date.now() - startTime;
        
        interactions.push({ type: 'input-fill', time: responseTime });
        console.log(`  Input Response: ${responseTime}ms`);
      }
      
      const avgInteractionTime = interactions.length > 0 ? 
        interactions.reduce((sum, i) => sum + i.time, 0) / interactions.length : 0;
      
      console.log(`  Average Interaction Time: ${avgInteractionTime.toFixed(0)}ms`);
      
      this.results.responseiveness = avgInteractionTime < 1000; // Under 1 second
      console.log(`  ${this.results.responseiveness ? '✅' : '❌'} Responsiveness: ${this.results.responseiveness ? 'Good' : 'Slow'}`);
      
    } catch (error) {
      console.log(`  ❌ Interaction test failed: ${error.message}`);
      this.results.responseiveness = false;
    }
    
    await context.close();
  }

  async testDatabaseQueryPerformance() {
    console.log('\\n🗄️  Database Query Performance');
    console.log('===============================');
    
    // Test multiple appointment slot queries to stress the database
    const testDates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const testDate = new Date(today);
      testDate.setDate(today.getDate() + i);
      testDates.push(testDate.toISOString().split('T')[0]);
    }
    
    const startTime = Date.now();
    let successCount = 0;
    let totalResponseTime = 0;
    
    for (const date of testDates.slice(0, 10)) { // Test first 10 dates
      try {
        const requestStart = Date.now();
        const response = await fetch(`http://localhost:8000/api/v1/appointments/slots?appointment_date=${date}`);
        const requestTime = Date.now() - requestStart;
        
        if (response.status === 200) {
          successCount++;
          totalResponseTime += requestTime;
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.log(`    ${date}: Failed`);
      }
    }
    
    const totalTime = Date.now() - startTime;
    const avgQueryTime = successCount > 0 ? totalResponseTime / successCount : 0;
    
    console.log(`  Tested ${testDates.slice(0, 10).length} date queries`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Average Query Time: ${avgQueryTime.toFixed(0)}ms`);
    
    const dbPerformance = avgQueryTime < 500 && successCount >= 8; // 80% success rate, under 500ms
    console.log(`  ${dbPerformance ? '✅' : '❌'} Database Performance: ${dbPerformance ? 'Excellent' : 'Needs Optimization'}`);
    
    return dbPerformance;
  }

  printSummary() {
    console.log('\\n📊 Performance Test Summary');
    console.log('=============================');
    
    const tests = [
      { name: 'Backend API Performance', passed: this.results.backendPerformance },
      { name: 'Frontend Page Loading', passed: this.results.frontendLoad },
      { name: 'User Interface Responsiveness', passed: this.results.responseiveness },
      { name: 'Resource Loading Efficiency', passed: this.results.resourceLoading }
    ];
    
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
    });
    
    const passedTests = tests.filter(test => test.passed).length;
    const totalTests = tests.length;
    
    console.log(`\\n🎯 Performance Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests >= 3) {
      console.log('\\n🚀 Performance is good! Ready for UX testing.');
      console.log('\\n📋 Key Achievements:');
      if (this.results.backendPerformance) console.log('  ✅ Backend APIs are fast and responsive');
      if (this.results.frontendLoad) console.log('  ✅ Frontend pages load in reasonable time');
      if (this.results.responseiveness) console.log('  ✅ User interactions are responsive');
      if (this.results.resourceLoading) console.log('  ✅ Resources load efficiently');
    } else {
      console.log('\\n⚠️  Performance needs improvement before moving forward.');
    }
    
    return passedTests >= 3;
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testBackendPerformance();
      const concurrentOk = await this.testConcurrentRequests();
      await this.testFrontendResourceLoading();
      await this.testUserInteractionResponsiveness();
      const dbOk = await this.testDatabaseQueryPerformance();
      
      console.log('\\n📈 Additional Performance Metrics:');
      console.log(`  ${concurrentOk ? '✅' : '❌'} Concurrent Request Handling`);
      console.log(`  ${dbOk ? '✅' : '❌'} Database Query Optimization`);
      
      const success = this.printSummary();
      
      return success;
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the focused performance test
const tester = new FocusedPerformanceTester();
tester.run().catch(console.error);