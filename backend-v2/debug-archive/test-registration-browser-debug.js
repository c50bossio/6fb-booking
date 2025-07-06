const puppeteer = require('puppeteer');

async function testRegistrationWithDebug() {
  console.log('🔍 Testing Registration Flow with Browser Debugging\n');
  
  let browser;
  try {
    // Launch browser with debugging enabled
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true, // Open DevTools automatically
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-logging',
        '--v=1'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.log('❌ Browser Error:', text);
      } else if (type === 'warning') {
        console.log('⚠️ Browser Warning:', text);
      } else {
        console.log('📝 Browser Log:', text);
      }
    });
    
    // Track page errors
    page.on('pageerror', error => {
      console.log('💥 Page Error:', error.message);
    });
    
    // Track all network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`→ API Request: ${request.method()} ${request.url()}`);
        if (request.method() === 'POST') {
          const postData = request.postData();
          if (postData) {
            try {
              const data = JSON.parse(postData);
              console.log(`  Body: ${JSON.stringify(data, null, 2)}`);
            } catch (e) {
              console.log(`  Body: ${postData}`);
            }
          }
        }
      }
    });
    
    // Track all responses
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`← API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Track navigation
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        console.log(`📍 Navigated to: ${frame.url()}`);
      }
    });
    
    // Test data
    const testEmail = `test_debug_${Date.now()}@example.com`;
    console.log(`📧 Using test email: ${testEmail}\n`);
    
    // 1. Go to registration page
    console.log('1️⃣ Loading registration page...');
    await page.goto('http://localhost:3001/register', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for page to be interactive
    await page.waitForSelector('input[name="name"]', { visible: true });
    
    // 2. Fill form
    console.log('\n2️⃣ Filling registration form...');
    await page.type('input[name="name"]', 'Debug Test User');
    await page.type('input[name="email"]', testEmail);
    await page.type('input[name="password"]', 'TestPassword123!');
    await page.type('input[name="confirmPassword"]', 'TestPassword123!');
    
    // Check consents
    await page.click('input[id="terms-consent"]');
    await page.click('input[id="privacy-consent"]');
    
    // 3. Submit and monitor what happens
    console.log('\n3️⃣ Submitting form and monitoring behavior...');
    
    // Monitor for the next 20 seconds
    const monitorPromise = new Promise((resolve) => {
      let redirectCount = 0;
      let checkEmailReached = false;
      
      const checkUrl = setInterval(() => {
        const currentUrl = page.url();
        console.log(`⏱️ Current URL at ${new Date().toISOString()}: ${currentUrl}`);
        
        if (currentUrl.includes('check-email') && !checkEmailReached) {
          checkEmailReached = true;
          console.log('✅ Reached check-email page!');
        }
        
        // Check localStorage
        page.evaluate(() => {
          return {
            token: localStorage.getItem('token'),
            refreshToken: localStorage.getItem('refresh_token'),
            user: localStorage.getItem('user')
          };
        }).then(storage => {
          if (storage.token || storage.refreshToken) {
            console.log('🔐 Auth tokens found in localStorage:');
            console.log('  - Access token:', storage.token ? 'Present' : 'Missing');
            console.log('  - Refresh token:', storage.refreshToken ? 'Present' : 'Missing');
          }
        });
        
        redirectCount++;
        if (redirectCount >= 20) { // 20 seconds
          clearInterval(checkUrl);
          resolve();
        }
      }, 1000);
    });
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for monitoring to complete
    await monitorPromise;
    
    // Final state
    console.log('\n4️⃣ Final State:');
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check for any error messages
    const errorMessage = await page.evaluate(() => {
      const alerts = document.querySelectorAll('[role="alert"], .error, .text-red-500, .text-red-600');
      return Array.from(alerts).map(el => el.textContent?.trim()).filter(Boolean).join(', ');
    });
    
    if (errorMessage) {
      console.log(`❌ Error messages found: ${errorMessage}`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: './registration-debug-final.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved: registration-debug-final.png');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
  } finally {
    console.log('\n🏁 Test complete. Browser will remain open for inspection.');
    console.log('Close browser manually when done.');
    // Don't auto-close browser so we can inspect DevTools
  }
}

testRegistrationWithDebug().catch(console.error);