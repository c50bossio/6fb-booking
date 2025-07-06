/**
 * Debug Login Flow - Step by step
 */
const { chromium } = require('playwright');

async function debugLogin() {
  console.log('🔍 Debugging BookedBarber V2 Login Flow...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Go to login page (using development server)
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);

    // Step 2: Wait for page to load and check selectors
    console.log('📍 Step 2: Checking available inputs...');
    await page.waitForTimeout(3000);
    
    // Check what inputs are available
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input elements`);
    
    // Try different selectors
    const emailSelector = await page.locator('input[id="email"]').count() > 0 ? 'input[id="email"]' : 
                         await page.locator('input[type="email"]').count() > 0 ? 'input[type="email"]' :
                         'input[placeholder*="email" i]';
    
    const passwordSelector = await page.locator('input[id="password"]').count() > 0 ? 'input[id="password"]' : 
                            await page.locator('input[type="password"]').count() > 0 ? 'input[type="password"]' :
                            'input[placeholder*="password" i]';
    
    console.log('📍 Step 2b: Filling credentials...');
    console.log('Email selector:', emailSelector);
    console.log('Password selector:', passwordSelector);
    
    await page.fill(emailSelector, 'admin@bookedbarber.com');
    await page.fill(passwordSelector, 'admin123');
    
    // Step 3: Monitor console logs
    console.log('📍 Step 3: Monitoring console logs...');
    page.on('console', msg => {
      console.log(`🖥️  Console: ${msg.text()}`);
    });

    // Step 4: Submit form
    console.log('📍 Step 4: Submitting form...');
    await page.click('button[type="submit"]');
    
    // Step 5: Wait and observe
    console.log('📍 Step 5: Waiting for response...');
    await page.waitForTimeout(5000);
    
    // Step 6: Check URL
    const currentUrl = page.url();
    console.log('📍 Step 6: Current URL:', currentUrl);
    
    // Step 7: Check localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('📍 Step 7: Token in localStorage:', token ? 'YES' : 'NO');
    
    // Step 8: Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red').allTextContents();
    if (errorMessages.length > 0) {
      console.log('🚨 Error messages:', errorMessages);
    }
    
    // Step 9: Take screenshot
    await page.screenshot({ path: 'login-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: login-debug.png');
    
    // Step 10: Try manual navigation to dashboard
    if (token) {
      console.log('📍 Step 10: Manually navigating to dashboard...');
      await page.goto('http://localhost:3000/dashboard');
      await page.waitForTimeout(3000);
      
      const dashboardUrl = page.url();
      console.log('📊 Dashboard URL:', dashboardUrl);
      
      if (dashboardUrl.includes('dashboard')) {
        console.log('✅ Dashboard accessible!');
      } else {
        console.log('❌ Dashboard redirect failed');
      }
    }

    // Step 11: Test API directly
    console.log('📍 Step 11: Testing API directly...');
    const apiResponse = await page.request.post('http://localhost:8000/api/v1/auth-test/login', {
      data: { 
        email: 'admin@bookedbarber.com', 
        password: 'admin123' 
      }
    });
    
    console.log('🔧 API Status:', apiResponse.status());
    if (apiResponse.ok()) {
      const data = await apiResponse.json();
      console.log('🔧 API Response has token:', !!data.access_token);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugLogin().catch(console.error);