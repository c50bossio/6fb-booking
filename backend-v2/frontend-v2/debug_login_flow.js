const puppeteer = require('puppeteer');

async function debugLoginFlow() {
  console.log('Starting comprehensive login flow debugging...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 50 // Slow down actions to see what's happening
  });

  const page = await browser.newPage();
  
  // Enable detailed console logging
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}]`, msg.text());
    } else if (msg.text().includes('Dashboard:') || msg.text().includes('Login:') || msg.text().includes('Redirecting')) {
      console.log(`[CONSOLE]`, msg.text());
    }
  });

  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });

  page.on('requestfailed', request => {
    console.error('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });

  // Monitor navigation events
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log(`[NAVIGATION] Navigated to: ${frame.url()}`);
    }
  });

  try {
    // 1. Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✓ Login page loaded\n');

    // 2. Check if already redirected
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('⚠️  Already redirected to dashboard. May have existing session.');
      console.log('Current URL:', currentUrl);
      
      // Clear localStorage to ensure clean slate
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      console.log('Cleared storage, reloading login page...');
      await page.goto('http://localhost:3000/login', {
        waitUntil: 'networkidle0'
      });
    }

    // 3. Fill in login form
    console.log('2. Filling in login form...');
    await page.type('input[name="email"]', 'admin.test@bookedbarber.com');
    await page.type('input[name="password"]', 'AdminTest123');
    console.log('✓ Form filled\n');

    // 4. Set up request interception to monitor API calls
    console.log('3. Setting up API monitoring...');
    const apiCalls = [];
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        const status = response.status();
        let responseData = null;
        
        try {
          if (response.headers()['content-type']?.includes('application/json')) {
            responseData = await response.json();
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        apiCalls.push({
          url,
          status,
          method: response.request().method(),
          data: responseData
        });
        
        console.log(`[API] ${response.request().method()} ${url} -> ${status}`);
        if (responseData) {
          console.log(`[API Response]`, JSON.stringify(responseData, null, 2).substring(0, 200));
        }
      }
    });

    // 5. Submit form and monitor what happens
    console.log('\n4. Submitting login form...');
    
    // Set up promise to wait for navigation
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 10000
    }).catch(err => {
      console.log('[NAVIGATION] No navigation occurred:', err.message);
      return null;
    });

    // Click submit button
    await page.click('button[type="submit"]');
    
    // Wait a bit for any immediate reactions
    await page.waitForTimeout(2000);

    // Check localStorage for tokens
    const storageData = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        refreshToken: localStorage.getItem('refresh_token'),
        allKeys: Object.keys(localStorage)
      };
    });
    
    console.log('\n5. Checking authentication state...');
    console.log('Token stored:', !!storageData.token);
    console.log('Refresh token stored:', !!storageData.refreshToken);
    console.log('All localStorage keys:', storageData.allKeys);

    // Wait for navigation or timeout
    const navResult = await navigationPromise;
    
    console.log('\n6. Navigation result:');
    if (navResult) {
      console.log('✓ Navigation completed');
    } else {
      console.log('✗ No navigation occurred');
    }
    
    // Check final state
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log('\n7. Final state:');
    console.log('Current URL:', finalUrl);
    console.log('Expected URL: http://localhost:3000/dashboard');
    console.log('Success:', finalUrl.includes('/dashboard'));

    // Get any error messages on the page
    const errorMessage = await page.$eval('.text-error-600', el => el.textContent).catch(() => null);
    if (errorMessage) {
      console.log('Error message on page:', errorMessage);
    }

    // Check if we're stuck on login page
    if (finalUrl.includes('/login')) {
      console.log('\n⚠️  Still on login page. Checking for issues...');
      
      // Check for any visible error messages
      const pageContent = await page.content();
      if (pageContent.includes('error') || pageContent.includes('Error')) {
        console.log('Page contains error indicators');
      }

      // Try to manually navigate to dashboard
      console.log('\n8. Attempting manual navigation to dashboard...');
      try {
        await page.goto('http://localhost:3000/dashboard', {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const dashboardUrl = page.url();
        console.log('Dashboard navigation result:', dashboardUrl);
        
        if (dashboardUrl.includes('/login')) {
          console.log('✗ Redirected back to login');
        } else if (dashboardUrl.includes('/dashboard')) {
          console.log('✓ Successfully reached dashboard manually!');
          console.log('This suggests the authentication worked but automatic redirect failed.');
        }
      } catch (navError) {
        console.error('Manual navigation failed:', navError.message);
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log('API calls made:', apiCalls.length);
    apiCalls.forEach(call => {
      console.log(`- ${call.method} ${call.url} -> ${call.status}`);
    });
    
    console.log('\nPossible issues:');
    if (!storageData.token) {
      console.log('- No authentication token stored');
    }
    if (finalUrl.includes('/login')) {
      console.log('- Navigation/redirect not working properly');
    }
    if (apiCalls.some(call => call.status >= 400)) {
      console.log('- API errors detected');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nPress Ctrl+C to close the browser...');
    // Keep browser open for inspection
    await new Promise(() => {});
  }
}

debugLoginFlow().catch(console.error);