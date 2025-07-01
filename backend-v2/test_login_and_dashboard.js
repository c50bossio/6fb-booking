const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
    } else {
      console.log(`Console [${msg.type()}]:`, msg.text());
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  // Listen for response
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`HTTP ${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    console.log('1. Navigating to home page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('2. On login page, attempting to login...');
      
      // Wait for login form to be visible
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      
      // Fill in login form
      await page.type('input[type="email"]', 'admin@6fb.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      console.log('3. Login submitted, waiting for navigation...');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('4. After login, current URL:', page.url());
    }
    
    // Navigate to enterprise dashboard
    console.log('5. Navigating to enterprise dashboard...');
    await page.goto('http://localhost:3000/enterprise/dashboard', { waitUntil: 'networkidle2' });
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
    // Check if page loaded or still showing spinner
    const spinnerExists = await page.$('.animate-spin') !== null;
    if (spinnerExists) {
      console.log('WARNING: Page still showing loading spinner');
      
      // Get page content
      const content = await page.content();
      console.log('Page has content length:', content.length);
      
      // Check localStorage
      const localStorage = await page.evaluate(() => {
        return {
          token: window.localStorage.getItem('token'),
          user: window.localStorage.getItem('user'),
          theme: window.localStorage.getItem('6fb-theme')
        };
      });
      console.log('LocalStorage:', localStorage);
    } else {
      console.log('SUCCESS: Page loaded successfully!');
      
      // Take screenshot
      await page.screenshot({ path: 'enterprise-dashboard.png' });
      console.log('Screenshot saved as enterprise-dashboard.png');
    }
    
  } catch (error) {
    console.error('Script error:', error);
    
    // Take error screenshot
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('Error screenshot saved');
  }
  
  // Keep browser open for inspection
  console.log('\nPress Ctrl+C to close browser...');
  await new Promise(() => {});
})();