const puppeteer = require('puppeteer');

async function testLoginFlow() {
  console.log('🔍 Testing complete login flow...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Monitor console and errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', msg.text());
    }
  });
  
  try {
    // Step 1: Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle2'
    });
    
    // Step 2: Fill in login form
    console.log('2. Filling login form...');
    await page.type('input[name="email"]', 'admin@6fb.com');
    await page.type('input[name="password"]', 'admin123');
    
    // Take screenshot before login
    await page.screenshot({ path: 'before-login.png' });
    
    // Step 3: Submit form
    console.log('3. Submitting login form...');
    
    // Set up response listener for login
    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/auth/login'),
      { timeout: 10000 }
    );
    
    // Click submit button
    await page.click('button[type="submit"]');
    
    // Wait for login response
    const loginResponse = await loginResponsePromise;
    console.log(`   Login response: ${loginResponse.status()}`);
    
    if (loginResponse.status() === 200) {
      console.log('   ✅ Login successful!');
      
      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`4. Redirected to: ${currentUrl}`);
      
      // Take screenshot after login
      await page.screenshot({ path: 'after-login.png' });
      
      // Check if we're on dashboard
      if (currentUrl.includes('/dashboard')) {
        console.log('   ✅ Successfully reached dashboard!');
        
        // Wait a bit to see if content loads
        await page.waitForTimeout(3000);
        
        // Check for loading spinner
        const hasSpinner = await page.evaluate(() => {
          return !!document.querySelector('.animate-spin');
        });
        
        console.log(`5. Dashboard loading spinner: ${hasSpinner ? 'Still present' : 'Gone'}`);
        
        // Get page content
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log('6. Dashboard content preview:', pageText.substring(0, 150) + '...');
        
        // Final screenshot
        await page.screenshot({ path: 'dashboard-loaded.png', fullPage: true });
      }
    } else {
      const responseText = await loginResponse.text();
      console.log('   ❌ Login failed:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  }
  
  console.log('\n✅ Test complete. Browser remains open for inspection.');
  console.log('Press Ctrl+C to exit.');
}

testLoginFlow().catch(console.error);