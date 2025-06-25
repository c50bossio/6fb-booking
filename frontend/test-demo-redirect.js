#!/usr/bin/env node

// Quick test script to verify demo redirect and data loading
const puppeteer = require('puppeteer');

async function testDemoRedirect() {
  console.log('🚀 Starting demo redirect test...');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    defaultViewport: { width: 1280, height: 720 }
  });

  try {
    const page = await browser.newPage();

    // Listen for console logs from the page
    page.on('console', msg => {
      console.log(`🌐 Browser: ${msg.text()}`);
    });

    // Listen for network requests
    page.on('response', response => {
      if (response.url().includes('/api/v1/dashboard/demo/')) {
        console.log(`📡 API Call: ${response.url()} - Status: ${response.status()}`);
      }
    });

    console.log('📍 Navigating to /app page...');
    await page.goto('http://localhost:3001/app', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Wait a moment for any redirects to happen
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Check if we're on the dashboard
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Redirect successful!');

      // Wait for dashboard to load and check for revenue display
      await page.waitForTimeout(3000);

      // Look for revenue elements
      const revenueElements = await page.$$eval('[class*="revenue"], [class*="Revenue"], [class*="currency"]',
        elements => elements.map(el => el.textContent?.trim()).filter(text => text?.includes('$'))
      );

      console.log('💰 Revenue displays found:', revenueElements);

      // Check if we see the correct $500 demo revenue
      const hasCorrectRevenue = revenueElements.some(text => text.includes('$500'));
      if (hasCorrectRevenue) {
        console.log('🎉 SUCCESS: Demo data loaded correctly with $500 revenue!');
      } else {
        console.log('⚠️  Issue: Demo revenue not showing $500. Found:', revenueElements);
      }

    } else {
      console.log('❌ Redirect failed - still on /app page');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🔚 Test completed. Keeping browser open for manual inspection...');
    // Don't close browser so we can inspect manually
    // await browser.close();
  }
}

// Run the test if puppeteer is available
if (require.resolve('puppeteer')) {
  testDemoRedirect().catch(console.error);
} else {
  console.log('❌ Puppeteer not available. Please run: npm install puppeteer');
}
