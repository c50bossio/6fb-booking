const puppeteer = require('puppeteer');

async function testAuthFlow() {
  console.log('Starting authentication flow test...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`API Response: ${response.url()} - Status: ${response.status()}`);
    }
  });
  
  page.on('requestfailed', request => {
    console.error(`Request failed: ${request.url()} - ${request.failure().errorText}`);
  });
  
  try {
    // 1. Navigate to login page
    console.log('\n1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    
    // 2. Check localStorage before login
    console.log('\n2. Checking localStorage before login...');
    const beforeLoginStorage = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refresh_token'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log('Before login storage:', beforeLoginStorage);
    
    // 3. Try to login with demo credentials
    console.log('\n3. Attempting login...');
    await page.type('input[type="email"]', 'admin@6fb.com');
    await page.type('input[type="password"]', 'admin123'); // Common demo password
    
    // Take screenshot before submitting
    await page.screenshot({ path: 'before-login.png' });
    
    // Click login button
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/auth/login'), { timeout: 10000 }),
      page.click('button[type="submit"]')
    ]).catch(err => {
      console.error('Login response error:', err);
    });
    
    // Wait a bit for any redirects
    await page.waitForTimeout(2000);
    
    // 4. Check localStorage after login
    console.log('\n4. Checking localStorage after login...');
    const afterLoginStorage = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refresh_token'),
        allKeys: Object.keys(localStorage),
        currentUrl: window.location.href
      };
    });
    console.log('After login storage:', afterLoginStorage);
    
    // 5. Try to navigate to calendar
    console.log('\n5. Navigating to calendar...');
    await page.goto('http://localhost:3001/calendar', { waitUntil: 'networkidle0' });
    
    // Take screenshot of calendar page
    await page.screenshot({ path: 'calendar-page.png' });
    
    // 6. Check for auth debug tools
    console.log('\n6. Running auth debug tools...');
    const debugInfo = await page.evaluate(() => {
      if (window.authDebug) {
        // Capture console output
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
          logs.push({ type: 'log', message: args.join(' ') });
          originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
          logs.push({ type: 'error', message: args.join(' ') });
          originalError.apply(console, args);
        };
        
        // Run debug functions
        window.authDebug.checkStatus();
        
        // Restore console
        console.log = originalLog;
        console.error = originalError;
        
        return logs;
      }
      return null;
    });
    
    if (debugInfo) {
      console.log('\nAuth Debug Output:');
      debugInfo.forEach(log => {
        console.log(`[${log.type}]`, log.message);
      });
    }
    
    // 7. Test API connection
    console.log('\n7. Testing API connection...');
    const apiTest = await page.evaluate(async () => {
      const results = {};
      
      // Test health endpoint
      try {
        const healthResponse = await fetch('http://localhost:8000/health');
        results.health = {
          status: healthResponse.status,
          ok: healthResponse.ok,
          data: await healthResponse.text()
        };
      } catch (error) {
        results.health = { error: error.message };
      }
      
      // Test auth endpoint with token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const meResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          results.authMe = {
            status: meResponse.status,
            ok: meResponse.ok,
            data: meResponse.ok ? await meResponse.json() : await meResponse.text()
          };
        } catch (error) {
          results.authMe = { error: error.message };
        }
      }
      
      return results;
    });
    
    console.log('API Test Results:', JSON.stringify(apiTest, null, 2));
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log('\nTest complete. Browser will remain open for inspection.');
    // Keep browser open for manual inspection
    // await browser.close();
  }
}

// Run the test
testAuthFlow().catch(console.error);