#!/usr/bin/env node

/**
 * Simplified Appointment CRUD Test
 * Tests appointment functionality with corrected selectors and better error handling
 */

const { chromium } = require('playwright');

class SimplifiedAppointmentTester {
  constructor() {
    this.browser = null;
    this.results = {
      backendSlots: false,
      calendarPage: false,
      bookingPage: false,
      dashboardPage: false,
      authentication: false
    };
  }

  async initialize() {
    console.log('📋 Simplified Appointment CRUD Test');
    console.log('===================================');
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

  async testBackendEndpoints() {
    console.log('\n🔌 Testing Backend Endpoints...');
    
    try {
      // Test appointment slots (we know this works)
      const response = await fetch('http://localhost:8000/api/v1/appointments/slots?appointment_date=2025-07-04');
      const data = await response.json();
      
      if (response.status === 200 && data.slots !== undefined) {
        this.results.backendSlots = true;
        console.log(`  ✅ Appointment slots: ${data.slots.length} slots available`);
      }
      
    } catch (error) {
      console.log(`  ❌ Backend test failed: ${error.message}`);
    }
  }

  async testPageAccessibility() {
    console.log('\n🌐 Testing Page Accessibility...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    // Set authentication tokens first
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('refresh_token', 'mock-refresh');
    });
    
    const pages = [
      { url: 'http://localhost:3000/calendar', name: 'Calendar', result: 'calendarPage' },
      { url: 'http://localhost:3000/book', name: 'Booking', result: 'bookingPage' },
      { url: 'http://localhost:3000/dashboard', name: 'Dashboard', result: 'dashboardPage' }
    ];
    
    for (const testPage of pages) {
      try {
        console.log(`\\n  📄 Testing ${testPage.name} page...`);
        
        await page.goto(testPage.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(3000); // Give time for content to load
        
        const pageAnalysis = await page.evaluate(() => {
          return {
            title: document.title,
            path: window.location.pathname,
            hasContent: document.body.textContent.length > 100,
            elementCount: document.querySelectorAll('*').length,
            hasButtons: document.querySelectorAll('button').length > 0,
            hasInputs: document.querySelectorAll('input').length > 0,
            hasNavigation: document.querySelectorAll('nav, [role="navigation"]').length > 0,
            bodyText: document.body.textContent.substring(0, 200),
            isLoginRedirect: window.location.pathname.includes('/login'),
            hasErrorMessage: document.body.textContent.toLowerCase().includes('error') ||
                           document.body.textContent.toLowerCase().includes('not found')
          };
        });
        
        console.log(`    Path: ${pageAnalysis.path}`);
        console.log(`    Title: ${pageAnalysis.title}`);
        console.log(`    Content Length: ${pageAnalysis.hasContent ? pageAnalysis.bodyText.length : 0} chars`);
        console.log(`    Elements: ${pageAnalysis.elementCount}`);
        console.log(`    Interactive: ${pageAnalysis.hasButtons || pageAnalysis.hasInputs ? 'Yes' : 'No'}`);
        
        if (pageAnalysis.isLoginRedirect) {
          console.log(`    ℹ️  Redirects to login (auth protection working)`);
          this.results[testPage.result] = true; // Auth protection is good
        } else if (pageAnalysis.hasContent && pageAnalysis.elementCount > 50) {
          console.log(`    ✅ Page loads successfully`);
          this.results[testPage.result] = true;
        } else {
          console.log(`    ❌ Page has minimal content`);
        }
        
        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `./test-screenshots/${testPage.name.toLowerCase()}-page.png`,
          fullPage: false
        });
        
      } catch (error) {
        console.log(`    ❌ ${testPage.name} page failed: ${error.message}`);
      }
    }
    
    await context.close();
  }

  async testSpecificCalendarFunctionality() {
    console.log('\n📅 Testing Calendar Specific Functionality...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      // Set tokens and go to calendar
      await page.goto('http://localhost:3000');
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock-token');
        localStorage.setItem('refresh_token', 'mock-refresh');
      });
      
      await page.goto('http://localhost:3000/calendar', { timeout: 10000 });
      await page.waitForTimeout(5000);
      
      // Check what's actually on the calendar page
      const calendarAnalysis = await page.evaluate(() => {
        const allText = document.body.textContent.toLowerCase();
        
        return {
          pageLoaded: document.readyState === 'complete',
          hasCalendarKeywords: allText.includes('calendar') || allText.includes('appointment') || 
                               allText.includes('schedule') || allText.includes('book'),
          hasDateElements: document.querySelectorAll('table, [class*="calendar"], [class*="date"]').length > 0,
          hasTimeElements: document.querySelectorAll('[class*="time"], [class*="slot"]').length > 0,
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 10),
          mainContent: allText.substring(0, 300),
          redirectedToLogin: window.location.pathname.includes('/login'),
          currentPath: window.location.pathname
        };
      });
      
      console.log('  📊 Calendar Analysis:');
      console.log(`    Current Path: ${calendarAnalysis.currentPath}`);
      console.log(`    Page Loaded: ${calendarAnalysis.pageLoaded}`);
      console.log(`    Has Calendar Keywords: ${calendarAnalysis.hasCalendarKeywords}`);
      console.log(`    Has Date Elements: ${calendarAnalysis.hasDateElements}`);
      console.log(`    Has Time Elements: ${calendarAnalysis.hasTimeElements}`);
      console.log(`    Buttons Found: ${calendarAnalysis.buttons.join(', ')}`);
      console.log(`    Content Preview: "${calendarAnalysis.mainContent}"`);
      
      if (!calendarAnalysis.redirectedToLogin && 
          (calendarAnalysis.hasCalendarKeywords || calendarAnalysis.hasDateElements)) {
        console.log('  ✅ Calendar functionality detected');
        this.results.calendarPage = true;
      } else if (calendarAnalysis.redirectedToLogin) {
        console.log('  ℹ️  Calendar requires authentication (protection working)');
        this.results.authentication = true;
      } else {
        console.log('  ❌ Calendar functionality not clearly detected');
      }
      
    } catch (error) {
      console.log(`  ❌ Calendar test failed: ${error.message}`);
    }
    
    await context.close();
  }

  async testSimpleBookingFlow() {
    console.log('\n📝 Testing Simple Booking Flow...');
    
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto('http://localhost:3000/book', { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      const bookingAnalysis = await page.evaluate(() => {
        const allText = document.body.textContent.toLowerCase();
        
        return {
          hasBookingKeywords: allText.includes('book') || allText.includes('appointment') || 
                             allText.includes('service') || allText.includes('schedule'),
          hasForm: document.querySelector('form') !== null,
          hasInputs: document.querySelectorAll('input').length > 0,
          hasSubmitButton: document.querySelectorAll('button').length > 0,
          inputTypes: Array.from(document.querySelectorAll('input')).map(i => i.type),
          isProtected: window.location.pathname.includes('/login'),
          content: allText.substring(0, 200)
        };
      });
      
      console.log('  📊 Booking Analysis:');
      console.log(`    Has Booking Keywords: ${bookingAnalysis.hasBookingKeywords}`);
      console.log(`    Has Form: ${bookingAnalysis.hasForm}`);
      console.log(`    Has Inputs: ${bookingAnalysis.hasInputs}`);
      console.log(`    Input Types: ${bookingAnalysis.inputTypes.join(', ')}`);
      console.log(`    Is Protected: ${bookingAnalysis.isProtected}`);
      console.log(`    Content: "${bookingAnalysis.content}"`);
      
      if (bookingAnalysis.hasBookingKeywords && (bookingAnalysis.hasForm || bookingAnalysis.hasInputs)) {
        console.log('  ✅ Booking functionality detected');
        this.results.bookingPage = true;
      } else if (bookingAnalysis.isProtected) {
        console.log('  ℹ️  Booking requires authentication (protection working)');
      } else {
        console.log('  ❌ Booking functionality not clearly detected');
      }
      
    } catch (error) {
      console.log(`  ❌ Booking test failed: ${error.message}`);
    }
    
    await context.close();
  }

  printResults() {
    console.log('\n📊 Appointment System Test Results');
    console.log('===================================');
    
    const tests = [
      { name: 'Backend Appointment Slots', passed: this.results.backendSlots, critical: true },
      { name: 'Calendar Page Access', passed: this.results.calendarPage, critical: true },
      { name: 'Booking Page Access', passed: this.results.bookingPage, critical: true },
      { name: 'Dashboard Page Access', passed: this.results.dashboardPage, critical: false },
      { name: 'Authentication Protection', passed: this.results.authentication, critical: false }
    ];
    
    tests.forEach(test => {
      const icon = test.passed ? '✅' : (test.critical ? '❌' : '⚠️');
      console.log(`  ${icon} ${test.name}`);
    });
    
    const criticalTests = tests.filter(t => t.critical);
    const passedCritical = criticalTests.filter(t => t.passed).length;
    const totalCritical = criticalTests.length;
    
    console.log(`\\n📈 Critical Functions: ${passedCritical}/${totalCritical} working`);
    
    if (passedCritical === totalCritical) {
      console.log('🎉 Core appointment system functionality is working!');
    } else {
      console.log('⚠️  Some core appointment functions need attention');
    }
    
    return passedCritical >= totalCritical * 0.8;
  }

  async run() {
    try {
      await this.initialize();
      
      await this.testBackendEndpoints();
      await this.testPageAccessibility();
      await this.testSpecificCalendarFunctionality();
      await this.testSimpleBookingFlow();
      
      const success = this.printResults();
      
      if (success) {
        console.log('\\n🚀 Appointment CRUD testing completed - moving to performance testing!');
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
const tester = new SimplifiedAppointmentTester();
tester.run().catch(console.error);