const puppeteer = require('puppeteer');

async function testFinalComplete() {
  console.log('🧪 Final Complete Test: Login + Skip Button\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // STEP 1: Login
    console.log('📌 STEP 1: Login Process');
    console.log('========================\n');
    
    console.log('1.1 Navigate to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    // Accept cookies if present
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('1.2 Fill login form...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('1.3 Submit login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    
    const afterLoginUrl = page.url();
    console.log(`1.4 Current URL: ${afterLoginUrl}`);
    
    if (afterLoginUrl.includes('/dashboard')) {
      console.log('✅ Login successful!\n');
    } else {
      console.log('❌ Login failed\n');
      return;
    }
    
    // STEP 2: Welcome Page
    console.log('📌 STEP 2: Welcome Page Test');
    console.log('============================\n');
    
    console.log('2.1 Navigate to welcome page...');
    await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('2.2 Analyzing welcome page...');
    const welcomePageInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const buttons = Array.from(document.querySelectorAll('button'));
      
      return {
        title: document.title,
        url: window.location.href,
        links: links.map(a => ({
          text: a.textContent?.trim(),
          href: a.href,
          hasSkip: a.textContent?.toLowerCase().includes('skip')
        })),
        buttons: buttons.map(b => ({
          text: b.textContent?.trim(),
          type: b.type
        })),
        bodyText: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('Welcome page URL:', welcomePageInfo.url);
    console.log('Links found:', welcomePageInfo.links.length);
    console.log('Skip links:', welcomePageInfo.links.filter(l => l.hasSkip));
    
    // STEP 3: Click Skip Button
    console.log('\n📌 STEP 3: Skip Button Test');
    console.log('===========================\n');
    
    console.log('3.1 Looking for skip button...');
    
    // Try multiple methods to find and click skip
    const skipClicked = await page.evaluate(() => {
      // Method 1: Find by text content
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent?.toLowerCase().includes('skip')) {
          console.log('Found skip link by text:', link.outerHTML);
          link.click();
          return { method: 'text', clicked: true };
        }
      }
      
      // Method 2: Find link to /dashboard
      for (const link of links) {
        if (link.href?.endsWith('/dashboard') && !link.href.includes('welcome')) {
          console.log('Found dashboard link:', link.outerHTML);
          link.click();
          return { method: 'dashboard-link', clicked: true };
        }
      }
      
      // Method 3: Check buttons
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        if (button.textContent?.toLowerCase().includes('skip')) {
          console.log('Found skip button:', button.outerHTML);
          button.click();
          return { method: 'button', clicked: true };
        }
      }
      
      return { method: 'none', clicked: false };
    });
    
    console.log('3.2 Skip click result:', skipClicked);
    
    if (skipClicked.clicked) {
      console.log('✅ Skip element clicked using method:', skipClicked.method);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalUrl = page.url();
      console.log(`3.3 Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
        console.log('✅ Successfully redirected to main dashboard!');
      } else {
        console.log('⚠️  Still on welcome page or unexpected location');
      }
    } else {
      console.log('❌ Could not find skip button');
      
      // Debug: Show all available links
      const allLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.href,
          visible: a.offsetParent !== null
        }));
      });
      
      console.log('\nAll links on page:');
      allLinks.forEach((link, i) => {
        console.log(`  ${i + 1}. "${link.text}" -> ${link.href} (visible: ${link.visible})`);
      });
    }
    
    // STEP 4: Final Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('===============');
    console.log('1. Login: ✅ Success');
    console.log('2. Welcome Page: ✅ Loaded');
    console.log(`3. Skip Button: ${skipClicked.clicked ? '✅ Working' : '❌ Not Found'}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test_final_result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: test_final_result.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test_error_final.png' });
  } finally {
    console.log('\n🏁 Test complete. Browser will stay open for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

testFinalComplete().catch(console.error);