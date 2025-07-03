const puppeteer = require('puppeteer');

async function testCalendarBookingFlow() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  console.log('🔍 Testing BookedBarber Calendar Booking System\n');
  
  const results = {
    clientView: {},
    barberView: {},
    shopView: {},
    enterpriseView: {},
    issues: [],
    uiUxFindings: []
  };

  try {
    // Test 1: Client Booking View
    console.log('1️⃣ Testing Client Booking View...');
    await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle0' });
    
    // Check if calendar loads
    const calendarExists = await page.$('.calendar-container, [data-testid="calendar"], .fc-view-container') !== null;
    results.clientView.calendarLoads = calendarExists;
    
    if (!calendarExists) {
      results.issues.push('Calendar component not found on booking page');
    }
    
    // Check for available time slots
    await page.waitForTimeout(2000);
    const timeSlots = await page.$$('[data-testid*="time-slot"], .time-slot, .available-slot');
    results.clientView.timeSlotsFound = timeSlots.length;
    
    if (timeSlots.length === 0) {
      results.issues.push('No time slots displayed for client booking');
    }
    
    // Check for service selection
    const serviceSelector = await page.$('select[name="service"], [data-testid="service-select"], .service-selector');
    results.clientView.hasServiceSelection = serviceSelector !== null;
    
    // Check for barber selection
    const barberSelector = await page.$('select[name="barber"], [data-testid="barber-select"], .barber-selector');
    results.clientView.hasBarberSelection = barberSelector !== null;
    
    // Test mobile responsiveness
    await page.setViewport({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    const mobileView = await page.$('.mobile-calendar, .calendar-mobile-view');
    results.uiUxFindings.push({
      type: 'mobile',
      hasMobileOptimization: mobileView !== null
    });
    
    // Test 2: Barber Dashboard View
    console.log('\n2️⃣ Testing Barber Dashboard View...');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Check if login form exists
    const loginForm = await page.$('form[action*="login"], [data-testid="login-form"], .login-form');
    results.barberView.hasLoginForm = loginForm !== null;
    
    // Try to navigate to barber calendar
    await page.goto('http://localhost:3000/calendar', { waitUntil: 'networkidle0' });
    
    // Check for authentication redirect
    const currentUrl = page.url();
    results.barberView.requiresAuth = currentUrl.includes('login');
    
    // Check for calendar views
    const viewButtons = await page.$$('[data-view], .view-button, .calendar-view-switcher button');
    results.barberView.calendarViews = viewButtons.length;
    
    // Test 3: Shop Management View
    console.log('\n3️⃣ Testing Shop Management View...');
    await page.goto('http://localhost:3000/settings/calendar', { waitUntil: 'networkidle0' });
    
    // Check for business hours configuration
    const businessHours = await page.$('.business-hours, [data-testid="business-hours"], .hours-configuration');
    results.shopView.hasBusinessHours = businessHours !== null;
    
    // Check for availability settings
    const availabilitySettings = await page.$('.availability-settings, [data-testid="availability"]');
    results.shopView.hasAvailabilitySettings = availabilitySettings !== null;
    
    // Test 4: Enterprise Features
    console.log('\n4️⃣ Testing Enterprise Features...');
    await page.goto('http://localhost:3000/enterprise/calendar', { waitUntil: 'networkidle0' });
    
    // Check for multi-location support
    const locationSelector = await page.$('.location-selector, [data-testid="location-select"]');
    results.enterpriseView.hasMultiLocation = locationSelector !== null;
    
    // Check for analytics
    const analytics = await page.$('.calendar-analytics, .booking-analytics');
    results.enterpriseView.hasAnalytics = analytics !== null;
    
    // UI/UX Analysis
    console.log('\n5️⃣ Analyzing UI/UX...');
    
    // Check loading states
    await page.goto('http://localhost:3000/book', { waitUntil: 'domcontentloaded' });
    const hasLoadingState = await page.$('.loading, .skeleton, [data-loading="true"]') !== null;
    results.uiUxFindings.push({
      type: 'loading',
      hasLoadingStates: hasLoadingState
    });
    
    // Check error states
    const hasErrorBoundary = await page.evaluate(() => {
      return document.querySelector('.error-boundary, .error-message, [data-error]') !== null;
    });
    results.uiUxFindings.push({
      type: 'errors',
      hasErrorHandling: hasErrorBoundary
    });
    
    // Check accessibility
    const accessibilityIssues = await page.accessibility.snapshot();
    results.uiUxFindings.push({
      type: 'accessibility',
      snapshot: accessibilityIssues ? 'Captured' : 'Failed'
    });
    
    // Performance check
    const performanceMetrics = await page.metrics();
    results.uiUxFindings.push({
      type: 'performance',
      metrics: {
        layoutDuration: performanceMetrics.LayoutDuration,
        scriptDuration: performanceMetrics.ScriptDuration,
        taskDuration: performanceMetrics.TaskDuration
      }
    });
    
  } catch (error) {
    console.error('Error during testing:', error);
    results.issues.push(`Test error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  // Generate report
  console.log('\n📊 CALENDAR SYSTEM TEST RESULTS\n');
  console.log('CLIENT VIEW:', JSON.stringify(results.clientView, null, 2));
  console.log('\nBARBER VIEW:', JSON.stringify(results.barberView, null, 2));
  console.log('\nSHOP VIEW:', JSON.stringify(results.shopView, null, 2));
  console.log('\nENTERPRISE VIEW:', JSON.stringify(results.enterpriseView, null, 2));
  console.log('\nISSUES FOUND:', results.issues);
  console.log('\nUI/UX FINDINGS:', JSON.stringify(results.uiUxFindings, null, 2));
  
  return results;
}

// Run the test
testCalendarBookingFlow().catch(console.error);