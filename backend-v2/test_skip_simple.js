const puppeteer = require('puppeteer');

async function testSkipSimple() {
  console.log('🧪 Simple Skip Button Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log console messages
  page.on('console', msg => {
    if (msg.text().includes('Login') || msg.text().includes('Redirect')) {
      console.log('Browser:', msg.text());
    }
  });
  
  try {
    // Step 1: Login
    console.log('1️⃣ Going to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    
    // Close cookies
    try {
      await page.click('button:has-text("Accept All")', { timeout: 1000 });
    } catch (e) {}
    
    console.log('2️⃣ Logging in...');
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait a bit for login to process
    console.log('3️⃣ Waiting for login to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    let currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('/dashboard')) {
      console.log('❌ Login failed - not on dashboard');
      return;
    }
    
    console.log('✅ Login successful!\n');
    
    // Step 2: Go to welcome page
    console.log('4️⃣ Going to welcome page...');
    await page.goto('http://localhost:3000/dashboard/welcome', { waitUntil: 'networkidle0' });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Find and click skip
    console.log('5️⃣ Looking for skip button...');
    
    // Get all links and their info
    const pageInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const skipLink = links.find(a => 
        a.textContent?.toLowerCase().includes('skip') ||
        (a.href?.endsWith('/dashboard') && a.textContent?.toLowerCase().includes('skip'))
      );
      
      return {
        hasSkipLink: !!skipLink,
        skipLinkText: skipLink?.textContent?.trim(),
        skipLinkHref: skipLink?.href,
        allLinks: links.map(a => ({
          text: a.textContent?.trim(),
          href: a.href
        })).filter(l => l.text) // Only show links with text
      };
    });
    
    console.log('Skip link found:', pageInfo.hasSkipLink);
    if (pageInfo.hasSkipLink) {
      console.log(`Skip link: "${pageInfo.skipLinkText}" -> ${pageInfo.skipLinkHref}`);
    }
    
    console.log('\nAll links on welcome page:');
    pageInfo.allLinks.forEach(link => {
      console.log(`- "${link.text}" -> ${link.href}`);
    });
    
    // Try to click skip
    if (pageInfo.hasSkipLink) {
      console.log('\n6️⃣ Clicking skip link...');
      
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const skipLink = links.find(a => 
          a.textContent?.toLowerCase().includes('skip')
        );
        if (skipLink) {
          skipLink.click();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);
      
      if (finalUrl.includes('/dashboard') && !finalUrl.includes('/welcome')) {
        console.log('✅ Skip button worked! Now on main dashboard');
      } else {
        console.log('⚠️  Skip didn\'t redirect as expected');
      }
    } else {
      console.log('❌ No skip link found on welcome page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'skip_test_result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: skip_test_result.png');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\nBrowser will stay open for 20 seconds...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
  }
}

testSkipSimple().catch(console.error);