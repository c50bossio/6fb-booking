/**
 * Visual Testing Script for Booked Barber Logo Implementation
 * This script captures screenshots of all key pages to verify logo placement and theme-appropriate rendering
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create screenshots directory
const screenshotsDir = './logo-implementation-screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshot(page, name, viewport = null) {
  if (viewport) {
    await page.setViewport(viewport);
  }
  
  const filename = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ 
    path: filename,
    fullPage: true
  });
  console.log(`✅ Captured: ${name}`);
}

async function setDarkMode(page, enabled = true) {
  await page.evaluateOnNewDocument((darkMode) => {
    localStorage.setItem('6fb-theme', darkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', darkMode);
  }, enabled);
}

async function testLogoImplementation() {
  console.log('🎨 Booked Barber Logo Implementation Visual Testing\n');
  console.log('📁 Screenshots will be saved to:', path.resolve(screenshotsDir), '\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 }
  });

  try {
    // Test 1: Landing Page
    console.log('🏠 Testing Landing Page...');
    let page = await browser.newPage();
    
    // Light mode
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await captureScreenshot(page, '01-landing-page-light-desktop');
    
    // Mobile view
    await captureScreenshot(page, '02-landing-page-light-mobile', { width: 375, height: 812 });
    
    // Dark mode
    await setDarkMode(page, true);
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await captureScreenshot(page, '03-landing-page-dark-desktop', { width: 1440, height: 900 });
    await page.close();

    // Test 2: Login Page
    console.log('\n🔐 Testing Login Page...');
    page = await browser.newPage();
    
    // Light mode
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await captureScreenshot(page, '04-login-page-light-desktop');
    
    // Dark mode
    await setDarkMode(page, true);
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await captureScreenshot(page, '05-login-page-dark-desktop');
    
    // Mobile view
    await captureScreenshot(page, '06-login-page-dark-mobile', { width: 375, height: 812 });
    await page.close();

    // Test 3: Dashboard with Authentication
    console.log('\n📊 Testing Dashboard (requires login)...');
    page = await browser.newPage();
    
    // Navigate to login
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    
    // Try to login with test credentials
    try {
      await page.type('input[type="email"]', 'admin@example.com');
      await page.type('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      // Light mode dashboard
      await new Promise(resolve => setTimeout(resolve, 2000));
      await captureScreenshot(page, '07-dashboard-light-desktop');
      
      // Test sidebar collapse
      const collapseButton = await page.$('button[aria-label*="collapse"], button[title*="collapse"], button:has(svg[class*="ChevronLeft"])');
      if (collapseButton) {
        await collapseButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        await captureScreenshot(page, '08-dashboard-light-sidebar-collapsed');
        
        // Expand again
        await collapseButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Dark mode dashboard
      await setDarkMode(page, true);
      await page.reload({ waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await captureScreenshot(page, '09-dashboard-dark-desktop');
      
      // Mobile view with drawer
      await captureScreenshot(page, '10-dashboard-dark-mobile', { width: 375, height: 812 });
      
      // Try to open mobile drawer
      const menuButton = await page.$('button[aria-label*="menu"], button:has(svg[class*="Bars3Icon"])');
      if (menuButton) {
        await menuButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        await captureScreenshot(page, '11-mobile-drawer-open', { width: 375, height: 812 });
      }
      
    } catch (error) {
      console.log('⚠️  Could not test authenticated pages. Login might have failed.');
      console.log('   Make sure the backend is running and test credentials are valid.');
    }
    
    await page.close();

    // Test 4: Theme Switching
    console.log('\n🌓 Testing Theme Switching...');
    page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Create side-by-side comparison
    const comparisonPage = await browser.newPage();
    await comparisonPage.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to a page that shows theme toggle
    await comparisonPage.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await comparisonPage.waitForTimeout(1000);
    
    // Take screenshot showing both themes if possible
    await captureScreenshot(comparisonPage, '12-theme-comparison', { width: 1920, height: 1080 });
    
    console.log('\n✨ Visual testing complete!');
    console.log(`📸 ${fs.readdirSync(screenshotsDir).length} screenshots captured`);
    console.log('\n📋 Summary of captured screenshots:');
    
    const screenshots = fs.readdirSync(screenshotsDir).sort();
    screenshots.forEach(file => {
      console.log(`   - ${file}`);
    });
    
    console.log('\n💡 Tips:');
    console.log('   - Review screenshots to ensure logos appear correctly in all contexts');
    console.log('   - Check that theme-appropriate logo variants are used (black/white)');
    console.log('   - Verify logo sizing is appropriate for each location');
    console.log('   - Ensure logos are visible and properly aligned');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
}

// Run the tests
testLogoImplementation().catch(console.error);