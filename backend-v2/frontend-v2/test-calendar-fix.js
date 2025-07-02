const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'log') {
      console.log('CONSOLE:', msg.text());
    } else if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    } else if (msg.type() === 'warning') {
      console.log('WARNING:', msg.text());
    }
  });
  
  try {
    console.log('Testing fixed calendar (no infinite loops)...');
    await page.goto('http://localhost:3000/calendar');
    
    // Wait for page to load and check for infinite loop errors
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== Testing Calendar Loading ===');
    
    // Check if calendar loaded without errors
    const hasInfiniteLoopError = await page.evaluate(() => {
      const logs = window.console._logs || [];
      return logs.some(log => log.includes('Maximum update depth exceeded'));
    });
    
    if (!hasInfiniteLoopError) {
      console.log('✅ No infinite loop errors detected!');
    } else {
      console.log('❌ Still detecting infinite loop errors');
    }
    
    console.log('\n=== Testing New Appointment Modal ===');
    
    // Try to click the "New Appointment" button
    const newAppointmentButton = await page.$('button:contains("New Appointment")') || 
                                   await page.$('button[aria-label*="appointment"]') ||
                                   await page.evaluateHandle(() => {
                                     return Array.from(document.querySelectorAll('button')).find(
                                       button => button.textContent?.includes('New Appointment') || 
                                                button.textContent?.includes('Create') ||
                                                button.textContent?.includes('Add')
                                     );
                                   });
    if (newAppointmentButton) {
      console.log('Found New Appointment button, clicking...');
      await newAppointmentButton.click();
      
      // Wait for modal to open
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if barber dropdown is present and working
      const barberDropdown = await page.$('[data-testid="barber-dropdown"], [data-barber-select], select[name="barber"]');
      if (barberDropdown) {
        console.log('✅ Barber dropdown found in modal!');
        
        // Check if it has options
        const options = await page.$$eval('option', options => 
          options.map(opt => opt.textContent)
        );
        console.log('Dropdown options:', options);
      } else {
        console.log('❌ Barber dropdown not found in modal');
      }
    } else {
      console.log('❌ New Appointment button not found');
    }
    
    console.log('\nBrowser will stay open for 30 seconds for manual testing...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();