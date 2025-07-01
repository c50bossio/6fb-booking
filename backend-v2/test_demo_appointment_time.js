#!/usr/bin/env node

/**
 * Test script to verify demo mode appointment time selection works
 */

const puppeteer = require('puppeteer');

async function testDemoAppointmentTime() {
  console.log('🚀 Testing demo mode appointment time selection...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100, // Slow down actions to see what's happening
    args: ['--window-size=1200,800']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('📍') || text.includes('🔍') || text.includes('✅') || text.includes('❌') || text.includes('📦')) {
        console.log('Browser:', text);
      }
    });

    // Navigate to demo calendar page
    console.log('📍 Navigating to demo calendar page...');
    await page.goto('http://localhost:3000/demo/calendar', {
      waitUntil: 'networkidle0'
    });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Click "Add Appointment" button
    console.log('🔘 Clicking Add Appointment button...');
    await page.waitForSelector('button:has-text("Add Appointment")', { timeout: 10000 });
    await page.click('button:has-text("Add Appointment")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ Modal opened');

    // Select a client
    console.log('👤 Selecting client...');
    await page.click('div:has-text("Test Test")');
    console.log('✅ Client selected');

    // Select a service
    console.log('🛠️ Selecting service...');
    await page.click('button:has-text("Select service")');
    await page.waitForTimeout(500);
    
    // Click the first service
    const serviceButtons = await page.$$('span.font-medium');
    let serviceSelected = false;
    for (const button of serviceButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('Haircut') || text.includes('Shave'))) {
        await button.click();
        console.log(`✅ Service selected: ${text}`);
        serviceSelected = true;
        break;
      }
    }
    
    if (!serviceSelected) {
      console.log('⚠️ No services found, checking for service list...');
      const services = await page.$$eval('button[class*="hover:bg-gray-50"]', buttons => 
        buttons.map(b => b.textContent)
      );
      console.log('Available services:', services);
    }

    // Select today's date if not already selected
    console.log('📅 Checking date selection...');
    const dateInput = await page.$('input[type="date"]');
    if (dateInput) {
      const currentValue = await dateInput.evaluate(el => el.value);
      if (!currentValue) {
        const today = new Date().toISOString().split('T')[0];
        await page.type('input[type="date"]', today);
        console.log(`✅ Date selected: ${today}`);
      } else {
        console.log(`✅ Date already selected: ${currentValue}`);
      }
    }

    // Wait for time slots to load
    await page.waitForTimeout(2000);

    // Try to open time dropdown
    console.log('⏰ Opening time dropdown...');
    const timeButton = await page.$('button:has-text("Select time")');
    
    if (timeButton) {
      const isDisabled = await timeButton.evaluate(el => el.disabled);
      console.log(`Time button disabled: ${isDisabled}`);
      
      if (!isDisabled) {
        await timeButton.click();
        await page.waitForTimeout(1000);
        
        // Check for available times
        const noTimesMessage = await page.$('div:has-text("No available times")');
        const loadingMessage = await page.$('div:has-text("Loading available times")');
        const timeSlots = await page.$$('button[class*="hover:bg-gray-50"]');
        
        if (noTimesMessage) {
          console.log('❌ No available times shown - This should not happen in demo mode!');
        } else if (loadingMessage) {
          console.log('⏳ Still loading times...');
          await page.waitForTimeout(2000);
        } else if (timeSlots.length > 0) {
          console.log(`✅ Found ${timeSlots.length} available time slots in demo mode!`);
          
          // Click the first available slot
          const firstSlot = await page.$('button[class*="hover:bg-gray-50"]');
          if (firstSlot) {
            const slotText = await firstSlot.evaluate(el => el.textContent);
            await firstSlot.click();
            console.log(`✅ Selected time slot: ${slotText}`);
          }
        }
      } else {
        console.log('❌ Time dropdown is still disabled - service or date may not be properly selected');
      }
    } else {
      console.log('❌ Could not find time selection button');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'demo-appointment-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved as demo-appointment-test-result.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take error screenshot
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: 'demo-appointment-test-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as demo-appointment-test-error.png');
    }
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
}

// Run the test
testDemoAppointmentTime().catch(console.error);