#!/usr/bin/env node

/**
 * Authenticated Calendar Testing
 * Tests calendar functionality with proper authentication
 */

const { chromium } = require('playwright');

class AuthenticatedCalendarTest {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🔐 Starting Authenticated Calendar Testing...');
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

  async authenticateUser() {
    console.log('\n🔑 Authenticating User...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to login page
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');

      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(1000);
      } catch (e) {
        // Cookie consent optional
      }

      await page.waitForTimeout(2000);

      // Check if login form is present
      const loginForm = await page.evaluate(() => {
        return {
          hasEmailInput: !!document.querySelector('input[type="email"], input[name="email"]'),
          hasPasswordInput: !!document.querySelector('input[type="password"], input[name="password"]'),
          hasSubmitButton: !!document.querySelector('button[type="submit"]') || 
                          Array.from(document.querySelectorAll('button')).some(btn => 
                            btn.textContent?.includes('Sign in') || btn.textContent?.includes('Login')
                          ),
          formVisible: document.querySelector('form') !== null
        };
      });

      console.log('  📝 Login Form Analysis:');
      console.log('    Email Input:', loginForm.hasEmailInput);
      console.log('    Password Input:', loginForm.hasPasswordInput);
      console.log('    Submit Button:', loginForm.hasSubmitButton);
      console.log('    Form Present:', loginForm.formVisible);

      if (loginForm.hasEmailInput && loginForm.hasPasswordInput) {
        console.log('  🔐 Attempting login with test credentials...');

        // Fill login form
        await page.fill('input[type="email"], input[name="email"]', 'admin@bookedbarber.dev');
        await page.fill('input[type="password"], input[name="password"]', 'dev123');

        // Submit form
        const submitButton = await page.$('button[type="submit"]') || 
                           await page.$('button:has-text("Sign in")') ||
                           await page.$('button:has-text("Login")');
        
        if (submitButton) {
          await submitButton.click();
          console.log('    ✅ Login form submitted');
          
          // Wait for redirect or response
          await page.waitForTimeout(3000);
          
          const currentUrl = page.url();
          console.log('    Current URL after login:', currentUrl);
          
          if (currentUrl.includes('/dashboard') || currentUrl.includes('/calendar') || !currentUrl.includes('/login')) {
            console.log('    ✅ Login successful - redirected away from login page');
            
            // Store auth tokens if available
            const tokens = await page.evaluate(() => {
              return {
                accessToken: localStorage.getItem('token'),
                refreshToken: localStorage.getItem('refresh_token'),
                hasTokens: !!localStorage.getItem('token')
              };
            });
            
            console.log('    Auth Tokens:', tokens.hasTokens ? 'Present' : 'Missing');
            
            return { success: true, context, page, tokens };
          } else {
            console.log('    ❌ Login failed - still on login page');
            return { success: false, context, page };
          }
        } else {
          console.log('    ❌ Submit button not found');
          return { success: false, context, page };
        }
      } else {
        console.log('    ❌ Login form not complete');
        return { success: false, context, page };
      }

    } catch (error) {
      console.log('    ❌ Authentication error:', error.message);
      return { success: false, context, page };
    }
  }

  async testAuthenticatedCalendar() {
    console.log('\n📅 Testing Authenticated Calendar...');
    
    // First authenticate
    const authResult = await this.authenticateUser();
    
    if (!authResult.success) {
      console.log('  ❌ Cannot test calendar - authentication failed');
      await authResult.context.close();
      return;
    }

    const { context, page } = authResult;

    try {
      // Navigate to calendar page
      console.log('  📍 Navigating to calendar page...');
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      // Check if we're still authenticated and on calendar page
      const calendarPageState = await page.evaluate(() => {
        return {
          currentUrl: window.location.href,
          isOnCalendar: window.location.pathname === '/calendar',
          isOnLogin: window.location.pathname === '/login',
          
          // Look for calendar components
          calendarElements: {
            hasCalendarContainer: !!document.querySelector('.calendar-page, [class*="calendar"]'),
            hasCalendarHeader: !!document.querySelector('.calendar-header, h1'),
            hasDateElements: document.querySelectorAll('[class*="date"], td, .day').length,
            hasNavigationButtons: Array.from(document.querySelectorAll('button'))
              .filter(btn => btn.textContent?.includes('Today') || 
                           btn.textContent?.includes('Month') ||
                           btn.textContent?.includes('Week') ||
                           btn.textContent?.includes('Day')).length,
            hasAppointments: document.querySelectorAll('[class*="appointment"], [class*="event"]').length
          },
          
          // Content analysis
          pageContent: {
            totalElements: document.querySelectorAll('*').length,
            headings: Array.from(document.querySelectorAll('h1, h2, h3'))
              .map(h => h.textContent?.trim()).slice(0, 5),
            visibleText: document.body.textContent.length,
            hasCalendarText: document.body.textContent.includes('Calendar')
          },
          
          // Error states
          hasErrors: document.querySelectorAll('[class*="error"]').length > 0,
          hasLoading: document.querySelectorAll('[class*="loading"], [class*="spinner"]').length > 0
        };
      });

      console.log('  📊 Calendar Page State:');
      console.log('    Current URL:', calendarPageState.currentUrl);
      console.log('    On Calendar Page:', calendarPageState.isOnCalendar);
      console.log('    Still On Login:', calendarPageState.isOnLogin);
      console.log('    Total Elements:', calendarPageState.pageContent.totalElements);
      console.log('    Page Headings:', calendarPageState.pageContent.headings);
      console.log('    Has Calendar Text:', calendarPageState.pageContent.hasCalendarText);

      console.log('\n  📅 Calendar Components:');
      console.log('    Calendar Container:', calendarPageState.calendarElements.hasCalendarContainer);
      console.log('    Calendar Header:', calendarPageState.calendarElements.hasCalendarHeader);
      console.log('    Date Elements:', calendarPageState.calendarElements.hasDateElements);
      console.log('    Navigation Buttons:', calendarPageState.calendarElements.hasNavigationButtons);
      console.log('    Appointments:', calendarPageState.calendarElements.hasAppointments);

      console.log('\n  🔍 Page State:');
      console.log('    Has Errors:', calendarPageState.hasErrors);
      console.log('    Has Loading:', calendarPageState.hasLoading);

      // Take screenshot
      await page.screenshot({ 
        path: './test-screenshots/calendar-authenticated.png', 
        fullPage: true 
      });

      // Test basic calendar interactions if available
      if (calendarPageState.calendarElements.hasNavigationButtons > 0) {
        console.log('\n  🔄 Testing Calendar Navigation...');
        try {
          // Look for today button and click it
          const todayButton = await page.$('button:has-text("Today")');
          if (todayButton) {
            await todayButton.click();
            await page.waitForTimeout(1000);
            console.log('    ✅ Today button works');
          }

          // Look for view switcher buttons
          const viewButtons = await page.$$('button');
          let viewSwitched = false;
          
          for (let button of viewButtons) {
            const text = await button.textContent();
            if (text && (text.includes('Week') || text.includes('Month') || text.includes('Day'))) {
              await button.click();
              await page.waitForTimeout(1000);
              console.log(`    ✅ ${text} view button works`);
              viewSwitched = true;
              break;
            }
          }
          
          if (!viewSwitched) {
            console.log('    ℹ️  No view switcher buttons found');
          }

        } catch (error) {
          console.log('    ❌ Navigation test failed:', error.message);
        }
      }

      // Calendar functionality assessment
      console.log('\n  🎯 Calendar Functionality Assessment:');
      
      if (calendarPageState.isOnLogin) {
        console.log('    🔴 CRITICAL: Redirected back to login - authentication issue');
      } else if (!calendarPageState.isOnCalendar) {
        console.log('    🔴 CRITICAL: Not on calendar page - routing issue');
      } else if (!calendarPageState.calendarElements.hasCalendarContainer) {
        console.log('    🔴 CRITICAL: Calendar container not found - component issue');
      } else if (calendarPageState.calendarElements.hasDateElements === 0) {
        console.log('    🟡 WARNING: No date elements found - calendar view issue');
      } else {
        console.log('    ✅ SUCCESS: Calendar page loaded with components');
        
        // Additional checks for full functionality
        if (calendarPageState.calendarElements.hasNavigationButtons > 0) {
          console.log('    ✅ Navigation buttons available');
        }
        if (calendarPageState.calendarElements.hasAppointments > 0) {
          console.log('    ✅ Appointments displayed');
        } else {
          console.log('    ℹ️  No appointments found (could be empty calendar)');
        }
      }

    } catch (error) {
      console.log('  ❌ Calendar testing error:', error.message);
    } finally {
      await context.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.testAuthenticatedCalendar();
      
      console.log('\n✅ Authenticated Calendar Testing Complete!');
      console.log('📸 Screenshots saved to test-screenshots/');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run authenticated calendar test
const tester = new AuthenticatedCalendarTest();
tester.run().catch(console.error);