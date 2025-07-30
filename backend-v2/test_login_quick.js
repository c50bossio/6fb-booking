const puppeteer = require('puppeteer');

async function quickLoginTest() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 10000 });
    
    console.log('✏️ Filling in credentials...');
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.type('#email', 'admin@bookedbarber.com');
    await page.type('#password', 'admin123');
    
    console.log('🔄 Clicking submit...');
    await page.click('button[type="submit"]');
    
    // Wait for either dashboard or error
    await page.waitForFunction(
      () => {
        return window.location.pathname === '/dashboard' || 
               window.location.pathname.includes('/dashboard') ||
               document.querySelector('.text-red-500') !== null;
      },
      { timeout: 8000 }
    );
    
    const currentUrl = page.url();
    console.log('🎯 Result URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard') || currentUrl.includes('dashboard')) {
      console.log('✅ LOGIN SUCCESS!');
      console.log('🎉 Admin login is now working correctly!');
      return true;
    } else {
      console.log('❌ LOGIN FAILED - still on login page');
      return false;
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

quickLoginTest();