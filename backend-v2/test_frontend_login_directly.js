const puppeteer = require('puppeteer');

async function testFrontendLogin() {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('🖥️  BROWSER:', msg.text());
  });
  
  // Enable network logging
  page.on('request', request => {
    if (request.url().includes('api/')) {
      console.log('📤 REQUEST:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('api/')) {
      console.log('📥 RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    console.log('✏️ Filling in login form...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('🔄 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for either success or error
    await page.waitForFunction(
      () => {
        return window.location.pathname === '/dashboard' || 
               document.querySelector('[role="alert"]') !== null ||
               document.querySelector('.error') !== null;
      },
      { timeout: 10000 }
    );
    
    const currentUrl = page.url();
    console.log('🎯 Final URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ LOGIN SUCCESSFUL!');
    } else {
      console.log('❌ LOGIN FAILED');
      
      // Look for error messages
      const errors = await page.evaluate(() => {
        const errorElements = document.querySelectorAll('[role="alert"], .error, .text-red-500, .text-destructive');
        return Array.from(errorElements).map(el => el.textContent.trim()).filter(text => text);
      });
      
      if (errors.length > 0) {
        console.log('🚨 Error messages found:', errors);
      }
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'login_error.png', fullPage: true });
      console.log('📸 Screenshot saved as login_error.png');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    await page.screenshot({ path: 'login_crash.png', fullPage: true });
  }
  
  // Keep browser open for manual inspection
  console.log('🔍 Browser staying open for inspection. Press Ctrl+C to close.');
  // await browser.close();
}

testFrontendLogin().catch(console.error);