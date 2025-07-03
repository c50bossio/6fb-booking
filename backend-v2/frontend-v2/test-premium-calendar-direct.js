const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';

class PremiumCalendarTester {
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
    console.log('🚀 Starting Premium Calendar Testing...');
    
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
    const screenshotPath = path.join(__dirname, 'test-screenshots', `premium-${name}-${Date.now()}.png`);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.results.screenshots.push({
      name,
      path: screenshotPath,
      timestamp: new Date().toISOString()
    });
    console.log(`📸 Screenshot saved: ${name}`);
    return screenshotPath;
  }

  async testCalendarAccess() {
    console.log('📅 Testing calendar page access...');
    
    try {
      // Navigate to calendar directly
      await this.page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(5000);
      
      // Check if calendar page loads (might be redirected to login)
      const currentUrl = this.page.url();
      const calendarAccessible = !currentUrl.includes('/login');
      
      await this.takeScreenshot('calendar-access');
      
      this.results.tests.push({
        name: 'Calendar Page Access',
        passed: calendarAccessible,
        details: {
          finalUrl: currentUrl,
          redirectedToLogin: currentUrl.includes('/login'),
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`✅ Calendar access: ${calendarAccessible ? 'accessible' : 'requires authentication'}`);
      return calendarAccessible;
      
    } catch (error) {
      console.error('❌ Calendar access failed:', error.message);
      this.results.tests.push({
        name: 'Calendar Page Access',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testBookingPageCalendar() {
    console.log('📅 Testing booking page calendar...');
    
    try {
      // Navigate to booking page
      await this.page.goto(`${FRONTEND_URL}/booking`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(5000);
      
      // Check for calendar elements on booking page
      const bookingCalendarElements = await this.page.evaluate(() => {
        const selectors = [
          '.calendar',
          '[data-testid="calendar"]',
          '.calendar-container',
          '.booking-calendar',
          '.date-picker',
          '.fc-toolbar',
          '.fc-view-container',
          '.fc-daygrid',
          '.fc-timegrid',
          '.react-calendar',
          '.date-selector'
        ];
        
        let foundElements = {};
        selectors.forEach(selector => {
          const element = document.querySelector(selector);
          foundElements[selector] = !!element;
        });
        
        // Additional checks
        const calendarInputs = document.querySelectorAll('input[type="date"], input[name*="date"]').length;
        const timeSlots = document.querySelectorAll('.time-slot, .available-time, .slot').length;
        const bookingButtons = document.querySelectorAll('button:contains("Book"), .book-btn, .booking-btn').length;
        
        return {
          foundElements,
          hasAnyCalendar: Object.values(foundElements).some(found => found),
          interactiveElements: {
            calendarInputs,
            timeSlots,
            bookingButtons
          },
          bodyText: document.body.textContent ? document.body.textContent.substring(0, 500) : 'No body text',
          pageTitle: document.title
        };
      });
      
      await this.takeScreenshot('booking-calendar');
      
      const bookingCalendarWorking = bookingCalendarElements.hasAnyCalendar || 
                                   bookingCalendarElements.interactiveElements.calendarInputs > 0 ||
                                   bookingCalendarElements.interactiveElements.timeSlots > 0;
      
      this.results.tests.push({
        name: 'Booking Page Calendar',
        passed: bookingCalendarWorking,
        details: bookingCalendarElements
      });
      
      console.log(`✅ Booking calendar: ${bookingCalendarWorking ? 'found' : 'not found'}`);
      return bookingCalendarWorking;
      
    } catch (error) {
      console.error('❌ Booking calendar test failed:', error.message);
      this.results.tests.push({
        name: 'Booking Page Calendar',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testHomepageFeatures() {
    console.log('🏠 Testing homepage calendar features...');
    
    try {
      // Navigate to homepage
      await this.page.goto(`${FRONTEND_URL}/`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(3000);
      
      // Check for homepage calendar/booking features
      const homepageFeatures = await this.page.evaluate(() => {
        const selectors = [
          '.calendar',
          '.booking-widget',
          '.appointment-scheduler',
          '.book-now',
          '.schedule-appointment',
          '[data-testid="booking"]',
          '[data-testid="calendar"]'
        ];
        
        let foundElements = {};
        selectors.forEach(selector => {
          const element = document.querySelector(selector);
          foundElements[selector] = !!element;
        });
        
        // Check for booking-related links
        const bookingLinks = Array.from(document.querySelectorAll('a')).filter(a => 
          a.textContent.toLowerCase().includes('book') || 
          a.textContent.toLowerCase().includes('appointment') ||
          a.href.includes('/booking') ||
          a.href.includes('/calendar')
        ).length;
        
        return {
          foundElements,
          hasBookingFeatures: Object.values(foundElements).some(found => found),
          bookingLinks,
          bodyText: document.body.textContent ? document.body.textContent.substring(0, 500) : 'No body text',
          pageTitle: document.title
        };
      });
      
      await this.takeScreenshot('homepage-features');
      
      const homepageHasBookingFeatures = homepageFeatures.hasBookingFeatures || homepageFeatures.bookingLinks > 0;
      
      this.results.tests.push({
        name: 'Homepage Calendar Features',
        passed: homepageHasBookingFeatures,
        details: homepageFeatures
      });
      
      console.log(`✅ Homepage booking features: ${homepageHasBookingFeatures ? 'found' : 'not found'}`);
      return homepageHasBookingFeatures;
      
    } catch (error) {
      console.error('❌ Homepage features test failed:', error.message);
      this.results.tests.push({
        name: 'Homepage Calendar Features',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testPremiumCalendarComponents() {
    console.log('⭐ Testing premium calendar components...');
    
    try {
      // Try multiple pages to find calendar components
      const pagesToTest = [
        { url: '/', name: 'Homepage' },
        { url: '/booking', name: 'Booking' },
        { url: '/calendar', name: 'Calendar' }
      ];
      
      let overallResults = {
        pagesWithCalendar: 0,
        totalPremiumFeatures: 0,
        bestPage: null,
        allResults: []
      };
      
      for (const pageTest of pagesToTest) {
        try {
          console.log(`  🔍 Testing ${pageTest.name} page...`);
          
          await this.page.goto(`${FRONTEND_URL}${pageTest.url}`, { 
            waitUntil: 'domcontentloaded',
            timeout: 10000 
          });
          
          await this.wait(3000);
          
          const pageFeatures = await this.page.evaluate(() => {
            const features = {
              calendar: {
                fullCalendar: !!document.querySelector('.fc'),
                reactCalendar: !!document.querySelector('.react-calendar'),
                customCalendar: !!document.querySelector('.calendar, .date-picker'),
                calendarGrid: !!document.querySelector('.fc-daygrid, .fc-timegrid, .calendar-grid'),
                calendarHeader: !!document.querySelector('.fc-toolbar, .calendar-header')
              },
              dragAndDrop: {
                draggableElements: document.querySelectorAll('[draggable="true"]').length,
                dragHandles: document.querySelectorAll('.drag-handle, .fc-event').length,
                eventElements: document.querySelectorAll('.fc-event, .calendar-event, .appointment').length
              },
              visualEffects: {
                coloredEvents: document.querySelectorAll('.fc-event[style*="color"], .event-colored, .service-').length,
                animatedElements: document.querySelectorAll('[class*="animate"], .transition, .hover\\:').length,
                styledComponents: document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="border-"]').length
              },
              interactivity: {
                clickableSlots: document.querySelectorAll('.fc-daygrid-day, .fc-timegrid-slot, .time-slot, .available-slot').length,
                buttons: document.querySelectorAll('button, .btn, .button').length,
                forms: document.querySelectorAll('form, input, select').length
              },
              advanced: {
                viewSwitcher: document.querySelectorAll('.fc-toolbar button, .view-switcher button, .calendar-view-button').length,
                navigationButtons: document.querySelectorAll('.fc-prev-button, .fc-next-button, .fc-today-button').length,
                modalTriggers: document.querySelectorAll('[data-modal], .modal-trigger').length
              }
            };
            
            // Calculate premium score
            let premiumScore = 0;
            if (features.calendar.fullCalendar) premiumScore += 10;
            if (features.calendar.reactCalendar) premiumScore += 8;
            if (features.calendar.customCalendar) premiumScore += 5;
            premiumScore += features.dragAndDrop.eventElements * 2;
            premiumScore += features.visualEffects.coloredEvents;
            premiumScore += Math.min(features.interactivity.clickableSlots, 10);
            premiumScore += features.advanced.viewSwitcher * 3;
            
            return {
              features,
              premiumScore,
              hasCalendar: Object.values(features.calendar).some(f => f === true),
              totalElements: features.dragAndDrop.eventElements + 
                           features.interactivity.clickableSlots + 
                           features.advanced.viewSwitcher
            };
          });
          
          pageFeatures.pageName = pageTest.name;
          pageFeatures.pageUrl = pageTest.url;
          overallResults.allResults.push(pageFeatures);
          
          if (pageFeatures.hasCalendar) {
            overallResults.pagesWithCalendar++;
          }
          
          overallResults.totalPremiumFeatures += pageFeatures.premiumScore;
          
          if (!overallResults.bestPage || pageFeatures.premiumScore > overallResults.bestPage.premiumScore) {
            overallResults.bestPage = pageFeatures;
          }
          
          await this.takeScreenshot(`${pageTest.name.toLowerCase()}-premium-test`);
          
        } catch (error) {
          console.log(`    ⚠️ ${pageTest.name} page test failed: ${error.message}`);
        }
      }
      
      const premiumCalendarWorking = overallResults.pagesWithCalendar > 0 && overallResults.totalPremiumFeatures > 5;
      
      this.results.tests.push({
        name: 'Premium Calendar Components',
        passed: premiumCalendarWorking,
        details: overallResults
      });
      
      console.log(`✅ Premium calendar components: ${premiumCalendarWorking ? 'detected' : 'not found'}`);
      console.log(`   • Pages with calendar: ${overallResults.pagesWithCalendar}/3`);
      console.log(`   • Total premium score: ${overallResults.totalPremiumFeatures}`);
      if (overallResults.bestPage) {
        console.log(`   • Best page: ${overallResults.bestPage.pageName} (score: ${overallResults.bestPage.premiumScore})`);
      }
      
      return premiumCalendarWorking;
      
    } catch (error) {
      console.error('❌ Premium calendar components test failed:', error.message);
      this.results.tests.push({
        name: 'Premium Calendar Components',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async testCalendarInteractivity() {
    console.log('🖱️ Testing calendar interactivity...');
    
    try {
      // Find the best page with calendar features
      let bestPage = '/booking'; // Default to booking page
      
      if (this.results.tests.length > 0) {
        const premiumTest = this.results.tests.find(t => t.name === 'Premium Calendar Components');
        if (premiumTest && premiumTest.details && premiumTest.details.bestPage) {
          bestPage = premiumTest.details.bestPage.pageUrl;
        }
      }
      
      console.log(`  🎯 Testing interactivity on: ${bestPage}`);
      
      await this.page.goto(`${FRONTEND_URL}${bestPage}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.wait(3000);
      
      let interactionResults = {
        clicks: [],
        hovers: [],
        dragDrop: null
      };
      
      // Test clicking on various elements
      const clickableElements = await this.page.$$('button, .btn, .time-slot, .fc-daygrid-day, .fc-event, .available-slot');
      
      for (let i = 0; i < Math.min(clickableElements.length, 5); i++) {
        try {
          const clickStart = Date.now();
          await clickableElements[i].click();
          await this.wait(500);
          const clickEnd = Date.now();
          
          interactionResults.clicks.push({
            index: i,
            responseTime: clickEnd - clickStart,
            success: true
          });
          
        } catch (error) {
          interactionResults.clicks.push({
            index: i,
            success: false,
            error: error.message
          });
        }
      }
      
      // Test drag and drop if elements are available
      const draggableElements = await this.page.$$('.fc-event, [draggable="true"]');
      const dropTargets = await this.page.$$('.fc-timegrid-slot, .fc-daygrid-day, .time-slot');
      
      if (draggableElements.length > 0 && dropTargets.length > 0) {
        try {
          const sourceBox = await draggableElements[0].boundingBox();
          const targetBox = await dropTargets[Math.floor(dropTargets.length / 2)].boundingBox();
          
          if (sourceBox && targetBox) {
            await this.page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await this.page.mouse.down();
            await this.wait(500);
            await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
            await this.page.mouse.up();
            
            interactionResults.dragDrop = { success: true };
          }
        } catch (error) {
          interactionResults.dragDrop = { success: false, error: error.message };
        }
      }
      
      await this.takeScreenshot('interactivity-test');
      
      const interactivityWorking = (
        interactionResults.clicks.some(c => c.success) ||
        (interactionResults.dragDrop && interactionResults.dragDrop.success)
      );
      
      this.results.tests.push({
        name: 'Calendar Interactivity',
        passed: interactivityWorking,
        details: {
          testPage: bestPage,
          interactions: interactionResults,
          clickableElementsFound: clickableElements.length,
          draggableElementsFound: draggableElements.length,
          dropTargetsFound: dropTargets.length
        }
      });
      
      console.log(`✅ Calendar interactivity: ${interactivityWorking ? 'working' : 'limited'}`);
      console.log(`   • Successful clicks: ${interactionResults.clicks.filter(c => c.success).length}`);
      console.log(`   • Drag & drop: ${interactionResults.dragDrop ? (interactionResults.dragDrop.success ? 'working' : 'failed') : 'not tested'}`);
      
      return interactivityWorking;
      
    } catch (error) {
      console.error('❌ Calendar interactivity test failed:', error.message);
      this.results.tests.push({
        name: 'Calendar Interactivity',
        passed: false,
        error: error.message
      });
      return false;
    }
  }

  async generateReport() {
    console.log('📊 Generating premium calendar test report...');
    
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
      analysis: this.analyzeResults(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    const reportPath = path.join(__dirname, `premium-calendar-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Report saved to: ${reportPath}`);
    return report;
  }

  analyzeResults() {
    const analysis = {
      calendarImplementation: 'none',
      premiumFeatures: [],
      userExperience: 'basic',
      technicalImplementation: 'unknown'
    };
    
    // Analyze calendar implementation
    const premiumTest = this.results.tests.find(t => t.name === 'Premium Calendar Components');
    if (premiumTest && premiumTest.details && premiumTest.details.bestPage) {
      const features = premiumTest.details.bestPage.features;
      
      if (features.calendar.fullCalendar) {
        analysis.calendarImplementation = 'FullCalendar';
        analysis.technicalImplementation = 'professional';
      } else if (features.calendar.reactCalendar) {
        analysis.calendarImplementation = 'React Calendar';
        analysis.technicalImplementation = 'modern';
      } else if (features.calendar.customCalendar) {
        analysis.calendarImplementation = 'Custom Calendar';
        analysis.technicalImplementation = 'custom';
      }
      
      // Identify premium features
      if (features.dragAndDrop.eventElements > 0) analysis.premiumFeatures.push('Drag & Drop Events');
      if (features.advanced.viewSwitcher > 0) analysis.premiumFeatures.push('View Switching');
      if (features.visualEffects.coloredEvents > 0) analysis.premiumFeatures.push('Colored Events');
      if (features.interactivity.clickableSlots > 5) analysis.premiumFeatures.push('Interactive Time Slots');
      
      // Assess user experience
      const premiumScore = premiumTest.details.bestPage.premiumScore;
      if (premiumScore > 20) analysis.userExperience = 'premium';
      else if (premiumScore > 10) analysis.userExperience = 'enhanced';
      else if (premiumScore > 5) analysis.userExperience = 'standard';
    }
    
    return analysis;
  }

  generateRecommendations() {
    const recommendations = [];
    const analysis = this.analyzeResults();
    
    if (analysis.calendarImplementation === 'none') {
      recommendations.push({
        priority: 'high',
        category: 'functionality',
        issue: 'No calendar implementation detected',
        suggestion: 'Implement a calendar system for barber appointment management'
      });
    }
    
    if (analysis.premiumFeatures.length === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'user experience',
        issue: 'Limited premium calendar features',
        suggestion: 'Add drag & drop functionality, view switching, and visual enhancements for better barber productivity'
      });
    }
    
    if (this.results.errors.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'stability',
        issue: 'Console errors detected',
        suggestion: 'Address JavaScript errors to improve calendar stability and performance'
      });
    }
    
    if (analysis.userExperience === 'basic') {
      recommendations.push({
        priority: 'low',
        category: 'enhancement',
        issue: 'Basic user experience',
        suggestion: 'Consider upgrading to a more feature-rich calendar solution for enhanced barber workflows'
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
      
      console.log('🎯 Starting premium calendar testing...');
      
      // Run all tests
      await this.testCalendarAccess();
      await this.testHomepageFeatures();
      await this.testBookingPageCalendar();
      await this.testPremiumCalendarComponents();
      await this.testCalendarInteractivity();
      
      // Generate final report
      const finalReport = await this.generateReport();
      
      console.log('\n🎉 PREMIUM CALENDAR TESTING COMPLETED!');
      console.log('===========================================');
      console.log(`✅ Passed: ${finalReport.summary.passedTests}/${finalReport.summary.totalTests}`);
      console.log(`❌ Failed: ${finalReport.summary.failedTests}/${finalReport.summary.totalTests}`);
      console.log(`📸 Screenshots: ${finalReport.summary.totalScreenshots}`);
      console.log(`⚠️  Errors: ${finalReport.summary.totalErrors}`);
      
      // Show analysis
      console.log('\n📋 Analysis:');
      console.log(`   • Calendar Implementation: ${finalReport.analysis.calendarImplementation}`);
      console.log(`   • Technical Level: ${finalReport.analysis.technicalImplementation}`);
      console.log(`   • User Experience: ${finalReport.analysis.userExperience}`);
      console.log(`   • Premium Features: ${finalReport.analysis.premiumFeatures.join(', ') || 'None detected'}`);
      
      // Show test results
      console.log('\n📋 Test Results:');
      finalReport.tests.forEach(test => {
        console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
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
  const tester = new PremiumCalendarTester();
  tester.runFullTest().then(report => {
    console.log('\n📊 Final Analysis Summary:');
    console.log(JSON.stringify(report.analysis, null, 2));
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = PremiumCalendarTester;