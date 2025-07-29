const puppeteer = require('puppeteer');

async function debugLoginConsole() {
  console.log('🔍 Debugging frontend console errors...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console ERROR: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console WARNING: ${text}`);
    } else if (text.includes('login') || text.includes('auth') || text.includes('error')) {
      console.log(`📝 Console ${type.toUpperCase()}: ${text}`);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', (error) => {
    console.log(`💥 Page ERROR: ${error.message}`);
  });
  
  // Listen for request failures
  page.on('requestfailed', (request) => {
    console.log(`🚫 Request FAILED: ${request.url()} - ${request.failure().errorText}`);
  });
  
  try {
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    console.log('2️⃣ Waiting for page to load completely...');
    await page.waitForTimeout(3000);
    
    console.log('3️⃣ Checking for form elements...');
    const emailField = await page.$('#email');
    const passwordField = await page.$('#password');
    const submitButton = await page.$('button[type="submit"]');
    
    console.log(`   Email field: ${emailField ? 'FOUND' : 'MISSING'}`);
    console.log(`   Password field: ${passwordField ? 'FOUND' : 'MISSING'}`);
    console.log(`   Submit button: ${submitButton ? 'FOUND' : 'MISSING'}`);
    
    if (emailField && passwordField && submitButton) {
      console.log('4️⃣ Testing form interaction...');
      
      // Fill form
      await page.type('#email', 'admin@bookedbarber.com');
      await page.type('#password', 'admin123');
      
      console.log('5️⃣ Clicking submit button...');
      await submitButton.click();
      
      // Wait for any network activity
      await page.waitForTimeout(5000);
      
      console.log('6️⃣ Check current URL after submit...');
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error.message);
  }
  
  console.log('\n✅ Debug complete. Browser staying open for manual inspection...');
  // Keep browser open for manual debugging
}

debugLoginConsole();