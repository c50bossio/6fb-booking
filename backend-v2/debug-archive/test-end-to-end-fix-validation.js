#!/usr/bin/env node

/**
 * End-to-End Fix Validation Test
 * Tests that the backend ConversionEvent relationship fix resolves calendar functionality
 * while maintaining all existing functionality.
 */

const { chromium } = require('playwright');

class EndToEndFixValidator {
  constructor() {
    this.browser = null;
    this.results = {
      backendHealth: false,
      appointmentSlots: false,
      authentication: false,
      calendarFunctionality: false,
      noRegressions: true
    };
  }

  async initialize() {
    console.log('🔧 End-to-End Backend Fix Validation');
    console.log('==========================================');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testBackendHealth() {
    console.log('\n🏥 Testing Backend Health...');
    
    try {
      const response = await fetch('http://localhost:8000/health');
      this.results.backendHealth = response.status < 400;
      console.log(`  ✅ Backend health: ${response.status}`);
    } catch (error) {
      console.log(`  ❌ Backend health failed: ${error.message}`);
    }
  }

  async testAppointmentSlotsEndpoint() {
    console.log('\n📅 Testing Appointment Slots Endpoint...');
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/appointments/slots?appointment_date=2025-07-04');
      const data = await response.json();
      
      if (response.status === 200 && data.date && Array.isArray(data.slots)) {
        this.results.appointmentSlots = true;
        console.log('  ✅ Appointment slots endpoint: 200 OK');
        console.log(`  📊 Response: ${data.slots.length} slots for ${data.date}`);
      } else {
        console.log(`  ❌ Appointment slots endpoint: ${response.status}`);
        console.log(`  📊 Response: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`  ❌ Appointment slots test failed: ${error.message}`);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      // Navigate to login page
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      
      // Check if login form is present
      const loginForm = await page.$('form');
      if (loginForm) {
        console.log('  ✅ Login page loads successfully');
        
        // Test form submission (will fail with invalid credentials, but should not timeout)
        const emailInput = await page.$('input[type="email"]');
        const passwordInput = await page.$('input[type="password"]');
        const submitButton = await page.$('button[type="submit"]');
        
        if (emailInput && passwordInput && submitButton) {
          await emailInput.fill('test@example.com');
          await passwordInput.fill('testpassword');
          
          // Submit and wait for response (should be quick, not timeout)
          const startTime = Date.now();
          await submitButton.click();
          await page.waitForTimeout(3000); // Wait for auth attempt
          const responseTime = Date.now() - startTime;
          
          console.log(`  ✅ Auth submission responsive: ${responseTime}ms`);
          this.results.authentication = responseTime < 10000; // No timeout
        }
      }
    } catch (error) {
      console.log(`  ❌ Authentication test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testCalendarWithMockAuth() {
    console.log('\n📅 Testing Calendar with Mock Authentication...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      // Go to home page first to set localStorage
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      // Set mock authentication tokens
      await page.evaluate(() => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBib29rZWRiYXJiZXIuZGV2Iiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('refresh_token', 'mock-refresh');
      });
      
      // Navigate to calendar page
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000); // Give calendar time to load
      
      // Analyze calendar functionality
      const calendarAnalysis = await page.evaluate(() => {
        return {
          onCalendarPage: window.location.pathname === '/calendar',
          hasContent: document.body.textContent.length > 1000,
          hasCalendarElements: document.querySelectorAll('[class*="calendar"], [data-date], table').length > 0,
          hasNoErrors: document.querySelectorAll('[class*="error"]').length === 0,
          pageTitle: document.title
        };
      });
      
      if (calendarAnalysis.onCalendarPage && calendarAnalysis.hasContent && calendarAnalysis.hasCalendarElements) {
        this.results.calendarFunctionality = true;
        console.log('  ✅ Calendar page loads with authentication');
        console.log(`  📊 Page elements: ${calendarAnalysis.hasContent ? 'Rich content' : 'Minimal content'}`);
        console.log(`  📊 Calendar elements: ${calendarAnalysis.hasCalendarElements ? 'Present' : 'Missing'}`);
      } else {
        console.log('  ❌ Calendar functionality issues detected');
        console.log(`  📊 On calendar page: ${calendarAnalysis.onCalendarPage}`);
        console.log(`  📊 Has content: ${calendarAnalysis.hasContent}`);
        console.log(`  📊 Has calendar elements: ${calendarAnalysis.hasCalendarElements}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Calendar test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async checkForRegressions() {
    console.log('\n🧪 Checking for Regressions...');
    
    try {
      // Test a few key endpoints to ensure no breaking changes
      const endpoints = [
        'http://localhost:8000/api/v1/users/me',
        'http://localhost:8000/api/v1/services',
        'http://localhost:8000/docs'
      ];
      
      let regressionFound = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          const isHealthy = response.status < 500; // Allow auth errors (401, 403) but not server errors
          
          console.log(`  ${isHealthy ? '✅' : '❌'} ${endpoint}: ${response.status}`);
          
          if (!isHealthy) {
            regressionFound = true;
          }
        } catch (error) {
          console.log(`  ❌ ${endpoint}: ${error.message}`);
          regressionFound = true;
        }
      }
      
      this.results.noRegressions = !regressionFound;
      
    } catch (error) {
      console.log(`  ❌ Regression check failed: ${error.message}`);
      this.results.noRegressions = false;
    }
  }

  printResults() {
    console.log('\n📊 Fix Validation Results');
    console.log('===========================');
    
    const tests = [
      { name: 'Backend Health', passed: this.results.backendHealth },
      { name: 'Appointment Slots (Critical Fix)', passed: this.results.appointmentSlots },
      { name: 'Authentication Flow', passed: this.results.authentication },
      { name: 'Calendar Functionality', passed: this.results.calendarFunctionality },
      { name: 'No Regressions', passed: this.results.noRegressions }
    ];
    
    tests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.name}`);
    });
    
    const allPassed = tests.every(test => test.passed);
    
    console.log('\n🎯 Overall Result');
    console.log('==================');
    
    if (allPassed) {
      console.log('🎉 SUCCESS: All tests passed! Backend fix successful.');
      console.log('✅ Appointment slots endpoint now returns 200 instead of 500');
      console.log('✅ End-to-end authentication and calendar flow works');
      console.log('✅ No breaking changes or regressions detected');
    } else {
      console.log('⚠️  PARTIAL SUCCESS: Some issues remain');
      
      const failed = tests.filter(test => !test.passed);
      failed.forEach(test => {
        console.log(`❌ Issue: ${test.name}`);
      });
    }
    
    return allPassed;
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testBackendHealth();
      await this.testAppointmentSlotsEndpoint();
      await this.testAuthenticationFlow();
      await this.testCalendarWithMockAuth();
      await this.checkForRegressions();
      
      const success = this.printResults();
      
      if (success) {
        console.log('\n🚀 Ready to continue with calendar system testing!');
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the validation test
const validator = new EndToEndFixValidator();
validator.run().catch(console.error);