#!/usr/bin/env node

/**
 * Calendar Diagnostic Test
 * Diagnoses why calendar components aren't rendering
 */

const { chromium } = require('playwright');

class CalendarDiagnostic {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🔬 Starting Calendar Diagnostic...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 2000
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async diagnoseCalendarPage() {
    console.log('\n🔍 Diagnosing Calendar Page...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Capture console logs and errors
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    try {
      console.log('  📍 Navigating to calendar page...');
      await page.goto('http://localhost:3000/calendar');
      
      console.log('  ⏳ Waiting for initial load...');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        console.log('  ✅ Cookie consent handled');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('  ℹ️  No cookie consent found');
      }

      // Wait for calendar to potentially load
      console.log('  ⏳ Waiting for calendar components...');
      await page.waitForTimeout(8000);

      // Detailed page state analysis
      const pageState = await page.evaluate(() => {
        return {
          // Basic page info
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
          
          // Content analysis
          bodyText: document.body.textContent.substring(0, 500),
          totalElements: document.querySelectorAll('*').length,
          
          // Look for loading states
          loadingElements: Array.from(document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]'))
            .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.trim().substring(0, 50) })),
          
          // Look for error states
          errorElements: Array.from(document.querySelectorAll('[class*="error"], [data-error]'))
            .map(el => ({ tag: el.tagName, class: el.className, text: el.textContent?.trim().substring(0, 100) })),
          
          // Look for calendar-specific elements
          calendarElements: {
            calendarPage: !!document.querySelector('.calendar-page'),
            calendarHeader: !!document.querySelector('.calendar-header'),
            calendarContainer: !!document.querySelector('[class*="calendar"]'),
            responsiveCalendar: !!document.querySelector('[class*="ResponsiveCalendar"]'),
            calendarViews: Array.from(document.querySelectorAll('[class*="calendar"], [class*="Calendar"]'))
              .map(el => ({ tag: el.tagName, class: el.className }))
          },
          
          // Check for authentication issues
          authElements: {
            loginButton: Array.from(document.querySelectorAll('button')).some(btn => btn.textContent?.includes('Login')) ||
                        !!document.querySelector('a[href*="login"]'),
            userInfo: !!document.querySelector('[class*="user"]') || !!document.querySelector('.user-info'),
            redirectIndicators: document.location.href.includes('login')
          },
          
          // React/Next.js specific checks
          reactElements: {
            reactRoot: !!document.querySelector('#__next'),
            nextData: !!document.querySelector('#__NEXT_DATA__'),
            hasHydrationIssues: document.querySelectorAll('[data-reactroot]').length > 1
          }
        };
      });

      console.log('\n📊 Page State Analysis:');
      console.log('  URL:', pageState.url);
      console.log('  Ready State:', pageState.readyState);
      console.log('  Total Elements:', pageState.totalElements);
      console.log('  Body Text Preview:', pageState.bodyText.substring(0, 200) + '...');

      console.log('\n🔄 Loading States:');
      if (pageState.loadingElements.length > 0) {
        console.log('  Loading elements found:');
        pageState.loadingElements.forEach((el, i) => {
          console.log(`    ${i + 1}. ${el.tag} (${el.class}): ${el.text}`);
        });
      } else {
        console.log('  ✅ No loading states detected');
      }

      console.log('\n❌ Error States:');
      if (pageState.errorElements.length > 0) {
        console.log('  Error elements found:');
        pageState.errorElements.forEach((el, i) => {
          console.log(`    ${i + 1}. ${el.tag} (${el.class}): ${el.text}`);
        });
      } else {
        console.log('  ✅ No error states detected');
      }

      console.log('\n📅 Calendar Elements:');
      console.log('  Calendar Page Container:', pageState.calendarElements.calendarPage);
      console.log('  Calendar Header:', pageState.calendarElements.calendarHeader);
      console.log('  Calendar Container:', pageState.calendarElements.calendarContainer);
      console.log('  Responsive Calendar:', pageState.calendarElements.responsiveCalendar);
      console.log('  Calendar View Elements:', pageState.calendarElements.calendarViews.length);
      
      if (pageState.calendarElements.calendarViews.length > 0) {
        pageState.calendarElements.calendarViews.forEach((el, i) => {
          console.log(`    ${i + 1}. ${el.tag} (${el.class})`);
        });
      }

      console.log('\n🔐 Authentication Check:');
      console.log('  Has Login Button:', pageState.authElements.loginButton);
      console.log('  Has User Info:', pageState.authElements.userInfo);
      console.log('  Redirected to Login:', pageState.authElements.redirectIndicators);

      console.log('\n⚛️ React/Next.js Health:');
      console.log('  React Root Present:', pageState.reactElements.reactRoot);
      console.log('  Next.js Data Present:', pageState.reactElements.nextData);
      console.log('  Hydration Issues:', pageState.reactElements.hasHydrationIssues);

      // Console logs analysis
      console.log('\n📜 Console Logs:');
      if (logs.length > 0) {
        console.log(`  Total logs: ${logs.length}`);
        logs.slice(-10).forEach((log, i) => {
          console.log(`    ${logs.length - 10 + i + 1}. ${log}`);
        });
      } else {
        console.log('  No console logs captured');
      }

      // JavaScript errors analysis
      console.log('\n🐛 JavaScript Errors:');
      if (errors.length > 0) {
        console.log(`  Total errors: ${errors.length}`);
        errors.forEach((error, i) => {
          console.log(`    ${i + 1}. ${error}`);
        });
      } else {
        console.log('  ✅ No JavaScript errors detected');
      }

      // Take diagnostic screenshot
      await page.screenshot({ 
        path: './test-screenshots/calendar-diagnostic.png', 
        fullPage: true 
      });

      // Diagnosis and recommendations
      console.log('\n💡 Diagnosis & Recommendations:');
      
      if (!pageState.calendarElements.calendarPage) {
        console.log('  🔴 CRITICAL: Calendar page container not found');
        console.log('     - Check if calendar page component is loading correctly');
        console.log('     - Verify authentication is working');
      }
      
      if (pageState.loadingElements.length > 0) {
        console.log('  🟡 WARNING: Page appears to be stuck in loading state');
        console.log('     - Check API calls and loading state management');
        console.log('     - Verify backend connectivity');
      }
      
      if (pageState.errorElements.length > 0) {
        console.log('  🔴 ERROR: Error states detected on page');
        console.log('     - Check error handling and component error boundaries');
      }
      
      if (pageState.authElements.redirectIndicators) {
        console.log('  🔴 AUTH: Page redirected to login');
        console.log('     - Authentication required for calendar access');
        console.log('     - Check authentication flow and token management');
      }
      
      if (errors.length > 0) {
        console.log('  🔴 JS ERROR: JavaScript errors preventing rendering');
        console.log('     - Fix JavaScript errors to enable proper rendering');
      }
      
      if (pageState.totalElements < 200) {
        console.log('  🟡 LOW CONTENT: Very few DOM elements suggest incomplete rendering');
        console.log('     - Check React component mounting and hydration');
      }

    } catch (error) {
      console.log('  ❌ Diagnostic error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.diagnoseCalendarPage();
      
      console.log('\n✅ Calendar Diagnostic Complete!');
      console.log('📸 Screenshot saved to test-screenshots/calendar-diagnostic.png');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run calendar diagnostic
const diagnostic = new CalendarDiagnostic();
diagnostic.run().catch(console.error);