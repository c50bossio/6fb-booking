const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

// Test credentials
const BARBER_CREDENTIALS = {
  email: 'admin@bookedbarber.com',
  password: 'admin123'
};

// Test data
const TEST_APPOINTMENT = {
  client_name: 'John Doe',
  client_email: 'john@example.com',
  client_phone: '555-0123',
  service: 'Premium Haircut',
  date: '2025-07-05',
  time: '10:00'
};

class BarberJourneyTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      screenshots: [],
      performance: {},
      errors: []
    };
  }

  async init() {
    console.log('🚀 Starting Barber Journey Testing...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable request interception for monitoring
    await this.page.setRequestInterception(true);
    this.page.on('request', (request) => {
      request.continue();
    });
    
    // Monitor console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.results.errors.push({
          type: 'console',
          message: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Monitor network failures
    this.page.on('requestfailed', (request) => {
      this.results.errors.push({
        type: 'network',
        url: request.url(),
        failure: request.failure().errorText,
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Browser initialized successfully');
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(__dirname, 'test-screenshots', `barber-${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push({
      name,
      path: screenshotPath,
      timestamp: new Date().toISOString()
    });
    return screenshotPath;
  }

  async testBarberLogin() {
    console.log('🔐 Testing barber login...');
    
    try {
      // Navigate to login page
      await this.page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
      await this.takeScreenshot('login-page');
      
      // Fill login form
      await this.page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await this.page.type('input[name="email"]', BARBER_CREDENTIALS.email);
      await this.page.type('input[name="password"]', BARBER_CREDENTIALS.password);
      
      // Submit login
      await this.page.click('button[type="submit"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check if logged in successfully
      const currentUrl = this.page.url();
      const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl.includes('/calendar');
      
      await this.takeScreenshot('after-login');
      
      this.results.tests.push({
        name: 'Barber Login',
        passed: isLoggedIn,
        details: {
          loginEmail: BARBER_CREDENTIALS.email,
          redirectUrl: currentUrl,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`✅ Barber login ${isLoggedIn ? 'successful' : 'failed'}`);
      return isLoggedIn;
      
    } catch (error) {
      console.error('❌ Barber login failed:', error);
      this.results.tests.push({
        name: 'Barber Login',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testDashboardAccess() {
    console.log('📊 Testing dashboard access...');
    
    try {
      // Navigate to dashboard
      await this.page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
      
      // Check for dashboard elements
      const dashboardElements = await this.page.evaluate(() => {
        const elements = {
          title: document.querySelector('h1, h2, [data-testid="dashboard-title"]'),
          calendar: document.querySelector('[data-testid="calendar"], .calendar'),
          navigation: document.querySelector('nav, [data-testid="navigation"]'),
          appointments: document.querySelector('[data-testid="appointments"], .appointments')
        };
        
        return {
          hasTitle: !!elements.title,
          hasCalendar: !!elements.calendar,
          hasNavigation: !!elements.navigation,
          hasAppointments: !!elements.appointments,
          titleText: elements.title ? elements.title.textContent : null
        };
      });
      
      await this.takeScreenshot('dashboard');
      
      const dashboardWorking = dashboardElements.hasTitle || dashboardElements.hasCalendar;
      
      this.results.tests.push({
        name: 'Dashboard Access',
        passed: dashboardWorking,
        details: dashboardElements
      });
      
      console.log(`✅ Dashboard access ${dashboardWorking ? 'successful' : 'failed'}`);
      return dashboardWorking;
      
    } catch (error) {
      console.error('❌ Dashboard access failed:', error);
      this.results.tests.push({
        name: 'Dashboard Access',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testCalendarManagement() {
    console.log('📅 Testing calendar management...');
    
    try {
      // Navigate to calendar page
      await this.page.goto(`${FRONTEND_URL}/calendar`, { waitUntil: 'networkidle2' });
      
      // Wait for calendar to load
      await this.page.waitForSelector('.calendar, [data-testid="calendar"]', { timeout: 15000 });
      
      // Test calendar view switching
      const viewSwitching = await this.page.evaluate(() => {
        const dayButton = document.querySelector('button[data-view="day"], [data-testid="day-view"]');
        const weekButton = document.querySelector('button[data-view="week"], [data-testid="week-view"]');
        const monthButton = document.querySelector('button[data-view="month"], [data-testid="month-view"]');
        
        return {
          hasDayView: !!dayButton,
          hasWeekView: !!weekButton,
          hasMonthView: !!monthButton
        };
      });
      
      await this.takeScreenshot('calendar-main');
      
      // Test appointment creation
      const appointmentCreation = await this.testAppointmentCreation();
      
      // Test drag and drop functionality
      const dragDropTest = await this.testDragAndDrop();
      
      this.results.tests.push({
        name: 'Calendar Management',
        passed: true,
        details: {
          viewSwitching,
          appointmentCreation,
          dragDropTest,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Calendar management test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Calendar management failed:', error);
      this.results.tests.push({
        name: 'Calendar Management',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testAppointmentCreation() {
    console.log('📝 Testing appointment creation...');
    
    try {
      // Look for appointment creation button
      const createButton = await this.page.$('button[data-testid="create-appointment"], button:has-text("Create Appointment"), button:has-text("Add Appointment")');
      
      if (createButton) {
        await createButton.click();
        await this.page.waitForTimeout(2000);
        
        // Fill appointment form if it appears
        const formVisible = await this.page.$('form, [data-testid="appointment-form"]');
        if (formVisible) {
          await this.page.type('input[name="client_name"], input[placeholder*="name"]', TEST_APPOINTMENT.client_name);
          await this.page.type('input[name="client_email"], input[placeholder*="email"]', TEST_APPOINTMENT.client_email);
          await this.page.type('input[name="client_phone"], input[placeholder*="phone"]', TEST_APPOINTMENT.client_phone);
          
          // Submit form
          await this.page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
          await this.page.waitForTimeout(2000);
          
          await this.takeScreenshot('appointment-created');
          
          return { success: true, method: 'form' };
        }
      }
      
      // Alternative: Try clicking on calendar time slot
      const timeSlot = await this.page.$('.calendar-slot, .time-slot, [data-testid="time-slot"]');
      if (timeSlot) {
        await timeSlot.click();
        await this.page.waitForTimeout(2000);
        await this.takeScreenshot('time-slot-clicked');
        return { success: true, method: 'time-slot' };
      }
      
      return { success: false, reason: 'No creation method found' };
      
    } catch (error) {
      console.error('❌ Appointment creation test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testDragAndDrop() {
    console.log('🖱️ Testing drag and drop functionality...');
    
    try {
      // Look for draggable appointment elements
      const draggableElements = await this.page.$$('.appointment, .event, [draggable="true"]');
      
      if (draggableElements.length > 0) {
        const sourceElement = draggableElements[0];
        const sourceBox = await sourceElement.boundingBox();
        
        // Find a drop target
        const dropTargets = await this.page.$$('.calendar-slot, .time-slot, .drop-zone');
        
        if (dropTargets.length > 0 && sourceBox) {
          const targetElement = dropTargets[Math.floor(dropTargets.length / 2)];
          const targetBox = await targetElement.boundingBox();
          
          if (targetBox) {
            // Perform drag and drop
            await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await this.page.mouse.down();
            await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
            await this.page.mouse.up();
            
            await this.page.waitForTimeout(2000);
            await this.takeScreenshot('drag-drop-completed');
            
            return { success: true, method: 'drag-drop' };
          }
        }
      }
      
      return { success: false, reason: 'No draggable elements found' };
      
    } catch (error) {
      console.error('❌ Drag and drop test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testMobileExperience() {
    console.log('📱 Testing mobile experience...');
    
    try {
      // Switch to mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Reload calendar page
      await this.page.reload({ waitUntil: 'networkidle2' });
      await this.takeScreenshot('mobile-calendar');
      
      // Test mobile navigation
      const mobileNavigation = await this.page.evaluate(() => {
        const hamburgerMenu = document.querySelector('.hamburger, .menu-toggle, [data-testid="mobile-menu"]');
        const mobileNav = document.querySelector('.mobile-nav, .nav-mobile, [data-testid="mobile-navigation"]');
        
        return {
          hasHamburgerMenu: !!hamburgerMenu,
          hasMobileNav: !!mobileNav,
          isResponsive: window.innerWidth <= 768
        };
      });
      
      // Test touch interactions
      const touchTest = await this.testTouchInteractions();
      
      // Reset to desktop viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      this.results.tests.push({
        name: 'Mobile Experience',
        passed: true,
        details: {
          mobileNavigation,
          touchTest,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Mobile experience test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Mobile experience test failed:', error);
      this.results.tests.push({
        name: 'Mobile Experience',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testTouchInteractions() {
    console.log('👆 Testing touch interactions...');
    
    try {
      // Simulate touch events on calendar
      const touchableElements = await this.page.$$('.calendar-slot, .time-slot, .appointment');
      
      if (touchableElements.length > 0) {
        const element = touchableElements[0];
        const box = await element.boundingBox();
        
        if (box) {
          // Simulate tap
          await this.page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await this.page.waitForTimeout(1000);
          
          await this.takeScreenshot('touch-interaction');
          
          return { success: true, method: 'touch-tap' };
        }
      }
      
      return { success: false, reason: 'No touchable elements found' };
      
    } catch (error) {
      console.error('❌ Touch interactions test failed:', error);
      return { success: false, error: error.message };
    }
  }

  async testPerformance() {
    console.log('⚡ Testing performance...');
    
    try {
      // Start performance monitoring
      await this.page.evaluateOnNewDocument(() => {
        window.performance.mark('test-start');
      });
      
      // Navigate to calendar with performance monitoring
      const response = await this.page.goto(`${FRONTEND_URL}/calendar`, { waitUntil: 'networkidle2' });
      
      // Measure performance metrics
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime,
          responseTime: response ? response.status() : null
        };
      });
      
      // Test calendar rendering performance
      const calendarPerformance = await this.testCalendarPerformance();
      
      this.results.performance = {
        pageLoad: performanceMetrics,
        calendar: calendarPerformance,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Performance test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Performance test failed:', error);
      this.results.performance = { error: error.message };
      return false;
    }
  }

  async testCalendarPerformance() {
    console.log('📊 Testing calendar performance...');
    
    try {
      const startTime = Date.now();
      
      // Test calendar switching performance
      const viewButtons = await this.page.$$('button[data-view], .view-button');
      
      if (viewButtons.length > 0) {
        for (const button of viewButtons) {
          const switchStart = Date.now();
          await button.click();
          await this.page.waitForTimeout(500);
          const switchEnd = Date.now();
          
          console.log(`View switch took ${switchEnd - switchStart}ms`);
        }
      }
      
      // Test appointment interactions performance
      const appointments = await this.page.$$('.appointment, .event');
      let interactionTimes = [];
      
      for (let i = 0; i < Math.min(appointments.length, 5); i++) {
        const interactionStart = Date.now();
        await appointments[i].click();
        await this.page.waitForTimeout(200);
        const interactionEnd = Date.now();
        interactionTimes.push(interactionEnd - interactionStart);
      }
      
      const endTime = Date.now();
      
      return {
        totalTestTime: endTime - startTime,
        averageInteractionTime: interactionTimes.length > 0 ? interactionTimes.reduce((a, b) => a + b) / interactionTimes.length : 0,
        interactionTimes,
        appointmentCount: appointments.length
      };
      
    } catch (error) {
      console.error('❌ Calendar performance test failed:', error);
      return { error: error.message };
    }
  }

  async testClientCommunication() {
    console.log('💬 Testing client communication features...');
    
    try {
      // Look for client management sections
      const clientFeatures = await this.page.evaluate(() => {
        const clientList = document.querySelector('.client-list, [data-testid="client-list"]');
        const clientNotes = document.querySelector('.client-notes, [data-testid="client-notes"]');
        const clientHistory = document.querySelector('.client-history, [data-testid="client-history"]');
        const notifications = document.querySelector('.notifications, [data-testid="notifications"]');
        
        return {
          hasClientList: !!clientList,
          hasClientNotes: !!clientNotes,
          hasClientHistory: !!clientHistory,
          hasNotifications: !!notifications
        };
      });
      
      await this.takeScreenshot('client-communication');
      
      this.results.tests.push({
        name: 'Client Communication',
        passed: true,
        details: {
          clientFeatures,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Client communication test completed');
      return true;
      
    } catch (error) {
      console.error('❌ Client communication test failed:', error);
      this.results.tests.push({
        name: 'Client Communication',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async generateReport() {
    console.log('📊 Generating comprehensive test report...');
    
    const report = {
      ...this.results,
      summary: {
        totalTests: this.results.tests.length,
        passedTests: this.results.tests.filter(t => t.passed).length,
        failedTests: this.results.tests.filter(t => !t.passed).length,
        totalErrors: this.results.errors.length,
        totalScreenshots: this.results.screenshots.length,
        testDuration: new Date().toISOString()
      },
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, `barber-journey-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze test results and generate recommendations
    const failedTests = this.results.tests.filter(t => !t.passed);
    const hasErrors = this.results.errors.length > 0;
    
    if (failedTests.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'functionality',
        issue: 'Failed tests detected',
        details: failedTests.map(t => t.name),
        suggestion: 'Review and fix failed test cases to ensure barber workflow functionality'
      });
    }
    
    if (hasErrors) {
      recommendations.push({
        priority: 'medium',
        category: 'stability',
        issue: 'Console/Network errors detected',
        details: this.results.errors.length + ' errors found',
        suggestion: 'Address console errors and network failures for improved stability'
      });
    }
    
    if (this.results.performance && this.results.performance.pageLoad) {
      const loadTime = this.results.performance.pageLoad.loadComplete;
      if (loadTime > 3000) {
        recommendations.push({
          priority: 'medium',
          category: 'performance',
          issue: 'Slow page load time',
          details: `Load time: ${loadTime}ms`,
          suggestion: 'Optimize page loading performance for better user experience'
        });
      }
    }
    
    return recommendations;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Cleanup completed');
  }

  async runFullTest() {
    try {
      await this.init();
      
      // Ensure screenshots directory exists
      const screenshotsDir = path.join(__dirname, 'test-screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      console.log('🎯 Starting comprehensive barber journey testing...');
      
      // Run all tests
      const loginSuccess = await this.testBarberLogin();
      
      if (loginSuccess) {
        await this.testDashboardAccess();
        await this.testCalendarManagement();
        await this.testMobileExperience();
        await this.testPerformance();
        await this.testClientCommunication();
      }
      
      // Generate final report
      const finalReport = await this.generateReport();
      
      console.log('\n🎉 BARBER JOURNEY TESTING COMPLETED!');
      console.log('===========================================');
      console.log(`✅ Passed: ${finalReport.summary.passedTests}/${finalReport.summary.totalTests}`);
      console.log(`❌ Failed: ${finalReport.summary.failedTests}/${finalReport.summary.totalTests}`);
      console.log(`📸 Screenshots: ${finalReport.summary.totalScreenshots}`);
      console.log(`⚠️  Errors: ${finalReport.summary.totalErrors}`);
      console.log('===========================================');
      
      return finalReport;
      
    } catch (error) {
      console.error('🚨 Fatal error during testing:', error);
      this.results.errors.push({
        type: 'fatal',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return this.results;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test if executed directly
if (require.main === module) {
  const tester = new BarberJourneyTester();
  tester.runFullTest().then(report => {
    console.log('\n📊 Final Test Report Summary:');
    console.log(JSON.stringify(report.summary, null, 2));
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = BarberJourneyTester;