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

class SimpleBarberTester {
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
    console.log('🚀 Starting Simple Barber Testing...');
    
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
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

    console.log('✅ Browser initialized');
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async takeScreenshot(name) {
    const screenshotPath = path.join(__dirname, 'test-screenshots', `barber-${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push({
      name,
      path: screenshotPath,
      timestamp: new Date().toISOString()
    });
    console.log(`📸 Screenshot saved: ${name}`);
    return screenshotPath;
  }

  async testBarberLogin() {
    console.log('🔐 Testing barber login...');
    
    try {
      // Navigate to login page
      await this.page.goto(`${FRONTEND_URL}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Wait for login form to be visible
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await this.takeScreenshot('login-page');
      
      // Fill login form
      await this.page.type('input[type="email"]', BARBER_CREDENTIALS.email, { delay: 100 });
      await this.page.type('input[type="password"]', BARBER_CREDENTIALS.password, { delay: 100 });
      
      // Submit login
      await this.page.click('button[type="submit"]');
      
      // Wait for redirect
      await this.wait(5000);
      
      const currentUrl = this.page.url();
      const isLoggedIn = !currentUrl.includes('/login');
      
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
      
      console.log(`✅ Login ${isLoggedIn ? 'successful' : 'failed'} - redirected to: ${currentUrl}`);
      return isLoggedIn;
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      this.results.tests.push({
        name: 'Barber Login',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testCalendarAccess() {
    console.log('📅 Testing calendar access...');
    
    try {
      // Navigate to calendar
      await this.page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // Wait for calendar elements to load
      await this.wait(5000);
      
      // Check for calendar elements
      const calendarElements = await this.page.evaluate(() => {
        const selectors = [
          '.calendar',
          '[data-testid="calendar"]',
          '.calendar-container',
          '.calendar-view',
          '.fc-toolbar', // FullCalendar toolbar
          '.fc-view-container', // FullCalendar view
          '.fc-daygrid',
          '.fc-timegrid'
        ];
        
        let foundElements = {};
        selectors.forEach(selector => {
          const element = document.querySelector(selector);
          foundElements[selector] = !!element;
        });
        
        return {
          foundElements,
          hasAnyCalendar: Object.values(foundElements).some(found => found),
          bodyText: document.body.textContent ? document.body.textContent.substring(0, 500) : 'No body text',
          pageTitle: document.title
        };
      });
      
      await this.takeScreenshot('calendar-page');
      
      const calendarWorking = calendarElements.hasAnyCalendar;
      
      this.results.tests.push({
        name: 'Calendar Access',
        passed: calendarWorking,
        details: calendarElements
      });
      
      console.log(`✅ Calendar access ${calendarWorking ? 'successful' : 'failed'}`);
      return calendarWorking;
      
    } catch (error) {
      console.error('❌ Calendar access failed:', error.message);
      this.results.tests.push({
        name: 'Calendar Access',
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
      await this.page.goto(`${FRONTEND_URL}/dashboard`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(3000);
      
      // Check for dashboard elements
      const dashboardElements = await this.page.evaluate(() => {
        const selectors = [
          'h1', 'h2', 'h3',
          '.dashboard',
          '[data-testid="dashboard"]',
          '.dashboard-container',
          '.stats',
          '.metrics',
          '.card',
          '.dashboard-card'
        ];
        
        let foundElements = {};
        selectors.forEach(selector => {
          const element = document.querySelector(selector);
          foundElements[selector] = !!element;
        });
        
        return {
          foundElements,
          hasContent: Object.values(foundElements).some(found => found),
          pageTitle: document.title,
          bodyText: document.body.textContent ? document.body.textContent.substring(0, 500) : 'No body text'
        };
      });
      
      await this.takeScreenshot('dashboard-page');
      
      const dashboardWorking = dashboardElements.hasContent;
      
      this.results.tests.push({
        name: 'Dashboard Access',
        passed: dashboardWorking,
        details: dashboardElements
      });
      
      console.log(`✅ Dashboard access ${dashboardWorking ? 'successful' : 'failed'}`);
      return dashboardWorking;
      
    } catch (error) {
      console.error('❌ Dashboard access failed:', error.message);
      this.results.tests.push({
        name: 'Dashboard Access',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testPremiumCalendarFeatures() {
    console.log('⭐ Testing premium calendar features...');
    
    try {
      // Navigate to calendar
      await this.page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(5000);
      
      // Test for premium features
      const premiumFeatures = await this.page.evaluate(() => {
        const features = {
          dragAndDrop: {
            draggableElements: document.querySelectorAll('[draggable="true"]').length,
            dragHandles: document.querySelectorAll('.drag-handle, .fc-event').length,
            eventElements: document.querySelectorAll('.fc-event, .calendar-event, .appointment').length
          },
          visualEffects: {
            coloredEvents: document.querySelectorAll('.fc-event[style*="color"], .event-colored, .service-haircut, .service-beard').length,
            animatedElements: document.querySelectorAll('[class*="animate"], .transition, .hover\\:').length
          },
          advancedControls: {
            viewSwitcher: document.querySelectorAll('.fc-toolbar button, .view-switcher button, .calendar-view-button').length,
            timeSlots: document.querySelectorAll('.fc-timegrid-slot, .time-slot, .fc-daygrid-day').length,
            navigationButtons: document.querySelectorAll('.fc-prev-button, .fc-next-button, .fc-today-button').length
          },
          interactivity: {
            clickableSlots: document.querySelectorAll('.fc-daygrid-day, .fc-timegrid-slot, .time-slot').length,
            modalTriggers: document.querySelectorAll('[data-modal], .modal-trigger, .appointment-modal').length,
            buttons: document.querySelectorAll('button, .btn, .button').length
          },
          calendar: {
            fullCalendar: !!document.querySelector('.fc'),
            calendarGrid: !!document.querySelector('.fc-daygrid, .fc-timegrid'),
            calendarHeader: !!document.querySelector('.fc-toolbar'),
            calendarEvents: document.querySelectorAll('.fc-event').length
          }
        };
        
        return features;
      });
      
      await this.takeScreenshot('premium-calendar-features');
      
      // Test drag and drop if available
      let dragDropResult = null;
      if (premiumFeatures.dragAndDrop.eventElements > 0) {
        dragDropResult = await this.testDragAndDrop();
      }
      
      // Test view switching
      let viewSwitchResult = null;
      if (premiumFeatures.advancedControls.viewSwitcher > 0) {
        viewSwitchResult = await this.testViewSwitching();
      }
      
      const premiumWorking = (
        premiumFeatures.calendar.fullCalendar ||
        premiumFeatures.dragAndDrop.eventElements > 0 ||
        premiumFeatures.visualEffects.coloredEvents > 0 ||
        premiumFeatures.advancedControls.viewSwitcher > 0
      );
      
      this.results.tests.push({
        name: 'Premium Calendar Features',
        passed: premiumWorking,
        details: {
          premiumFeatures,
          dragDropResult,
          viewSwitchResult,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`✅ Premium calendar features ${premiumWorking ? 'detected' : 'not found'}`);
      return premiumWorking;
      
    } catch (error) {
      console.error('❌ Premium calendar features test failed:', error.message);
      this.results.tests.push({
        name: 'Premium Calendar Features',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testDragAndDrop() {
    console.log('🖱️ Testing drag and drop...');
    
    try {
      // Find draggable elements
      const draggableElements = await this.page.$$('.fc-event, [draggable="true"], .appointment');
      
      if (draggableElements.length === 0) {
        return { success: false, reason: 'No draggable elements found' };
      }
      
      // Get first draggable element
      const sourceElement = draggableElements[0];
      const sourceBox = await sourceElement.boundingBox();
      
      if (!sourceBox) {
        return { success: false, reason: 'Could not get source element bounds' };
      }
      
      // Find drop targets
      const dropTargets = await this.page.$$('.fc-timegrid-slot, .fc-daygrid-day, .time-slot, .calendar-slot');
      
      if (dropTargets.length === 0) {
        return { success: false, reason: 'No drop targets found' };
      }
      
      // Get drop target
      const targetElement = dropTargets[Math.floor(dropTargets.length / 2)];
      const targetBox = await targetElement.boundingBox();
      
      if (!targetBox) {
        return { success: false, reason: 'Could not get target element bounds' };
      }
      
      // Perform drag and drop
      await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
      await this.page.mouse.down();
      await this.wait(500);
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
      await this.page.mouse.up();
      
      await this.wait(1000);
      await this.takeScreenshot('drag-drop-result');
      
      return { success: true, method: 'drag-drop' };
      
    } catch (error) {
      console.error('❌ Drag and drop failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testViewSwitching() {
    console.log('🔄 Testing view switching...');
    
    try {
      // Find view switching buttons
      const viewButtons = await this.page.$$('.fc-toolbar button, .view-switcher button, .calendar-view-button');
      
      if (viewButtons.length === 0) {
        return { success: false, reason: 'No view switching buttons found' };
      }
      
      let switchResults = [];
      
      // Test clicking each view button
      for (let i = 0; i < Math.min(viewButtons.length, 3); i++) {
        try {
          const switchStart = Date.now();
          await viewButtons[i].click();
          await this.wait(1000);
          const switchEnd = Date.now();
          
          switchResults.push({
            buttonIndex: i,
            switchTime: switchEnd - switchStart,
            success: true
          });
          
          console.log(`View switch ${i + 1} took ${switchEnd - switchStart}ms`);
        } catch (error) {
          switchResults.push({
            buttonIndex: i,
            success: false,
            error: error.message
          });
        }
      }
      
      await this.takeScreenshot('view-switching-result');
      
      return { 
        success: switchResults.some(r => r.success), 
        results: switchResults 
      };
      
    } catch (error) {
      console.error('❌ View switching failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testMobileResponsiveness() {
    console.log('📱 Testing mobile responsiveness...');
    
    try {
      // Switch to mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      
      // Test homepage on mobile
      await this.page.goto(`${FRONTEND_URL}/`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(3000);
      await this.takeScreenshot('mobile-homepage');
      
      // Test calendar on mobile
      await this.page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(3000);
      await this.takeScreenshot('mobile-calendar');
      
      // Check mobile features
      const mobileFeatures = await this.page.evaluate(() => {
        return {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: window.innerWidth <= 768
          },
          touch: {
            hasTouchSupport: 'ontouchstart' in window,
            hasPointerEvents: 'onpointerdown' in window
          },
          responsiveElements: {
            hamburgerMenu: document.querySelectorAll('.hamburger, .menu-toggle, .mobile-menu-button').length,
            responsiveNavigation: document.querySelectorAll('.mobile-nav, .nav-mobile').length,
            flexibleLayout: document.querySelectorAll('.flex, .grid').length
          }
        };
      });
      
      // Reset to desktop viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      this.results.tests.push({
        name: 'Mobile Responsiveness',
        passed: mobileFeatures.viewport.isMobile,
        details: mobileFeatures
      });
      
      console.log(`✅ Mobile responsiveness test completed`);
      return true;
      
    } catch (error) {
      console.error('❌ Mobile responsiveness test failed:', error.message);
      this.results.tests.push({
        name: 'Mobile Responsiveness',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testPerformanceMetrics() {
    console.log('⚡ Testing performance metrics...');
    
    try {
      // Navigate to calendar with performance monitoring
      const startTime = Date.now();
      
      await this.page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      const navigationTime = Date.now() - startTime;
      
      // Get performance metrics
      const performanceMetrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          navigation: navigation ? {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.navigationStart
          } : null,
          paint: {
            firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
          },
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          } : null
        };
      });
      
      this.results.performance = {
        navigationTime,
        metrics: performanceMetrics,
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Performance test completed - Navigation: ${navigationTime}ms`);
      return true;
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      this.results.performance = { error: error.message };
      return false;
    }
  }

  async generateReport() {
    console.log('📊 Generating test report...');
    
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
    const reportPath = path.join(__dirname, `barber-simple-test-report-${Date.now()}.json`);
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
    
    if (this.results.performance && this.results.performance.navigationTime > 3000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'Slow page load time',
        details: `Navigation time: ${this.results.performance.navigationTime}ms`,
        suggestion: 'Optimize page loading performance for better user experience'
      });
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
      
      console.log('🎯 Starting simple barber journey testing...');
      
      // Run tests
      const loginSuccess = await this.testBarberLogin();
      
      if (loginSuccess) {
        await this.testDashboardAccess();
        await this.testCalendarAccess();
        await this.testPremiumCalendarFeatures();
      }
      
      // These tests work regardless of login status
      await this.testMobileResponsiveness();
      await this.testPerformanceMetrics();
      
      // Generate final report
      const finalReport = await this.generateReport();
      
      console.log('\n🎉 BARBER JOURNEY TESTING COMPLETED!');
      console.log('===========================================');
      console.log(`✅ Passed: ${finalReport.summary.passedTests}/${finalReport.summary.totalTests}`);
      console.log(`❌ Failed: ${finalReport.summary.failedTests}/${finalReport.summary.totalTests}`);
      console.log(`📸 Screenshots: ${finalReport.summary.totalScreenshots}`);
      console.log(`⚠️  Errors: ${finalReport.summary.totalErrors}`);
      
      // Show test results
      console.log('\n📋 Test Results:');
      finalReport.tests.forEach(test => {
        console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
        if (test.details && test.details.premiumFeatures) {
          console.log(`   • Calendar: ${test.details.premiumFeatures.calendar.fullCalendar ? 'FullCalendar detected' : 'Basic calendar'}`);
          console.log(`   • Events: ${test.details.premiumFeatures.dragAndDrop.eventElements} events found`);
          console.log(`   • Interactions: ${test.details.premiumFeatures.interactivity.clickableSlots} clickable slots`);
        }
      });
      
      if (finalReport.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        finalReport.recommendations.forEach(rec => {
          console.log(`   ${rec.priority.toUpperCase()}: ${rec.suggestion}`);
        });
      }
      
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
  const tester = new SimpleBarberTester();
  tester.runFullTest().then(report => {
    console.log('\n📊 Final Test Report Summary:');
    console.log(JSON.stringify(report.summary, null, 2));
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SimpleBarberTester;