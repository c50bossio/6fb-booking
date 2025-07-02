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
    console.log('CONSOLE:', msg.type().toUpperCase(), ':', msg.text());
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
    console.log('Opening calendar page...');
    await page.goto('http://localhost:3001/calendar');
    
    // Wait and keep browser open for manual testing
    console.log('\n=== BROWSER OPENED ===');
    console.log('Please manually:');
    console.log('1. Click the "New Appointment" button');
    console.log('2. Click the barber dropdown');
    console.log('3. Check the browser console for debug logs');
    console.log('4. Check if any barbers appear');
    console.log('\nPress Ctrl+C to close browser');
    
    // Keep browser open indefinitely for manual testing
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Error:', error);
  }
})();