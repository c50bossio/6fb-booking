
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));
    page.on('pageerror', error => console.log('Browser Error:', error.message));
    
    // Go to booking page
    console.log('Navigating to booking page...');
    await page.goto('http://localhost:3001/book', { waitUntil: 'networkidle0' });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Take a screenshot
    await page.screenshot({ path: 'booking-page.png' });
    console.log('Screenshot saved as booking-page.png');
    
    // Check if there are any barbers available
    const barbersExist = await page.evaluate(() => {
      return document.body.textContent.includes('Select a Barber') || 
             document.body.textContent.includes('Choose Your Barber');
    });
    
    console.log('Barbers section found:', barbersExist);
    
    // Keep browser open for manual testing
    console.log('Browser is open for manual testing. Press Ctrl+C to close.');
    
  } catch (error) {
    console.error('Error:', error);
  }
})();
