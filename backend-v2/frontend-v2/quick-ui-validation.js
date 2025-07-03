#!/usr/bin/env node

/**
 * Quick UI Validation Script
 * Focuses on specific UI issues found in initial testing
 */

const { chromium } = require('playwright');

class QuickUIValidator {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🔍 Quick UI Validation Starting...');
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

  async validateBookingPage() {
    console.log('\n📋 Validating Booking Page...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/book');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000); // Give components time to render

      console.log('Current URL:', page.url());
      
      // Check what's actually on the page
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
          buttons: Array.from(document.querySelectorAll('button')).map(b => ({ 
            text: b.textContent, 
            type: b.type 
          })),
          inputs: Array.from(document.querySelectorAll('input')).map(i => ({ 
            type: i.type, 
            name: i.name,
            placeholder: i.placeholder 
          })),
          forms: Array.from(document.querySelectorAll('form')).length,
          hasServices: !!document.querySelector('[data-testid="service"], .service, [class*="service"]'),
          hasCalendar: !!document.querySelector('[data-testid="calendar"], .calendar, [class*="calendar"]'),
          hasBookingForm: !!document.querySelector('[data-testid="booking"], .booking, [class*="booking"]'),
          bodyClasses: document.body.className,
          hasErrors: Array.from(document.querySelectorAll('[class*="error"], .error')).map(e => e.textContent)
        };
      });

      console.log('📄 Page Analysis:');
      console.log('  Title:', pageContent.title);
      console.log('  Headings:', pageContent.headings);
      console.log('  Buttons:', pageContent.buttons.slice(0, 5)); // First 5 buttons
      console.log('  Input fields:', pageContent.inputs.slice(0, 5)); // First 5 inputs
      console.log('  Forms found:', pageContent.forms);
      console.log('  Has services:', pageContent.hasServices);
      console.log('  Has calendar:', pageContent.hasCalendar);
      console.log('  Has booking form:', pageContent.hasBookingForm);
      console.log('  Errors:', pageContent.hasErrors);

      // Check for authentication redirects
      if (page.url().includes('/login')) {
        console.log('  ✓ Redirected to login (normal for booking)');
      }

      await page.screenshot({ path: './test-screenshots/booking-page-analysis.png', fullPage: true });

    } catch (error) {
      console.log('❌ Booking page error:', error.message);
    }

    await context.close();
  }

  async validateDashboardPage() {
    console.log('\n🏠 Validating Dashboard Page...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      console.log('Current URL:', page.url());

      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent),
          hasLoginForm: !!document.querySelector('input[type="email"], input[type="password"]'),
          hasDashboard: !!document.querySelector('[data-testid="dashboard"], .dashboard, [class*="dashboard"]'),
          redirectReason: window.location.href
        };
      });

      console.log('📄 Dashboard Analysis:');
      console.log('  Title:', pageContent.title);
      console.log('  Headings:', pageContent.headings);
      console.log('  Has login form:', pageContent.hasLoginForm);
      console.log('  Has dashboard:', pageContent.hasDashboard);
      console.log('  Final URL:', pageContent.redirectReason);

      if (page.url().includes('/login')) {
        console.log('  ✓ Correctly redirected to login (unauthenticated)');
      } else if (pageContent.hasDashboard) {
        console.log('  ✓ Dashboard loaded (authenticated or guest access)');
      }

      await page.screenshot({ path: './test-screenshots/dashboard-analysis.png', fullPage: true });

    } catch (error) {
      console.log('❌ Dashboard error:', error.message);
    }

    await context.close();
  }

  async validateApiConnectivity() {
    console.log('\n🔌 Validating API Connectivity...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000');
      
      // Test API connectivity using Next.js API route (if exists)
      const apiTest = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/health');
          return { status: response.status, ok: response.ok };
        } catch (error) {
          return { error: error.message };
        }
      });

      console.log('📡 API Test (via Next.js):', apiTest);

      // Test direct backend connectivity
      const backendTest = await page.evaluate(async () => {
        try {
          // Try fetching from backend with proper CORS headers
          const response = await fetch('http://localhost:8000/', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });
          const data = await response.json();
          return { status: response.status, data };
        } catch (error) {
          return { error: error.message };
        }
      });

      console.log('📡 Backend Test:', backendTest);

    } catch (error) {
      console.log('❌ API connectivity error:', error.message);
    }

    await context.close();
  }

  async validateCalendarFunctionality() {
    console.log('\n📅 Validating Calendar Functionality...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/calendar');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000); // Give calendar more time to load

      const calendarAnalysis = await page.evaluate(() => {
        const calendarElements = {
          calendarContainers: document.querySelectorAll('[class*="calendar"], [data-testid*="calendar"]').length,
          dateElements: document.querySelectorAll('[class*="date"], [data-testid*="date"]').length,
          timeElements: document.querySelectorAll('[class*="time"], [data-testid*="time"]').length,
          appointmentElements: document.querySelectorAll('[class*="appointment"], [data-testid*="appointment"]').length,
          loadingStates: document.querySelectorAll('[class*="loading"], [class*="skeleton"]').length,
          errorStates: document.querySelectorAll('[class*="error"]').length,
          totalElements: document.querySelectorAll('*').length
        };

        return calendarElements;
      });

      console.log('📅 Calendar Analysis:');
      console.log('  Calendar containers:', calendarAnalysis.calendarContainers);
      console.log('  Date elements:', calendarAnalysis.dateElements);
      console.log('  Time elements:', calendarAnalysis.timeElements);
      console.log('  Appointment elements:', calendarAnalysis.appointmentElements);
      console.log('  Loading states:', calendarAnalysis.loadingStates);
      console.log('  Error states:', calendarAnalysis.errorStates);
      console.log('  Total DOM elements:', calendarAnalysis.totalElements);

      await page.screenshot({ path: './test-screenshots/calendar-analysis.png', fullPage: true });

    } catch (error) {
      console.log('❌ Calendar validation error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.validateApiConnectivity();
      await this.validateBookingPage();
      await this.validateDashboardPage();
      await this.validateCalendarFunctionality();
      
      console.log('\n✅ UI Validation Complete!');
      console.log('📸 Screenshots saved to test-screenshots/');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run validation
const validator = new QuickUIValidator();
validator.run().catch(console.error);