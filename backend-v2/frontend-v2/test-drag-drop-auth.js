const puppeteer = require('puppeteer');

async function testDragAndDrop() {
  console.log('Starting drag and drop test with authentication...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[DRAG DEBUG]')) {
      console.log('Browser console:', msg.text());
    }
  });
  
  // Log network requests
  page.on('response', response => {
    if (response.url().includes('/api/v1/appointments')) {
      console.log('API Response:', response.status(), response.url());
    }
  });
  
  try {
    // First, log in
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle2'
    });
    
    // Fill in login form
    console.log('Filling login form...');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.type('input[name="email"]', 'john.doe@example.com');
    await page.type('input[name="password"]', 'Secure123!');
    
    // Submit login
    console.log('Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Login successful!');
    
    // Navigate to calendar page
    console.log('Navigating to calendar...');
    await page.goto('http://localhost:3000/calendar', {
      waitUntil: 'networkidle2'
    });
    
    // Wait for calendar to load
    await page.waitForSelector('.unified-calendar', { timeout: 10000 });
    console.log('Calendar loaded!');
    
    // Wait for appointments to load
    await page.waitForSelector('.unified-calendar-appointment', { timeout: 10000 });
    console.log('Appointments loaded!');
    
    // Get all appointments and log their draggable status
    const appointments = await page.$$eval('.unified-calendar-appointment', elements => 
      elements.map(el => ({
        id: el.getAttribute('data-appointment-id'),
        draggable: el.getAttribute('draggable'),
        text: el.textContent
      }))
    );
    console.log('Found appointments:', appointments);
    
    // Get the first draggable appointment
    const appointment = await page.$('.unified-calendar-appointment[draggable="true"]');
    if (!appointment) {
      console.error('No draggable appointments found!');
      console.log('All appointments have draggable=false or no draggable attribute');
      return;
    }
    
    console.log('Found draggable appointment');
    
    // Get appointment bounds
    const appointmentBox = await appointment.boundingBox();
    console.log('Appointment position:', appointmentBox);
    
    // Find a target time slot (look for an empty slot)
    const slots = await page.$$('.time-slot');
    console.log(`Found ${slots.length} time slots`);
    
    // Find an empty slot
    let targetSlot = null;
    let targetBox = null;
    
    for (const slot of slots) {
      const children = await slot.$$('.unified-calendar-appointment');
      if (children.length === 0) {
        targetSlot = slot;
        targetBox = await slot.boundingBox();
        console.log('Found empty target slot:', targetBox);
        break;
      }
    }
    
    if (!targetSlot) {
      console.error('No empty slots found!');
      return;
    }
    
    // Perform drag and drop
    console.log('Starting drag...');
    
    // Move to appointment center
    await page.mouse.move(
      appointmentBox.x + appointmentBox.width / 2,
      appointmentBox.y + appointmentBox.height / 2
    );
    
    // Mouse down to start drag
    await page.mouse.down();
    console.log('Mouse down - drag started');
    
    // Small initial movement to trigger drag
    await page.mouse.move(
      appointmentBox.x + appointmentBox.width / 2 + 5,
      appointmentBox.y + appointmentBox.height / 2 + 5,
      { steps: 5 }
    );
    
    // Move to target
    console.log('Moving to target...');
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 }
    );
    
    // Drop
    await page.mouse.up();
    console.log('Mouse up - drop completed');
    
    // Wait for any animations or API calls
    await page.waitForTimeout(2000);
    
    // Check console logs
    const logs = await page.evaluate(() => {
      return window.consoleLogs || [];
    });
    console.log('Console logs during drag:', logs);
    
    // Check if reschedule modal appeared
    const modalVisible = await page.$('.reschedule-modal, [role="dialog"]') !== null;
    if (modalVisible) {
      console.log('✅ Reschedule modal appeared!');
    } else {
      console.log('❌ No reschedule modal found');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'drag-drop-result.png', fullPage: true });
    console.log('Screenshot saved as drag-drop-result.png');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'drag-drop-error.png', fullPage: true });
  }
  
  // Keep browser open for manual inspection
  console.log('Test complete. Browser will stay open for inspection.');
  // await browser.close();
}

testDragAndDrop().catch(console.error);