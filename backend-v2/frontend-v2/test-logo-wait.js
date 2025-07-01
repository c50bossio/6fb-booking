/**
 * Logo Implementation Test with Better Wait Conditions
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const screenshotsDir = './logo-implementation-screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testLogoImplementation() {
  console.log('🎨 Testing Booked Barber Logo Implementation\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Add console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Test 1: Direct navigation to login (simpler page)
    console.log('📸 Testing Login Page First...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for content to appear
    try {
      await page.waitForSelector('main', { timeout: 5000 });
      console.log('✅ Main content loaded');
    } catch (e) {
      console.log('⚠️  Main content not found');
    }

    // Check if logo images are loading
    const logoImages = await page.$$eval('img[alt*="Booked"], img[alt*="Logo"], img[src*="logo"]', imgs => 
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        loaded: img.complete && img.naturalHeight !== 0
      }))
    );
    
    if (logoImages.length > 0) {
      console.log('🖼️  Found logo images:');
      logoImages.forEach(img => {
        console.log(`   - ${img.alt || 'No alt'}: ${img.src} (${img.loaded ? 'loaded' : 'not loaded'})`);
      });
    } else {
      console.log('⚠️  No logo images found on page');
    }

    // Take screenshot anyway
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'login-test.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: login-test.png');

    // Check page content
    const pageContent = await page.content();
    if (pageContent.includes('Loading...')) {
      console.log('⚠️  Page is still showing loading state');
    }

    // Try to wait for specific elements
    try {
      await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      console.log('✅ Login form loaded');
    } catch (e) {
      console.log('⚠️  Login form not found');
    }

    // Test 2: Try homepage
    console.log('\n📸 Testing Homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'home-test.png'),
      fullPage: true
    });
    console.log('📸 Screenshot saved: home-test.png');

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    console.log('\n✨ Test complete!');
    console.log('⏳ Keeping browser open for 10 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error);
    
    // Take error screenshot
    try {
      const page = await browser.newPage();
      await page.goto('http://localhost:3000');
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'error-state.png'),
        fullPage: true
      });
    } catch (e) {
      console.log('Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testLogoImplementation();