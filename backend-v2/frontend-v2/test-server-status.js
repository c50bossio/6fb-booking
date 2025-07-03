/**
 * Test Server Status with Puppeteer
 */
const puppeteer = require('puppeteer');

async function testServerStatus() {
  console.log('🔍 Testing localhost:3000 with Puppeteer...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Test localhost:3000
    console.log('📍 Testing localhost:3000...');
    const response = await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    console.log('✅ Response status:', response.status());
    console.log('✅ Response URL:', response.url());
    
    // Take screenshot
    await page.screenshot({ path: 'server-test-3000.png', fullPage: true });
    console.log('📸 Screenshot saved: server-test-3000.png');
    
    // Check page title
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check for any error messages
    const errorElements = await page.$$eval('[role="alert"], .error, .text-red-500', 
      elements => elements.map(el => el.textContent)
    );
    
    if (errorElements.length > 0) {
      console.log('🚨 Error messages found:', errorElements);
    } else {
      console.log('✅ No error messages detected');
    }
    
    // Test login page specifically
    console.log('📍 Testing localhost:3000/login...');
    const loginResponse = await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    console.log('✅ Login page status:', loginResponse.status());
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page-test.png', fullPage: true });
    console.log('📸 Login page screenshot saved: login-page-test.png');
    
    // Check if login form elements exist
    const emailInput = await page.$('input[type="email"], input[id="email"]');
    const passwordInput = await page.$('input[type="password"], input[id="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    console.log('📋 Form elements check:');
    console.log('  Email input:', emailInput ? '✅ Found' : '❌ Missing');
    console.log('  Password input:', passwordInput ? '✅ Found' : '❌ Missing');
    console.log('  Submit button:', submitButton ? '✅ Found' : '❌ Missing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Try to get more info about the error
    if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
      console.log('🔍 Connection refused - server may not be running');
    } else if (error.message.includes('timeout')) {
      console.log('🔍 Timeout - server may be slow to respond');
    }
    
    // Take screenshot of error state
    try {
      await page.screenshot({ path: 'error-state.png', fullPage: true });
      console.log('📸 Error screenshot saved: error-state.png');
    } catch (screenshotError) {
      console.log('Could not take error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testServerStatus().catch(console.error);