const puppeteer = require('puppeteer');

async function testDashboardAccess() {
  console.log('Testing dashboard access with stored token...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`[CONSOLE ${msg.type().toUpperCase()}]`, msg.text()));
  page.on('pageerror', error => console.error('[PAGE ERROR]', error.message));

  try {
    // First, set the authentication token in localStorage
    console.log('1. Setting up authentication token...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    
    // Set the token we got from the API
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refresh_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi50ZXN0QGJvb2tlZGJhcmJlci5jb20iLCJleHAiOjE3NTIyMzg4ODcsInR5cGUiOiJyZWZyZXNoIn0.Y2mWG-qnclkn90WDF8Pp4qK0Vd-zm5lHn_czZw9Jqj4');
    }, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi50ZXN0QGJvb2tlZGJhcmJlci5jb20iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE3NTE2MzQ5ODcsInR5cGUiOiJhY2Nlc3MifQ.1kVOlRrvhE9ExIWhxMlU88nCZOBMpYpop3oCIKD5MAo');
    
    console.log('✓ Token set in localStorage\n');

    // Now try to access the dashboard
    console.log('2. Navigating directly to dashboard...');
    const response = await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    console.log('Response status:', response.status());
    
    if (finalUrl.includes('/dashboard')) {
      console.log('✓ Successfully accessed dashboard!\n');
      
      // Check what's on the page
      const pageTitle = await page.title();
      const h1Text = await page.$eval('h1', el => el.textContent).catch(() => 'No h1 found');
      
      console.log('Page title:', pageTitle);
      console.log('H1 text:', h1Text);
      
      // Check if user data is displayed
      const userEmail = await page.$eval('p', el => el.textContent).catch(() => null);
      if (userEmail && userEmail.includes('admin.test@bookedbarber.com')) {
        console.log('✓ User email displayed:', userEmail);
      }
      
    } else {
      console.log('✗ Was redirected away from dashboard to:', finalUrl);
      
      // Check localStorage again
      const tokenStillThere = await page.evaluate(() => localStorage.getItem('token'));
      console.log('Token still in localStorage:', !!tokenStillThere);
    }

    // Try the login flow one more time with navigation monitoring
    console.log('\n3. Testing full login flow with navigation monitoring...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Clear and re-login
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.type('input[name="email"]', 'admin.test@bookedbarber.com');
    await page.type('input[name="password"]', 'AdminTest123');
    
    // Monitor network activity
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Use Promise.race to handle navigation or timeout
    console.log('Submitting form...');
    const submitPromise = page.click('button[type="submit"]');
    const navigationPromise = page.waitForNavigation({ 
      waitUntil: 'networkidle0',
      timeout: 5000 
    }).catch(() => null);
    
    await submitPromise;
    const navResult = await navigationPromise;
    
    if (!navResult) {
      console.log('No navigation occurred after form submission');
      
      // Check if router.push is being called
      const routerCalls = await page.evaluate(() => {
        return window._routerPushCalls || [];
      });
      console.log('Router push calls:', routerCalls);
    }
    
    await page.waitForTimeout(3000);
    
    console.log('\nFinal state:');
    console.log('URL:', page.url());
    console.log('API responses:', responses);
    
    // Check for any error indicators in the DOM
    const errorElements = await page.$$eval('[class*="error"], [class*="Error"]', elements => 
      elements.map(el => ({ 
        text: el.textContent, 
        className: el.className 
      }))
    );
    
    if (errorElements.length > 0) {
      console.log('Error elements found:', errorElements);
    }

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nPress Ctrl+C to close browser...');
    await new Promise(() => {});
  }
}

testDashboardAccess().catch(console.error);