const puppeteer = require('puppeteer');

async function testSkipButton() {
  console.log('🧪 Testing Login Flow and Skip Button\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Monitor errors
  page.on('error', err => {
    console.error('Page error:', err);
  });
  
  page.on('pageerror', err => {
    console.error('Page error:', err);
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    console.log('✓ Login page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'test_1_login_page.png' });
    
    // Step 2: Fill in login credentials
    console.log('\n2️⃣ Entering login credentials...');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.type('input[name="email"]', 'admin@bookedbarber.com');
    await page.type('input[name="password"]', 'admin123');
    console.log('✓ Credentials entered');
    
    // Step 3: Submit login form
    console.log('\n3️⃣ Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    const afterLoginUrl = page.url();
    console.log(`✓ Navigated to: ${afterLoginUrl}`);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test_2_after_login.png' });
    
    // Step 4: Navigate to welcome page
    console.log('\n4️⃣ Navigating to welcome page...');
    await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
    console.log('✓ Welcome page loaded');
    
    // Take screenshot of welcome page
    await page.screenshot({ path: 'test_3_welcome_page.png' });
    
    // Step 5: Look for Skip button and click it
    console.log('\n5️⃣ Looking for Skip button...');
    
    // Try multiple selectors for the Skip button
    const skipSelectors = [
      'a[href="/dashboard"]:has-text("Skip for now")',
      'a:has-text("Skip for now")',
      'button:has-text("Skip for now")',
      'a[href="/dashboard"]',
      '[href="/dashboard"]'
    ];
    
    let skipClicked = false;
    
    for (const selector of skipSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✓ Found skip element with selector: ${selector}`);
          await element.click();
          skipClicked = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!skipClicked) {
      // Try to find by text content
      console.log('Trying to find skip button by text content...');
      const links = await page.$$eval('a', links => 
        links.map(link => ({
          text: link.textContent?.trim(),
          href: link.href,
          className: link.className
        }))
      );
      
      console.log('Available links:', links);
      
      // Click using evaluate
      await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.textContent?.includes('Skip')) {
            console.log('Clicking skip link:', link.outerHTML);
            link.click();
            return true;
          }
        }
        return false;
      });
    }
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`\n6️⃣ Final URL: ${finalUrl}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test_4_final_page.png' });
    
    // Check the result
    if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
      console.log('✅ SUCCESS: Skip button worked! Redirected to main dashboard');
    } else {
      console.log('⚠️  ISSUE: Did not redirect to main dashboard after skip');
    }
    
    // Get page content for debugging
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('\n📄 Page Content:');
    console.log('Title:', pageContent.title);
    console.log('URL:', pageContent.url);
    console.log('Body preview:', pageContent.bodyText);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test_error.png' });
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
  }
}

testSkipButton().catch(console.error);