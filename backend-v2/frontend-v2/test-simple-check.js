const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:3000';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simpleCheck() {
  console.log('🚀 Starting Simple Check...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  
  try {
    console.log('📡 Testing homepage...');
    
    await page.goto(`${FRONTEND_URL}/`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await wait(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'homepage-check.png', fullPage: true });
    console.log('📸 Homepage screenshot saved');
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasBookingButton: !!document.querySelector('a[href*="booking"], button:contains("Book")'),
        hasLoginLink: !!document.querySelector('a[href*="login"]'),
        textContent: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('\n📋 Homepage Analysis:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   Has booking: ${pageInfo.hasBookingButton}`);
    console.log(`   Has login: ${pageInfo.hasLoginLink}`);
    console.log(`   Content preview: ${pageInfo.textContent.substring(0, 200)}...`);
    
    // Test booking page
    console.log('\n📅 Testing booking page...');
    await page.goto(`${FRONTEND_URL}/booking`, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    await wait(2000);
    await page.screenshot({ path: 'booking-check.png' });
    console.log('📸 Booking screenshot saved');
    
    const bookingInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasCalendar: document.querySelectorAll('.calendar, .date-picker, input[type="date"]').length > 0,
        hasTimeSlots: document.querySelectorAll('.time-slot, .available-time').length > 0,
        elementCount: document.querySelectorAll('*').length,
        textPreview: document.body.textContent.substring(0, 300)
      };
    });
    
    console.log(`   Booking URL: ${bookingInfo.url}`);
    console.log(`   Booking Title: ${bookingInfo.title}`);
    console.log(`   Has calendar: ${bookingInfo.hasCalendar}`);
    console.log(`   Has time slots: ${bookingInfo.hasTimeSlots}`);
    console.log(`   Elements on page: ${bookingInfo.elementCount}`);
    console.log(`   Content: ${bookingInfo.textPreview.substring(0, 150)}...`);
    
    // Test login
    console.log('\n🔐 Testing login page...');
    await page.goto(`${FRONTEND_URL}/login`, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    await wait(2000);
    await page.screenshot({ path: 'login-check.png' });
    console.log('📸 Login screenshot saved');
    
    const loginInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        hasForm: document.querySelectorAll('form').length > 0,
        hasEmailInput: document.querySelectorAll('input[type="email"]').length > 0,
        hasPasswordInput: document.querySelectorAll('input[type="password"]').length > 0
      };
    });
    
    console.log(`   Login URL: ${loginInfo.url}`);
    console.log(`   Has form: ${loginInfo.hasForm}`);
    console.log(`   Has email input: ${loginInfo.hasEmailInput}`);
    console.log(`   Has password input: ${loginInfo.hasPasswordInput}`);
    
    console.log('\n✅ Simple check completed successfully!');
    
  } catch (error) {
    console.error('❌ Simple check failed:', error.message);
  } finally {
    await browser.close();
  }
}

simpleCheck().catch(console.error);