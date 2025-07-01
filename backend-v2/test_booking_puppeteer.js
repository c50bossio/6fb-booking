#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testBookingExperience() {
  console.log('🚀 Starting Puppeteer booking experience test...');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,   // Run headless to avoid display issues
      slowMo: 500,      // Slow down actions
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    console.log('📋 Step 1: Navigate to login page...');
    console.log('Attempting to connect to http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Page loaded successfully');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    
    console.log('🔐 Step 2: Logging in...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log(`✅ Logged in successfully, current URL: ${page.url()}`);
    
    console.log('📋 Step 3: Navigate to booking page...');
    await page.goto('http://localhost:3000/book');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    console.log('🔧 Step 4: Select service...');
    await page.waitForSelector('button', { timeout: 5000 });
    const serviceButtons = await page.$$('button');
    if (serviceButtons.length > 0) {
      await serviceButtons[0].click(); // Click first service
      console.log('✅ Service selected');
    }
    
    console.log('📅 Step 5: Wait for date picker to load...');
    await page.waitForSelector('[data-testid="calendar"], .calendar, [class*="calendar"]', { timeout: 10000 });
    
    console.log('🔍 Step 6: Analyzing current page state...');
    
    // Check for any error messages or status indicators
    const pageContent = await page.content();
    
    // Look for specific elements
    const dateHeader = await page.$eval('h2', el => el.textContent).catch(() => 'Not found');
    console.log(`📅 Date header: ${dateHeader}`);
    
    // Check for next available messages
    const nextAvailableElements = await page.$$eval(
      '[class*="next"], [class*="available"], [class*="slot"]',
      elements => elements.map(el => ({
        text: el.textContent.trim(),
        className: el.className
      }))
    ).catch(() => []);
    
    console.log('🎯 Next Available Messages Found:');
    nextAvailableElements.forEach((elem, i) => {
      if (elem.text.includes('available') || elem.text.includes('slot')) {
        console.log(`  ${i + 1}. "${elem.text}" (class: ${elem.className})`);
      }
    });
    
    console.log('🌐 Step 7: Making direct API call to compare...');
    
    // Make API call from browser context
    const apiResponse = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/v1/bookings/slots?booking_date=2025-06-28', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return {
          status: response.status,
          slots_count: data.slots ? data.slots.length : 0,
          next_available: data.next_available,
          error: null
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('📊 API Response Analysis:');
    console.log(`  Status: ${apiResponse.status}`);
    console.log(`  Slots count: ${apiResponse.slots_count}`);
    console.log(`  Next available: ${JSON.stringify(apiResponse.next_available, null, 2)}`);
    if (apiResponse.error) {
      console.log(`  Error: ${apiResponse.error}`);
    }
    
    console.log('🔍 Step 8: Checking DOM for conflicting messages...');
    
    // Look for all text that mentions "available" or "slot"
    const allAvailableText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.includes('available') || text.includes('slot') || text.includes('Next')) {
          texts.push({
            text: text,
            parent: node.parentElement.tagName,
            className: node.parentElement.className
          });
        }
      }
      return texts;
    });
    
    console.log('📝 All "available/slot" text found:');
    allAvailableText.forEach((item, i) => {
      console.log(`  ${i + 1}. "${item.text}" (in <${item.parent}> class="${item.className}")`);
    });
    
    console.log('📸 Step 9: Taking screenshot...');
    await page.screenshot({
      path: '/Users/bossio/6fb-booking/backend-v2/puppeteer-booking-test.png',
      fullPage: true
    });
    
    console.log('✅ Test completed! Screenshot saved to: puppeteer-booking-test.png');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testBookingExperience().catch(console.error);