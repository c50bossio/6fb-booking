const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:3000';

async function manualBarberCheck() {
  console.log('🚀 Starting Manual Barber Check...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  
  try {
    console.log('📡 Testing basic connectivity...');
    
    // Test basic connectivity to homepage
    const response = await page.goto(`${FRONTEND_URL}/`, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log(`✅ Homepage response: ${response.status()}`);
    
    // Wait for page to stabilize
    await page.waitForTimeout(3000);
    
    // Take screenshot
    const screenshotPath = path.join(__dirname, 'manual-barber-check.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        bodyText: document.body.textContent.substring(0, 1000),
        hasLogin: !!document.querySelector('a[href*="login"], a:contains("Login"), button:contains("Login"), input[type="email"]'),
        hasBooking: !!document.querySelector('a[href*="booking"], a:contains("Book"), button:contains("Book")'),
        hasCalendar: !!document.querySelector('.calendar, [data-testid="calendar"], .fc'),
        elementCounts: {
          buttons: document.querySelectorAll('button').length,
          links: document.querySelectorAll('a').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input').length
        }
      };
    });
    
    console.log('\n📋 Page Analysis:');
    console.log(`   Title: ${pageInfo.title}`);
    console.log(`   URL: ${pageInfo.url}`);
    console.log(`   Has Login: ${pageInfo.hasLogin}`);
    console.log(`   Has Booking: ${pageInfo.hasBooking}`);
    console.log(`   Has Calendar: ${pageInfo.hasCalendar}`);
    console.log(`   Elements: ${pageInfo.elementCounts.buttons} buttons, ${pageInfo.elementCounts.links} links, ${pageInfo.elementCounts.forms} forms`);
    
    console.log('\n📝 Page Content Preview:');
    console.log(pageInfo.bodyText.substring(0, 300) + '...');
    
    // Test login page
    console.log('\n🔐 Testing login page...');
    try {
      await page.goto(`${FRONTEND_URL}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      
      const loginInfo = await page.evaluate(() => {
        return {
          hasEmailInput: !!document.querySelector('input[type="email"], input[name="email"]'),
          hasPasswordInput: !!document.querySelector('input[type="password"], input[name="password"]'),
          hasSubmitButton: !!document.querySelector('button[type="submit"], input[type="submit"]'),
          currentUrl: window.location.href
        };
      });
      
      console.log(`   Login page accessible: ${!loginInfo.currentUrl.includes('404')}`);
      console.log(`   Has email field: ${loginInfo.hasEmailInput}`);
      console.log(`   Has password field: ${loginInfo.hasPasswordInput}`);
      console.log(`   Has submit button: ${loginInfo.hasSubmitButton}`);
      
      const loginScreenshot = path.join(__dirname, 'manual-login-check.png');
      await page.screenshot({ path: loginScreenshot });
      console.log(`📸 Login screenshot: ${loginScreenshot}`);
      
    } catch (error) {
      console.log(`   ❌ Login page error: ${error.message}`);
    }
    
    // Test booking page
    console.log('\n📅 Testing booking page...');
    try {
      await page.goto(`${FRONTEND_URL}/booking`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      
      const bookingInfo = await page.evaluate(() => {
        return {
          hasCalendarElements: document.querySelectorAll('.calendar, .date-picker, .fc, input[type="date"]').length,
          hasTimeSlots: document.querySelectorAll('.time-slot, .available-time, .slot').length,
          hasServiceSelection: document.querySelectorAll('select, .service-option, .service-card').length,
          currentUrl: window.location.href,
          visible: !window.location.href.includes('404')
        };
      });
      
      console.log(`   Booking page accessible: ${bookingInfo.visible}`);
      console.log(`   Calendar elements: ${bookingInfo.hasCalendarElements}`);
      console.log(`   Time slots: ${bookingInfo.hasTimeSlots}`);
      console.log(`   Service selection: ${bookingInfo.hasServiceSelection}`);
      
      const bookingScreenshot = path.join(__dirname, 'manual-booking-check.png');
      await page.screenshot({ path: bookingScreenshot });
      console.log(`📸 Booking screenshot: ${bookingScreenshot}`);
      
    } catch (error) {
      console.log(`   ❌ Booking page error: ${error.message}`);
    }
    
    // Test calendar page
    console.log('\n📊 Testing calendar page...');
    try {
      await page.goto(`${FRONTEND_URL}/calendar`, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      
      const calendarInfo = await page.evaluate(() => {
        return {
          hasFullCalendar: !!document.querySelector('.fc'),
          hasCalendarGrid: !!document.querySelector('.fc-daygrid, .fc-timegrid'),
          hasCalendarEvents: document.querySelectorAll('.fc-event').length,
          hasCustomCalendar: !!document.querySelector('.calendar:not(.fc)'),
          currentUrl: window.location.href,
          isRedirected: window.location.href.includes('login') || window.location.href.includes('404')
        };
      });
      
      console.log(`   Calendar page accessible: ${!calendarInfo.isRedirected}`);
      console.log(`   Has FullCalendar: ${calendarInfo.hasFullCalendar}`);
      console.log(`   Has calendar grid: ${calendarInfo.hasCalendarGrid}`);
      console.log(`   Calendar events: ${calendarInfo.hasCalendarEvents}`);
      console.log(`   Has custom calendar: ${calendarInfo.hasCustomCalendar}`);
      
      const calendarScreenshot = path.join(__dirname, 'manual-calendar-check.png');
      await page.screenshot({ path: calendarScreenshot });
      console.log(`📸 Calendar screenshot: ${calendarScreenshot}`);
      
    } catch (error) {
      console.log(`   ❌ Calendar page error: ${error.message}`);
    }
    
    console.log('\n✅ Manual barber check completed!');
    
  } catch (error) {
    console.error('❌ Manual check failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the manual check
manualBarberCheck().catch(console.error);