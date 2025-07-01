/**
 * Manual Screenshot Tool - Simple approach to capture the design
 */

const puppeteer = require('puppeteer');

async function takeManualScreenshots() {
  console.log('📸 Taking manual screenshots of the Apple design system...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for manual interaction
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to homepage
    console.log('🏠 Navigate to homepage and take a screenshot...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: './homepage-desktop.png', 
      fullPage: true 
    });
    console.log('✅ Homepage screenshot saved: ./homepage-desktop.png');
    
    // Try to navigate to login
    console.log('\n🔐 Navigate to login page...');
    try {
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await page.screenshot({ 
        path: './login-desktop.png', 
        fullPage: true 
      });
      console.log('✅ Login screenshot saved: ./login-desktop.png');
    } catch (e) {
      console.log('⚠️  Login page may not exist or failed to load');
    }
    
    // Mobile screenshot
    console.log('\n📱 Taking mobile screenshot...');
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ 
      path: './homepage-mobile.png', 
      fullPage: true 
    });
    console.log('✅ Mobile screenshot saved: ./homepage-mobile.png');
    
    console.log('\n📊 Screenshot analysis complete!');
    
  } catch (error) {
    console.log('❌ Screenshot failed:', error.message);
  } finally {
    await browser.close();
  }
}

takeManualScreenshots();