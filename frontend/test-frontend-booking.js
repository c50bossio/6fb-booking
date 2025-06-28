const puppeteer = require('puppeteer');

async function testFrontendBooking() {
  console.log('🚀 Starting frontend booking flow test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });

  try {
    const page = await browser.newPage();

    // Navigate to booking page
    console.log('1. Navigating to booking page...');
    await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle2' });

    // Wait for locations to load
    await page.waitForSelector('[data-testid="location-card"]', { timeout: 10000 }).catch(() => {
      console.log('   Waiting for location cards...');
    });

    // Take screenshot of booking page
    await page.screenshot({ path: 'booking-test-1-locations.png' });
    console.log('   ✓ Screenshot saved: booking-test-1-locations.png');

    // Click first location
    console.log('\n2. Selecting first location...');
    const locationCards = await page.$$('[data-testid="location-card"]');
    if (locationCards.length > 0) {
      await locationCards[0].click();
      console.log('   ✓ Location selected');
    } else {
      // Try alternative selectors
      await page.click('.location-card, .shop-card, [role="button"]');
    }

    // Wait for services to load
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'booking-test-2-services.png' });
    console.log('   ✓ Screenshot saved: booking-test-2-services.png');

    // Select a service
    console.log('\n3. Selecting a service...');
    const serviceCards = await page.$$('[data-testid="service-card"]');
    if (serviceCards.length > 0) {
      await serviceCards[0].click();
      console.log('   ✓ Service selected');
    }

    // Wait for barbers to load
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'booking-test-3-barbers.png' });
    console.log('   ✓ Screenshot saved: booking-test-3-barbers.png');

    // Select a barber
    console.log('\n4. Selecting a barber...');
    const barberCards = await page.$$('[data-testid="barber-card"]');
    if (barberCards.length > 0) {
      await barberCards[0].click();
      console.log('   ✓ Barber selected');
    }

    // Wait for calendar/time slots
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'booking-test-4-datetime.png' });
    console.log('   ✓ Screenshot saved: booking-test-4-datetime.png');

    // Select a time slot
    console.log('\n5. Selecting date and time...');
    const timeSlots = await page.$$('[data-testid="time-slot"]');
    if (timeSlots.length > 0) {
      // Find first available slot
      for (const slot of timeSlots) {
        const isDisabled = await slot.evaluate(el => el.disabled || el.classList.contains('disabled'));
        if (!isDisabled) {
          await slot.click();
          console.log('   ✓ Time slot selected');
          break;
        }
      }
    }

    // Continue to contact details
    await page.waitForTimeout(1000);
    const continueBtn = await page.$('button:has-text("Continue"), button:has-text("Next")');
    if (continueBtn) {
      await continueBtn.click();
    }

    await page.screenshot({ path: 'booking-test-5-details.png' });
    console.log('   ✓ Screenshot saved: booking-test-5-details.png');

    // Fill contact details
    console.log('\n6. Filling contact details...');
    await page.type('input[name="client_first_name"], input[name="firstName"]', 'Test');
    await page.type('input[name="client_last_name"], input[name="lastName"]', 'Customer');
    await page.type('input[name="client_email"], input[name="email"]', 'test@example.com');
    await page.type('input[name="client_phone"], input[name="phone"]', '5551234567');

    await page.screenshot({ path: 'booking-test-6-filled.png' });
    console.log('   ✓ Screenshot saved: booking-test-6-filled.png');

    console.log('\n✅ Frontend booking flow test completed!');
    console.log('   Check the screenshot files to see the booking process.');

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: 'booking-test-error.png' });
  } finally {
    await browser.close();
  }
}

testFrontendBooking();
