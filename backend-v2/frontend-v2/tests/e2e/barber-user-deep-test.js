const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:8000',
  viewport: { width: 1920, height: 1080 },
  mobileViewport: { width: 375, height: 812 },
  timeout: 15000, // Reduced timeout for better responsiveness
  screenshots: true,
  headless: false, // Set to true for CI/CD
  protocolTimeout: 30000 // Add protocol timeout
};

// Test credentials
const BARBER_CREDENTIALS = {
  email: 'test-barber@6fb.com',
  password: 'testpass123'
};

// Performance metrics collector
class PerformanceCollector {
  constructor() {
    this.metrics = {
      pageLoads: [],
      apiCalls: [],
      renderTimes: [],
      errors: [],
      memoryUsage: []
    };
  }

  addPageLoad(page, duration) {
    this.metrics.pageLoads.push({
      page,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  addApiCall(endpoint, duration, status) {
    this.metrics.apiCalls.push({
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString()
    });
  }

  addError(context, error) {
    this.metrics.errors.push({
      context,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  async collectMemoryUsage(page) {
    const metrics = await page.metrics();
    this.metrics.memoryUsage.push({
      timestamp: new Date().toISOString(),
      JSHeapUsedSize: metrics.JSHeapUsedSize,
      JSHeapTotalSize: metrics.JSHeapTotalSize
    });
  }

  generateReport() {
    const avgPageLoad = this.metrics.pageLoads.reduce((acc, m) => acc + m.duration, 0) / this.metrics.pageLoads.length || 0;
    const avgApiCall = this.metrics.apiCalls.reduce((acc, m) => acc + m.duration, 0) / this.metrics.apiCalls.length || 0;
    
    return {
      summary: {
        totalPageLoads: this.metrics.pageLoads.length,
        averagePageLoadTime: avgPageLoad.toFixed(2) + 'ms',
        totalApiCalls: this.metrics.apiCalls.length,
        averageApiResponseTime: avgApiCall.toFixed(2) + 'ms',
        totalErrors: this.metrics.errors.length,
        testDuration: this.getTestDuration()
      },
      details: this.metrics
    };
  }

  getTestDuration() {
    if (this.metrics.pageLoads.length === 0) return '0ms';
    const start = new Date(this.metrics.pageLoads[0].timestamp);
    const end = new Date(this.metrics.pageLoads[this.metrics.pageLoads.length - 1].timestamp);
    return (end - start) + 'ms';
  }
}

// Screenshot helper
async function takeScreenshot(page, name, testName = 'barber') {
  if (!TEST_CONFIG.screenshots) return;
  
  const dir = path.join(__dirname, 'test-screenshots', testName);
  await fs.mkdir(dir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  
  await page.screenshot({
    path: path.join(dir, filename),
    fullPage: true
  });
  
  console.log(`📸 Screenshot saved: ${filename}`);
}

// Wait helper with performance tracking
async function waitAndNavigate(page, url, metrics, pageName) {
  const startTime = Date.now();
  try {
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', // Changed from networkidle2 for faster response
      timeout: TEST_CONFIG.timeout 
    });
    const duration = Date.now() - startTime;
    metrics.addPageLoad(pageName, duration);
    console.log(`⏱️  ${pageName} loaded in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.addPageLoad(pageName, duration);
    console.log(`⚠️  ${pageName} loaded with issues in ${duration}ms`);
    throw error;
  }
}

// Helper function for waiting
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to find elements by text content
async function findElementByText(page, text) {
  const element = await page.evaluateHandle((text) => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements.find(el => el.textContent && el.textContent.includes(text));
  }, text);
  
  // Return null if element not found
  const isNull = await page.evaluate(el => el === null, element);
  return isNull ? null : element;
}

// Helper function to safely click element
async function safeClick(page, element) {
  if (!element) return false;
  try {
    await element.click();
    return true;
  } catch (error) {
    console.log('⚠️  Click failed, trying evaluate click');
    try {
      await page.evaluate(el => el.click(), element);
      return true;
    } catch (e) {
      console.log('⚠️  Evaluate click also failed');
      return false;
    }
  }
}

// API interceptor for performance monitoring
async function setupApiInterceptor(page, metrics) {
  await page.setRequestInterception(true);
  
  const apiRequests = new Map();
  
  page.on('request', request => {
    if (request.url().includes(TEST_CONFIG.apiUrl)) {
      apiRequests.set(request.url(), Date.now());
    }
    request.continue();
  });
  
  page.on('response', response => {
    if (response.url().includes(TEST_CONFIG.apiUrl)) {
      const startTime = apiRequests.get(response.url());
      if (startTime) {
        const duration = Date.now() - startTime;
        metrics.addApiCall(response.url(), duration, response.status());
        apiRequests.delete(response.url());
      }
    }
  });
}

// Main test suite
async function runBarberUserTests() {
  const browser = await puppeteer.launch({
    headless: TEST_CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: TEST_CONFIG.protocolTimeout
  });
  
  const metrics = new PerformanceCollector();
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    console.log('🧑‍💼 Starting Barber User Deep Testing Suite...\n');
    
    // Test 1: Login Flow
    console.log('📋 Test 1: Barber Login Flow');
    const page = await browser.newPage();
    await page.setViewport(TEST_CONFIG.viewport);
    await setupApiInterceptor(page, metrics);
    
    try {
      await waitAndNavigate(page, TEST_CONFIG.baseUrl + '/login', metrics, 'Login Page');
      await takeScreenshot(page, '01-login-page');
      
      // Fill login form
      await page.waitForSelector('#email');
      await page.type('#email', BARBER_CREDENTIALS.email);
      await page.type('#password', BARBER_CREDENTIALS.password);
      
      // Submit login
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: TEST_CONFIG.timeout }),
        page.click('button[type="submit"]')
      ]);
      
      await takeScreenshot(page, '02-barber-dashboard');
      
      // Verify barber-specific UI elements
      const dashboardTitle = await page.$eval('h1', el => el.textContent);
      if (dashboardTitle.includes('Dashboard') || dashboardTitle.includes('Calendar')) {
        console.log('✅ Barber login successful');
        testResults.passed++;
      } else {
        throw new Error('Failed to reach barber dashboard');
      }
      
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Login test failed:', error.message);
      metrics.addError('Login Flow', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-login');
    }
    
    testResults.tests.push({
      name: 'Barber Login',
      status: testResults.failed === 0 ? 'passed' : 'failed'
    });
    
    // Test 2: Calendar View and Navigation
    console.log('\n📋 Test 2: Calendar Management');
    try {
      // Navigate to calendar
      let calendarLink = await page.$('a[href*="calendar"]');
      if (!calendarLink) {
        calendarLink = await findElementByText(page, 'Calendar');
      }
      if (calendarLink) {
        const clicked = await safeClick(page, calendarLink);
        if (clicked) await sleep(2000);
      }
      
      await takeScreenshot(page, '03-calendar-view');
      
      // Test calendar views (month, week, day)
      let viewButtons = await page.$$('[data-testid*="view"]');
      if (viewButtons.length === 0) {
        // Try to find view buttons by text
        const monthBtn = await findElementByText(page, 'Month');
        const weekBtn = await findElementByText(page, 'Week');
        const dayBtn = await findElementByText(page, 'Day');
        viewButtons = [monthBtn, weekBtn, dayBtn].filter(btn => btn);
      }
      
      for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
        const clicked = await safeClick(page, viewButtons[i]);
        if (clicked) {
          await sleep(1000);
          await takeScreenshot(page, `04-calendar-view-${i}`);
        } else {
          console.log(`⚠️  Could not click view button ${i}`);
        }
      }
      
      // Test appointment slots
      const appointmentSlots = await page.$$('[data-testid*="appointment"], .appointment-slot, .calendar-event');
      console.log(`✅ Found ${appointmentSlots.length} appointment slots`);
      
      // Click on an appointment if available
      if (appointmentSlots.length > 0) {
        await appointmentSlots[0].click();
        await sleep(1000);
        await takeScreenshot(page, '05-appointment-details');
        
        // Look for management options
        const cancelBtn = await findElementByText(page, 'Cancel');
        const rescheduleBtn = await findElementByText(page, 'Reschedule');
        const confirmBtn = await findElementByText(page, 'Confirm');
        const managementOptions = [cancelBtn, rescheduleBtn, confirmBtn].filter(btn => btn);
        console.log(`✅ Found ${managementOptions.length} appointment management options`);
      }
      
      testResults.passed++;
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Calendar test failed:', error.message);
      metrics.addError('Calendar Management', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-calendar');
    }
    
    testResults.tests.push({
      name: 'Calendar Management',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 3: Client Management
    console.log('\n📋 Test 3: Client Management');
    try {
      // Navigate to clients section
      let clientsLink = await page.$('a[href*="clients"]');
      if (!clientsLink) {
        clientsLink = await findElementByText(page, 'Clients');
      }
      if (clientsLink) {
        const clicked = await safeClick(page, clientsLink);
        if (clicked) {
          await sleep(2000);
          await takeScreenshot(page, '06-clients-list');
        }
        
        // Search for client
        const searchInput = await page.$('input[placeholder*="Search"], input[type="search"]');
        if (searchInput) {
          await searchInput.type('John');
          await sleep(1000);
          await takeScreenshot(page, '07-client-search');
        }
        
        // Click on a client if available
        const clientRows = await page.$$('tr[data-testid*="client"], .client-row, tbody tr');
        if (clientRows.length > 1) { // Skip header row
          await clientRows[1].click();
          await sleep(1000);
          await takeScreenshot(page, '08-client-details');
          
          // Check for client history
          const historySection = await page.$('[data-testid*="history"], .appointment-history, .client-history');
          if (historySection) {
            console.log('✅ Client history section found');
          }
        }
        
        console.log(`✅ Found ${clientRows.length - 1} clients`);
        testResults.passed++;
      }
      
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Client management test failed:', error.message);
      metrics.addError('Client Management', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-clients');
    }
    
    testResults.tests.push({
      name: 'Client Management',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 4: Analytics Dashboard
    console.log('\n📋 Test 4: Analytics Dashboard');
    try {
      // Navigate to analytics
      let analyticsLink = await page.$('a[href*="analytics"]');
      if (!analyticsLink) {
        analyticsLink = await findElementByText(page, 'Analytics');
      }
      if (!analyticsLink) {
        analyticsLink = await findElementByText(page, 'Reports');
      }
      if (analyticsLink) {
        const clicked = await safeClick(page, analyticsLink);
        if (clicked) {
          await sleep(3000);
          await takeScreenshot(page, '09-analytics-dashboard');
        }
        
        // Check for key metrics
        const metricCards = await page.$$('[data-testid*="metric"], .metric-card, .stat-card');
        console.log(`✅ Found ${metricCards.length} metric cards`);
        
        // Check for charts
        const charts = await page.$$('canvas, svg.chart, [data-testid*="chart"]');
        console.log(`✅ Found ${charts.length} charts`);
        
        // Test date range picker
        const dateRangePicker = await page.$('[data-testid*="date-range"], .date-picker, input[type="date"]');
        if (dateRangePicker) {
          await dateRangePicker.click();
          await sleep(1000);
          await takeScreenshot(page, '10-date-range-picker');
        }
        
        // Check for revenue metrics
        const revenueElements = await page.$$eval('*', elements => 
          elements.filter(el => el.textContent.includes('Revenue') || el.textContent.includes('$')).length
        );
        console.log(`✅ Found ${revenueElements} revenue-related elements`);
        
        testResults.passed++;
      }
      
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Analytics test failed:', error.message);
      metrics.addError('Analytics Dashboard', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-analytics');
    }
    
    testResults.tests.push({
      name: 'Analytics Dashboard',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 5: Appointment Management Actions
    console.log('\n📋 Test 5: Appointment Management Actions');
    try {
      // Return to calendar
      await page.goto(TEST_CONFIG.baseUrl + '/calendar', { waitUntil: 'networkidle2' });
      await sleep(2000);
      
      // Find and click on an appointment
      const appointments = await page.$$('[data-testid*="appointment"], .appointment-slot:not(:empty), .calendar-event');
      
      if (appointments.length > 0) {
        await appointments[0].click();
        await sleep(1000);
        
        // Test appointment actions
        const actions = ['Confirm', 'Reschedule', 'Cancel', 'Edit'];
        for (const action of actions) {
          const button = await findElementByText(page, action);
          if (button) {
            console.log(`✅ Found ${action} action`);
            
            // Test reschedule flow
            if (action === 'Reschedule') {
              const clicked = await safeClick(page, button);
              if (clicked) {
                await sleep(1000);
                await takeScreenshot(page, '11-reschedule-modal');
                
                // Close modal
                let closeButton = await page.$('button[aria-label="Close"]');
                if (!closeButton) {
                  closeButton = await findElementByText(page, 'Cancel');
                }
                if (!closeButton) {
                  closeButton = await page.$('.modal-close');
                }
                if (closeButton) await safeClick(page, closeButton);
              }
            }
          }
        }
        
        testResults.passed++;
      } else {
        console.log('⚠️  No appointments found to test actions');
      }
      
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Appointment actions test failed:', error.message);
      metrics.addError('Appointment Actions', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-appointment-actions');
    }
    
    testResults.tests.push({
      name: 'Appointment Actions',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 6: Mobile Responsiveness
    console.log('\n📋 Test 6: Mobile Responsiveness');
    try {
      await page.setViewport(TEST_CONFIG.mobileViewport);
      await sleep(1000);
      await takeScreenshot(page, '12-mobile-dashboard');
      
      // Test mobile menu
      let mobileMenuButton = await page.$('[data-testid*="mobile-menu"]');
      if (!mobileMenuButton) {
        mobileMenuButton = await page.$('button[aria-label*="menu"]');
      }
      if (!mobileMenuButton) {
        mobileMenuButton = await page.$('.hamburger-menu');
      }
      if (mobileMenuButton) {
        const clicked = await safeClick(page, mobileMenuButton);
        if (clicked) {
          await sleep(500);
          await takeScreenshot(page, '13-mobile-menu');
        }
        
        // Navigate to calendar on mobile
        const mobileCalendarLink = await page.$('a[href*="calendar"]');
        if (mobileCalendarLink) {
          await mobileCalendarLink.click();
          await sleep(2000);
          await takeScreenshot(page, '14-mobile-calendar');
        }
      }
      
      // Test swipe gestures (simulated)
      await page.evaluate(() => {
        try {
          // Create touch objects manually
          const touch1 = new Touch({
            identifier: 1,
            target: document.body,
            clientX: 300,
            clientY: 400,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 10,
            force: 0.5
          });
          
          const touch2 = new Touch({
            identifier: 1,
            target: document.body,
            clientX: 100,
            clientY: 400,
            radiusX: 2.5,
            radiusY: 2.5,
            rotationAngle: 10,
            force: 0.5
          });

          const touchStart = new TouchEvent('touchstart', {
            touches: [touch1],
            targetTouches: [touch1],
            changedTouches: [touch1],
            bubbles: true
          });
          
          const touchEnd = new TouchEvent('touchend', {
            touches: [],
            targetTouches: [],
            changedTouches: [touch2],
            bubbles: true
          });
          
          document.dispatchEvent(touchStart);
          document.dispatchEvent(touchEnd);
        } catch (e) {
          // Fallback for browsers that don't support Touch constructor
          const event1 = new Event('touchstart');
          const event2 = new Event('touchend');
          document.dispatchEvent(event1);
          document.dispatchEvent(event2);
        }
      });
      
      await sleep(1000);
      console.log('✅ Mobile responsiveness tested');
      testResults.passed++;
      
      // Reset viewport
      await page.setViewport(TEST_CONFIG.viewport);
      
    } catch (error) {
      console.error('❌ Mobile responsiveness test failed:', error.message);
      metrics.addError('Mobile Responsiveness', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-mobile');
    }
    
    testResults.tests.push({
      name: 'Mobile Responsiveness',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 7: Settings and Profile
    console.log('\n📋 Test 7: Settings and Profile');
    try {
      // Navigate to settings
      let settingsLink = await page.$('a[href*="settings"]');
      if (!settingsLink) {
        settingsLink = await findElementByText(page, 'Settings');
      }
      if (!settingsLink) {
        settingsLink = await findElementByText(page, 'Profile');
      }
      if (settingsLink) {
        const clicked = await safeClick(page, settingsLink);
        if (clicked) {
          await sleep(2000);
          await takeScreenshot(page, '15-settings-page');
          
          // Test profile sections
          const sections = ['Profile', 'Schedule', 'Services', 'Notifications', 'Payment'];
          for (const section of sections) {
            const sectionTab = await findElementByText(page, section);
            if (sectionTab) {
              const sectionClicked = await safeClick(page, sectionTab);
              if (sectionClicked) {
                await sleep(1000);
                await takeScreenshot(page, `16-settings-${section.toLowerCase()}`);
                console.log(`✅ ${section} settings section accessible`);
              }
            }
          }
        }
        
        // Test schedule management
        const scheduleInputs = await page.$$('input[type="time"], .schedule-input');
        console.log(`✅ Found ${scheduleInputs.length} schedule inputs`);
        
        testResults.passed++;
      }
      
      await metrics.collectMemoryUsage(page);
      
    } catch (error) {
      console.error('❌ Settings test failed:', error.message);
      metrics.addError('Settings', error);
      testResults.failed++;
      await takeScreenshot(page, 'error-settings');
    }
    
    testResults.tests.push({
      name: 'Settings and Profile',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 8: Role-Based Access Control
    console.log('\n📋 Test 8: Role-Based Access Control');
    try {
      // Check for barber-only features
      const barberOnlyElements = await page.evaluate(() => {
        const elements = {
          payoutSection: !!document.querySelector('[data-testid*="payout"]') || 
                        !!Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('Payouts')),
          scheduleManagement: !!document.querySelector('[data-testid*="schedule"], .schedule-management'),
          serviceManagement: !!document.querySelector('[data-testid*="service"], .service-management'),
          clientNotes: !!document.querySelector('[data-testid*="notes"], .client-notes'),
          analyticsAccess: !!document.querySelector('[data-testid*="analytics"], a[href*="analytics"]')
        };
        return elements;
      });
      
      console.log('✅ Barber-specific features verified:');
      Object.entries(barberOnlyElements).forEach(([feature, exists]) => {
        console.log(`  - ${feature}: ${exists ? '✓' : '✗'}`);
      });
      
      // Try to access admin routes (should fail)
      await page.goto(TEST_CONFIG.baseUrl + '/admin', { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const isOnAdminPage = await page.evaluate(() => 
        window.location.pathname.includes('/admin')
      );
      
      if (!isOnAdminPage) {
        console.log('✅ Admin routes properly restricted');
        testResults.passed++;
      } else {
        throw new Error('Barber user has unauthorized access to admin routes');
      }
      
    } catch (error) {
      console.error('❌ RBAC test failed:', error.message);
      metrics.addError('Role-Based Access Control', error);
      testResults.failed++;
    }
    
    testResults.tests.push({
      name: 'Role-Based Access Control',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 9: Performance Metrics
    console.log('\n📋 Test 9: Performance Analysis');
    try {
      // Collect navigation timing
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      console.log('✅ Performance Metrics:');
      console.log(`  - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`  - Page Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`  - First Paint: ${performanceMetrics.firstPaint}ms`);
      console.log(`  - First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
      
      // Check for performance issues
      if (performanceMetrics.firstContentfulPaint > 3000) {
        console.warn('⚠️  First Contentful Paint exceeds 3 seconds');
      }
      
      testResults.passed++;
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      metrics.addError('Performance Analysis', error);
      testResults.failed++;
    }
    
    testResults.tests.push({
      name: 'Performance Analysis',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
    // Test 10: Error Handling
    console.log('\n📋 Test 10: Error Handling');
    try {
      // Test 404 page
      await page.goto(TEST_CONFIG.baseUrl + '/non-existent-page', { waitUntil: 'networkidle2' });
      await sleep(1000);
      await takeScreenshot(page, '17-404-page');
      
      const has404 = await page.evaluate(() => 
        document.body.textContent.includes('404') || 
        document.body.textContent.toLowerCase().includes('not found')
      );
      
      if (has404) {
        console.log('✅ 404 error page displayed correctly');
      }
      
      // Test form validation
      await page.goto(TEST_CONFIG.baseUrl + '/calendar', { waitUntil: 'networkidle2' });
      
      // Try to submit invalid data
      let newAppointmentButton = await findElementByText(page, 'New Appointment');
      if (!newAppointmentButton) {
        newAppointmentButton = await findElementByText(page, 'Book');
      }
      if (newAppointmentButton) {
        const clicked = await safeClick(page, newAppointmentButton);
        if (clicked) await sleep(1000);
        
        // Submit without filling required fields
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await sleep(500);
          
          // Check for validation messages
          const validationMessages = await page.$$('.error-message, .validation-error, [role="alert"]');
          console.log(`✅ Found ${validationMessages.length} validation messages`);
          await takeScreenshot(page, '18-form-validation');
        }
      }
      
      testResults.passed++;
      
    } catch (error) {
      console.error('❌ Error handling test failed:', error.message);
      metrics.addError('Error Handling', error);
      testResults.failed++;
    }
    
    testResults.tests.push({
      name: 'Error Handling',
      status: testResults.tests[testResults.tests.length - 1].status === 'failed' ? 'failed' : 'passed'
    });
    
  } catch (error) {
    console.error('❌ Fatal test error:', error);
    metrics.addError('Fatal Error', error);
  } finally {
    await browser.close();
    
    // Generate final report
    const performanceReport = metrics.generateReport();
    const finalReport = {
      testSuite: 'Barber User Deep Testing',
      timestamp: new Date().toISOString(),
      environment: {
        frontend: TEST_CONFIG.baseUrl,
        backend: TEST_CONFIG.apiUrl
      },
      results: {
        total: testResults.tests.length,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / testResults.tests.length) * 100).toFixed(2) + '%'
      },
      tests: testResults.tests,
      performance: performanceReport,
      recommendations: generateRecommendations(testResults, performanceReport)
    };
    
    // Save report
    const reportPath = path.join(__dirname, 'test-reports', `barber-user-test-report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(finalReport, null, 2));
    
    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BARBER USER TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${finalReport.results.total}`);
    console.log(`Passed: ${finalReport.results.passed} ✅`);
    console.log(`Failed: ${finalReport.results.failed} ❌`);
    console.log(`Success Rate: ${finalReport.results.successRate}`);
    console.log('\nPerformance Summary:');
    console.log(`- Average Page Load: ${performanceReport.summary.averagePageLoadTime}`);
    console.log(`- Average API Response: ${performanceReport.summary.averageApiResponseTime}`);
    console.log(`- Total Errors: ${performanceReport.summary.totalErrors}`);
    console.log('\nTest Details:');
    testResults.tests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}: ${test.status === 'passed' ? '✅' : '❌'}`);
    });
    console.log('\n📄 Full report saved to:', reportPath);
    console.log('📸 Screenshots saved to:', path.join(__dirname, 'test-screenshots', 'barber'));
    
    // Return success/failure
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Generate recommendations based on test results
function generateRecommendations(testResults, performanceReport) {
  const recommendations = [];
  
  // Performance recommendations
  const avgPageLoad = parseFloat(performanceReport.summary.averagePageLoadTime);
  if (avgPageLoad > 2000) {
    recommendations.push({
      category: 'Performance',
      priority: 'High',
      issue: 'Slow page load times',
      suggestion: 'Implement code splitting and lazy loading for faster initial loads'
    });
  }
  
  // Error handling recommendations
  if (performanceReport.summary.totalErrors > 0) {
    recommendations.push({
      category: 'Stability',
      priority: 'Critical',
      issue: `${performanceReport.summary.totalErrors} errors detected during testing`,
      suggestion: 'Review error logs and implement proper error boundaries'
    });
  }
  
  // Feature recommendations
  const failedTests = testResults.tests.filter(t => t.status === 'failed');
  failedTests.forEach(test => {
    recommendations.push({
      category: 'Functionality',
      priority: 'High',
      issue: `${test.name} test failed`,
      suggestion: `Review and fix issues in ${test.name.toLowerCase()} functionality`
    });
  });
  
  // Mobile recommendations
  if (testResults.tests.find(t => t.name === 'Mobile Responsiveness' && t.status === 'failed')) {
    recommendations.push({
      category: 'User Experience',
      priority: 'Medium',
      issue: 'Mobile experience needs improvement',
      suggestion: 'Optimize touch interactions and responsive layouts for mobile devices'
    });
  }
  
  // Security recommendations
  recommendations.push({
    category: 'Security',
    priority: 'Medium',
    issue: 'Role-based access control verification',
    suggestion: 'Regularly audit and test RBAC implementations to prevent privilege escalation'
  });
  
  return recommendations;
}

// Run the tests
runBarberUserTests().catch(console.error);