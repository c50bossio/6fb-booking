#!/usr/bin/env node

/**
 * Test script to verify appointment creation and display in live calendar
 */

const puppeteer = require('puppeteer');

async function testAppointmentFlow() {
  console.log('🚀 Testing live appointment creation and display flow...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100, // Slow down actions to see what's happening
    args: ['--window-size=1400,900']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('📅') || text.includes('🚀') || text.includes('✅') || 
          text.includes('❌') || text.includes('📊') || text.includes('🔍')) {
        console.log('Browser Log:', text);
      }
    });

    // Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0'
    });

    // Login with demo credentials
    console.log('🔐 Logging in...');
    await page.type('input[type="email"]', 'demo@6fb.com');
    await page.type('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Logged in successfully');

    // Navigate to calendar
    console.log('📅 Navigating to calendar...');
    await page.goto('http://localhost:3000/calendar', {
      waitUntil: 'networkidle0'
    });

    // Wait for calendar to load
    await page.waitForTimeout(2000);

    // Count existing appointments
    const initialAppointments = await page.$$eval('[class*="appointment"]', elements => elements.length);
    console.log(`📊 Initial appointments count: ${initialAppointments}`);

    // Click "New Appointment" button
    console.log('🔘 Clicking New Appointment button...');
    await page.click('button:has-text("New Appointment")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ Modal opened');

    // Search for a client
    console.log('👤 Searching for client...');
    await page.click('button:has-text("Select client")');
    await page.waitForTimeout(500);
    
    // Type in search box
    const searchInput = await page.$('input[placeholder*="Search existing clients"]');
    if (searchInput) {
      await searchInput.type('test');
      await page.waitForTimeout(1000);
      
      // Click first client result
      const clientButtons = await page.$$('button[class*="hover:bg-gray-50"]');
      if (clientButtons.length > 0) {
        await clientButtons[0].click();
        console.log('✅ Client selected');
      } else {
        console.log('⚠️ No clients found, creating new client...');
        // Click New Client button
        await page.click('button:has-text("New Client")');
        await page.waitForTimeout(500);
        
        // Fill in client details
        await page.type('input[placeholder="John"]', 'Test');
        await page.type('input[placeholder="Doe"]', 'User');
        await page.type('input[placeholder*="@example.com"]', 'test@example.com');
        await page.click('button:has-text("Add Client")');
        await page.waitForTimeout(1000);
      }
    }

    // Select a service
    console.log('🛠️ Selecting service...');
    await page.click('button:has-text("Select service")');
    await page.waitForTimeout(500);
    
    // Click first service
    const serviceButtons = await page.$$('button span.font-medium');
    for (const button of serviceButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.trim() !== 'Select service') {
        await button.click();
        console.log(`✅ Service selected: ${text}`);
        break;
      }
    }

    // Select today's date (should already be selected)
    console.log('📅 Date selection...');
    const dateInput = await page.$('input[type="date"]');
    if (dateInput) {
      const currentValue = await dateInput.evaluate(el => el.value);
      if (!currentValue) {
        const today = new Date().toISOString().split('T')[0];
        await page.type('input[type="date"]', today);
        console.log(`✅ Date selected: ${today}`);
      }
    }

    // Wait for time slots to load
    await page.waitForTimeout(2000);

    // Select time
    console.log('⏰ Selecting time...');
    await page.click('button:has-text("Select time")');
    await page.waitForTimeout(1000);
    
    // Check for available times
    const noTimesMessage = await page.$('div:has-text("No available times")');
    if (noTimesMessage) {
      console.log('❌ No available times shown');
      await browser.close();
      return;
    }
    
    // Click first available time slot
    const timeSlots = await page.$$('button[class*="hover:bg-gray-50"]');
    if (timeSlots.length > 0) {
      const slotText = await timeSlots[0].evaluate(el => el.textContent);
      await timeSlots[0].click();
      console.log(`✅ Time selected: ${slotText}`);
    }

    // Click Create Appointment button
    console.log('💾 Creating appointment...');
    await page.click('button:has-text("Create Appointment")');
    
    // Wait for modal to close and calendar to refresh
    await page.waitForTimeout(3000);

    // Count appointments after creation
    const finalAppointments = await page.$$eval('[class*="appointment"]', elements => elements.length);
    console.log(`📊 Final appointments count: ${finalAppointments}`);

    if (finalAppointments > initialAppointments) {
      console.log('✅ SUCCESS: New appointment appears on calendar!');
    } else {
      console.log('❌ ISSUE: New appointment not visible on calendar');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'appointment-test-result.png', fullPage: true });
      console.log('📸 Screenshot saved as appointment-test-result.png');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: 'appointment-test-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as appointment-test-error.png');
    }
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Run the test
testAppointmentFlow().catch(console.error);