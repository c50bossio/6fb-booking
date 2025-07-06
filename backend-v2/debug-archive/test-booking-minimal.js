#!/usr/bin/env node

/**
 * Minimal test to check if booking page service selection renders
 */

const { chromium } = require('playwright');

class MinimalBookingTest {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    console.log('🔬 Testing Minimal Booking Page...');
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

  async testBasicRendering() {
    console.log('\n📋 Testing Basic Rendering...');
    const context = await this.browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('http://localhost:3000/book');
      
      // Take screenshot immediately to see loading state
      await page.screenshot({ path: './test-screenshots/booking-initial.png', fullPage: true });
      
      // Wait for network to settle with longer timeout
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Handle cookie consent if present
      try {
        await page.waitForSelector('button:has-text("Accept All")', { timeout: 3000 });
        await page.click('button:has-text("Accept All")');
        console.log('  ✅ Cookie consent handled');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('  ℹ️  No cookie consent found');
      }

      // Wait longer for React to render
      await page.waitForTimeout(5000);
      
      // Take another screenshot after settling
      await page.screenshot({ path: './test-screenshots/booking-after-settle.png', fullPage: true });

      // Check for basic page structure
      const pageStructure = await page.evaluate(() => {
        // Look for the main container
        const mainContainer = document.querySelector('.min-h-screen');
        
        // Look for service selection elements
        const serviceHeaders = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim()).filter(text => text);
        
        // Look for the SERVICES constant rendered as buttons/cards
        const serviceButtons = Array.from(document.querySelectorAll('button, [role="button"], .cursor-pointer'))
          .map(btn => btn.textContent?.trim()).filter(text => text && text.length < 100);
        
        // Look for any cards that might contain services
        const cards = Array.from(document.querySelectorAll('[class*="card"], .card, [class*="Card"]'))
          .map(card => card.textContent?.trim()).filter(text => text && text.length < 200);
        
        // Check for error states
        const errorElements = Array.from(document.querySelectorAll('[class*="error"], [data-error], .text-red'))
          .map(el => el.textContent?.trim()).filter(text => text);

        // Check for loading states
        const loadingElements = Array.from(document.querySelectorAll('[class*="loading"], [class*="spinner"]'))
          .map(el => el.textContent?.trim()).filter(text => text);

        return {
          hasMainContainer: !!mainContainer,
          pageTitle: document.title,
          headings: serviceHeaders,
          buttons: serviceButtons,
          cards: cards,
          errors: errorElements,
          loading: loadingElements,
          bodyClasses: document.body.className,
          totalElements: document.querySelectorAll('*').length,
          visibleText: document.body.textContent.trim().substring(0, 300)
        };
      });

      console.log('📊 Page Structure Analysis:');
      console.log('  Has Main Container:', pageStructure.hasMainContainer);
      console.log('  Total DOM Elements:', pageStructure.totalElements);
      console.log('  Page Title:', pageStructure.pageTitle);
      console.log('  Headings:', pageStructure.headings.slice(0, 5));
      console.log('  Buttons/Clickable:', pageStructure.buttons.slice(0, 10));
      console.log('  Cards:', pageStructure.cards.slice(0, 3));
      console.log('  Errors:', pageStructure.errors.length > 0 ? pageStructure.errors : 'None');
      console.log('  Loading:', pageStructure.loading.length > 0 ? pageStructure.loading : 'None');
      console.log('  Body Classes:', pageStructure.bodyClasses);
      
      if (pageStructure.visibleText.length < 50) {
        console.log('  ⚠️  Very little visible text - possible render issue');
        console.log('  Visible Text Sample:', pageStructure.visibleText);
      } else {
        console.log('  ✅ Good amount of content rendered');
      }

      // Specifically look for service-related content
      const serviceContent = await page.evaluate(() => {
        const haircutElements = Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent?.includes('Haircut'))
          .map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim(),
            classes: el.className
          }));
        
        const shaveElements = Array.from(document.querySelectorAll('*'))
          .filter(el => el.textContent?.includes('Shave'))
          .map(el => ({
            tag: el.tagName,
            text: el.textContent?.trim(),
            classes: el.className
          }));

        return {
          haircutElements: haircutElements.slice(0, 3),
          shaveElements: shaveElements.slice(0, 3)
        };
      });

      console.log('\n🔍 Service Content Search:');
      console.log('  Haircut Elements:', serviceContent.haircutElements);
      console.log('  Shave Elements:', serviceContent.shaveElements);

      if (serviceContent.haircutElements.length > 0 || serviceContent.shaveElements.length > 0) {
        console.log('  ✅ Service content found - booking page is rendering services');
      } else {
        console.log('  ❌ No service content found - possible rendering issue');
      }

    } catch (error) {
      console.log('❌ Test error:', error.message);
    }

    await context.close();
  }

  async run() {
    try {
      await this.initialize();
      await this.testBasicRendering();
      
      console.log('\n✅ Minimal Booking Test Complete!');
      console.log('📸 Screenshots saved to test-screenshots/');
      
    } finally {
      await this.cleanup();
    }
  }
}

// Run minimal test
const tester = new MinimalBookingTest();
tester.run().catch(console.error);