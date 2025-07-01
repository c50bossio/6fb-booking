#!/usr/bin/env node

/**
 * Test script for appointment creation flow
 * This verifies that the time dropdown shows available slots
 * and appointments can be created successfully
 */

const puppeteer = require('puppeteer');

async function testAppointmentCreation() {
  console.log('🚀 Starting appointment creation test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50, // Slow down actions to see what's happening
    args: ['--window-size=1200,800']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      console.log('Browser:', msg.text());
    });

    // Navigate to the appointments page
    console.log('📍 Navigating to appointments page...');
    await page.goto('http://localhost:3000/appointments', {
      waitUntil: 'networkidle0'
    });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Click the "New Appointment" button
    console.log('🔘 Clicking New Appointment button...');
    await page.waitForSelector('button:has-text("New Appointment")', { timeout: 10000 });
    await page.click('button:has-text("New Appointment")');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✅ Modal opened');

    // Select a client (click dropdown and select first one)
    console.log('👤 Selecting client...');
    await page.click('button:has-text("Select client")');
    await page.waitForTimeout(1000);
    
    // Type to search for client
    await page.type('input[placeholder*="Search existing clients"]', 'test');
    await page.waitForTimeout(1000);
    
    // Click first client if available
    const clientButtons = await page.$$('button[class*="hover:bg-gray-50"]');
    if (clientButtons.length > 0) {
      await clientButtons[0].click();
      console.log('✅ Client selected');
    } else {
      console.log('⚠️ No clients found, may need to create one');
    }

    // Select a service
    console.log('🛠️ Selecting service...');
    await page.click('button:has-text("Select service")');
    await page.waitForTimeout(500);
    
    // Click the first service
    const serviceButtons = await page.$$('span.font-medium');
    for (const button of serviceButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('Haircut') || text.includes('Shave'))) {
        await button.click();
        console.log(`✅ Service selected: ${text}`);
        break;
      }
    }

    // Select a date (today)
    console.log('📅 Selecting date...');
    const today = new Date().toISOString().split('T')[0];
    await page.type('input[type="date"]', today);
    console.log(`✅ Date selected: ${today}`);

    // Wait for slots to load
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
        
        // Check if slots are available
        const noTimesMessage = await page.$('div:has-text("No available times")');
        const loadingMessage = await page.$('div:has-text("Loading available times")');
        const timeSlots = await page.$$('button[class*="hover:bg-gray-50"]');
        
        if (noTimesMessage) {
          console.log('❌ No available times shown');
        } else if (loadingMessage) {
          console.log('⏳ Still loading times...');
        } else if (timeSlots.length > 0) {
          console.log(`✅ Found ${timeSlots.length} available time slots`);
          
          // Click the first available slot
          await timeSlots[0].click();
          console.log('✅ Time slot selected');
          
          // Try to create the appointment
          console.log('📝 Creating appointment...');
          await page.click('button:has-text("Create Appointment")');
          
          // Wait for response
          await page.waitForTimeout(2000);
          
          // Check for success or error
          const successMessage = await page.$('div:has-text("successfully")');
          const errorMessage = await page.$('div:has-text("error")');
          
          if (successMessage) {
            console.log('✅ Appointment created successfully!');
          } else if (errorMessage) {
            const errorText = await errorMessage.evaluate(el => el.textContent);
            console.log(`❌ Error creating appointment: ${errorText}`);
          }
        }
      } else {
        console.log('❌ Time dropdown is disabled - date and service may not be properly selected');
      }
    } else {
      console.log('❌ Could not find time selection button');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'appointment-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved as appointment-test-result.png');

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
testAppointmentCreation().catch(console.error);