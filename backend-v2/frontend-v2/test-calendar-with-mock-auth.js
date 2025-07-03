#!/usr/bin/env node

/**
 * Calendar Testing with Mock Authentication
 * Bypasses login form by directly setting auth tokens to test calendar functionality
 */

const { chromium } = require('playwright');

class CalendarMockAuthTest {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('📅 Testing Calendar with Mock Authentication...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testCalendarWithMockAuth() {
    console.log('\n🔐 Setting up mock authentication...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // First, navigate to a page to set localStorage
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(1000);
      } catch (e) {
        // Cookie consent optional
      }

      // Set mock authentication tokens in localStorage
      console.log('  🎫 Setting mock auth tokens...');
      await page.evaluate(() => {
        // Set a mock JWT token (this won't be validated by backend, but will make frontend think user is authenticated)
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBib29rZWRiYXJiZXIuZGV2Iiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock-signature';
        const mockRefreshToken = 'mock-refresh-token';
        
        localStorage.setItem('token', mockToken);
        localStorage.setItem('refresh_token', mockRefreshToken);
        
        return {
          tokenSet: !!localStorage.getItem('token'),
          refreshTokenSet: !!localStorage.getItem('refresh_token')
        };
      });

      console.log('  ✅ Mock tokens set');

      // Now navigate to calendar page
      console.log('\n📅 Navigating to calendar page...');
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(8000); // Give time for components to load

      // Analyze the calendar page with mock auth
      const calendarAnalysis = await page.evaluate(() => {
        return {
          // URL and basic state
          currentUrl: window.location.href,
          isOnCalendar: window.location.pathname === '/calendar',
          isRedirectedToLogin: window.location.pathname === '/login',
          
          // Authentication state
          authTokens: {
            hasToken: !!localStorage.getItem('token'),
            hasRefreshToken: !!localStorage.getItem('refresh_token')
          },
          
          // Page content analysis
          pageContent: {
            totalElements: document.querySelectorAll('*').length,
            bodyTextLength: document.body.textContent.length,
            headings: Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => h.textContent?.trim()).slice(0, 10),
            hasCalendarText: document.body.textContent.toLowerCase().includes('calendar')
          },
          
          // Calendar-specific elements
          calendarElements: {
            calendarPage: !!document.querySelector('.calendar-page'),
            calendarHeader: !!document.querySelector('.calendar-header'),
            calendarContainer: !!document.querySelector('[class*="calendar"]'),
            
            // Look for common calendar patterns
            dateElements: document.querySelectorAll('[class*="date"], td, .day, [data-date]').length,
            timeElements: document.querySelectorAll('[class*="time"], [data-time]').length,
            appointmentElements: document.querySelectorAll('[class*="appointment"], [class*="event"], [class*="booking"]').length,
            
            // Navigation elements
            navigationButtons: Array.from(document.querySelectorAll('button'))
              .filter(btn => {
                const text = btn.textContent?.toLowerCase() || '';
                return text.includes('today') || text.includes('month') || 
                       text.includes('week') || text.includes('day') ||
                       text.includes('prev') || text.includes('next');
              }).length,
            
            // Specific calendar components
            responsiveCalendar: !!document.querySelector('[class*="ResponsiveCalendar"], [class*="responsive-calendar"]'),
            calendarGrid: !!document.querySelector('table, .calendar-grid, [class*="grid"]'),
            calendarViews: document.querySelectorAll('[class*="view"], [data-view]').length
          },
          
          // Error and loading states
          errorStates: {
            hasErrors: document.querySelectorAll('[class*="error"], [data-error]').length > 0,
            hasLoadingStates: document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]').length > 0,
            errorMessages: Array.from(document.querySelectorAll('[class*="error"]'))
              .map(el => el.textContent?.trim()).filter(text => text).slice(0, 3)
          },
          
          // Interactive elements
          interactiveElements: {
            totalButtons: document.querySelectorAll('button').length,
            clickableElements: document.querySelectorAll('[onclick], [role="button"], .cursor-pointer').length,
            formElements: document.querySelectorAll('form, input, select, textarea').length
          }
        };
      });

      console.log('\n📊 Calendar Analysis with Mock Auth:');
      console.log('  🌐 Navigation:');
      console.log('    Current URL:', calendarAnalysis.currentUrl);
      console.log('    On Calendar Page:', calendarAnalysis.isOnCalendar);
      console.log('    Redirected to Login:', calendarAnalysis.isRedirectedToLogin);
      
      console.log('\n  🔐 Authentication:');
      console.log('    Has Token:', calendarAnalysis.authTokens.hasToken);
      console.log('    Has Refresh Token:', calendarAnalysis.authTokens.hasRefreshToken);
      
      console.log('\n  📄 Page Content:');
      console.log('    Total Elements:', calendarAnalysis.pageContent.totalElements);
      console.log('    Body Text Length:', calendarAnalysis.pageContent.bodyTextLength);
      console.log('    Has Calendar Text:', calendarAnalysis.pageContent.hasCalendarText);
      console.log('    Page Headings:', calendarAnalysis.pageContent.headings);
      
      console.log('\n  📅 Calendar Elements:');
      console.log('    Calendar Page Container:', calendarAnalysis.calendarElements.calendarPage);
      console.log('    Calendar Header:', calendarAnalysis.calendarElements.calendarHeader);
      console.log('    Calendar Container:', calendarAnalysis.calendarElements.calendarContainer);
      console.log('    Responsive Calendar:', calendarAnalysis.calendarElements.responsiveCalendar);
      console.log('    Calendar Grid:', calendarAnalysis.calendarElements.calendarGrid);
      console.log('    Date Elements:', calendarAnalysis.calendarElements.dateElements);
      console.log('    Time Elements:', calendarAnalysis.calendarElements.timeElements);
      console.log('    Appointment Elements:', calendarAnalysis.calendarElements.appointmentElements);
      console.log('    Navigation Buttons:', calendarAnalysis.calendarElements.navigationButtons);
      console.log('    Calendar Views:', calendarAnalysis.calendarElements.calendarViews);
      
      console.log('\n  ⚠️  Error States:');
      console.log('    Has Errors:', calendarAnalysis.errorStates.hasErrors);
      console.log('    Has Loading States:', calendarAnalysis.errorStates.hasLoadingStates);
      if (calendarAnalysis.errorStates.errorMessages.length > 0) {
        console.log('    Error Messages:', calendarAnalysis.errorStates.errorMessages);
      }
      
      console.log('\n  🔘 Interactive Elements:');
      console.log('    Total Buttons:', calendarAnalysis.interactiveElements.totalButtons);
      console.log('    Clickable Elements:', calendarAnalysis.interactiveElements.clickableElements);
      console.log('    Form Elements:', calendarAnalysis.interactiveElements.formElements);

      // Test calendar interactions if available
      if (calendarAnalysis.calendarElements.navigationButtons > 0) {
        console.log('\n  🔄 Testing Calendar Interactions...');
        try {
          // Test today button if available
          const todayButton = await page.$('button:has-text("Today"), button:has-text("today")');
          if (todayButton) {
            await todayButton.click();
            await page.waitForTimeout(1000);
            console.log('    ✅ Today button interaction works');
          }

          // Test view switching if available
          const viewButtons = await page.$$('button');
          for (let button of viewButtons.slice(0, 3)) { // Test first 3 buttons
            const text = await button.textContent();
            if (text && (text.includes('Month') || text.includes('Week') || text.includes('Day'))) {
              await button.click();
              await page.waitForTimeout(1000);
              console.log(`    ✅ ${text} button interaction works`);
              break;
            }
          }

        } catch (error) {
          console.log('    ❌ Calendar interaction test failed:', error.message);
        }
      }

      // Take screenshot for visual verification
      await page.screenshot({ 
        path: './test-screenshots/calendar-mock-auth.png', 
        fullPage: true 
      });

      // Calendar functionality assessment
      console.log('\n🎯 Calendar Functionality Assessment:');
      
      if (calendarAnalysis.isRedirectedToLogin) {
        console.log('  🔴 CRITICAL: Still redirected to login despite mock tokens');
        console.log('     - Frontend auth check may be validating token with backend');
        console.log('     - Need to check AppLayout authentication logic');
      } else if (!calendarAnalysis.isOnCalendar) {
        console.log('  🟡 WARNING: Not on calendar page - unexpected redirect');
      } else if (calendarAnalysis.pageContent.totalElements < 200) {
        console.log('  🔴 CRITICAL: Very few page elements - calendar not rendering');
        console.log('     - Check component loading and error boundaries');
      } else if (!calendarAnalysis.calendarElements.calendarPage && !calendarAnalysis.calendarElements.calendarContainer) {
        console.log('  🔴 CRITICAL: No calendar components found');
        console.log('     - Calendar components may not be mounting');
      } else if (calendarAnalysis.calendarElements.dateElements === 0) {
        console.log('  🟡 WARNING: Calendar container found but no date elements');
        console.log('     - Calendar may be in loading state or empty');
      } else {
        console.log('  ✅ SUCCESS: Calendar components detected and rendering');
        
        if (calendarAnalysis.calendarElements.navigationButtons > 0) {
          console.log('     - Navigation controls available');
        }
        if (calendarAnalysis.calendarElements.appointmentElements > 0) {
          console.log(`     - ${calendarAnalysis.calendarElements.appointmentElements} appointments/events displayed`);
        }
        if (calendarAnalysis.calendarElements.responsiveCalendar) {
          console.log('     - Responsive calendar component detected');
        }
      }

      if (calendarAnalysis.errorStates.hasErrors) {
        console.log('  🔴 ERROR: Error states detected on calendar page');
        if (calendarAnalysis.errorStates.errorMessages.length > 0) {
          console.log('     - Error messages:', calendarAnalysis.errorStates.errorMessages);
        }
      }

    } catch (error) {
      console.log('  ❌ Calendar mock auth test error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testCalendarWithMockAuth();
      
      console.log('\n✅ Calendar Mock Auth Test Complete!');
      console.log('📸 Screenshot saved to test-screenshots/calendar-mock-auth.png');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run calendar mock auth test
const tester = new CalendarMockAuthTest();
tester.run().catch(console.error);