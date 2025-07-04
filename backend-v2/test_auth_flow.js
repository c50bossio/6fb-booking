const puppeteer = require('puppeteer');

async function testAuthFlow() {
  console.log('🚀 Starting authentication flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Monitor console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    console.log('📝 Testing registration flow...');
    
    // Go to registration page
    await page.goto('http://localhost:3000/register');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Generate unique test email
    const timestamp = Date.now();
    const testEmail = `test_auth_${timestamp}@example.com`;
    const testPassword = 'TestPass123';
    const testName = 'Test Auth User';
    
    console.log(`Using test email: ${testEmail}`);
    
    // Fill out registration form
    await page.type('input[name="name"]', testName);
    await page.type('input[name="email"]', testEmail);
    await page.type('input[name="password"]', testPassword);
    await page.type('input[name="confirmPassword"]', testPassword);
    
    // Check required consent checkboxes
    await page.click('input[id="terms-consent"]');
    await page.click('input[id="privacy-consent"]');
    
    // Optionally enable test data
    await page.click('input[id="test-data-consent"]');
    
    console.log('📤 Submitting registration form...');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for redirect or success message
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);
    
    if (currentUrl.includes('/check-email')) {
      console.log('✅ Registration successful - redirected to check email page');
      
      // Test login flow
      console.log('🔐 Testing login flow...');
      
      await page.goto('http://localhost:3000/login');
      await page.waitForSelector('input[name="email"]');
      
      // Fill login form
      await page.type('input[name="email"]', testEmail);
      await page.type('input[name="password"]', testPassword);
      
      console.log('📤 Submitting login form...');
      await page.click('button[type="submit"]');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      const loginUrl = page.url();
      console.log(`Current URL after login: ${loginUrl}`);
      
      // Check for error message about email verification
      const errorMessage = await page.$eval('div[class*="bg-red"]', el => el.textContent).catch(() => null);
      
      if (errorMessage && errorMessage.includes('email')) {
        console.log('✅ Login correctly blocked for unverified email');
        console.log(`Error message: ${errorMessage}`);
      } else if (loginUrl.includes('/dashboard')) {
        console.log('❌ Login succeeded without email verification - this is wrong!');
      } else {
        console.log('⚠️ Unexpected login behavior');
      }
      
    } else {
      console.log('❌ Registration failed or unexpected redirect');
      
      // Check for error messages
      const errorElement = await page.$('div[class*="bg-red"]');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        console.log(`Registration error: ${errorText}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    console.log('🏁 Test completed');
    await browser.close();
  }
}

testAuthFlow().catch(console.error);