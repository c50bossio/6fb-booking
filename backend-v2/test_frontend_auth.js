const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('error', err => console.error('Browser error:', err));
  page.on('pageerror', err => console.error('Page error:', err));
  
  try {
    // First, let's check the login endpoint directly via API
    console.log('Testing login API endpoint...');
    const loginResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'admin@6fb.com',
            password: 'admin123'
          })
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Login API response:', loginResponse);
    
    if (loginResponse.status === 200 && loginResponse.data.access_token) {
      // Store token in localStorage
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('refresh_token', token);
      }, loginResponse.data.access_token);
      
      console.log('Token stored in localStorage');
      
      // Now navigate to enterprise dashboard
      console.log('Navigating to enterprise dashboard...');
      await page.goto('http://localhost:3000/enterprise/dashboard', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait and check if page loaded
      await page.waitForTimeout(5000);
      
      // Check if still loading
      const spinnerExists = await page.$('.animate-spin');
      if (spinnerExists) {
        console.log('Page still showing spinner after 5 seconds');
        
        // Get any error messages
        const errorText = await page.$eval('body', el => el.innerText).catch(() => '');
        console.log('Page text:', errorText);
        
        // Check network requests
        console.log('Checking failed requests...');
      } else {
        console.log('Page loaded successfully!');
        await page.screenshot({ path: 'enterprise-dashboard-success.png' });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'error-state.png' });
  }
  
  console.log('\nKeeping browser open for debugging...');
  console.log('Open DevTools to inspect the page');
  console.log('Press Ctrl+C to exit');
  
  // Keep browser open
  await new Promise(() => {});
})();