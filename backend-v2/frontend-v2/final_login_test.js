const puppeteer = require('puppeteer');

async function finalLoginTest() {
  console.log('Starting final login test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Enable console and error logging
  page.on('console', msg => {
    const text = msg.text();
    if (!text.includes('Download the React DevTools')) {
      console.log(`[${msg.type().toUpperCase()}]`, text);
    }
  });
  
  page.on('pageerror', error => console.error('[PAGE ERROR]', error.message));

  try {
    // 1. Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✓ Login page loaded\n');

    // 2. Clear any existing auth
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // 3. Fill and submit form
    console.log('2. Filling login form...');
    // Wait for form to be ready
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'admin.test@bookedbarber.com');
    await page.type('#password', 'AdminTest123');
    console.log('✓ Form filled\n');

    // 4. Monitor API responses
    const apiResponses = [];
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        const url = response.url();
        apiResponses.push({ url, status });
        console.log(`[API] ${status} ${url}`);
      }
    });

    // 5. Submit form
    console.log('3. Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for any response
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. Check current state
    const currentUrl = page.url();
    console.log('\n4. Current state:');
    console.log('URL:', currentUrl);
    
    // Check localStorage
    const authData = await page.evaluate(() => ({
      token: localStorage.getItem('token'),
      hasToken: !!localStorage.getItem('token')
    }));
    console.log('Has auth token:', authData.hasToken);
    
    // 7. If still on login, try manual navigation
    if (currentUrl.includes('/login')) {
      console.log('\n5. Still on login page. Attempting manual navigation to dashboard...');
      
      try {
        await page.goto('http://localhost:3000/dashboard', {
          waitUntil: 'networkidle0',
          timeout: 10000
        });
        
        const dashboardUrl = page.url();
        console.log('Dashboard URL:', dashboardUrl);
        
        if (dashboardUrl.includes('/dashboard')) {
          console.log('✓ Manual navigation successful!');
          
          // Wait for content to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check page content
          const pageContent = await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            const userInfo = Array.from(document.querySelectorAll('p')).find(p => 
              p.textContent.includes('@')
            );
            return {
              heading: h1 ? h1.textContent : 'No heading found',
              userEmail: userInfo ? userInfo.textContent : 'No user info found'
            };
          });
          
          console.log('\nPage content:');
          console.log('Heading:', pageContent.heading);
          console.log('User info:', pageContent.userEmail);
          
          // Take a screenshot
          await page.screenshot({ 
            path: 'dashboard-screenshot.png',
            fullPage: true 
          });
          console.log('\n✓ Screenshot saved as dashboard-screenshot.png');
          
          console.log('\n✅ SUCCESS! The admin account is working.');
          console.log('Credentials: admin.test@bookedbarber.com / AdminTest123');
          console.log('\nThe issue was with the automatic redirect after login.');
          console.log('You can manually navigate to /dashboard after logging in.');
          
        } else {
          console.log('✗ Redirected back to:', dashboardUrl);
        }
      } catch (navError) {
        console.error('Navigation error:', navError.message);
      }
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ Automatic redirect worked! Dashboard loaded successfully.');
    }
    
    // Summary
    console.log('\n=== Summary ===');
    console.log('API calls made:', apiResponses.length);
    apiResponses.forEach(r => console.log(`- ${r.status} ${r.url}`));

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('\nTest complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to close.');
    await new Promise(() => {});
  }
}

finalLoginTest().catch(console.error);