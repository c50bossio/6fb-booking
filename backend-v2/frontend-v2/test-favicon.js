const puppeteer = require('puppeteer');
const path = require('path');

async function testFavicon() {
  console.log('🎨 Testing Booked Barber Favicon\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    console.log('📸 Opening homepage to test favicon...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded'
    });
    
    // Get page title to verify branding
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check favicon link
    const faviconLink = await page.$eval('link[rel="icon"]', el => el.href);
    console.log(`🔗 Favicon link: ${faviconLink}`);
    
    // Take screenshot showing browser tab
    console.log('\n✅ Check the browser tab to see the BB favicon!');
    console.log('💡 The favicon should show "BB" on a teal background');
    
    console.log('\n⏳ Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testFavicon();