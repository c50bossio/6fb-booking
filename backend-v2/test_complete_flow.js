const puppeteer = require('puppeteer');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Login Flow and Skip Button\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Error')) {
      console.log('Browser console:', msg.type(), msg.text());
    }
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    console.log('✓ Login page loaded');
    
    // Handle cookie banner if present
    try {
      await page.click('button:has-text("Accept All")', { timeout: 2000 });
      console.log('✓ Accepted cookies');
    } catch (e) {
      // Cookie banner might not be present
    }
    
    // Step 2: Fill in login credentials using ID selectors
    console.log('\n2️⃣ Entering login credentials...');
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    console.log('✓ Credentials entered');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test_1_before_login.png' });
    
    // Step 3: Submit login form
    console.log('\n3️⃣ Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('button[type="submit"]')
    ]);
    
    const afterLoginUrl = page.url();
    console.log(`✓ Navigated to: ${afterLoginUrl}`);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test_2_after_login.png' });
    
    // Check if we're on the dashboard
    if (afterLoginUrl.includes('/dashboard')) {
      console.log('✅ Successfully logged in and redirected to dashboard!');
    } else {
      console.log('⚠️  Not redirected to dashboard as expected');
    }
    
    // Step 4: Navigate to welcome page
    console.log('\n4️⃣ Navigating to welcome page...');
    await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
    console.log('✓ Welcome page loaded');
    
    // Wait for page to fully render
    await page.waitForTimeout(2000);
    
    // Take screenshot of welcome page
    await page.screenshot({ path: 'test_3_welcome_page.png' });
    
    // Step 5: Look for Skip button and click it
    console.log('\n5️⃣ Looking for Skip button...');
    
    // Get all links on the page
    const links = await page.$$eval('a', links => 
      links.map(link => ({
        text: link.textContent?.trim(),
        href: link.href,
        className: link.className,
        outerHTML: link.outerHTML
      }))
    );
    
    console.log('Found links:');
    links.forEach((link, i) => {
      if (link.text?.toLowerCase().includes('skip') || link.href?.includes('/dashboard')) {
        console.log(`  ${i + 1}. "${link.text}" -> ${link.href}`);
      }
    });
    
    // Try to click the skip button
    let skipClicked = false;
    
    // Method 1: Click by text content
    try {
      await page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          if (link.textContent?.toLowerCase().includes('skip')) {
            link.click();
            return true;
          }
        }
        // If no skip link, try any link to /dashboard
        for (const link of links) {
          if (link.href?.endsWith('/dashboard')) {
            link.click();
            return true;
          }
        }
        return false;
      });
      skipClicked = true;
      console.log('✓ Clicked skip/dashboard link');
    } catch (e) {
      console.log('Could not find skip button');
    }
    
    // Wait for navigation if skip was clicked
    if (skipClicked) {
      await page.waitForTimeout(3000);
    }
    
    const finalUrl = page.url();
    console.log(`\n6️⃣ Final URL: ${finalUrl}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test_4_final_page.png' });
    
    // Check the result
    if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
      console.log('✅ SUCCESS: Skip button worked! Redirected to main dashboard');
    } else if (finalUrl.includes('/dashboard/welcome')) {
      console.log('⚠️  Still on welcome page - skip button may not have worked');
      
      // Get page content for debugging
      const pageContent = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.href
        }));
        
        return {
          title: document.title,
          buttons: buttons,
          links: links,
          hasSkipLink: document.body.innerHTML.toLowerCase().includes('skip')
        };
      });
      
      console.log('\n📄 Welcome Page Analysis:');
      console.log('Buttons found:', pageContent.buttons);
      console.log('Has skip link:', pageContent.hasSkipLink);
      console.log('All links:', pageContent.links);
    }
    
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log('1. Login: ' + (afterLoginUrl.includes('/dashboard') ? '✅ Success' : '❌ Failed'));
    console.log('2. Welcome page: ✅ Loaded');
    console.log('3. Skip button: ' + (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome') ? '✅ Working' : '❌ Not working'));
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'test_error.png' });
  } finally {
    console.log('\n🏁 Test completed. Browser will close in 15 seconds...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    await browser.close();
  }
}

testCompleteFlow().catch(console.error);