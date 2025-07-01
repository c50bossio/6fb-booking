#!/usr/bin/env node

/**
 * Comprehensive End-to-End Booking Flow Test
 * Tests the complete booking process from frontend to backend
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';
const TEST_EMAIL = 'test-guest@example.com';
const TEST_TIMEOUT = 30000; // 30 seconds

class BookingFlowTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      backendTests: {},
      frontendTests: {},
      endToEndTests: {},
      errors: [],
      warnings: []
    };
  }

  async setUp() {
    console.log('🚀 Setting up test environment...');
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      
      // Listen for console errors and warnings
      this.page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
          this.results.errors.push(`Frontend Console Error: ${text}`);
        } else if (msg.type() === 'warning') {
          this.results.warnings.push(`Frontend Console Warning: ${text}`);
        }
      });
      
      // Listen for page errors
      this.page.on('pageerror', error => {
        this.results.errors.push(`Frontend Page Error: ${error.message}`);
      });
      
      // Listen for failed requests
      this.page.on('requestfailed', request => {
        this.results.errors.push(`Failed Request: ${request.method()} ${request.url()} - ${request.failure().errorText}`);
      });
      
      console.log('✅ Test environment set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up test environment:', error);
      throw error;
    }
  }

  async tearDown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testBackendAPIs() {
    console.log('\n🔧 Testing Backend APIs...');
    
    try {
      // Test health endpoint
      const healthResponse = await fetch(`${BACKEND_URL}/health`);
      this.results.backendTests.health = healthResponse.ok;
      console.log(`  Health endpoint: ${healthResponse.ok ? '✅' : '❌'}`);
      
      // Test appointments slots endpoint
      const today = new Date().toISOString().split('T')[0];
      const slotsResponse = await fetch(`${BACKEND_URL}/api/v1/appointments/slots?appointment_date=${today}`);
      this.results.backendTests.slots = slotsResponse.ok;
      console.log(`  Slots endpoint: ${slotsResponse.ok ? '✅' : '❌'}`);
      
      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        this.results.backendTests.slotsStructure = {
          hasDate: !!slotsData.date,
          hasSlots: Array.isArray(slotsData.slots),
          hasBusinessHours: !!slotsData.business_hours,
          slotsCount: slotsData.slots?.length || 0
        };
        console.log(`    Slots structure: ${JSON.stringify(this.results.backendTests.slotsStructure)}`);
      }
      
      // Test next available slot endpoint
      const nextAvailableResponse = await fetch(`${BACKEND_URL}/api/v1/appointments/slots/next-available`);
      this.results.backendTests.nextAvailable = nextAvailableResponse.ok;
      console.log(`  Next available endpoint: ${nextAvailableResponse.ok ? '✅' : '❌'}`);
      
      // Test appointment creation endpoint (guest booking)
      const guestBookingData = {
        date: today,
        time: "14:00",
        service: "Haircut",
        guest_info: {
          first_name: "Test",
          last_name: "User",
          email: TEST_EMAIL,
          phone: "(555) 123-4567"
        }
      };
      
      const createResponse = await fetch(`${BACKEND_URL}/api/v1/appointments/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(guestBookingData)
      });
      
      this.results.backendTests.guestBooking = createResponse.ok;
      console.log(`  Guest booking endpoint: ${createResponse.ok ? '✅' : '❌'}`);
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        this.results.errors.push(`Guest booking API error: ${createResponse.status} - ${errorText}`);
      }
      
    } catch (error) {
      console.error('❌ Backend API test failed:', error);
      this.results.errors.push(`Backend API test error: ${error.message}`);
    }
  }

  async testFrontendBookingPage() {
    console.log('\n🌐 Testing Frontend Booking Page...');
    
    try {
      // Navigate to booking page
      await this.page.goto(`${FRONTEND_URL}/book`, { waitUntil: 'networkidle0', timeout: TEST_TIMEOUT });
      this.results.frontendTests.pageLoad = true;
      console.log('  ✅ Booking page loaded successfully');
      
      // Check if services are displayed
      const servicesVisible = await this.page.$$eval('[data-testid="service-card"], .cursor-pointer', 
        elements => elements.length > 0
      ).catch(() => false);
      
      this.results.frontendTests.servicesDisplayed = servicesVisible;
      console.log(`  Services displayed: ${servicesVisible ? '✅' : '❌'}`);
      
      // Test service selection
      const serviceButtons = await this.page.$$('.cursor-pointer');
      if (serviceButtons.length > 0) {
        await serviceButtons[0].click();
        await this.page.waitForTimeout(1000);
        
        const dateTimeStepVisible = await this.page.$('h1').then(h1 => 
          h1 ? h1.evaluate(el => el.textContent.includes('Date & Time')) : false
        ).catch(() => false);
        
        this.results.frontendTests.serviceSelection = dateTimeStepVisible;
        console.log(`  Service selection: ${dateTimeStepVisible ? '✅' : '❌'}`);
        
        // Check if calendar is displayed
        const calendarVisible = await this.page.$('[data-testid="calendar"], .calendar').then(el => !!el).catch(() => false);
        this.results.frontendTests.calendarDisplayed = calendarVisible;
        console.log(`  Calendar displayed: ${calendarVisible ? '✅' : '❌'}`);
        
        // Check if time slots are loaded
        await this.page.waitForTimeout(2000); // Wait for API call
        const timeSlotsVisible = await this.page.$$eval('[data-testid="time-slot"], .time-slot', 
          elements => elements.length > 0
        ).catch(() => false);
        
        this.results.frontendTests.timeSlotsLoaded = timeSlotsVisible;
        console.log(`  Time slots loaded: ${timeSlotsVisible ? '✅' : '❌'}`);
      } else {
        this.results.frontendTests.serviceSelection = false;
        this.results.frontendTests.calendarDisplayed = false;
        this.results.frontendTests.timeSlotsLoaded = false;
        console.log('  ❌ No service buttons found');
      }
      
    } catch (error) {
      console.error('❌ Frontend test failed:', error);
      this.results.errors.push(`Frontend test error: ${error.message}`);
      this.results.frontendTests.pageLoad = false;
    }
  }

  async testEndToEndBookingFlow() {
    console.log('\n🔄 Testing End-to-End Booking Flow...');
    
    try {
      // Navigate to booking page
      await this.page.goto(`${FRONTEND_URL}/book`, { waitUntil: 'networkidle0', timeout: TEST_TIMEOUT });
      
      // Step 1: Select a service
      console.log('  Step 1: Selecting service...');
      const serviceButtons = await this.page.$$('.cursor-pointer');
      if (serviceButtons.length > 0) {
        await serviceButtons[0].click(); // Select first service (Haircut)
        await this.page.waitForTimeout(1000);
        this.results.endToEndTests.serviceSelected = true;
        console.log('  ✅ Service selected');
      } else {
        throw new Error('No service buttons found');
      }
      
      // Step 2: Select a date (today if available)
      console.log('  Step 2: Selecting date...');
      const today = new Date();
      const todayButton = await this.page.$(`[data-date="${today.toISOString().split('T')[0]}"]`);
      if (todayButton) {
        await todayButton.click();
        await this.page.waitForTimeout(2000); // Wait for time slots to load
        this.results.endToEndTests.dateSelected = true;
        console.log('  ✅ Date selected');
      } else {
        // Try to click any available date
        const availableDates = await this.page.$$('.available-date, [data-available="true"]');
        if (availableDates.length > 0) {
          await availableDates[0].click();
          await this.page.waitForTimeout(2000);
          this.results.endToEndTests.dateSelected = true;
          console.log('  ✅ Date selected (fallback)');
        } else {
          throw new Error('No available dates found');
        }
      }
      
      // Step 3: Select a time slot
      console.log('  Step 3: Selecting time slot...');
      const timeSlots = await this.page.$$('.time-slot:not(.disabled), [data-available="true"]');
      if (timeSlots.length > 0) {
        await timeSlots[0].click();
        await this.page.waitForTimeout(1000);
        this.results.endToEndTests.timeSelected = true;
        console.log('  ✅ Time slot selected');
        
        // Check if we moved to guest info step
        const guestInfoVisible = await this.page.$('h1').then(h1 => 
          h1 ? h1.evaluate(el => el.textContent.includes('Information')) : false
        ).catch(() => false);
        
        if (guestInfoVisible) {
          // Step 4: Fill guest information
          console.log('  Step 4: Filling guest information...');
          await this.page.type('#firstName', 'Test');
          await this.page.type('#lastName', 'User');
          await this.page.type('#email', TEST_EMAIL);
          await this.page.type('#phone', '(555) 123-4567');
          
          const continueButton = await this.page.$('button[type="submit"], button:contains("Continue")');
          if (continueButton) {
            await continueButton.click();
            await this.page.waitForTimeout(2000);
            this.results.endToEndTests.guestInfoCompleted = true;
            console.log('  ✅ Guest information completed');
          }
        }
        
      } else {
        throw new Error('No available time slots found');
      }
      
      // Check if we reached confirmation/payment step
      const paymentStepVisible = await this.page.$('h1').then(h1 => 
        h1 ? h1.evaluate(el => el.textContent.includes('Payment') || el.textContent.includes('Confirm')) : false
      ).catch(() => false);
      
      this.results.endToEndTests.reachedPaymentStep = paymentStepVisible;
      console.log(`  Payment/Confirmation step reached: ${paymentStepVisible ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error('❌ End-to-end test failed:', error);
      this.results.errors.push(`End-to-end test error: ${error.message}`);
    }
  }

  async checkForAPIEndpointMismatches() {
    console.log('\n🔍 Checking for API endpoint mismatches...');
    
    try {
      // Get frontend API calls
      const apiCalls = [];
      this.page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method()
          });
        }
      });
      
      // Navigate and trigger API calls
      await this.page.goto(`${FRONTEND_URL}/book`, { waitUntil: 'networkidle0' });
      
      // Check for common mismatches
      const expectedEndpoints = [
        '/api/v1/appointments/slots',
        '/api/v1/appointments/slots/next-available'
      ];
      
      this.results.backendTests.endpointMatches = {};
      
      for (const endpoint of expectedEndpoints) {
        const response = await fetch(`${BACKEND_URL}${endpoint}?appointment_date=${new Date().toISOString().split('T')[0]}`);
        this.results.backendTests.endpointMatches[endpoint] = response.ok;
        console.log(`  ${endpoint}: ${response.ok ? '✅' : '❌'}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          this.results.errors.push(`Endpoint ${endpoint} failed: ${response.status} - ${errorText}`);
        }
      }
      
    } catch (error) {
      console.error('❌ API endpoint check failed:', error);
      this.results.errors.push(`API endpoint check error: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    // Backend tests
    console.log('\n🔧 Backend API Tests:');
    Object.entries(this.results.backendTests).forEach(([test, result]) => {
      console.log(`  ${test}: ${typeof result === 'object' ? JSON.stringify(result) : (result ? '✅' : '❌')}`);
    });
    
    // Frontend tests
    console.log('\n🌐 Frontend Tests:');
    Object.entries(this.results.frontendTests).forEach(([test, result]) => {
      console.log(`  ${test}: ${result ? '✅' : '❌'}`);
    });
    
    // End-to-end tests
    console.log('\n🔄 End-to-End Tests:');
    Object.entries(this.results.endToEndTests).forEach(([test, result]) => {
      console.log(`  ${test}: ${result ? '✅' : '❌'}`);
    });
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors Found:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Warnings
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    // Overall status
    const totalTests = Object.keys(this.results.backendTests).length + 
                      Object.keys(this.results.frontendTests).length + 
                      Object.keys(this.results.endToEndTests).length;
    const passedTests = Object.values(this.results.backendTests).filter(Boolean).length +
                       Object.values(this.results.frontendTests).filter(Boolean).length +
                       Object.values(this.results.endToEndTests).filter(Boolean).length;
    
    console.log('\n🎯 Overall Status:');
    console.log(`  Tests passed: ${passedTests}/${totalTests}`);
    console.log(`  Errors: ${this.results.errors.length}`);
    console.log(`  Warnings: ${this.results.warnings.length}`);
    
    const success = this.results.errors.length === 0 && passedTests >= totalTests * 0.8;
    console.log(`  Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      success,
      results: this.results,
      summary: {
        totalTests,
        passedTests,
        errorCount: this.results.errors.length,
        warningCount: this.results.warnings.length
      }
    };
  }

  async runAllTests() {
    try {
      await this.setUp();
      await this.testBackendAPIs();
      await this.checkForAPIEndpointMismatches();
      await this.testFrontendBookingPage();
      await this.testEndToEndBookingFlow();
      
      return this.generateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.errors.push(`Test suite error: ${error.message}`);
      return this.generateReport();
    } finally {
      await this.tearDown();
    }
  }
}

// Run the tests
async function main() {
  console.log('🧪 Starting Comprehensive Booking Flow Test');
  console.log('============================================');
  
  const tester = new BookingFlowTester();
  const report = await tester.runAllTests();
  
  console.log('\n🏁 Test suite completed!');
  
  // Exit with appropriate code
  process.exit(report.success ? 0 : 1);
}

// Check if running directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BookingFlowTester;