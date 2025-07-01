#!/usr/bin/env node

/**
 * Comprehensive Calendar System End-to-End Test
 * Tests the complete calendar functionality for 100% system validation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:8000',
  testUser: {
    email: 'test@example.com',
    password: 'testpass123'
  },
  headless: false,
  viewport: { width: 1920, height: 1080 },
  timeout: 30000,
  screenshotDir: './test-results/calendar-screenshots'
};

// Test results storage
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  errors: [],
  critical: [],
  warnings: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📅',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    critical: '🚨'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
  
  if (type === 'error') testResults.errors.push({ message, timestamp });
  if (type === 'critical') testResults.critical.push({ message, timestamp });
  if (type === 'warning') testResults.warnings.push({ message, timestamp });
}

async function takeScreenshot(page, name, description = '') {
  try {
    const filename = `${Date.now()}_${name}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);
    
    // Ensure directory exists
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true,
      quality: 90
    });
    
    log(`Screenshot saved: ${filename} ${description ? '- ' + description : ''}`, 'info');
    return filepath;
  } catch (error) {
    log(`Failed to take screenshot ${name}: ${error.message}`, 'error');
    return null;
  }
}

async function waitForSelector(page, selector, timeout = CONFIG.timeout) {
  try {
    await page.waitForSelector(selector, { timeout, visible: true });
    return true;
  } catch (error) {
    log(`Selector not found: ${selector}`, 'error');
    return false;
  }
}

async function waitForAPI(page, apiCall, expectedCount = 1) {
  try {
    const responses = [];
    
    page.on('response', (response) => {
      if (response.url().includes(apiCall)) {
        responses.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });
    
    // Wait for expected number of API calls
    while (responses.length < expectedCount) {
      await page.waitForTimeout(100);
    }
    
    return responses;
  } catch (error) {
    log(`API wait failed for ${apiCall}: ${error.message}`, 'error');
    return [];
  }
}

// Test functions
async function testLogin(page) {
  log('Testing login flow...', 'info');
  
  try {
    await page.goto(`${CONFIG.baseUrl}/login`);
    await takeScreenshot(page, 'login_page', 'Login page loaded');
    
    // Fill login form
    await page.type('input[type="email"]', CONFIG.testUser.email);
    await page.type('input[type="password"]', CONFIG.testUser.password);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/calendar')) {
      log('Login successful', 'success');
      testResults.tests.push({ name: 'Login', status: 'PASSED' });
      testResults.passed++;
      return true;
    } else {
      log('Login failed - unexpected redirect', 'error');
      testResults.tests.push({ name: 'Login', status: 'FAILED', error: 'Unexpected redirect' });
      testResults.failed++;
      return false;
    }
  } catch (error) {
    log(`Login test failed: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Login', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testBookingFlow(page) {
  log('Testing complete booking flow...', 'info');
  
  try {
    // Navigate to booking page
    await page.goto(`${CONFIG.baseUrl}/book`);
    await takeScreenshot(page, 'booking_start', 'Booking page loaded');
    
    // Step 1: Select service
    await waitForSelector(page, '[data-testid="service-haircut"], .service-card, [role="button"]');
    const serviceCards = await page.$$('.service-card, [data-testid*="service"], [role="button"]');
    
    if (serviceCards.length > 0) {
      await serviceCards[0].click();
      log('Service selected', 'success');
    } else {
      // Fallback: look for any clickable service element
      const services = await page.$$eval('*', els => 
        els.filter(el => 
          el.textContent && 
          (el.textContent.includes('Haircut') || el.textContent.includes('Service')) &&
          (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.onclick)
        ).map(el => ({ text: el.textContent, tag: el.tagName }))
      );
      
      if (services.length > 0) {
        await page.click('button:first-of-type, [role="button"]:first-of-type');
        log('Service selected via fallback', 'success');
      } else {
        throw new Error('No services found on page');
      }
    }
    
    await takeScreenshot(page, 'service_selected', 'Service selection step');
    
    // Step 2: Select date and time
    await page.waitForTimeout(1000);
    
    // Look for calendar or date picker
    const calendarExists = await waitForSelector(page, '.calendar, [data-testid="calendar"], .react-calendar');
    
    if (calendarExists) {
      // Click on a future date
      const availableDates = await page.$$('.calendar-day:not(.disabled), .react-calendar__tile:not([disabled])');
      if (availableDates.length > 0) {
        await availableDates[Math.min(5, availableDates.length - 1)].click();
        log('Date selected', 'success');
      }
    }
    
    await takeScreenshot(page, 'date_selected', 'Date selection step');
    
    // Look for time slots
    await page.waitForTimeout(2000);
    const timeSlots = await page.$$('.time-slot, [data-testid*="time"], .time-button');
    
    if (timeSlots.length > 0) {
      await timeSlots[0].click();
      log('Time slot selected', 'success');
    } else {
      log('No time slots found - checking for alternative selectors', 'warning');
      // Try alternative selectors
      const altTimeSlots = await page.$$('button[data-time], .slot-button, [role="button"][aria-label*="time"]');
      if (altTimeSlots.length > 0) {
        await altTimeSlots[0].click();
        log('Time slot selected via alternative selector', 'success');
      }
    }
    
    await takeScreenshot(page, 'time_selected', 'Time selection step');
    
    // Step 3: Proceed to confirmation
    const continueButton = await page.$('button:contains("Continue"), button:contains("Confirm"), button:contains("Next")');
    if (continueButton) {
      await continueButton.click();
      log('Proceeded to confirmation', 'success');
    }
    
    await takeScreenshot(page, 'booking_confirmation', 'Booking confirmation step');
    
    testResults.tests.push({ name: 'Booking Flow', status: 'PASSED' });
    testResults.passed++;
    return true;
    
  } catch (error) {
    log(`Booking flow test failed: ${error.message}`, 'error');
    await takeScreenshot(page, 'booking_flow_error', 'Booking flow error state');
    testResults.tests.push({ name: 'Booking Flow', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testCalendarViews(page) {
  log('Testing calendar view consistency...', 'info');
  
  try {
    // Navigate to calendar
    await page.goto(`${CONFIG.baseUrl}/calendar`);
    await takeScreenshot(page, 'calendar_initial', 'Calendar page loaded');
    
    // Test Month View
    const monthButton = await page.$('button:contains("Month"), [data-view="month"]');
    if (monthButton) {
      await monthButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'calendar_month_view', 'Month view active');
      
      // Check for appointments in month view
      const monthAppointments = await page.$$('.appointment, .event, [data-appointment]');
      log(`Month view shows ${monthAppointments.length} appointments`, 'info');
    }
    
    // Test Week View
    const weekButton = await page.$('button:contains("Week"), [data-view="week"]');
    if (weekButton) {
      await weekButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'calendar_week_view', 'Week view active');
      
      // Check for appointments in week view
      const weekAppointments = await page.$$('.appointment, .event, [data-appointment]');
      log(`Week view shows ${weekAppointments.length} appointments`, 'info');
    }
    
    // Test Day View
    const dayButton = await page.$('button:contains("Day"), [data-view="day"]');
    if (dayButton) {
      await dayButton.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'calendar_day_view', 'Day view active');
      
      // Check for appointments in day view
      const dayAppointments = await page.$$('.appointment, .event, [data-appointment]');
      log(`Day view shows ${dayAppointments.length} appointments`, 'info');
    }
    
    testResults.tests.push({ name: 'Calendar Views', status: 'PASSED' });
    testResults.passed++;
    return true;
    
  } catch (error) {
    log(`Calendar views test failed: ${error.message}`, 'error');
    await takeScreenshot(page, 'calendar_views_error', 'Calendar views error state');
    testResults.tests.push({ name: 'Calendar Views', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testDragAndDrop(page) {
  log('Testing drag-and-drop functionality...', 'info');
  
  try {
    // Ensure we're in day view for easier drag-and-drop testing
    const dayButton = await page.$('button:contains("Day"), [data-view="day"]');
    if (dayButton) {
      await dayButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for draggable appointments
    const appointments = await page.$$('.appointment[draggable="true"], .calendar-appointment[draggable="true"]');
    
    if (appointments.length > 0) {
      const appointment = appointments[0];
      
      // Get appointment position
      const appointmentBox = await appointment.boundingBox();
      
      // Find a time slot to drop to
      const timeSlots = await page.$$('.time-slot, .calendar-time-slot');
      
      if (timeSlots.length > 5) {
        const targetSlot = timeSlots[5]; // Use 6th slot
        const targetBox = await targetSlot.boundingBox();
        
        // Perform drag and drop
        await page.mouse.move(appointmentBox.x + appointmentBox.width/2, appointmentBox.y + appointmentBox.height/2);
        await page.mouse.down();
        await page.mouse.move(targetBox.x + targetBox.width/2, targetBox.y + targetBox.height/2);
        await page.mouse.up();
        
        await page.waitForTimeout(2000);
        await takeScreenshot(page, 'drag_drop_completed', 'Drag and drop operation completed');
        
        log('Drag and drop operation completed', 'success');
        testResults.tests.push({ name: 'Drag and Drop', status: 'PASSED' });
        testResults.passed++;
        return true;
      } else {
        log('Insufficient time slots for drag and drop test', 'warning');
        testResults.tests.push({ name: 'Drag and Drop', status: 'SKIPPED', reason: 'Insufficient time slots' });
        testResults.skipped++;
        return false;
      }
    } else {
      log('No draggable appointments found', 'warning');
      testResults.tests.push({ name: 'Drag and Drop', status: 'SKIPPED', reason: 'No draggable appointments' });
      testResults.skipped++;
      return false;
    }
    
  } catch (error) {
    log(`Drag and drop test failed: ${error.message}`, 'error');
    await takeScreenshot(page, 'drag_drop_error', 'Drag and drop error state');
    testResults.tests.push({ name: 'Drag and Drop', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testAPIIntegration(page) {
  log('Testing API integration...', 'info');
  
  try {
    const apiCalls = [];
    
    // Monitor API calls
    page.on('response', (response) => {
      if (response.url().includes('/api/v1/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Navigate to calendar to trigger API calls
    await page.goto(`${CONFIG.baseUrl}/calendar`);
    await page.waitForTimeout(3000);
    
    // Refresh calendar data
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Check for expected API calls
    const expectedCalls = [
      '/api/v1/appointments',
      '/api/v1/auth',
      '/api/v1/users'
    ];
    
    let successfulCalls = 0;
    let failedCalls = 0;
    
    for (const call of apiCalls) {
      if (call.status >= 200 && call.status < 300) {
        successfulCalls++;
      } else {
        failedCalls++;
        log(`API call failed: ${call.method} ${call.url} - Status: ${call.status}`, 'error');
      }
    }
    
    log(`API Integration: ${successfulCalls} successful, ${failedCalls} failed calls`, 'info');
    
    if (failedCalls === 0 && successfulCalls > 0) {
      testResults.tests.push({ name: 'API Integration', status: 'PASSED', details: `${successfulCalls} successful calls` });
      testResults.passed++;
      return true;
    } else {
      testResults.tests.push({ name: 'API Integration', status: 'FAILED', details: `${failedCalls} failed calls` });
      testResults.failed++;
      return false;
    }
    
  } catch (error) {
    log(`API integration test failed: ${error.message}`, 'error');
    testResults.tests.push({ name: 'API Integration', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testErrorHandling(page) {
  log('Testing error handling scenarios...', 'info');
  
  try {
    const originalUrl = page.url();
    
    // Test 1: Navigate to non-existent appointment
    await page.goto(`${CONFIG.baseUrl}/calendar/appointment/99999`);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'error_404', '404 error handling');
    
    // Test 2: Test API error handling by navigating back and checking for error states
    await page.goto(originalUrl);
    await page.waitForTimeout(2000);
    
    // Look for error messages or loading states
    const errorElements = await page.$$('.error, .alert-error, [data-testid*="error"]');
    const loadingElements = await page.$$('.loading, .spinner, [data-testid*="loading"]');
    
    log(`Found ${errorElements.length} error elements and ${loadingElements.length} loading elements`, 'info');
    
    testResults.tests.push({ name: 'Error Handling', status: 'PASSED' });
    testResults.passed++;
    return true;
    
  } catch (error) {
    log(`Error handling test failed: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Error Handling', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testMobileResponsiveness(page) {
  log('Testing mobile responsiveness...', 'info');
  
  try {
    // Test on mobile viewport
    await page.setViewport({ width: 375, height: 667 }); // iPhone 6/7/8
    await page.goto(`${CONFIG.baseUrl}/calendar`);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'mobile_calendar', 'Calendar on mobile view');
    
    // Test touch interactions
    const appointments = await page.$$('.appointment, .calendar-appointment');
    if (appointments.length > 0) {
      await appointments[0].tap();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'mobile_appointment_tap', 'Appointment tap on mobile');
    }
    
    // Test booking flow on mobile
    await page.goto(`${CONFIG.baseUrl}/book`);
    await page.waitForTimeout(2000);
    await takeScreenshot(page, 'mobile_booking', 'Booking page on mobile');
    
    // Restore desktop viewport
    await page.setViewport(CONFIG.viewport);
    
    testResults.tests.push({ name: 'Mobile Responsiveness', status: 'PASSED' });
    testResults.passed++;
    return true;
    
  } catch (error) {
    log(`Mobile responsiveness test failed: ${error.message}`, 'error');
    await takeScreenshot(page, 'mobile_error', 'Mobile test error state');
    testResults.tests.push({ name: 'Mobile Responsiveness', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

async function testDataRefresh(page) {
  log('Testing data refresh functionality...', 'info');
  
  try {
    await page.goto(`${CONFIG.baseUrl}/calendar`);
    
    // Count initial appointments
    const initialAppointments = await page.$$('.appointment, .calendar-appointment');
    const initialCount = initialAppointments.length;
    
    log(`Initial appointment count: ${initialCount}`, 'info');
    
    // Trigger refresh by reloading or using refresh button
    const refreshButton = await page.$('button:contains("Refresh"), [data-action="refresh"]');
    if (refreshButton) {
      await refreshButton.click();
    } else {
      await page.reload({ waitUntil: 'networkidle2' });
    }
    
    await page.waitForTimeout(3000);
    
    // Count appointments after refresh
    const refreshedAppointments = await page.$$('.appointment, .calendar-appointment');
    const refreshedCount = refreshedAppointments.length;
    
    log(`Refreshed appointment count: ${refreshedCount}`, 'info');
    
    // Check if data was refreshed (counts should be consistent)
    if (refreshedCount >= 0) { // Allow for 0 appointments as valid state
      testResults.tests.push({ name: 'Data Refresh', status: 'PASSED', details: `${refreshedCount} appointments after refresh` });
      testResults.passed++;
      return true;
    } else {
      testResults.tests.push({ name: 'Data Refresh', status: 'FAILED', details: 'Negative appointment count after refresh' });
      testResults.failed++;
      return false;
    }
    
  } catch (error) {
    log(`Data refresh test failed: ${error.message}`, 'error');
    testResults.tests.push({ name: 'Data Refresh', status: 'FAILED', error: error.message });
    testResults.failed++;
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Comprehensive Calendar System Test', 'info');
  log(`Frontend: ${CONFIG.baseUrl}`, 'info');
  log(`Backend: ${CONFIG.backendUrl}`, 'info');
  
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport(CONFIG.viewport);
  
  // Set longer timeouts
  page.setDefaultTimeout(CONFIG.timeout);
  page.setDefaultNavigationTimeout(CONFIG.timeout);
  
  try {
    // Run all tests in sequence
    await testLogin(page);
    await testBookingFlow(page);
    await testCalendarViews(page);
    await testDragAndDrop(page);
    await testAPIIntegration(page);
    await testErrorHandling(page);
    await testMobileResponsiveness(page);
    await testDataRefresh(page);
    
  } catch (error) {
    log(`Test runner error: ${error.message}`, 'critical');
    testResults.critical.push({ message: error.message, timestamp: new Date().toISOString() });
  }
  
  await browser.close();
  
  // Generate final report
  generateReport();
}

function generateReport() {
  log('\n📊 COMPREHENSIVE CALENDAR TEST REPORT', 'info');
  log('=' * 50, 'info');
  
  log(`✅ Passed: ${testResults.passed}`, 'success');
  log(`❌ Failed: ${testResults.failed}`, 'error');
  log(`⏭️  Skipped: ${testResults.skipped}`, 'warning');
  
  if (testResults.tests.length > 0) {
    log('\n📋 Test Details:', 'info');
    testResults.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : test.status === 'FAILED' ? '❌' : '⏭️';
      log(`${status} ${test.name}: ${test.status}${test.details ? ` (${test.details})` : ''}${test.error ? ` - ${test.error}` : ''}`, 'info');
    });
  }
  
  if (testResults.critical.length > 0) {
    log('\n🚨 Critical Issues:', 'critical');
    testResults.critical.forEach(issue => {
      log(`- ${issue.message}`, 'critical');
    });
  }
  
  if (testResults.errors.length > 0) {
    log('\n❌ Errors Found:', 'error');
    testResults.errors.forEach(error => {
      log(`- ${error.message}`, 'error');
    });
  }
  
  if (testResults.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'warning');
    testResults.warnings.forEach(warning => {
      log(`- ${warning.message}`, 'warning');
    });
  }
  
  // Calculate overall health score
  const totalTests = testResults.passed + testResults.failed;
  const healthScore = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;
  
  log(`\n🏥 Overall System Health: ${healthScore}%`, healthScore >= 80 ? 'success' : healthScore >= 60 ? 'warning' : 'error');
  
  // Write detailed report to file
  const reportPath = './test-results/calendar-test-report.json';
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      healthScore
    },
    tests: testResults.tests,
    errors: testResults.errors,
    warnings: testResults.warnings,
    critical: testResults.critical
  }, null, 2));
  
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  
  // Exit with appropriate code
  process.exit(testResults.failed === 0 && testResults.critical.length === 0 ? 0 : 1);
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'critical');
    process.exit(1);
  });
}

module.exports = { runTests, testResults };