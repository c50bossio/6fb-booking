#!/usr/bin/env node

/**
 * UI Testing with Cookie Consent Handling
 * Automatically handles cookie consent and tests core functionality
 */

const { chromium } = require('playwright');

class UITesterWithCookies {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🍪 Starting UI Tests with Cookie Handling...');
    this.browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async handleCookieConsent(page) {
    try {
      // Wait for cookie consent modal and handle it
      await page.waitForSelector('button:has-text("Accept All")', { timeout: 5000 });
      await page.click('button:has-text("Accept All")');
      console.log('  ✅ Cookie consent accepted');
      await page.waitForTimeout(1000);
    } catch (error) {
      console.log('  ℹ️  No cookie consent modal found or already handled');
    }
  }

  async testBookingFlow() {
    console.log('\n📋 Testing Complete Booking Flow...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Navigate to booking page
      await page.goto('http://localhost:3000/book');
      await page.waitForLoadState('networkidle');
      
      // Handle cookie consent
      await this.handleCookieConsent(page);
      await page.waitForTimeout(2000);

      // Now check for booking elements
      const bookingElements = await page.evaluate(() => {
        return {
          services: Array.from(document.querySelectorAll('[data-testid="service"], .service, button')).map(el => el.textContent?.trim()).filter(text => text && text.length > 0),
          calendar: !!document.querySelector('[data-testid="calendar"], .calendar, [class*="calendar"]'),
          dateInputs: document.querySelectorAll('input[type="date"]').length,
          timeSlots: document.querySelectorAll('[class*="time"], [data-testid*="time"], button').length,
          forms: document.querySelectorAll('form').length,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim())
        };
      });

      console.log('📋 Booking Page Analysis (Post-Cookie Consent):');
      console.log('  Available Services:', bookingElements.services.slice(0, 10));
      console.log('  Has Calendar:', bookingElements.calendar);
      console.log('  Date Inputs:', bookingElements.dateInputs);
      console.log('  Time Slots/Buttons:', bookingElements.timeSlots);
      console.log('  Forms:', bookingElements.forms);
      console.log('  Headings:', bookingElements.headings);

      // Test service selection if services are available
      if (bookingElements.services.length > 0) {
        try {
          const serviceButton = await page.$('button:has-text("Haircut")');
          if (serviceButton) {
            await serviceButton.click();
            console.log('  ✅ Service selection works');
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          console.log('  ⚠️  Service selection failed:', error.message);
        }
      }

      await page.screenshot({ path: './test-screenshots/booking-flow-post-cookies.png', fullPage: true });

    } catch (error) {
      console.log('❌ Booking flow error:', error.message);
    }

    await context.close();
  }

  async testDashboardFlow() {
    console.log('\n🏠 Testing Dashboard Flow...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      
      await this.handleCookieConsent(page);
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      console.log('  Current URL:', currentUrl);

      if (currentUrl.includes('/login')) {
        console.log('  ✅ Correctly redirected to login (authentication required)');
        
        // Check login form elements
        const loginForm = await page.evaluate(() => {
          return {
            emailInput: !!document.querySelector('input[type="email"], input[name="email"]'),
            passwordInput: !!document.querySelector('input[type="password"], input[name="password"]'),
            submitButton: !!document.querySelector('button[type="submit"], button:has-text("Log"), button:has-text("Sign")'),
            hasForm: document.querySelectorAll('form').length > 0
          };
        });

        console.log('  📝 Login Form Elements:');
        console.log('    Email Input:', loginForm.emailInput);
        console.log('    Password Input:', loginForm.passwordInput);
        console.log('    Submit Button:', loginForm.submitButton);
        console.log('    Has Form:', loginForm.hasForm);

      } else {
        console.log('  📊 Dashboard loaded directly (might be guest access)');
        
        const dashboardContent = await page.evaluate(() => {
          return {
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()),
            cards: document.querySelectorAll('[class*="card"], .card').length,
            buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).slice(0, 5)
          };
        });

        console.log('  📊 Dashboard Content:', dashboardContent);
      }

      await page.screenshot({ path: './test-screenshots/dashboard-flow-post-cookies.png', fullPage: true });

    } catch (error) {
      console.log('❌ Dashboard flow error:', error.message);
    }

    await context.close();
  }

  async testCalendarInteractivity() {
    console.log('\n📅 Testing Calendar Interactivity...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      
      await this.handleCookieConsent(page);
      await page.waitForTimeout(3000); // Give calendar time to load

      const calendarInteraction = await page.evaluate(() => {
        // Look for various calendar elements
        const calendarElements = {
          monthView: !!document.querySelector('[class*="month"], [data-view="month"]'),
          weekView: !!document.querySelector('[class*="week"], [data-view="week"]'),
          dayView: !!document.querySelector('[class*="day"], [data-view="day"]'),
          dateElements: document.querySelectorAll('[class*="date"], [data-date]').length,
          navigationButtons: document.querySelectorAll('button').length,
          appointments: document.querySelectorAll('[class*="appointment"], [class*="event"]').length
        };

        return calendarElements;
      });

      console.log('📅 Calendar Interactivity:');
      console.log('  Month View:', calendarInteraction.monthView);
      console.log('  Week View:', calendarInteraction.weekView);
      console.log('  Day View:', calendarInteraction.dayView);
      console.log('  Date Elements:', calendarInteraction.dateElements);
      console.log('  Navigation Buttons:', calendarInteraction.navigationButtons);
      console.log('  Appointments/Events:', calendarInteraction.appointments);

      // Test navigation if buttons are available
      if (calendarInteraction.navigationButtons > 0) {
        try {
          const navButton = await page.$('button:first-child');
          if (navButton) {
            await navButton.click();
            console.log('  ✅ Calendar navigation responsive');
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          console.log('  ⚠️  Calendar navigation test failed:', error.message);
        }
      }

      await page.screenshot({ path: './test-screenshots/calendar-interactivity.png', fullPage: true });

    } catch (error) {
      console.log('❌ Calendar interactivity error:', error.message);
    }

    await context.close();
  }

  async testMobileResponsiveness() {
    console.log('\n📱 Testing Mobile Responsiveness...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      // Test iPhone viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      await this.handleCookieConsent(page);
      await page.waitForTimeout(2000);

      const mobileOptimization = await page.evaluate(() => {
        return {
          viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
          touchTargets: Array.from(document.querySelectorAll('button, a, input')).filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44; // iOS recommended touch target size
          }).length,
          mobileMenus: document.querySelectorAll('[class*="mobile"], [class*="drawer"]').length,
          responsiveImages: document.querySelectorAll('img[sizes], picture').length
        };
      });

      console.log('📱 Mobile Optimization:');
      console.log('  Viewport Meta:', mobileOptimization.viewport);
      console.log('  Touch-friendly Targets:', mobileOptimization.touchTargets);
      console.log('  Mobile Menus:', mobileOptimization.mobileMenus);
      console.log('  Responsive Images:', mobileOptimization.responsiveImages);

      await page.screenshot({ path: './test-screenshots/mobile-responsiveness.png', fullPage: true });

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await this.handleCookieConsent(page);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: './test-screenshots/tablet-calendar.png', fullPage: true });

    } catch (error) {
      console.log('❌ Mobile responsiveness error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testBookingFlow();
      await this.testDashboardFlow();
      await this.testCalendarInteractivity();
      await this.testMobileResponsiveness();
      
      console.log('\n✅ UI Testing with Cookie Handling Complete!');
      console.log('📸 Screenshots saved to test-screenshots/');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests
const tester = new UITesterWithCookies();
tester.run().catch(console.error);