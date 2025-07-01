const puppeteer = require('puppeteer');

async function testBookingFlow() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    slowMo: 100, // Slow down actions to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Starting booking flow test...');
    
    // 1. Navigate to login page
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    // 2. Login
    console.log('🔐 Logging in...');
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'TestPass123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForNavigation();
    console.log('✅ Logged in successfully');
    
    // 3. Navigate to booking page
    console.log('📅 Navigating to booking page...');
    await page.goto('http://localhost:3000/book');
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // 4. Select a service
    console.log('🛍️ Selecting service...');
    const serviceButtons = await page.$$('button[class*="rounded-lg"]');
    if (serviceButtons.length > 0) {
      await serviceButtons[0].click(); // Click first service
      console.log('✅ Service selected');
    } else {
      console.log('❌ No service buttons found');
    }
    
    // 5. Wait for calendar to load
    await page.waitForSelector('h2', { timeout: 5000 });
    console.log('📅 Calendar loaded');
    
    // 6. Select a date (tomorrow)
    console.log('📆 Selecting date...');
    // Find tomorrow's date button
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();
    
    const dateButtons = await page.$$('button[class*="rounded"]');
    let dateSelected = false;
    for (const button of dateButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text === tomorrowDay.toString()) {
        await button.click();
        dateSelected = true;
        console.log(`✅ Selected date: ${tomorrowDay}`);
        break;
      }
    }
    
    if (!dateSelected) {
      console.log('❌ Could not find tomorrow\'s date button');
    }
    
    // 7. Wait for time slots to load
    await page.waitForTimeout(2000); // Wait for slots to load
    console.log('⏰ Checking for available time slots...');
    
    // Check if there are any time slot buttons
    const timeSlots = await page.$$('button[class*="border"][class*="rounded"]');
    console.log(`Found ${timeSlots.length} time slot buttons`);
    
    if (timeSlots.length > 0) {
      // Click the first available slot
      await timeSlots[0].click();
      console.log('✅ Time slot selected');
      
      // 8. Wait for confirmation page
      await page.waitForTimeout(1000);
      
      // 9. Click confirm booking button
      console.log('📝 Confirming booking...');
      const confirmButton = await page.$('button:has-text("Proceed to Payment")');
      if (confirmButton) {
        await confirmButton.click();
        console.log('✅ Booking confirmation clicked');
        
        // Wait for response
        await page.waitForTimeout(2000);
        
        // Check for errors
        const errorMessage = await page.$('.bg-red-50');
        if (errorMessage) {
          const errorText = await page.evaluate(el => el.textContent, errorMessage);
          console.log(`❌ Error occurred: ${errorText}`);
        } else {
          console.log('✅ Booking created successfully!');
        }
      }
    } else {
      console.log('❌ No time slots available');
      
      // Check for error message
      const errorDiv = await page.$('div[class*="border-blue-200"]');
      if (errorDiv) {
        const errorText = await page.evaluate(el => el.textContent, errorDiv);
        console.log(`ℹ️ Message: ${errorText}`);
      }
    }
    
    // Take screenshot of final state
    await page.screenshot({ path: 'booking-flow-result.png', fullPage: true });
    console.log('📸 Screenshot saved as booking-flow-result.png');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'booking-flow-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testBookingFlow().catch(console.error);