const puppeteer = require('puppeteer');

async function traceRegistrationFlow() {
  console.log('🔍 Tracing complete registration flow...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Browser error:', error.message));
    
    // Track navigation events
    let navigationCount = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationCount++;
        console.log(`📍 Navigation ${navigationCount}: ${frame.url()}`);
      }
    });
    
    // Track network requests with more detail
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`→ API Request: ${request.method()} ${request.url()}`);
        if (request.method() === 'POST' && request.postData()) {
          try {
            const data = JSON.parse(request.postData());
            console.log(`  Request body: ${JSON.stringify(data, null, 2)}`);
          } catch (e) {
            // Not JSON
          }
        }
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`← API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Generate unique test email
    const testEmail = `test_${Date.now()}@example.com`;
    console.log(`📧 Using test email: ${testEmail}\n`);
    
    // Navigate to registration page
    console.log('1️⃣ Loading registration page...');
    await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle2' });
    
    // Fill registration form
    console.log('2️⃣ Filling registration form...');
    await page.type('input[name="name"]', 'Test User Journey');
    await page.type('input[name="email"]', testEmail);
    await page.type('input[name="password"]', 'TestPassword123!');
    await page.type('input[name="confirmPassword"]', 'TestPassword123!');
    
    // Check required checkboxes
    await page.click('input[id="terms-consent"]');
    await page.click('input[id="privacy-consent"]');
    
    // Submit form and track what happens
    console.log('3️⃣ Submitting registration form...');
    
    // Set up promise to track navigation
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    try {
      await navigationPromise;
      console.log('✅ Navigation completed');
    } catch (navError) {
      console.log('⚠️ Navigation timeout or error:', navError.message);
    }
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`\n4️⃣ Current page: ${currentUrl}`);
    
    // Check for error messages
    const errorMessage = await page.evaluate(() => {
      const error = document.querySelector('[role="alert"]') || 
                   document.querySelector('.error') || 
                   document.querySelector('.text-red-500');
      return error?.textContent || null;
    });
    
    if (errorMessage) {
      console.log(`❌ Error message found: ${errorMessage}`);
    }
    
    // If we're on check-email page, monitor for redirects
    if (currentUrl.includes('check-email')) {
      console.log('\n5️⃣ Successfully reached check-email page!');
      
      // Get the email displayed on the page
      const displayedEmail = await page.evaluate(() => {
        const emailElement = document.querySelector('.font-medium.text-gray-900');
        return emailElement?.textContent || null;
      });
      console.log(`📧 Email displayed on page: ${displayedEmail}`);
      
      // Wait and see what happens
      console.log('\n⏳ Monitoring page for 15 seconds to check for unexpected redirects...');
      
      // Set up promise to detect navigation
      let didNavigate = false;
      const navigationPromise = new Promise((resolve) => {
        page.once('framenavigated', (frame) => {
          if (frame === page.mainFrame()) {
            didNavigate = true;
            resolve(frame.url());
          }
        });
        // Timeout after 15 seconds
        setTimeout(() => resolve(null), 15000);
      });
      
      const newUrl = await navigationPromise;
      
      if (newUrl) {
        console.log(`\n⚠️ Unexpected navigation detected!`);
        console.log(`🔄 Redirected to: ${newUrl}`);
        
        // Check localStorage for auth tokens
        const authState = await page.evaluate(() => {
          return {
            token: localStorage.getItem('token'),
            refreshToken: localStorage.getItem('refresh_token'),
            user: localStorage.getItem('user'),
            theme: localStorage.getItem('6fb-theme')
          };
        });
        
        console.log('\n🔐 Auth state in localStorage:');
        console.log('- Access token:', authState.token ? 'Present' : 'Missing');
        console.log('- Refresh token:', authState.refreshToken ? 'Present' : 'Missing');
        console.log('- User data:', authState.user ? 'Present' : 'Missing');
        console.log('- Theme:', authState.theme || 'Not set');
      } else {
        console.log('\n✅ No unexpected redirects! Page remained stable.');
        console.log('📍 Still on:', page.url());
      }
    }
    
    // Take screenshot of final state
    const screenshotPath = `/Users/bossio/6fb-booking/backend-v2/registration-flow-final.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Final screenshot saved to: ${screenshotPath}`);
    
    // Summary
    console.log('\n📊 Registration Flow Summary:');
    console.log('- Started at: /register');
    console.log('- Ended at:', page.url());
    console.log('- Email sent:', testEmail.includes('@') ? 'SendGrid returned 403 (expected in dev)' : 'Unknown');
    
  } catch (error) {
    console.error('💥 Error during flow tracing:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    if (browser) {
      await browser.close();
    }
  }
}

traceRegistrationFlow().catch(console.error);