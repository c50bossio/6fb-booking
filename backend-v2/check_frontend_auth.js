const puppeteer = require('puppeteer');

async function checkFrontendAuth() {
  console.log('Checking frontend authentication...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Intercept console logs
  page.on('console', msg => {
    if (msg.text().includes('error') || msg.text().includes('Error')) {
      console.log('Browser error:', msg.text());
    }
  });
  
  try {
    // 1. Go directly to the calendar page
    console.log('1. Navigating to calendar page...');
    await page.goto('http://localhost:3001/calendar', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    // 2. Check if redirected to login
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login page - not authenticated');
      
      // 3. Login
      console.log('\n2. Logging in...');
      await page.type('input[type="email"]', 'admin@6fb.com');
      await page.type('input[type="password"]', 'admin123');
      
      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
        page.click('button[type="submit"]')
      ]);
      
      console.log('After login URL:', page.url());
    }
    
    // 4. Check localStorage
    console.log('\n3. Checking authentication state...');
    const authState = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        tokenLength: localStorage.getItem('token')?.length,
        refreshToken: !!localStorage.getItem('refresh_token'),
        apiUrl: process.env.NEXT_PUBLIC_API_URL || 'not set',
        currentUrl: window.location.href
      };
    });
    
    console.log('Auth state:', authState);
    
    // 5. Check if API calls are working
    console.log('\n4. Testing API call from browser context...');
    const apiTest = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      try {
        const response = await fetch(`${API_URL}/api/v1/appointments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          ok: response.ok,
          headers: {
            contentType: response.headers.get('content-type'),
            cors: response.headers.get('access-control-allow-origin')
          },
          data: response.ok ? await response.json() : await response.text()
        };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    });
    
    console.log('API test result:', JSON.stringify(apiTest, null, 2));
    
    // 6. Take screenshot
    await page.screenshot({ path: 'calendar-auth-check.png', fullPage: true });
    console.log('\nScreenshot saved to calendar-auth-check.png');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

// Run the check
checkFrontendAuth().catch(console.error);