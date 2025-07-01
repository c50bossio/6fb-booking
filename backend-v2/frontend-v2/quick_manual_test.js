const puppeteer = require('puppeteer');

async function quickManualTest() {
  console.log('🔍 Quick Manual Frontend Test...\n');

  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for manual verification
    slowMo: 1000,    // Slow down for visibility
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  try {
    console.log('📱 Testing Homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'homepage_test.png' });
    console.log('   Screenshot saved: homepage_test.png');

    console.log('\n🔐 Testing Login Page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'login_test.png' });
    console.log('   Screenshot saved: login_test.png');

    console.log('\n📅 Testing Booking Page...');
    await page.goto('http://localhost:3000/book', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'booking_test.png' });
    console.log('   Screenshot saved: booking_test.png');

    console.log('\n📊 Testing Dashboard Page...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'dashboard_test.png' });
    console.log('   Screenshot saved: dashboard_test.png');

    console.log('\n✅ All pages tested successfully!');
    console.log('👀 Browser window opened for manual verification');
    console.log('📸 Screenshots saved for verification');
    
    // Keep browser open for 10 seconds for manual verification
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

quickManualTest().catch(console.error);