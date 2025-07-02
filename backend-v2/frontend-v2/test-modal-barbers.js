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
      console.log('PAGE LOG:', msg.text());
    } else if (msg.type() === 'error') {
      console.error('PAGE ERROR:', msg.text());
    }
  });
  
  // Enable network monitoring to see API calls
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('API REQUEST:', request.method(), request.url());
    }
    request.continue();
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('API RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('Navigating to frontend...');
    await page.goto('http://localhost:3001/calendar');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Looking for New Appointment button...');
    
    // Look for the "New Appointment" button
    const newAppointmentButton = await page.$('button:has-text("New Appointment")') ||
                                  await page.$('button:has-text("New")') ||
                                  await page.$('[data-testid="new-appointment"]') ||
                                  await page.$('button[class*="calendar-action-button"]');
    
    if (newAppointmentButton) {
      console.log('Found New Appointment button, clicking...');
      await newAppointmentButton.click();
      
      // Wait for modal to open
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Looking for barber dropdown...');
      
      // Wait for the modal to load and check for barber dropdown
      const barberDropdown = await page.$('[data-testid="barber-dropdown"]') ||
                           await page.$('button:has-text("Any available barber")') ||
                           await page.$('button:has-text("Select barber")');
      
      if (barberDropdown) {
        console.log('Found barber dropdown, clicking to open...');
        await barberDropdown.click();
        
        // Wait for dropdown to open and check contents
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if barber options are visible
        const barberOptions = await page.$$eval('[role="option"], .barber-option, button:has-text("John")', 
          options => options.map(opt => opt.textContent.trim()));
        
        console.log('Barber options found:', barberOptions);
        
        if (barberOptions.length === 0) {
          console.log('❌ No barber options found in dropdown!');
          
          // Check if there are any loading states
          const loadingText = await page.$('text="Loading barbers..."') ||
                            await page.$('text="Loading..."');
          
          if (loadingText) {
            console.log('Dropdown is still loading...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check again after loading
            const barberOptionsAfter = await page.$$eval('[role="option"], .barber-option', 
              options => options.map(opt => opt.textContent.trim()));
            console.log('Barber options after loading:', barberOptionsAfter);
          }
        } else {
          console.log('✅ Found barber options:', barberOptions);
        }
      } else {
        console.log('❌ Could not find barber dropdown!');
      }
    } else {
      console.log('❌ Could not find New Appointment button!');
      
      // Log all buttons on the page for debugging
      const allButtons = await page.$$eval('button', buttons => 
        buttons.map(btn => btn.textContent.trim()).filter(text => text.length > 0)
      );
      console.log('All buttons on page:', allButtons);
    }
    
    // Wait for user to inspect
    console.log('Leaving browser open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();