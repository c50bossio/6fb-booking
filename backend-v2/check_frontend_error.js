const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('Console:', msg.type(), msg.text());
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  // Listen for request failures
  page.on('requestfailed', request => {
    console.error('Request failed:', request.url(), request.failure().errorText);
  });
  
  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Wait a bit to see if page loads
    await page.waitForTimeout(3000);
    
    // Check if still loading
    const loadingElement = await page.$('.animate-spin');
    if (loadingElement) {
      console.log('Page is stuck on loading spinner');
      
      // Check for any network errors
      const requests = [];
      page.on('request', request => requests.push(request));
      page.on('requestfailed', request => {
        console.error('Failed request:', request.url());
      });
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'login-page-screenshot.png' });
    console.log('Screenshot saved as login-page-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();