const puppeteer = require('puppeteer');

async function testAllPages() {
  console.log('Testing all pages after successful login...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enhanced logging
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools') && !text.includes('[HMR]')) {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]`, text);
    }
  });
  
  page.on('pageerror', error => console.error('[PAGE ERROR]', error.message));
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`[HTTP ERROR] ${response.status()} ${response.url()}`);
    }
  });

  page.on('requestfailed', request => {
    console.error('[REQUEST FAILED]', request.url(), request.failure().errorText);
  });

  const pagesToTest = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Book Appointment', path: '/book' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Settings', path: '/settings' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Clients', path: '/clients' },
    { name: 'Admin Panel', path: '/admin' },
    { name: 'Notifications', path: '/notifications' },
    { name: 'Payouts', path: '/payouts' }
  ];

  try {
    // 1. First login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Clear any existing auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Login
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'admin.test@bookedbarber.com');
    await page.type('#password', 'AdminTest123');
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForTimeout(3000) // Wait for any redirects
    ]);

    // Check if we have a token
    const hasToken = await page.evaluate(() => !!localStorage.getItem('token'));
    console.log('Login successful, token stored:', hasToken);
    console.log('Current URL after login:', page.url());
    console.log('\n');

    // 2. Test each page
    for (const pageInfo of pagesToTest) {
      console.log(`\n=== Testing ${pageInfo.name} (${pageInfo.path}) ===`);
      
      try {
        // Track API calls
        const apiCalls = [];
        const apiListener = response => {
          if (response.url().includes('/api/')) {
            apiCalls.push({
              url: response.url(),
              status: response.status(),
              method: response.request().method()
            });
          }
        };
        page.on('response', apiListener);

        // Navigate to the page
        const response = await page.goto(`http://localhost:3000${pageInfo.path}`, {
          waitUntil: 'networkidle0',
          timeout: 15000
        });

        const finalUrl = page.url();
        const status = response ? response.status() : 'No response';
        
        console.log(`Status: ${status}`);
        console.log(`Final URL: ${finalUrl}`);
        
        // Check if redirected
        if (!finalUrl.includes(pageInfo.path)) {
          console.log(`⚠️  Redirected away from ${pageInfo.path}`);
        }

        // Wait a bit for content to load
        await page.waitForTimeout(2000);

        // Check for common error indicators
        const pageContent = await page.content();
        const hasError = pageContent.includes('error') || 
                        pageContent.includes('Error') || 
                        pageContent.includes('failed') ||
                        pageContent.includes('Failed');
        
        if (hasError) {
          console.log('⚠️  Page contains error indicators');
        }

        // Check for main content
        const h1Text = await page.$eval('h1', el => el.textContent).catch(() => 'No h1 found');
        console.log(`Page heading: ${h1Text}`);

        // Check for loading states
        const hasLoadingIndicator = await page.$('.animate-spin, .loading, [class*="skeleton"]').catch(() => false);
        if (hasLoadingIndicator) {
          console.log('⚠️  Page still showing loading indicators');
        }

        // Report API calls
        console.log(`API calls made: ${apiCalls.length}`);
        apiCalls.forEach(call => {
          console.log(`  - ${call.method} ${call.url} -> ${call.status}`);
        });

        // Clean up listener
        page.off('response', apiListener);

      } catch (error) {
        console.error(`❌ Failed to test ${pageInfo.name}:`, error.message);
      }
    }

    // 3. Summary
    console.log('\n\n=== SUMMARY ===');
    console.log('Test complete. Check the above results for any issues.');
    console.log('\nCommon issues to look for:');
    console.log('- Pages redirecting to login (auth issue)');
    console.log('- API calls returning 4xx/5xx errors');
    console.log('- Pages stuck on loading states');
    console.log('- JavaScript errors in console');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nKeeping browser open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {});
  }
}

testAllPages().catch(console.error);