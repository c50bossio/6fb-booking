const puppeteer = require('puppeteer');

async function testRegistration() {
  console.log('Testing registration flow...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Test email
    const testEmail = `test_${Date.now()}@example.com`;
    console.log(`Using test email: ${testEmail}\n`);
    
    // Go to registration page
    console.log('1. Loading registration page...');
    await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle2' });
    console.log('✓ Registration page loaded\n');
    
    // Fill form
    console.log('2. Filling registration form...');
    await page.type('input[name="name"]', 'Test User');
    await page.type('input[name="email"]', testEmail);
    await page.type('input[name="password"]', 'TestPassword123!');
    await page.type('input[name="confirmPassword"]', 'TestPassword123!');
    
    // Check consents
    await page.click('input[id="terms-consent"]');
    await page.click('input[id="privacy-consent"]');
    console.log('✓ Form filled\n');
    
    // Submit
    console.log('3. Submitting registration...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    // Check where we ended up
    const currentUrl = page.url();
    console.log(`✓ Navigated to: ${currentUrl}\n`);
    
    if (currentUrl.includes('check-email')) {
      console.log('4. Success! On check-email page');
      
      // Wait 5 seconds to see if any redirects happen
      console.log('   Waiting 5 seconds to check for redirects...');
      await page.waitForTimeout(5000);
      
      const finalUrl = page.url();
      if (finalUrl !== currentUrl) {
        console.log(`   ⚠️ Redirected to: ${finalUrl}`);
      } else {
        console.log('   ✓ No redirects - page is stable!');
      }
    } else {
      console.log('4. ERROR: Not on check-email page!');
    }
    
    // Take screenshot
    await page.screenshot({ path: './registration-test-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved as registration-test-result.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) {
      console.log('\nClosing browser in 3 seconds...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await browser.close();
    }
  }
}

testRegistration();