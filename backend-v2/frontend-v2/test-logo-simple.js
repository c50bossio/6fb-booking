/**
 * Simplified Visual Testing Script for Booked Barber Logo Implementation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = './logo-implementation-screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function testLogoImplementation() {
  console.log('🎨 Testing Booked Barber Logo Implementation\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    defaultViewport: { width: 1440, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // Test Landing Page
    console.log('📸 Capturing Landing Page...');
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'landing-page.png'),
        fullPage: true
      });
      console.log('✅ Landing page captured');
    } catch (e) {
      console.log('⚠️  Could not capture landing page:', e.message);
    }

    // Test Login Page
    console.log('\n📸 Capturing Login Page...');
    try {
      await page.goto('http://localhost:3000/login', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'login-page.png'),
        fullPage: true
      });
      console.log('✅ Login page captured');
    } catch (e) {
      console.log('⚠️  Could not capture login page:', e.message);
    }

    // Test Dark Mode
    console.log('\n🌙 Testing Dark Mode...');
    try {
      await page.evaluateOnNewDocument(() => {
        localStorage.setItem('6fb-theme', 'dark');
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'login-page-dark.png'),
        fullPage: true
      });
      console.log('✅ Dark mode captured');
    } catch (e) {
      console.log('⚠️  Could not capture dark mode:', e.message);
    }

    // Test Mobile View
    console.log('\n📱 Testing Mobile View...');
    try {
      await page.setViewport({ width: 375, height: 812 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'login-page-mobile.png'),
        fullPage: true
      });
      console.log('✅ Mobile view captured');
    } catch (e) {
      console.log('⚠️  Could not capture mobile view:', e.message);
    }

    console.log('\n✨ Testing complete!');
    console.log(`📁 Screenshots saved to: ${path.resolve(screenshotsDir)}`);
    
    const files = fs.readdirSync(screenshotsDir);
    if (files.length > 0) {
      console.log('\n📋 Captured screenshots:');
      files.forEach(file => console.log(`   - ${file}`));
    }

    console.log('\n⏳ Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testLogoImplementation();