const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const screenshotsDir = './logo-implementation-screenshots';

async function testLogos() {
  console.log('🎨 Testing Logo Display\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });

  try {
    const page = await browser.newPage();
    
    // Test the HTML test page
    console.log('📸 Testing logo test page...');
    await page.goto('http://localhost:3000/test-logos.html', { 
      waitUntil: 'networkidle0'
    });
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'logo-test-page.png'),
      fullPage: true
    });
    console.log('✅ Logo test page captured');

    console.log('\n⏳ Browser will close in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLogos();