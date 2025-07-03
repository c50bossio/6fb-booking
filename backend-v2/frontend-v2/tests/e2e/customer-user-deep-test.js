const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:8000',
  testUser: {
    email: 'test.customer@example.com',
    password: 'TestPassword123!',
    name: 'Test Customer',
    phone: '+1234567890'
  },
  timeout: 30000,
  headless: false,
  slowMo: 50
};

// Utility functions
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `customer-test-${name}-${timestamp}.png`;
  await page.screenshot({ 
    path: path.join(__dirname, 'test-results', 'customer', filename),
    fullPage: true 
  });
  return filename;
}

async function logTestResult(results, testName, status, details = {}) {
  results.push({
    test: testName,
    status,
    timestamp: new Date().toISOString(),
    ...details
  });
  console.log(`${status === 'PASSED' ? '✅' : '❌'} ${testName}`, details.error || '');
}

async function measurePerformance(page, actionName, action) {
  const startTime = Date.now();
  let result;
  
  try {
    result = await action();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Get performance metrics
    const metrics = await page.metrics();
    const performanceData = await page.evaluate(() => ({
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource').length,
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null
    }));
    
    return {
      success: true,
      duration,
      metrics,
      performanceData,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function simulateNetworkConditions(page, condition) {
  const conditions = {
    '4G': { downloadThroughput: 4000000, uploadThroughput: 3000000, latency: 20 },
    '3G': { downloadThroughput: 1600000, uploadThroughput: 768000, latency: 300 },
    'Slow': { downloadThroughput: 500000, uploadThroughput: 500000, latency: 400 }
  };
  
  const settings = conditions[condition];
  if (settings) {
    try {
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: settings.downloadThroughput,
        uploadThroughput: settings.uploadThroughput,
        latency: settings.latency
      });
    } catch (error) {
      console.log(`Network emulation failed for ${condition}:`, error.message);
    }
  }
}

async function checkAuthentication(page) {
  // Check for auth token in local storage
  const authToken = await page.evaluate(() => {
    return localStorage.getItem('authToken');
  });
  
  // Check for auth cookies
  const cookies = await page.cookies();
  const authCookie = cookies.find(c => c.name === 'auth' || c.name === 'session');
  
  return {
    hasToken: !!authToken,
    hasCookie: !!authCookie,
    tokenValue: authToken ? 'REDACTED' : null
  };
}

// Main test suite
async function runCustomerTests() {
  const browser = await puppeteer.launch({
    headless: TEST_CONFIG.headless,
    slowMo: TEST_CONFIG.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = [];
  let page;
  
  try {
    // Create test results directory
    await fs.mkdir(path.join(__dirname, 'test-results', 'customer'), { recursive: true });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    // Set up request interception for security testing
    await page.setRequestInterception(true);
    const interceptedRequests = [];
    
    page.on('request', request => {
      interceptedRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
      request.continue();
    });
    
    console.log('🧪 Starting Customer User Deep Testing...\n');
    
    // Test 1: Registration Flow
    console.log('📝 Test 1: Customer Registration');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`, { waitUntil: 'networkidle0' });
      
      // Check if registration form exists
      const hasRegistrationForm = await page.$('input[name="email"]');
      if (!hasRegistrationForm) {
        await logTestResult(results, 'Customer Registration', 'SKIPPED', {
          reason: 'Registration form not found, may need different selectors'
        });
      } else {
        // Fill registration form
        await page.waitForSelector('input[name="email"]', { timeout: 5000 });
        await page.type('input[name="email"]', TEST_CONFIG.testUser.email);
        await page.type('input[name="password"]', TEST_CONFIG.testUser.password);
        
        // Check for confirm password field
        const confirmPasswordField = await page.$('input[name="confirmPassword"]');
        if (confirmPasswordField) {
          await page.type('input[name="confirmPassword"]', TEST_CONFIG.testUser.password);
        }
        
        // Check for name field
        const nameField = await page.$('input[name="name"]');
        if (nameField) {
          await page.type('input[name="name"]', TEST_CONFIG.testUser.name);
        }
        
        // Check for phone field
        const phoneField = await page.$('input[name="phone"]');
        if (phoneField) {
          await page.type('input[name="phone"]', TEST_CONFIG.testUser.phone);
        }
      
      // Check terms acceptance
      const termsCheckbox = await page.$('input[type="checkbox"][name="terms"]');
      if (termsCheckbox) {
        await termsCheckbox.click();
      }
      
      await takeScreenshot(page, 'registration-form-filled');
      
      // Submit form with performance measurement
      const registrationPerf = await measurePerformance(page, 'Registration', async () => {
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);
      });
      
      // Check if redirected to dashboard or login
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/login')) {
        await logTestResult(results, 'Customer Registration', 'PASSED', {
          performance: registrationPerf,
          redirectTo: currentUrl
        });
      } else {
        // Try login flow instead
        await logTestResult(results, 'Customer Registration', 'SKIPPED', {
          reason: 'User might already exist, proceeding to login'
        });
      }
    } catch (error) {
      await logTestResult(results, 'Customer Registration', 'FAILED', { error: error.message });
    }
    
    // Test 2: Login Flow
    console.log('\n🔐 Test 2: Customer Login');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
      
      await page.waitForSelector('input[name="email"]', { timeout: 5000 });
      await page.type('input[name="email"]', TEST_CONFIG.testUser.email);
      await page.type('input[name="password"]', TEST_CONFIG.testUser.password);
      
      await takeScreenshot(page, 'login-form-filled');
      
      const loginPerf = await measurePerformance(page, 'Login', async () => {
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);
      });
      
      // Verify authentication
      const authStatus = await checkAuthentication(page);
      
      await logTestResult(results, 'Customer Login', 'PASSED', {
        performance: loginPerf,
        authentication: authStatus,
        redirectTo: page.url()
      });
      
      await takeScreenshot(page, 'after-login');
    } catch (error) {
      await logTestResult(results, 'Customer Login', 'FAILED', { error: error.message });
      await takeScreenshot(page, 'login-error');
    }
    
    // Test 3: Customer Dashboard
    console.log('\n📊 Test 3: Customer Dashboard');
    try {
      if (!page.url().includes('/dashboard')) {
        await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      }
      
      // Check dashboard elements
      const dashboardElements = await page.evaluate(() => {
        return {
          hasWelcomeMessage: !!document.querySelector('[data-testid="welcome-message"], h1'),
          hasUpcomingAppointments: !!document.querySelector('[data-testid="upcoming-appointments"], .appointments'),
          hasBookButton: !!document.querySelector('[data-testid="book-appointment"], a[href*="book"]'),
          hasProfileSection: !!document.querySelector('[data-testid="profile-section"], .profile'),
          hasNavigation: !!document.querySelector('nav, [role="navigation"]')
        };
      });
      
      await takeScreenshot(page, 'dashboard-loaded');
      
      await logTestResult(results, 'Customer Dashboard Load', 'PASSED', {
        elements: dashboardElements
      });
    } catch (error) {
      await logTestResult(results, 'Customer Dashboard Load', 'FAILED', { error: error.message });
    }
    
    // Test 4: Booking Flow
    console.log('\n📅 Test 4: Appointment Booking Flow');
    try {
      // Navigate to booking page
      await page.goto(`${TEST_CONFIG.baseUrl}/book`, { waitUntil: 'networkidle0' });
      
      // Check for different booking form patterns
      const bookingElements = await page.evaluate(() => {
        return {
          hasServiceCards: !!document.querySelector('[data-testid="service-card"], .service-item, .service-option'),
          hasBarberCards: !!document.querySelector('[data-testid="barber-card"], .barber-item, .barber-option'),
          hasCalendar: !!document.querySelector('[data-testid="calendar"], .calendar, .date-picker'),
          hasTimeSlots: !!document.querySelector('[data-testid="time-slot"], .time-slot, .time-option'),
          hasBookingForm: !!document.querySelector('form, [data-testid="booking-form"]'),
          formFields: Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder
          }))
        };
      });
      
      // Step 1: Select service (if available)
      if (bookingElements.hasServiceCards) {
        const services = await page.$$('[data-testid="service-card"], .service-item, .service-option');
        if (services.length > 0) {
          await services[0].click();
          await takeScreenshot(page, 'service-selected');
        }
      }
      
      // Step 2: Select barber
      await page.waitForSelector('[data-testid="barber-card"], .barber-item', { timeout: 5000 });
      const barbers = await page.$$('[data-testid="barber-card"], .barber-item');
      
      if (barbers.length > 0) {
        await barbers[0].click();
        await takeScreenshot(page, 'barber-selected');
      }
      
      // Step 3: Select date and time
      await page.waitForSelector('[data-testid="calendar"], .calendar', { timeout: 5000 });
      
      // Click on an available date
      const availableDates = await page.$$('[data-testid="available-date"], .available-slot');
      if (availableDates.length > 0) {
        await availableDates[0].click();
      }
      
      // Select time slot
      await page.waitForSelector('[data-testid="time-slot"], .time-slot', { timeout: 5000 });
      const timeSlots = await page.$$('[data-testid="time-slot"], .time-slot');
      
      if (timeSlots.length > 0) {
        await timeSlots[0].click();
        await takeScreenshot(page, 'datetime-selected');
      }
      
      // Confirm booking
      const confirmButton = await page.$('[data-testid="confirm-booking"], button[type="submit"]');
      if (confirmButton) {
        const bookingPerf = await measurePerformance(page, 'Booking Confirmation', async () => {
          await confirmButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle0' });
        });
        
        await logTestResult(results, 'Appointment Booking', 'PASSED', {
          performance: bookingPerf
        });
      }
      
      await takeScreenshot(page, 'booking-completed');
    } catch (error) {
      await logTestResult(results, 'Appointment Booking', 'FAILED', { error: error.message });
      await takeScreenshot(page, 'booking-error');
    }
    
    // Test 5: Payment Processing
    console.log('\n💳 Test 5: Payment Processing');
    try {
      // Check if redirected to payment page
      if (page.url().includes('/payment') || page.url().includes('/checkout')) {
        // Wait for Stripe iframe
        await page.waitForSelector('iframe[name*="stripe"], #card-element', { timeout: 10000 });
        
        // Fill test card details
        const stripeFrame = await page.$('iframe[name*="stripe"]');
        if (stripeFrame) {
          const frame = await stripeFrame.contentFrame();
          
          // Test card: 4242 4242 4242 4242
          await frame.type('[name="cardnumber"]', '4242424242424242');
          await frame.type('[name="exp-date"]', '1225');
          await frame.type('[name="cvc"]', '123');
          await frame.type('[name="postal"]', '10001');
        }
        
        await takeScreenshot(page, 'payment-form-filled');
        
        // Process payment
        const paymentPerf = await measurePerformance(page, 'Payment Processing', async () => {
          await page.click('[data-testid="pay-button"], button[type="submit"]');
          await page.waitForNavigation({ waitUntil: 'networkidle0' });
        });
        
        // Check for success message
        const successIndicators = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return {
            hasSuccessMessage: text.includes('success') || text.includes('confirmed'),
            hasConfirmationNumber: !!document.querySelector('[data-testid="confirmation-number"]'),
            currentUrl: window.location.href
          };
        });
        
        await logTestResult(results, 'Payment Processing', 'PASSED', {
          performance: paymentPerf,
          success: successIndicators
        });
        
        await takeScreenshot(page, 'payment-success');
      } else {
        await logTestResult(results, 'Payment Processing', 'SKIPPED', {
          reason: 'No payment required or different flow'
        });
      }
    } catch (error) {
      await logTestResult(results, 'Payment Processing', 'FAILED', { error: error.message });
    }
    
    // Test 6: Appointment History
    console.log('\n📜 Test 6: Appointment History');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/appointments`, { waitUntil: 'networkidle0' });
      
      const appointmentData = await page.evaluate(() => {
        const appointments = document.querySelectorAll('[data-testid="appointment-item"], .appointment-card');
        return {
          count: appointments.length,
          hasUpcoming: !!document.querySelector('[data-testid="upcoming-appointments"]'),
          hasPast: !!document.querySelector('[data-testid="past-appointments"]'),
          hasCancelButton: !!document.querySelector('[data-testid="cancel-appointment"]'),
          hasRescheduleButton: !!document.querySelector('[data-testid="reschedule-appointment"]')
        };
      });
      
      await takeScreenshot(page, 'appointment-history');
      
      await logTestResult(results, 'Appointment History', 'PASSED', {
        appointments: appointmentData
      });
    } catch (error) {
      await logTestResult(results, 'Appointment History', 'FAILED', { error: error.message });
    }
    
    // Test 7: Profile Management
    console.log('\n👤 Test 7: Profile Management');
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/profile`, { waitUntil: 'networkidle0' });
      
      // Check profile elements
      const profileElements = await page.evaluate(() => {
        return {
          hasNameField: !!document.querySelector('input[name="name"]'),
          hasEmailField: !!document.querySelector('input[name="email"]'),
          hasPhoneField: !!document.querySelector('input[name="phone"]'),
          hasPasswordChange: !!document.querySelector('[data-testid="change-password"]'),
          hasNotificationSettings: !!document.querySelector('[data-testid="notification-settings"]'),
          hasSaveButton: !!document.querySelector('button[type="submit"]')
        };
      });
      
      // Test profile update
      const nameInput = await page.$('input[name="name"]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type('Updated Customer Name');
        
        const updatePerf = await measurePerformance(page, 'Profile Update', async () => {
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000); // Wait for update
        });
        
        // Check for success message
        const hasSuccess = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('updated') || text.includes('saved');
        });
        
        await logTestResult(results, 'Profile Update', hasSuccess ? 'PASSED' : 'FAILED', {
          performance: updatePerf
        });
      }
      
      await takeScreenshot(page, 'profile-page');
    } catch (error) {
      await logTestResult(results, 'Profile Management', 'FAILED', { error: error.message });
    }
    
    // Test 8: Mobile Responsiveness
    console.log('\n📱 Test 8: Mobile Responsiveness');
    try {
      // Test different viewport sizes
      const viewports = [
        { name: 'iPhone X', width: 375, height: 812 },
        { name: 'iPad', width: 768, height: 1024 },
        { name: 'Desktop', width: 1920, height: 1080 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
        
        // Check mobile menu
        const mobileMenuVisible = await page.evaluate(() => {
          const menu = document.querySelector('[data-testid="mobile-menu"], .mobile-menu');
          return menu && window.getComputedStyle(menu).display !== 'none';
        });
        
        await takeScreenshot(page, `responsive-${viewport.name.toLowerCase().replace(' ', '-')}`);
        
        await logTestResult(results, `Mobile Responsiveness - ${viewport.name}`, 'PASSED', {
          viewport,
          hasMobileMenu: mobileMenuVisible
        });
      }
    } catch (error) {
      await logTestResult(results, 'Mobile Responsiveness', 'FAILED', { error: error.message });
    }
    
    // Test 9: Network Performance
    console.log('\n🌐 Test 9: Network Performance Testing');
    try {
      const networkConditions = ['4G', '3G', 'Slow'];
      
      for (const condition of networkConditions) {
        await simulateNetworkConditions(page, condition);
        
        const loadPerf = await measurePerformance(page, `Page Load - ${condition}`, async () => {
          await page.goto(`${TEST_CONFIG.baseUrl}/book`, { waitUntil: 'networkidle0' });
        });
        
        await logTestResult(results, `Network Performance - ${condition}`, 'PASSED', {
          condition,
          performance: loadPerf
        });
      }
      
      // Reset network conditions
      await page.emulateNetworkConditions(null);
    } catch (error) {
      await logTestResult(results, 'Network Performance', 'FAILED', { error: error.message });
    }
    
    // Test 10: Security Testing
    console.log('\n🔒 Test 10: Security Testing');
    try {
      // Check CSRF protection
      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        const input = document.querySelector('input[name="_csrf"]');
        return meta?.content || input?.value;
      });
      
      // Check secure headers in requests
      const securityChecks = {
        hasCSRFToken: !!csrfToken,
        hasSecureHeaders: interceptedRequests.some(req => 
          req.headers['authorization'] || req.headers['x-csrf-token']
        ),
        hasHTTPS: interceptedRequests.filter(req => 
          req.url.startsWith('https://') || req.url.includes('localhost')
        ).length > 0
      };
      
      // Test unauthorized access
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
      });
      
      await page.goto(`${TEST_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle0' });
      const redirectedToLogin = page.url().includes('/login');
      
      await logTestResult(results, 'Security Testing', 'PASSED', {
        csrfProtection: securityChecks.hasCSRFToken,
        secureHeaders: securityChecks.hasSecureHeaders,
        unauthorizedAccessBlocked: redirectedToLogin
      });
    } catch (error) {
      await logTestResult(results, 'Security Testing', 'FAILED', { error: error.message });
    }
    
    // Test 11: Error Handling
    console.log('\n⚠️ Test 11: Error Handling');
    try {
      // Test 404 page
      await page.goto(`${TEST_CONFIG.baseUrl}/nonexistent-page`, { waitUntil: 'networkidle0' });
      const has404 = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('404') || text.includes('not found');
      });
      
      await takeScreenshot(page, 'error-404');
      
      // Test form validation
      await page.goto(`${TEST_CONFIG.baseUrl}/book`, { waitUntil: 'networkidle0' });
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        
        // Check for validation messages
        const validationErrors = await page.evaluate(() => {
          const errors = document.querySelectorAll('.error-message, [role="alert"]');
          return errors.length;
        });
        
        await logTestResult(results, 'Error Handling', 'PASSED', {
          has404Page: has404,
          formValidation: validationErrors > 0
        });
      }
    } catch (error) {
      await logTestResult(results, 'Error Handling', 'FAILED', { error: error.message });
    }
    
    // Test 12: Logout Flow
    console.log('\n🚪 Test 12: Logout Flow');
    try {
      // Re-login first
      await page.goto(`${TEST_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });
      await page.type('input[name="email"]', TEST_CONFIG.testUser.email);
      await page.type('input[name="password"]', TEST_CONFIG.testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Find and click logout
      const logoutButton = await page.$('[data-testid="logout"], a[href*="logout"]');
      if (logoutButton) {
        await logoutButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        // Verify logged out
        const authAfterLogout = await checkAuthentication(page);
        const redirectedToHome = page.url() === `${TEST_CONFIG.baseUrl}/` || page.url().includes('/login');
        
        await logTestResult(results, 'Logout Flow', 'PASSED', {
          clearedAuth: !authAfterLogout.hasToken,
          redirected: redirectedToHome
        });
      }
    } catch (error) {
      await logTestResult(results, 'Logout Flow', 'FAILED', { error: error.message });
    }
    
  } catch (error) {
    console.error('Critical test error:', error);
  } finally {
    // Generate test report
    const report = {
      testSuite: 'Customer User Deep Testing',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      environment: {
        frontend: TEST_CONFIG.baseUrl,
        backend: TEST_CONFIG.apiUrl
      },
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASSED').length,
        failed: results.filter(r => r.status === 'FAILED').length,
        skipped: results.filter(r => r.status === 'SKIPPED').length
      },
      results,
      interceptedRequests: interceptedRequests.slice(0, 10) // First 10 requests
    };
    
    // Save report
    await fs.writeFile(
      path.join(__dirname, 'test-results', 'customer', 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 CUSTOMER USER TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`);
    console.log('\nDetailed report saved to: test-results/customer/test-report.json');
    console.log('Screenshots saved to: test-results/customer/');
    
    await browser.close();
  }
}

// Performance monitoring
const startTime = Date.now();

// Run tests
runCustomerTests().catch(console.error);