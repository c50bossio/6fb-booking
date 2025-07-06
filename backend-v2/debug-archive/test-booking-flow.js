#!/usr/bin/env node

/**
 * Test booking flow to verify guest booking works despite backend errors
 */

const { chromium } = require('playwright');

class BookingFlowTester {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('📋 Testing Booking Flow...');
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

  async testGuestBookingFlow() {
    console.log('\n🏠 Testing Guest Booking Flow...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/book');
      await page.waitForLoadState('networkidle');
      
      // Handle cookie consent
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('  ℹ️  No cookie consent modal found');
      }

      // Wait for page to settle
      await page.waitForTimeout(3000);

      // Check what's actually visible on the booking page
      const bookingState = await page.evaluate(() => {
        const services = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent?.includes('Haircut') || 
          btn.textContent?.includes('Shave') ||
          btn.textContent?.includes('Service')
        );

        const calendar = document.querySelector('[class*="calendar"], [data-testid="calendar"]');
        const dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="date"]');
        const errorMessages = Array.from(document.querySelectorAll('[class*="error"], [data-error]'))
          .map(el => el.textContent?.trim()).filter(text => text);
        
        const loadingStates = Array.from(document.querySelectorAll('[class*="loading"], [class*="spinner"]'))
          .map(el => el.textContent?.trim()).filter(text => text);

        return {
          services: services.map(s => s.textContent?.trim()),
          hasCalendar: !!calendar,
          dateInputs: dateInputs.length,
          errorMessages,
          loadingStates,
          visibleText: document.body.textContent.trim().substring(0, 500),
          pageTitle: document.title
        };
      });

      console.log('📋 Booking Page Analysis:');
      console.log('  Services Available:', bookingState.services.length > 0 ? bookingState.services : 'None found');
      console.log('  Has Calendar Component:', bookingState.hasCalendar);
      console.log('  Date Inputs:', bookingState.dateInputs);
      console.log('  Error Messages:', bookingState.errorMessages.length > 0 ? bookingState.errorMessages : 'None');
      console.log('  Loading States:', bookingState.loadingStates.length > 0 ? bookingState.loadingStates : 'None');
      
      if (bookingState.visibleText.length < 100) {
        console.log('  ⚠️  Very little content visible - possible rendering issue');
        console.log('  Page content preview:', bookingState.visibleText);
      }

      // Test service selection if services are available
      if (bookingState.services.length > 0) {
        console.log('\n  🎯 Testing Service Selection...');
        try {
          // Look for the first service button
          const serviceButton = await page.$('button:has-text("Haircut")');
          if (serviceButton) {
            await serviceButton.click();
            console.log('    ✅ Service selection works');
            await page.waitForTimeout(1000);
            
            // Check if next step appears
            const nextStep = await page.evaluate(() => {
              return {
                hasDateSelection: !!document.querySelector('[class*="calendar"], input[type="date"]'),
                hasTimeSlots: !!document.querySelector('[class*="time"], [data-testid*="time"]'),
                stepIndicator: document.querySelector('[class*="step"]')?.textContent?.trim()
              };
            });
            
            console.log('    Next Step State:', nextStep);
          } else {
            console.log('    ⚠️  Could not find Haircut service button');
          }
        } catch (error) {
          console.log('    ❌ Service selection failed:', error.message);
        }
      } else {
        console.log('  ⚠️  No services found - booking flow may be broken');
      }

      // Test basic functionality even with backend errors
      console.log('\n  📅 Testing Date Selection (if available)...');
      try {
        const dateInputs = await page.$$('input[type="date"]');
        if (dateInputs.length > 0) {
          await dateInputs[0].fill('2025-07-10');
          console.log('    ✅ Date input works');
        } else {
          console.log('    ℹ️  No date inputs found');
        }
      } catch (error) {
        console.log('    ❌ Date input failed:', error.message);
      }

      await page.screenshot({ path: './test-screenshots/booking-flow-guest.png', fullPage: true });

    } catch (error) {
      console.log('❌ Booking flow error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testGuestBookingFlow();
      
      console.log('\n✅ Booking Flow Test Complete!');
      console.log('📸 Screenshot saved to test-screenshots/booking-flow-guest.png');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run booking flow test
const tester = new BookingFlowTester();
tester.run().catch(console.error);