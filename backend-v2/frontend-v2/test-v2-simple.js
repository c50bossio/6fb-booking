const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to V2 login page...');
    // Navigate and wait for content to load
    await page.goto('http://localhost:3000/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot
    await page.screenshot({ path: 'v2-login-screenshot.png', fullPage: true });
    console.log('Screenshot saved to v2-login-screenshot.png');
    
    // Get all text content
    const textContent = await page.evaluate(() => {
      return document.body.innerText || '';
    });
    
    console.log('\nPage Text Content:');
    console.log(textContent);
    
    // Check for branding
    const has6FB = textContent.includes('6FB Platform');
    const hasBookedBarber = textContent.includes('BookedBarber');
    
    console.log('\n=== BRANDING CHECK ===');
    console.log('Has "6FB Platform":', has6FB ? '❌ YES (V1)' : '✅ NO');
    console.log('Has "BookedBarber":', hasBookedBarber ? '✅ YES (V2)' : '❌ NO');
    
    if (!has6FB && hasBookedBarber) {
      console.log('\n🎉 SUCCESS: This is the V2 login screen with BookedBarber branding!');
    } else if (has6FB) {
      console.log('\n⚠️  WARNING: This appears to be the V1 login screen with 6FB Platform branding.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();